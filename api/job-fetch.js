// POST /api/job-fetch { url } -> { title, company, location, text } from a job advert the member chose.
// Guards against fetching private addresses, follows at most three redirects and reads at most 1.5 MB.
import dns from "node:dns/promises";
import net from "node:net";
import { extractJob } from "./_html.js";
import { bumpAi, env, fail, readJson, requireUser, send, usageToday } from "./_lib.js";

function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const s = ip.toLowerCase();
  if (s.startsWith("::ffff:")) return privateIp(s.slice(7));
  return s === "::" || s === "::1" || s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe80");
}
export async function safeUrl(raw) {
  let u; try { u = new URL(raw); } catch (e) { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || (u.port && u.port !== "80" && u.port !== "443")) return null;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
  if (net.isIP(host)) return privateIp(host) ? null : u;
  try { const addrs = await (globalThis.__testLookup || dns.lookup)(host, { all: true }); if (!addrs.length || addrs.some((a) => privateIp(a.address))) return null; } catch (e) { return null; }
  return u;
}

async function fetchPage(url) {
  let u = await safeUrl(url);
  for (let hop = 0; hop < 4 && u; hop++) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    let r;
    try { r = await fetch(u, { redirect: "manual", signal: ctl.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; BenchworkJobReader/1.0; +" + env("SITE_URL", "") + ")", accept: "text/html,application/xhtml+xml" } }); }
    finally { clearTimeout(t); }
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { u = await safeUrl(new URL(r.headers.get("location"), u).toString()); continue; }
    if (!r.ok) return { status: r.status };
    const type = r.headers.get("content-type") || "";
    if (type && !/html|text\/plain/.test(type)) return { status: 415 };
    const reader = r.body.getReader(); const chunks = []; let size = 0;
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 1.5e6) { try { reader.cancel(); } catch (e) { /* ignore */ } break; } chunks.push(value); }
    return { status: 200, html: Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8"), url: u.toString() };
  }
  return { status: 400 };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  const user = await requireUser(req, res); if (!user) return;
  const { url } = await readJson(req);
  if (typeof url !== "string" || url.length > 2000) return fail(res, 400, "Paste the link to the job advert.");
  if (/linkedin\.com/i.test(url)) return fail(res, 422, "LinkedIn doesn't let other sites read its job pages. Open the advert, copy the description and paste it in instead.", "blocked_site");
  if ((await usageToday(user.id, "fetch")) >= Number(env("JOB_FETCH_DAILY", 30))) return fail(res, 429, "That's enough links for today. Paste the text instead.", "daily_cap");
  await bumpAi(user.id, "fetch");
  let page;
  try { page = await fetchPage(url); } catch (e) { page = { status: 504 }; }
  if (!page.html) return fail(res, 422, page.status === 400 ? "That link can't be opened from here. Check it's a public web address." : "That page wouldn't open from here (it may need a login). Copy the description and paste it in instead.", "fetch_failed");
  const job = extractJob(page.html, page.url);
  if (job.text.length < 200) return fail(res, 422, "Couldn't find a job description on that page. Copy the description and paste it in instead.", "no_text");
  job.text = job.text.slice(0, 15000);
  send(res, 200, job);
}
