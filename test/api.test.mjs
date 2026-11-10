// Exercises every API route against the in-memory Supabase, with Anthropic and Resend stubbed.
import "./fake-supabase.js";

Object.assign(process.env, { SITE_URL: "https://benchwork.test", ANTHROPIC_API_KEY: "sk-test", RESEND_API_KEY: "re-test", CRON_SECRET: "cron-secret", TUTOR_DAILY_LIMIT: "3", EMAIL_FROM: "Benchwork <hi@benchwork.test>" });
const sb = globalThis.makeFakeSupabase({ ownerEmail: "owner@example.org" });
globalThis.__testAdminClient = sb;

let fails = 0, n = 0;
const ok = (name, cond) => { n++; if (!cond) { fails++; console.log("FAIL", name); } };

// ---- stubs for outside services ----
const sent = [];
let anthropicCalls = [], anthropicMode = "ok";
globalThis.fetch = async (url, init) => {
  if (String(url).includes("api.resend.com")) { sent.push(JSON.parse(init.body)); return new Response(JSON.stringify({ id: "em_" + sent.length }), { status: 200 }); }
  if (String(url).includes("api.anthropic.com")) {
    anthropicCalls.push({ headers: init.headers, body: JSON.parse(init.body) });
    if (anthropicMode === "busy") return new Response("{}", { status: 529 });
    const ev = (o) => "event: x\ndata: " + JSON.stringify(o) + "\n\n";
    const body = ev({ type: "message_start", message: { usage: { input_tokens: 120 } } }) + ev({ type: "content_block_delta", delta: { type: "text_delta", text: "Look at " } }) +
      ev({ type: "content_block_delta", delta: { type: "text_delta", text: "line 3." } }) + ev({ type: "message_delta", usage: { output_tokens: 9 } }) + ev({ type: "message_stop" });
    const enc = new TextEncoder();
    return new Response(new ReadableStream({ start(c) { for (let i = 0; i < body.length; i += 37) c.enqueue(enc.encode(body.slice(i, i + 37))); c.close(); } }), { status: 200 });
  }
  throw new Error("unexpected fetch " + url);
};

function call(handler, { method = "POST", body, token, url = "/", headers = {} } = {}) {
  return new Promise((resolve) => {
    const req = { method, url, body, headers: Object.assign(token ? { authorization: "Bearer " + token } : {}, headers) };
    const res = { statusCode: 200, headers: {}, chunks: [], setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, write(c) { this.chunks.push(String(c)); },
      end(c) { if (c) this.chunks.push(String(c)); const text = this.chunks.join(""); let json = null; try { json = JSON.parse(text); } catch (e) { /* html or text */ } resolve({ status: this.statusCode, headers: this.headers, text, json }); } };
    Promise.resolve(handler(req, res)).catch((e) => { console.log("THREW", e); resolve({ status: 599, text: String(e) }); });
  });
}

const owner = sb._addUser("owner@example.org", "pw", { full_name: "Owner" }, true);
const amira = sb._addUser("amira@example.org", "pw", { full_name: "Amira" }, true);
const ben = sb._addUser("ben@example.org", "pw", { full_name: "Ben" }, true);
const T = { owner: sb._tokenFor("owner@example.org"), amira: sb._tokenFor("amira@example.org"), ben: sb._tokenFor("ben@example.org") };
const load = async (f) => (await import("../api/" + f)).default;

// ---- tutor ----
const tutor = await load("tutor.js");
ok("tutor needs sign-in", (await call(tutor, { body: { messages: [{ role: "user", content: "hi" }] } })).status === 401);
ok("tutor rejects bad token", (await call(tutor, { token: "nope", body: { messages: [{ role: "user", content: "hi" }] } })).status === 401);
ok("tutor rejects bad shape", (await call(tutor, { token: T.amira, body: { messages: [{ role: "system", content: "x" }] } })).status === 400);
ok("tutor rejects huge convo", (await call(tutor, { token: T.amira, body: { messages: [{ role: "user", content: "x".repeat(70000) }] } })).status === 400);
let r = await call(tutor, { token: T.amira, body: { messages: [{ role: "user", content: "Why does line 3 fail?" }] } });
ok("tutor streams the answer", r.status === 200 && r.text === "Look at line 3." && r.chunks === undefined);
ok("tutor uses site key and model", anthropicCalls[0].headers["x-api-key"] === "sk-test" && anthropicCalls[0].body.model === "claude-haiku-5-5" && anthropicCalls[0].body.stream === true);
ok("tutor records usage", sb.tables.tutor_usage.find((u) => u.user_id === amira.id).in_tokens === 120 && sb.tables.tutor_usage.find((u) => u.user_id === amira.id).out_tokens === 9);
await call(tutor, { token: T.amira, body: { messages: [{ role: "user", content: "again" }] } });
await call(tutor, { token: T.amira, body: { messages: [{ role: "user", content: "again" }] } });
r = await call(tutor, { token: T.amira, body: { messages: [{ role: "user", content: "fourth" }] } });
ok("tutor daily cap", r.status === 429 && r.json.code === "daily_cap" && /3 tutor questions/.test(r.json.error));
ok("cap is per member", (await call(tutor, { token: T.ben, body: { messages: [{ role: "user", content: "hi" }] } })).status === 200);
anthropicMode = "busy";
r = await call(tutor, { token: T.ben, body: { messages: [{ role: "user", content: "hi" }] } });
ok("tutor busy upstream", r.status === 429 && r.json.code === "rate_limited");
anthropicMode = "ok";
process.env.TUTOR_SITE_DAILY_LIMIT = "4";
r = await call(tutor, { token: T.owner, body: { messages: [{ role: "user", content: "hi" }] } });
ok("site-wide ceiling", r.status === 429 && r.json.code === "site_cap");
delete process.env.TUTOR_SITE_DAILY_LIMIT;

// ---- export ----
sb._doc("data/users/" + amira.id + "/state", { account: { name: "Amira" }, hpw: 10, log: [] });
sb._doc("learners/" + amira.id, { name: "Amira", streak: 2 });
sb._doc("learners/" + ben.id, { name: "Ben" });
await new Promise((res) => setTimeout(res, 10));
const exp = await load("me-export.js");
r = await call(exp, { method: "GET", token: T.amira });
ok("export returns own records", r.status === 200 && r.json.private_records.length === 1 && r.json.shared_with_cohort.length === 1 && r.json.account.email === "amira@example.org");
ok("export excludes others", !JSON.stringify(r.json).includes("ben@example.org") && !JSON.stringify(r.json.shared_with_cohort).includes('"Ben"'));
ok("export includes tutor usage", r.json.tutor_usage.length === 1);

// ---- nudge ----
const nudge = await load("nudge.js");
r = await call(nudge, { token: T.amira, body: { to: ben.id, kind: "cheer", text: "Go on!" } });
ok("nudge refused when not partners", r.status === 403);
sb._doc("pairs/" + amira.id, { name: "Amira", partner: ben.id });
sb._doc("pairs/" + ben.id, { name: "Ben", partner: amira.id });
await new Promise((res) => setTimeout(res, 10));
r = await call(nudge, { token: T.amira, body: { to: ben.id, kind: "cheer", text: "Go on!" } });
ok("partner cheer emailed", r.status === 200 && r.json.emailed && sent.length === 1 && sent[0].to[0] === "ben@example.org" && /Amira cheered you on/.test(sent[0].subject));
ok("cheer email has one-click unsubscribe", /\/api\/unsubscribe\?t=/.test(sent[0].headers["List-Unsubscribe"]) && sent[0].html.includes("Go on!"));
ok("cheer escapes html", !(await call(nudge, { token: T.amira, body: { to: ben.id, kind: "nudge", text: "<script>x</script>" } })).text.includes("<script>") && !sent[1].html.includes("<script>x"));
await call(nudge, { token: T.amira, body: { to: ben.id, kind: "cheer" } });
r = await call(nudge, { token: T.amira, body: { to: ben.id, kind: "cheer" } });
ok("partner emails capped at 3 a day", r.json.emailed === false && r.json.reason === "limit" && sent.length === 3);
sb.tables.profiles.find((p) => p.id === amira.id).prefs = { partner: false };
r = await call(nudge, { token: T.ben, body: { to: amira.id, kind: "cheer" } });
ok("partner emails respect preference", r.json.emailed === false && r.json.reason === "off");
sb.tables.profiles.find((p) => p.id === amira.id).prefs = { weekly: true, streak: true, partner: true };

// ---- admin email ----
const adminEmail = await load("admin-email.js");
ok("members can't email others", (await call(adminEmail, { token: T.amira, body: { to: ben.id, subject: "x", body: "y" } })).status === 403);
r = await call(adminEmail, { token: T.owner, body: { to: ben.id, subject: "Project 1", body: "Hi Ben,\n\nGreat start." } });
ok("owner emails a learner", r.status === 200 && sent[sent.length - 1].to[0] === "ben@example.org" && sent[sent.length - 1].reply_to === "owner@example.org");
ok("owner email needs subject", (await call(adminEmail, { token: T.owner, body: { to: ben.id, subject: "", body: "y" } })).status === 400);

// ---- seed ----
const seed = await load("admin-seed.js");
ok("members can't seed", (await call(seed, { token: T.amira, body: {} })).status === 403);
r = await call(seed, { token: T.owner, body: {} });
ok("owner loads content", r.status === 200 && r.json.loaded === 32 && sb.tables.docs.filter((d) => d.parent === "content").length === 17 && sb.tables.docs.filter((d) => d.parent === "lessons").length === 15);
ok("seed leaves learners alone", sb.tables.docs.some((d) => d.path === "learners/" + amira.id));

// ---- certificates ----
const cert = await load("cert.js");
sb.tables.certs.push({ id: "abcdef0123456789", user_id: amira.id, name: "Amira <K>", course: "m1", course_title: "Python for engineers", hours: 21.5, issued: "2026-11-01" });
r = await call(cert, { method: "GET", url: "/api/cert?id=abcdef0123456789" });
ok("public certificate page", r.status === 200 && r.text.includes("Amira &lt;K&gt;") && r.text.includes("Python for engineers") && r.text.includes("1 November 2026") && r.text.includes('og:title'));
ok("certificate 404", (await call(cert, { method: "GET", url: "/api/cert?id=zzz" })).status === 404);

// ---- unsubscribe ----
const unsub = await load("unsubscribe.js");
const tok = sb.tables.profiles.find((p) => p.id === ben.id).unsub_token;
r = await call(unsub, { method: "GET", url: "/api/unsubscribe?t=" + tok + "&k=weekly" });
ok("unsubscribe GET only asks", r.text.includes("Yes, stop them") && sb.tables.profiles.find((p) => p.id === ben.id).prefs.weekly === true);
r = await call(unsub, { method: "POST", url: "/api/unsubscribe?t=" + tok + "&k=weekly" });
ok("unsubscribe POST switches off", r.text.includes("get weekly progress emails any more") && sb.tables.profiles.find((p) => p.id === ben.id).prefs.weekly === false && sb.tables.profiles.find((p) => p.id === ben.id).prefs.partner === true);
ok("bad unsubscribe token", (await call(unsub, { method: "POST", url: "/api/unsubscribe?t=nope&k=weekly" })).text.includes("valid any more"));

// ---- crons ----
const weekly = await load("cron/weekly.js"), daily = await load("cron/daily.js");
ok("cron needs secret", (await call(weekly, { method: "GET" })).status === 401);
const mon = (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); })();
sb._doc("data/users/" + amira.id + "/state", { account: { name: "Amira" }, hpw: 10, log: [{ d: mon, h: 4 }, { d: mon, h: 3 }] });
sb._doc("learners/" + amira.id, { name: "Amira", streak: 3, lvl: 4, pts: 820, cur: "Python for engineers", pct: 22, behind: 0, week: 7 });
sb._doc("data/users/" + ben.id + "/state", { account: { name: "Ben" }, hpw: 10, log: [] });
await new Promise((res) => setTimeout(res, 10));
const before = sent.length;
r = await call(weekly, { method: "GET", headers: { authorization: "Bearer cron-secret" } });
const wk = sent.slice(before);
ok("weekly email sent to opted-in members", r.json.sent === 1 && wk.length === 1 && wk[0].to[0] === "amira@example.org");
ok("weekly email content", /7 hours/.test(wk[0].subject) && wk[0].html.includes("Python for engineers") && wk[0].html.includes("Ben") && wk[0].text.includes("Weekly streak: 3 weeks"));
ok("ben opted out of weekly", !wk.some((e) => e.to[0] === "ben@example.org"));
r = await call(weekly, { method: "GET", headers: { authorization: "Bearer cron-secret" } });
ok("weekly email not repeated", r.json.sent === 0);

const { streakEmail, comebackEmail } = await import("../api/cron/daily.js");
const e1 = streakEmail({ state: { account: { name: "Amira" }, hpw: 10, log: [{ d: mon, h: 2 }] }, summary: { streak: 3 }, profile: { unsub_token: "t" } }, new Date(mon + "T00:00:00Z"));
ok("streak email maths", e1.subject === "Your 3-week streak ends Sunday" && e1.text.includes("2 of the 6 hours") && e1.text.includes("4 more hours"));
const e2 = comebackEmail({ state: { account: { name: "Ben" } }, summary: { cur: "SQL" }, profile: { unsub_token: "t" } }, 12);
ok("come-back email", e2.text.includes("12 days") && e2.html.includes("Continue SQL"));
sb._doc("data/users/" + ben.id + "/state", { account: { name: "Ben" }, hpw: 10, log: [{ d: "2026-01-02", h: 1 }] });
await new Promise((res) => setTimeout(res, 10));
r = await call(daily, { method: "GET", headers: { authorization: "Bearer cron-secret" } });
ok("daily cron sends come-back to quiet member", r.json.comeback === 1 && sent[sent.length - 1].to[0] === "ben@example.org");
r = await call(daily, { method: "GET", headers: { authorization: "Bearer cron-secret" } });
ok("come-back not repeated within 14 days", r.json.comeback === 0);

// ---- delete ----
const del = await load("me-delete.js");
ok("delete needs confirmation", (await call(del, { token: T.amira, body: {} })).status === 400);
ok("owner can't delete themselves", (await call(del, { token: T.owner, body: { confirm: "DELETE" } })).json.code === "owner");
r = await call(del, { token: T.amira, body: { confirm: "DELETE" } });
ok("member deletes account", r.status === 200 && !sb.users[amira.id] && !sb.tables.docs.some((d) => d.path.includes(amira.id)) && !sb.tables.profiles.some((p) => p.id === amira.id) && !sb.tables.certs.some((c) => c.user_id === amira.id));
ok("others untouched", sb.tables.docs.some((d) => d.path === "learners/" + ben.id) && !!sb.users[ben.id]);
ok("deleted token stops working", (await call(exp, { method: "GET", token: T.amira })).status === 401);

// ---- SMTP instead of Resend ----
delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM; process.env.SMTP_HOST = "json"; process.env.SMTP_USER = "benchwork.app@gmail.com"; globalThis.__smtpSent = [];
const { sendEmail } = await import("../api/_lib.js");
await sendEmail({ to: "ben@example.org", subject: "Hello", html: "<p>Hi</p>", text: "Hi", unsubscribe: "https://benchwork.test/api/unsubscribe?t=x&k=weekly" });
const m = JSON.parse(globalThis.__smtpSent[0].message);
ok("SMTP sends from the Gmail account", m.from.address === "benchwork.app@gmail.com" && m.to[0].address === "ben@example.org" && m.headers["List-Unsubscribe"].includes("unsubscribe"));
delete process.env.SMTP_HOST;
ok("no email provider: skipped quietly", (await sendEmail({ to: "a@b.c", subject: "x", html: "x", text: "x" })).skipped === true);

console.log(fails ? fails + " failures of " + n : "API: all " + n + " checks passed");
process.exit(fails ? 1 : 0);
