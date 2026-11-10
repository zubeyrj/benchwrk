// Shared helpers for Benchwork's API routes. Files starting with "_" are not routes on Vercel.
import { createClient } from "@supabase/supabase-js";

export const env = (k, d) => (process.env[k] === undefined || process.env[k] === "" ? d : process.env[k]);
export const SITE = () => env("SITE_URL", "http://localhost:3000").replace(/\/$/, "");

let admin = null;
export function adminClient() {
  if (globalThis.__testAdminClient) return globalThis.__testAdminClient;
  if (!admin) admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}
export const fail = (res, status, error, code) => send(res, status, { error, code });

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch (e) { return {}; }
}

// The signed-in member behind a request, from the Supabase access token it carries.
export async function requireUser(req, res) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) { fail(res, 401, "Sign in first.", "unauthenticated"); return null; }
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data || !data.user) { fail(res, 401, "Your session has expired. Sign in again.", "unauthenticated"); return null; }
  return data.user;
}

export async function isAdmin(uid) {
  const { data } = await adminClient().from("admins").select("user_id").eq("user_id", uid).maybeSingle();
  return !!data;
}

export function requireCron(req, res) {
  const secret = env("CRON_SECRET");
  if (!secret || (req.headers.authorization || "") !== "Bearer " + secret) { fail(res, 401, "Not allowed."); return false; }
  return true;
}

export async function getDoc(path) {
  const { data } = await adminClient().from("docs").select("data").eq("path", path).maybeSingle();
  return data ? data.data : null;
}

export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Runs fn over items, n at a time, and stops starting new ones once budgetMs has passed, so a
// scheduled job finishes inside the hosting time limit. Returns how many were left for the next run.
export async function pool(items, n, fn, budgetMs) {
  const start = Date.now(); let i = 0, left = 0;
  async function worker() { while (i < items.length) { if (budgetMs && Date.now() - start > budgetMs) { left = items.length - i; return; } const it = items[i++]; await fn(it); } }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return left;
}

// ---------- dates (Mondays, in UTC to match the app's week keys closely enough for emails) ----------
export const isoDay = (d) => d.toISOString().slice(0, 10);
export function mondayOf(d) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x; }
export function weekHours(state, monday) {
  const from = isoDay(monday), to = isoDay(new Date(monday.getTime() + 7 * 864e5));
  return ((state && state.log) || []).filter((e) => e.d >= from && e.d < to).reduce((a, e) => a + Number(e.h || 0), 0);
}

// ---------- email ----------
// Two ways to send: Resend (RESEND_API_KEY, needs your own domain to reach everyone) or any SMTP
// server such as a Gmail account with an app password (SMTP_HOST, SMTP_USER, SMTP_PASS).
let smtp = null;
async function smtpTransport() {
  if (smtp) return smtp;
  const nodemailer = (await import("nodemailer")).default;
  smtp = env("SMTP_HOST") === "json" ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({ host: env("SMTP_HOST"), port: Number(env("SMTP_PORT", 465)), secure: Number(env("SMTP_PORT", 465)) === 465, auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") } });
  return smtp;
}
export async function sendEmail({ to, subject, html, text, unsubscribe, replyTo, attachments }) {
  const headers = {};
  if (unsubscribe) { headers["List-Unsubscribe"] = "<" + unsubscribe + ">"; headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"; }
  const from = env("EMAIL_FROM", env("SMTP_USER") ? "Benchwork <" + env("SMTP_USER") + ">" : "Benchwork <onboarding@resend.dev>");
  const key = env("RESEND_API_KEY");
  if (key) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + key, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text, headers, reply_to: replyTo || undefined, attachments: attachments ? attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) : undefined }),
    });
    if (!r.ok) throw new Error("Email failed: " + r.status + " " + (await r.text()).slice(0, 200));
    return r.json();
  }
  if (env("SMTP_HOST")) {
    const t = await smtpTransport();
    const info = await t.sendMail({ from, to, subject, html, text, headers, replyTo: replyTo || undefined, attachments: attachments ? attachments.map((a) => ({ filename: a.filename, content: a.content })) : undefined });
    if (globalThis.__smtpSent) globalThis.__smtpSent.push(info);
    return info;
  }
  return { skipped: true };
}

export async function logEmail(user_id, kind, ref) { await adminClient().from("email_log").insert({ user_id, kind, ref }); }
export async function sentSince(user_id, kind, sinceIso, ref) {
  let q = adminClient().from("email_log").select("id", { count: "exact", head: true }).eq("user_id", user_id).eq("kind", kind).gte("sent_at", sinceIso);
  if (ref) q = q.eq("ref", ref);
  const { count } = await q;
  return count || 0;
}

export const unsubLink = (profile, kind) => SITE() + "/api/unsubscribe?t=" + encodeURIComponent(profile.unsub_token) + "&k=" + kind;

// One branded layout for every email: plain, readable, works in dark mode clients.
export function layout({ preheader, heading, body, cta, ctaHref, footer }) {
  const site = SITE();
  return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light dark"><title>' + esc(heading) + "</title></head>" +
    '<body style="margin:0;background:#f4f1ec;font-family:Figtree,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b2333">' +
    '<span style="display:none;max-height:0;overflow:hidden;opacity:0">' + esc(preheader || "") + "</span>" +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">' +
    '<tr><td style="padding:0 4px 18px"><a href="' + site + '" style="text-decoration:none;color:#0e1726;font-weight:800;font-size:20px;letter-spacing:-.02em"><span style="display:inline-block;width:26px;height:26px;border-radius:7px;background:#c93c1a;color:#fff;text-align:center;line-height:26px;font-size:16px;margin-right:8px">b</span>benchwork</a></td></tr>' +
    '<tr><td style="background:#ffffff;border-radius:16px;padding:30px 28px;border:1px solid #e6e0d6">' +
    '<h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;letter-spacing:-.02em;color:#0e1726">' + esc(heading) + "</h1>" +
    body +
    (cta ? '<p style="margin:26px 0 4px"><a href="' + esc(ctaHref || site) + '" style="display:inline-block;background:#c93c1a;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">' + esc(cta) + "</a></p>" : "") +
    "</td></tr>" +
    '<tr><td style="padding:18px 6px;font-size:12px;line-height:1.5;color:#6b7280">' + (footer || "") + "</td></tr></table></td></tr></table></body></html>";
}
export const p = (t) => '<p style="margin:0 0 12px;font-size:16px;line-height:1.55">' + t + "</p>";
export function stats(rows) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;border-collapse:separate;border-spacing:0 6px">' +
    rows.map((r) => '<tr><td style="background:#f7f4ef;border-radius:10px 0 0 10px;padding:11px 14px;font-size:14px;color:#4b5563">' + esc(r[0]) + '</td><td align="right" style="background:#f7f4ef;border-radius:0 10px 10px 0;padding:11px 14px;font-size:15px;font-weight:700;color:#0e1726">' + esc(r[1]) + "</td></tr>").join("") + "</table>";
}
export function footerFor(profile, kind, label) {
  return "You're getting this because you have a Benchwork account. " +
    (profile && profile.unsub_token ? '<a href="' + unsubLink(profile, kind) + '" style="color:#6b7280">Stop ' + esc(label) + "</a> · " : "") +
    '<a href="' + SITE() + '/#settings" style="color:#6b7280">Email settings</a>';
}

// ---------- AI usage and Claude calls ----------
const todayIso = () => new Date().toISOString().slice(0, 10);
export async function usageToday(uid, kind) {
  const { data } = await adminClient().from("ai_usage").select("calls").eq("user_id", uid).eq("day", todayIso()).eq("kind", kind).maybeSingle();
  return data ? data.calls : 0;
}
export async function siteUsageToday(kind) {
  const { data } = await adminClient().from("ai_usage").select("calls").eq("day", todayIso()).eq("kind", kind);
  return (data || []).reduce((a, r) => a + r.calls, 0);
}
export const bumpAi = (uid, kind, inp = 0, outp = 0) => adminClient().rpc("bump_ai", { uid, k: kind, inp, outp });

// One non-streaming call to Claude. Returns { text, usage } or throws with .status.
export async function claude({ model, system, messages, max_tokens }) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens, system, messages }),
  });
  if (!r.ok) throw Object.assign(new Error("Claude " + r.status), { status: r.status });
  const j = await r.json();
  return { text: (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join(""), usage: j.usage || {} };
}

// Pulls the JSON object out of a model reply, even if it added a sentence or a code fence around it.
export function parseJsonReply(text) {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b < a) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch (e) { return null; }
}

// ---------- errors and owner alerts ----------
const fp = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };
export async function ownerProfile() {
  const db = adminClient();
  const { data: a } = await db.from("admins").select("user_id").limit(1);
  if (!a || !a.length) return null;
  const { data } = await db.from("profiles").select("id, email, name").eq("id", a[0].user_id).maybeSingle();
  return data;
}
// Records an error, at most once a minute per distinct message, and emails the owner at most once an hour.
export async function logError({ source, message, detail, url, ua, user_id }) {
  try {
    const db = adminClient(), msg = String(message || "Unknown error").slice(0, 500), f = fp(source + "|" + msg.replace(/\d+/g, "#"));
    const recent = await db.from("errors").select("id", { count: "exact", head: true }).eq("fingerprint", f).gte("at", new Date(Date.now() - 60e3).toISOString());
    if (recent.count) return;
    const today = await db.from("errors").select("id", { count: "exact", head: true }).gte("at", new Date(Date.now() - 864e5).toISOString());
    if ((today.count || 0) > Number(env("ERROR_DAILY_MAX", 500))) return;
    await db.from("errors").insert({ source, message: msg, detail: String(detail || "").slice(0, 4000), url: String(url || "").slice(0, 500), ua: String(ua || "").slice(0, 300), user_id: user_id || null, fingerprint: f });
    const owner = await ownerProfile();
    if (!owner || !owner.email) return;
    if (await sentSince(owner.id, "error-alert", new Date(Date.now() - 3600e3).toISOString())) return;
    await sendEmail({ to: owner.email, subject: "Benchwork: something went wrong", text: "A " + source + " error was recorded:\n\n" + msg + "\n\n" + (url || "") + "\n\nSee Admin > Errors: " + SITE() + "/#admin",
      html: layout({ preheader: msg, heading: "Something went wrong on Benchwork", body: p("A " + esc(source) + " error was recorded" + (url ? " on " + esc(url) : "") + ":") + '<pre style="white-space:pre-wrap;background:#f7f4ef;border-radius:10px;padding:12px;font-size:13px">' + esc(msg) + "</pre>" + p("You'll get at most one of these an hour. Later errors are listed in Admin."), cta: "Open Admin", ctaHref: SITE() + "/#admin", footer: "Sent to the Benchwork owner." }) });
    await logEmail(owner.id, "error-alert", f);
  } catch (e) { console.error("logError failed", e && e.message); }
}
// Wraps an API route so any crash is recorded and the caller gets a clean 500.
export function withErrors(handler) {
  return async function (req, res) {
    try { return await handler(req, res); }
    catch (e) {
      console.error(e);
      await logError({ source: "server", message: (e && e.message) || String(e), detail: e && e.stack, url: req.url, ua: req.headers && req.headers["user-agent"] });
      if (!res.writableEnded) { try { if (!res.headersSent) fail(res, 500, "Something went wrong on our side. It's been reported."); else res.end(); } catch (x) { /* ignore */ } }
    }
  };
}
