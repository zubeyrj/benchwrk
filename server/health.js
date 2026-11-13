// GET /api/health -> owner-only system check. POST /api/health { test: "email" } sends the owner a test email.
import { SITE, adminClient, env, fail, isAdmin, layout, p, readJson, requireUser, send, sendEmail, withErrors } from "./_lib.js";

async function check(name, fn) {
  const t = Date.now();
  try { const r = await fn(); return Object.assign({ name, ms: Date.now() - t }, r); }
  catch (e) { return { name, ok: false, note: (e && e.message) || String(e), ms: Date.now() - t }; }
}

export default withErrors(async function handler(req, res) {
  const user = await requireUser(req, res); if (!user) return;
  if (!(await isAdmin(user.id))) return fail(res, 403, "Only the site owner can do that.");
  if (req.method === "POST") {
    const { test } = await readJson(req);
    if (test !== "email") return fail(res, 400, "Bad request.");
    const r = await sendEmail({ to: user.email, subject: "Benchwrk test email", text: "Email from Benchwrk works.", html: layout({ heading: "Email works", body: p("This test came from your Benchwrk site at " + SITE() + "."), footer: "Sent because you pressed Send test email in Admin." }) });
    return r && r.skipped ? fail(res, 400, "No email service is set up yet. Add the Gmail or Resend settings in Vercel.") : send(res, 200, { sent: true, to: user.email });
  }
  const db = adminClient(), host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const checks = await Promise.all([
    check("Database", async () => { const { count, error } = await db.from("docs").select("path", { count: "exact", head: true }).eq("parent", "content"); if (error) throw new Error(error.message); return { ok: count >= 17, note: count >= 17 ? count + " course documents" : "Course content not loaded: use Load the course content" }; }),
    check("Site address", async () => { const s = env("SITE_URL"); return { ok: !!s && (!host || s.includes(host)), note: s ? (host && !s.includes(host) ? "SITE_URL is " + s + " but this request came to " + host : s) : "Set SITE_URL in Vercel" }; }),
    check("Tutor and interviewer (Claude)", async () => {
      if (!env("ANTHROPIC_API_KEY")) return { ok: false, note: "Add ANTHROPIC_API_KEY in Vercel" };
      const r = await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01" } });
      return { ok: r.ok, note: r.ok ? "Key works. Tutor model " + env("TUTOR_MODEL", "claude-haiku-5-5") + ", interviewer " + env("INTERVIEW_MODEL", "claude-sonnet-5-5") : "Anthropic rejected the key (" + r.status + ")" };
    }),
    check("Email", async () => {
      if (env("RESEND_API_KEY")) return { ok: true, note: "Resend, from " + env("EMAIL_FROM", "(EMAIL_FROM not set)") };
      if (!env("SMTP_HOST")) return { ok: false, note: "No email service: add the Gmail settings (SMTP_*) in Vercel" };
      const nodemailer = (await import("nodemailer")).default;
      const t = nodemailer.createTransport({ host: env("SMTP_HOST"), port: Number(env("SMTP_PORT", 465)), secure: Number(env("SMTP_PORT", 465)) === 465, auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") } });
      await t.verify(); return { ok: true, note: "SMTP sign-in works as " + env("SMTP_USER") };
    }),
    check("Scheduled emails", async () => ({ ok: !!env("CRON_SECRET"), note: env("CRON_SECRET") ? "Weekly on Sundays, reminders daily" : "Add CRON_SECRET in Vercel" })),
    check("Live job search", async () => { const extra = [env("ADZUNA_APP_ID") && "Adzuna", env("REED_API_KEY") && "Reed"].filter(Boolean); return { ok: true, warn: !extra.length, note: "Remotive and Arbeitnow" + (extra.length ? " plus " + extra.join(" and ") : ". Add Adzuna or Reed keys for UK coverage") }; }),
    check("Sign-up protection", async () => ({ ok: true, warn: !env("TURNSTILE_SITE_KEY"), note: env("TURNSTILE_SITE_KEY") ? "Captcha on (check it's also switched on in Supabase > Auth > Bot protection)" : "No captcha: add TURNSTILE_SITE_KEY and switch on bot protection in Supabase" })),
    check("Backups", async () => ({ ok: true, warn: !(env("BACKUP_KEY") && env("BACKUP_KEY").length >= 16), note: env("BACKUP_KEY") && env("BACKUP_KEY").length >= 16 ? "Encrypted backup emailed to you every Sunday" : "Add BACKUP_KEY (a passphrase of 16+ characters) in Vercel to get a weekly encrypted backup" })),
    check("Contact address", async () => ({ ok: !!env("CONTACT_EMAIL"), note: env("CONTACT_EMAIL") || "Add CONTACT_EMAIL for the privacy notice" })),
  ]);
  send(res, 200, { checks, at: new Date().toISOString() });
});
