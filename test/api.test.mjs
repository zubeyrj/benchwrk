// Exercises every API route against the in-memory Supabase, with Anthropic and Resend stubbed.
import "./fake-supabase.js";

Object.assign(process.env, { SITE_URL: "https://benchwork.test", ANTHROPIC_API_KEY: "sk-test", RESEND_API_KEY: "re-test", CRON_SECRET: "cron-secret", TUTOR_DAILY_LIMIT: "3", EMAIL_FROM: "Benchwork <hi@benchwork.test>" });
const sb = globalThis.makeFakeSupabase({ ownerEmail: "owner@example.org" });
globalThis.__testAdminClient = sb;

let fails = 0, n = 0;
const ok = (name, cond) => { n++; if (!cond) { fails++; console.log("FAIL", name); } };

// ---- stubs for outside services ----
const sent = [];
let anthropicCalls = [], anthropicMode = "ok"; const ivCalls = [], adzunaUrls = [];
globalThis.__testLookup = async (host) => (host === "evil.example.com" ? [{ address: "10.0.0.5" }] : [{ address: "93.184.216.34" }]);
globalThis.fetch = async (url, init) => {
  if (String(url).includes("api.resend.com")) { sent.push(JSON.parse(init.body)); return new Response(JSON.stringify({ id: "em_" + sent.length }), { status: 200 }); }
  if (String(url).includes("api.anthropic.com") && !JSON.parse(init.body).stream) {
    const b = JSON.parse(init.body); ivCalls.push(b);
    if (anthropicMode === "busy") return new Response("{}", { status: 529 });
    const sys = b.system || "", usage = { input_tokens: 1000, output_tokens: 200 };
    let text;
    if (/decoding a job/.test(sys)) text = anthropicMode === "notjob" ? '{"is_job":false}' : 'Here you go:\n```json\n' + JSON.stringify({ is_job: true, title: "AI Engineer", company: "Acme", seniority: "early", summary: "Build RAG features.", competencies: [{ name: "RAG", why: "core of the role", quote: "build retrieval pipelines" }], must_haves: ["Python"], nice_to_haves: ["AWS"], fit: { verdict: "Investable Stretch", confidence: "Medium", signals: ["Shipped a RAG project"], frameable_gaps: ["No commercial AI work"], structural_gaps: [] }, likely_rounds: [{ format: "technical", why: "they list a take-home" }], prep: [{ action: "Finish evals", course: "Evaluating LLM apps" }], red_flags: [] }) + "\n```";
    else if (/interviewer for this job/.test(sys)) text = anthropicMode === "badtag" ? "Tell me about yourself." : "[[QUESTION 1]]\nHello, I'm the hiring manager. Walk me through your RAG project.";
    else if (/CV coach/.test(sys)) text = JSON.stringify({ overall: "Needs work", ats: "Ready", recruiter_scan: "Analyst moving into AI", strengths: ["SQL"], top_fixes: ["Add numbers"], summary_rewrite: "Data analyst...", bullets: [{ before: "Did reports", after: "Built 12 reports [add a number]", why: "Specific" }], missing_keywords: ["RAG"], transition_note: "Frame analytics as data work" });
    else if (/tell me about yourself/.test(sys)) text = JSON.stringify({ hook: "I turn messy data into decisions.", short: "s", medium: "m", long: "l", differentiator: "d", avoid: ["a"], follow_ups: ["f"] });
    else if (/debriefing a REAL interview/.test(sys)) text = JSON.stringify({ summary: "Went fine", confidence: "Medium", scores: { substance: 3, structure: 3, relevance: 4, credibility: 3, differentiation: 2 }, signals: ["Asked follow-ups"], questions: [{ question: "Tell me about RAG", competency: "RAG", landed: "x", gap: "y", stronger_answer: "z" }], patterns: [], next_round_prep: ["Prepare evals"], thank_you: "Thanks for...", stories_to_add: [] });
    else if (/which of several job adverts/.test(sys)) text = JSON.stringify({ ranking: [{ id: "a", rank: 1, verdict: "Strong Fit", why: "w", prep_effort: "Low", first_step: "f" }, { id: "b", rank: 2, verdict: "Weak Fit", why: "w", prep_effort: "High", first_step: "f" }], recommendation: "Start with a", skip: [] });
    else if (/scoring a mock interview/.test(sys)) text = JSON.stringify({ band: "Early career", confidence: "Medium", hire_signal: "Mixed", scores: { substance: 3, structure: 3.5, relevance: 4, credibility: 2.5, differentiation: 2 }, self_delta: "over", questions: [{ n: 1, question: "q", heard: "h", scores: { substance: 3, structure: 3.5, relevance: 4, credibility: 2.5, differentiation: 2 }, note: "n", stronger_answer: "s" }] });
    return new Response(JSON.stringify({ content: [{ type: "text", text }], usage }), { status: 200 });
  }
  if (String(url).includes("remotive.com")) return new Response(JSON.stringify({ jobs: [{ id: 7, title: "Senior AI Engineer", company_name: "Remote Co", candidate_required_location: "UK", salary: "", publication_date: "2026-11-08T10:00:00", url: "https://remotive.com/j/7", description: "<p>Build <b>LLM</b> apps &amp; evals.</p>" + "<p>More detail.</p>".repeat(30) }, { id: 8, title: "Office Manager", company_name: "X", url: "https://remotive.com/j/8", description: "<p>no</p>" }] }), { status: 200 });
  if (String(url).includes("arbeitnow.com")) return new Response("{}", { status: 500 });
  if (String(url).includes("api.adzuna.com")) { adzunaUrls.push(String(url)); return new Response(JSON.stringify({ results: [{ id: "123", title: "<strong>AI</strong> Engineer", company: { display_name: "Acme" }, location: { display_name: "London" }, salary_min: 55000, salary_max: 70000, created: "2026-11-09T09:00:00Z", redirect_url: "https://www.adzuna.co.uk/jobs/land/ad/123", description: "Build RAG..." }, { id: "124", title: "Senior AI Engineer", company: { display_name: "Remote Co" }, location: { display_name: "London" }, created: "2026-11-01T09:00:00Z", redirect_url: "https://x", description: "dup" }] }), { status: 200 }); }
  if (String(url).startsWith("https://careers.example.com/")) {
    const u = new URL(String(url));
    if (u.pathname === "/hop") return new Response("", { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } });
    if (u.pathname === "/pdf") return new Response("%PDF", { status: 200, headers: { "content-type": "application/pdf" } });
    const ld = { "@context": "https://schema.org", "@graph": [{ "@type": "Organization" }, { "@type": "JobPosting", title: "Applied AI Engineer", hiringOrganization: { "@type": "Organization", name: "Example Ltd" }, jobLocation: { address: { addressLocality: "Birmingham", addressCountry: "GB" } }, description: "<h2>About</h2><p>You will build RAG &amp; agents.</p><ul><li>Python</li><li>Evals</li></ul>" + "<p>We value curiosity and shipping.</p>".repeat(12) }] };
    return new Response('<html><head><title>Job</title><script type="application/ld+json">' + JSON.stringify(ld) + "</script></head><body><nav>menu</nav><main>ignored</main></body></html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }
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
ok("tutor records usage", sb.tables.ai_usage.find((u) => u.user_id === amira.id && u.kind === "tutor").in_tokens === 120 && sb.tables.ai_usage.find((u) => u.user_id === amira.id && u.kind === "tutor").out_tokens === 9);
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
ok("export includes tutor usage", r.json.ai_usage.length === 1);

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
sb.tables.email_log = sb.tables.email_log.filter((l) => l.kind !== "partner");
sb._doc("data/users/" + ben.id + "/state", { account: { name: "Ben" }, blocked: [amira.id] }); await new Promise((r2) => setTimeout(r2, 5));
r = await call(nudge, { token: T.amira, body: { to: ben.id, kind: "cheer" } });
ok("blocked member can't email you", r.json.emailed === false);
sb._doc("data/users/" + ben.id + "/state", { account: { name: "Ben" }, blocked: [] }); await new Promise((r2) => setTimeout(r2, 5));

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
sb.tables.errors.push({ id: 999, at: "2026-01-01T00:00:00Z", source: "client", message: "old", fingerprint: "o" });
await call(daily, { method: "GET", headers: { authorization: "Bearer cron-secret" } });
ok("errors older than 90 days deleted", !sb.tables.errors.some((e) => e.id === 999));

// ---- delete ----
const del = await load("me-delete.js");
ok("delete needs confirmation", (await call(del, { token: T.amira, body: {} })).status === 400);
ok("owner can't delete themselves", (await call(del, { token: T.owner, body: { confirm: "DELETE" } })).json.code === "owner");
r = await call(del, { token: T.amira, body: { confirm: "DELETE" } });
ok("member deletes account", r.status === 200 && !sb.users[amira.id] && !sb.tables.docs.some((d) => d.path.includes(amira.id)) && !sb.tables.profiles.some((p) => p.id === amira.id) && !sb.tables.certs.some((c) => c.user_id === amira.id));
ok("others untouched", sb.tables.docs.some((d) => d.path === "learners/" + ben.id) && !!sb.users[ben.id]);
ok("deleted token stops working", (await call(exp, { method: "GET", token: T.amira })).status === 401);

// ---- interviewer ----
const iv = await load("interviewer.js");
const JOB = { title: "AI Engineer", company: "Acme", text: "We are hiring an AI engineer to build retrieval pipelines, evals and LLM features in Python. You will own features end to end." };
const SETUP = { format: "technical", count: 5, band: "early", directness: 3 };
ok("interviewer needs sign-in", (await call(iv, { body: { mode: "decode", job: JOB } })).status === 401);
ok("interviewer rejects tiny job text", (await call(iv, { token: T.ben, body: { mode: "decode", job: { text: "hi" } } })).status === 400);
r = await call(iv, { token: T.ben, body: { mode: "decode", job: JOB, profile: { name: "Ben" }, courses: ["Evaluating LLM apps"] } });
ok("decode returns parsed JSON from a fenced reply", r.status === 200 && r.json.fit.verdict === "Investable Stretch" && r.json.competencies[0].name === "RAG");
ok("decode prompt carries job, profile and courses", /<job title="AI Engineer" company="Acme">/.test(ivCalls[0].messages[0].content) && /"name": "Ben"/.test(ivCalls[0].messages[0].content) && /Evaluating LLM apps/.test(ivCalls[0].messages[0].content));
ok("decode uses the interview model", ivCalls[0].model === "claude-sonnet-5-5");
anthropicMode = "notjob";
ok("non-job text refused", (await call(iv, { token: T.ben, body: { mode: "decode", job: JOB } })).json.code === "not_job");
anthropicMode = "ok";
r = await call(iv, { token: T.ben, body: { mode: "ask", job: JOB, setup: SETUP, transcript: [] } });
ok("first turn is question 1", r.status === 200 && r.json.kind === "question" && r.json.n === 1 && /RAG project/.test(r.json.text) && !/\[\[/.test(r.json.text));
let last = ivCalls[ivCalls.length - 1];
ok("ask prompt: only QUESTION 1 allowed at start", /\[\[QUESTION 1\]\]/.test(last.system) && !/FOLLOWUP\]\]/.test(last.system.split("Start your reply")[1]));
const tr = [{ role: "interviewer", kind: "question", n: 1, text: "Q1" }, { role: "candidate", text: "A1" }, { role: "interviewer", kind: "followup", text: "F1" }, { role: "candidate", text: "A1b" }];
await call(iv, { token: T.ben, body: { mode: "ask", job: JOB, setup: SETUP, transcript: tr } });
last = ivCalls[ivCalls.length - 1];
ok("after a follow-up only the next question is allowed", /\[\[QUESTION 2\]\]/.test(last.system.split("Start your reply")[1]) && !/FOLLOWUP/.test(last.system.split("Start your reply")[1]));
ok("transcript replayed as turns", last.messages.length === 5 && last.messages[1].role === "assistant" && /\[\[FOLLOWUP\]\]/.test(last.messages[3].content) && last.messages[4].content === "A1b");
anthropicMode = "badtag";
const tr5 = []; for (let i = 1; i <= 5; i++) tr5.push({ role: "interviewer", kind: "question", n: i, text: "Q" + i }, { role: "candidate", text: "A" + i });
r = await call(iv, { token: T.ben, body: { mode: "ask", job: JOB, setup: SETUP, transcript: tr5 } });
ok("untagged reply after the last question becomes END", r.json.kind === "end");
anthropicMode = "ok";
ok("ask validates setup", (await call(iv, { token: T.ben, body: { mode: "ask", job: JOB, setup: { format: "x", count: 5, band: "early", directness: 3 }, transcript: [] } })).status === 400);
ok("score needs an answer", (await call(iv, { token: T.ben, body: { mode: "score", job: JOB, setup: SETUP, transcript: [{ role: "interviewer", kind: "question", n: 1, text: "Q1" }] } })).status === 400);
r = await call(iv, { token: T.ben, body: { mode: "score", job: JOB, setup: Object.assign({}, SETUP, { directness: 5 }), transcript: tr, self: { best: 1, worst: 1, rating: 4, note: "ok" } } });
last = ivCalls[ivCalls.length - 1];
ok("score returns the scorecard", r.status === 200 && r.json.hire_signal === "Mixed" && r.json.scores.differentiation === 2);
ok("score prompt: rubric, band, directness, self-assessment", /Differentiation: 1 generic/.test(last.system) && /Early career/.test(last.system) && /Directness 5/.test(last.system) && /Self-rating overall: 4/.test(last.messages[0].content) && /scope_note/.test(last.system));
ok("interview usage tracked separately", sb.tables.ai_usage.some((u) => u.user_id === ben.id && u.kind === "interview" && u.calls >= 6));
process.env.INTERVIEW_DAILY_CALLS = "2";
ok("interview daily allowance", (await call(iv, { token: T.ben, body: { mode: "decode", job: JOB } })).json.code === "daily_cap");
delete process.env.INTERVIEW_DAILY_CALLS;

// ---- career tools ----
const CV = ("Data analyst with four years in retail analytics. Built SQL pipelines and Power BI dashboards. ").repeat(8);
r = await call(iv, { token: T.owner, body: { mode: "cv", cv: CV, job: JOB } });
ok("CV review", r.status === 200 && r.json.bullets[0].after.includes("[add a number]") && /<cv>/.test(ivCalls[ivCalls.length - 1].messages[0].content) && /<job /.test(ivCalls[ivCalls.length - 1].messages[0].content));
ok("CV too short refused", (await call(iv, { token: T.owner, body: { mode: "cv", cv: "short cv" } })).status === 400);
r = await call(iv, { token: T.owner, body: { mode: "cv", cv: CV } });
ok("CV review without a job", r.status === 200 && !/<job /.test(ivCalls[ivCalls.length - 1].messages[0].content));
r = await call(iv, { token: T.owner, body: { mode: "pitch", answers: { past: "Four years as a data analyst in retail.", why: "I built a chatbot and loved it." }, audience: "recruiter" } });
ok("pitch", r.status === 200 && r.json.hook && /recruiter on a first call/.test(ivCalls[ivCalls.length - 1].system));
ok("pitch needs an answer", (await call(iv, { token: T.owner, body: { mode: "pitch", answers: { past: "" } } })).status === 400);
r = await call(iv, { token: T.owner, body: { mode: "debrief", notes: "Q: Tell me about RAG. Me: talked about my demo but forgot numbers. Q: Why us? Me: rambled a bit about the mission and the team.", round: "Technical", feeling: "rushed" } });
ok("debrief", r.status === 200 && r.json.thank_you && /round="Technical"/.test(ivCalls[ivCalls.length - 1].messages[0].content));
ok("debrief needs notes", (await call(iv, { token: T.owner, body: { mode: "debrief", notes: "too short" } })).status === 400);
r = await call(iv, { token: T.owner, body: { mode: "compare", jobs: [Object.assign({ id: "a" }, JOB), Object.assign({ id: "b" }, JOB, { title: "ML Ops" })] } });
ok("compare", r.status === 200 && r.json.ranking.length === 2 && /<job id="b" title="ML Ops"/.test(ivCalls[ivCalls.length - 1].messages[0].content));
ok("compare needs 2 to 5", (await call(iv, { token: T.owner, body: { mode: "compare", jobs: [Object.assign({ id: "a" }, JOB)] } })).status === 400);
ok("unknown mode refused", (await call(iv, { token: T.owner, body: { mode: "chat", job: JOB } })).status === 400);

// ---- errors, moderation, health ----
const rep = await load("report-error.js");
r = await call(rep, { body: { message: "TypeError: x is undefined", url: "https://benchwork.test/#home" }, headers: { "user-agent": "test" } });
ok("browser error recorded", r.status === 200 && sb.tables.errors.length === 1 && sb.tables.errors[0].source === "client");
const alerts = sent.filter((m) => /something went wrong/i.test(m.subject)).length;
ok("owner alerted by email", alerts === 1 && sent[sent.length - 1].to[0] === "owner@example.org");
await call(rep, { body: { message: "TypeError: x is undefined" } });
ok("same error not repeated within a minute", sb.tables.errors.length === 1);
await call(rep, { body: { message: "RangeError: other" } });
ok("second error recorded, no second email within the hour", sb.tables.errors.length === 2 && sent.filter((m) => /something went wrong/i.test(m.subject)).length === 1);
const { withErrors } = await import("../api/_lib.js");
r = await call(withErrors(async () => { throw new Error("boom in route"); }), { url: "/api/x" });
ok("server crash caught and recorded", r.status === 500 && /reported/.test(r.json.error) && sb.tables.errors.some((e) => e.source === "server" && e.message === "boom in route"));
const mod = await load("admin-moderate.js");
let banned = null; sb.auth.admin.updateUserById = async (id, o) => { banned = [id, o.ban_duration]; return { error: null }; };
ok("members can't suspend", (await call(mod, { token: T.ben, body: { action: "suspend", uid: owner.id } })).status === 403);
r = await call(mod, { token: T.owner, body: { action: "suspend", uid: ben.id } });
ok("owner suspends", r.status === 200 && banned[0] === ben.id && banned[1] === "876000h" && sb.tables.docs.find((d) => d.path === "learners/" + ben.id).data.suspended === true);
await call(mod, { token: T.owner, body: { action: "restore", uid: ben.id } });
ok("owner restores", banned[1] === "none" && sb.tables.docs.find((d) => d.path === "learners/" + ben.id).data.suspended === false);
ok("owner can't suspend self", (await call(mod, { token: T.owner, body: { action: "suspend", uid: owner.id } })).status === 400);
const health = await load("health.js");
ok("health is owner-only", (await call(health, { method: "GET", token: T.ben })).status === 403);
r = await call(health, { method: "GET", token: T.owner, headers: { host: "benchwork.test" } });
ok("health runs every check", r.status === 200 && r.json.checks.length === 8 && r.json.checks.find((c) => c.name === "Database").ok && r.json.checks.find((c) => c.name === "Site address").ok);
ok("health flags missing captcha as optional", r.json.checks.find((c) => c.name === "Sign-up protection").warn === true);
r = await call(health, { token: T.owner, body: { test: "email" } });
ok("test email", r.status === 200 && sent[sent.length - 1].subject === "Benchwork test email");

// ---- jobs ----
const jobs = await load("jobs.js");
ok("jobs need sign-in", (await call(jobs, { method: "GET", url: "/api/jobs?q=AI" })).status === 401);
r = await call(jobs, { method: "GET", token: T.ben, url: "/api/jobs?q=AI%20engineer&where=London" });
ok("free sources work without keys", r.status === 200 && r.json.jobs.length === 1 && r.json.jobs[0].source === "Remotive" && r.json.jobs[0].full && /LLM apps & evals/.test(r.json.jobs[0].text));
ok("off-topic jobs filtered", !r.json.jobs.some((j) => j.title === "Office Manager"));
ok("failed source reported, not fatal", r.json.sources.some((s) => s.name === "arbeitnow" && !s.ok) && !r.json.sources.some((s) => s.name === "adzuna"));
process.env.ADZUNA_APP_ID = "id"; process.env.ADZUNA_APP_KEY = "key";
r = await call(jobs, { method: "GET", token: T.ben, url: "/api/jobs?q=AI%20engineer&where=Birmingham" });
ok("Adzuna used when keys are set", adzunaUrls.length === 1 && /where=Birmingham/.test(adzunaUrls[0]) && r.json.jobs.some((j) => j.source === "Adzuna" && j.title === "AI Engineer" && j.salary === "£55k to £70k"));
ok("duplicates across sources removed", r.json.jobs.filter((j) => j.title === "Senior AI Engineer").length === 1);
ok("newest first", r.json.jobs[0].posted >= r.json.jobs[r.json.jobs.length - 1].posted);
await call(jobs, { method: "GET", token: T.ben, url: "/api/jobs?q=AI%20engineer&where=Birmingham" });
ok("results cached", adzunaUrls.length === 1);
delete process.env.ADZUNA_APP_ID; delete process.env.ADZUNA_APP_KEY;

// ---- job page reader ----
const jf = await load("job-fetch.js");
r = await call(jf, { token: T.ben, body: { url: "https://careers.example.com/jobs/42" } });
ok("reads JobPosting data from a careers page", r.status === 200 && r.json.title === "Applied AI Engineer" && r.json.company === "Example Ltd" && r.json.location === "Birmingham, GB" && /build RAG & agents/.test(r.json.text) && /• Python/.test(r.json.text) && r.json.structured);
ok("LinkedIn explained, not fetched", (await call(jf, { token: T.ben, body: { url: "https://www.linkedin.com/jobs/view/1" } })).json.code === "blocked_site");
ok("private IP blocked", (await call(jf, { token: T.ben, body: { url: "http://127.0.0.1/admin" } })).status === 422);
ok("metadata IP blocked", (await call(jf, { token: T.ben, body: { url: "http://169.254.169.254/" } })).status === 422);
ok("hostname resolving to private IP blocked", (await call(jf, { token: T.ben, body: { url: "https://evil.example.com/job" } })).status === 422);
ok("redirect to private IP blocked", (await call(jf, { token: T.ben, body: { url: "https://careers.example.com/hop" } })).status === 422);
ok("non-HTML refused", (await call(jf, { token: T.ben, body: { url: "https://careers.example.com/pdf" } })).status === 422);
ok("odd ports refused", (await call(jf, { token: T.ben, body: { url: "https://careers.example.com:8443/x" } })).status === 422);
ok("file URLs refused", (await call(jf, { token: T.ben, body: { url: "file:///etc/passwd" } })).status === 422);
const { extractJob, htmlToText } = await import("../api/_html.js");
ok("plain page fallback", /Role/.test(extractJob("<html><head><title>AI role</title></head><body><nav>x</nav><main><h1>Role</h1><p>Do things &amp; stuff</p></main></body></html>").text) && htmlToText("a&nbsp;b &#8212; c") === "a b - c");

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
