// Exercises every API route against the in-memory Supabase, with Anthropic and Resend stubbed.
import "./fake-supabase.js";

Object.assign(process.env, { SITE_URL: "https://benchwork.test", ANTHROPIC_API_KEY: "sk-test", RESEND_API_KEY: "re-test", CRON_SECRET: "cron-secret", TUTOR_DAILY_LIMIT: "3", EMAIL_FROM: "Benchwrk <hi@benchwork.test>" });
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
    else if (/marking one answer against the model answer/.test(sys)) text = JSON.stringify({ verdict: "Adequate", scores: { substance: 3, structure: 3, relevance: 4, credibility: 3, differentiation: 2 }, landed: ["Named the tool registry"], missing: ["Turn budget"], wrong_answer_hit: "", follow_up: "Why is a turn budget separate from the stop condition?" });
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
const load = async (f) => (await import("../server/" + f)).default;

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
ok("owner loads content", r.status === 200 && r.json.loaded === 33 && sb.tables.docs.filter((d) => d.parent === "content").length === 18 && sb.tables.docs.filter((d) => d.parent === "lessons").length === 15);
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

const { streakEmail, comebackEmail } = await import("../server/cron/daily.js");
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

// ---- reminders: rules and copy ----
const { situation, dueSlot, pickCopy, remindOf } = await import("../server/_nudge.js");
const at = (iso) => new Date(iso);
const mem = (remind, log, extra = {}) => Object.assign({ profile: { id: "u1" }, prefs: {}, state: { account: { name: "Z", created: "2026-10-01" }, hpw: 10, log, remind }, summary: { streak: 0, cur: "SQL basics" }, partnerSummary: null }, extra);
const slotAt = (m, iso) => dueSlot(situation(m, at(iso)));
ok("no reminder level means gentle", remindOf({}).level === "gentle" && slotAt(mem(undefined, [{ d: "2026-11-01", h: 1 }]), "2026-11-11T19:30:00Z") === null);
const rel = mem({ level: "relentless", tz: "Europe/London" }, [{ d: "2026-11-10", h: 1 }]);
ok("relentless: lunchtime the day after skipping", slotAt(rel, "2026-11-11T12:30:00Z") === "noon");
ok("relentless: evening too", slotAt(rel, "2026-11-11T19:05:00Z") === "eve");
ok("nothing before 8am", slotAt(rel, "2026-11-11T07:30:00Z") === null);
ok("nothing after 9pm", slotAt(rel, "2026-11-11T21:10:00Z") === null);
ok("nothing once you've studied today", slotAt(mem({ level: "relentless" }, [{ d: "2026-11-11", h: 1 }]), "2026-11-11T19:30:00Z") === null);
ok("not on sign-up day", slotAt(mem({ level: "relentless" }, [], { state: { account: { created: "2026-11-11" }, hpw: 10, log: [], remind: { level: "relentless" } } }), "2026-11-11T19:30:00Z") === null);
const per1 = mem({ level: "persistent", hour: 18 }, [{ d: "2026-11-10", h: 1 }]);
ok("persistent: one skipped day is fine midweek", slotAt(per1, "2026-11-11T19:00:00Z") === null);
const per2 = mem({ level: "persistent", hour: 18 }, [{ d: "2026-11-09", h: 1 }]);
ok("persistent: two skipped days, evening only", slotAt(per2, "2026-11-11T18:20:00Z") === "eve" && slotAt(per2, "2026-11-11T13:00:00Z") === null && slotAt(per2, "2026-11-11T17:20:00Z") === null);
const risk = mem({ level: "persistent" }, [{ d: "2026-11-11", h: 2 }], { summary: { streak: 3, cur: "SQL basics" } });
let s = situation(risk, at("2026-11-12T19:30:00Z"));
ok("persistent: streak at risk on Thursday", s.atRisk && s.left === 4 && dueSlot(s) === "eve");
let c = pickCopy(s, "eve", "seed");
ok("streak copy uses real numbers", /streak|weeks/i.test(c.title + c.body) && /4 hours|3-week|3 weeks/.test(c.title + c.body));
s = situation(risk, at("2026-11-15T19:30:00Z"));
c = pickCopy(s, "eve", "seed");
ok("Sunday is last call", /Last call|ends tonight/.test(c.title));
const gone = mem({ level: "relentless" }, [{ d: "2026-10-20", h: 1 }]);
ok("after 14 quiet days: Sundays only", slotAt(gone, "2026-11-11T19:30:00Z") === null && slotAt(gone, "2026-11-15T19:30:00Z") === "eve" && pickCopy(situation(gone, at("2026-11-15T19:30:00Z")), "eve", "x").title === "We'll keep this short");
ok("gives up after 60 days", slotAt(mem({ level: "relentless" }, [{ d: "2026-08-01", h: 1 }]), "2026-11-15T19:30:00Z") === null);
const d5 = situation(mem({ level: "relentless" }, [{ d: "2026-11-06", h: 1 }]), at("2026-11-11T12:30:00Z"));
ok("day five escalates", d5.quiet === 5 && ["These reminders don't seem to be working", "5 days. We're starting to worry"].indexOf(pickCopy(d5, "noon", "a").title) >= 0);
const ny = mem({ level: "persistent", hour: 18, tz: "America/New_York" }, [{ d: "2026-11-08", h: 1 }]);
ok("uses the member's time zone", slotAt(ny, "2026-11-11T23:30:00Z") === "eve" && slotAt(ny, "2026-11-11T15:00:00Z") === null);
ok("bad time zone falls back to London", situation(mem({ level: "persistent", tz: "Mars/Olympus" }, []), at("2026-11-11T12:00:00Z")).L.hour === 12);
let style = true;
for (const q of [1, 2, 3, 5, 8, 20]) for (const seed of ["a", "b", "c", "d", "e", "f"]) { const x = pickCopy({ atRisk: q === 3, sunday: false, quiet: q, weeks: 2, left: 1, have: 2, need: 6, cur: "SQL", partner: { name: "Ben", hours: 5 } }, "eve", seed); if (/—|\{|\}|undefined/.test(x.title + x.body)) style = false; }
ok("copy fills every blank and has no dashes", style);

// ---- push devices ----
const pushCalls = [];
globalThis.__testPush = { fail: 0, async sendNotification(sub, payload) { pushCalls.push({ sub, payload: JSON.parse(payload) }); if (this.fail) throw Object.assign(new Error("gone"), { statusCode: this.fail }); } };
const push = await load("push.js");
const SUB = { endpoint: "https://fcm.googleapis.com/fcm/send/abc123", keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } };
ok("push needs sign-in", (await call(push, { body: { action: "status" } })).status === 401);
ok("push rejects a bad device", (await call(push, { token: T.amira, body: { action: "subscribe", subscription: { endpoint: "http://insecure/x", keys: SUB.keys } } })).status === 400);
ok("push saves a device", (await call(push, { token: T.amira, body: { action: "subscribe", subscription: SUB } })).json.ok === true);
await call(push, { token: T.amira, body: { action: "subscribe", subscription: SUB } });
r = await call(push, { token: T.amira, body: { action: "status" } });
ok("same device saved once", r.json.devices === 1 && r.json.ready === true);
r = await call(push, { token: T.amira, body: { action: "test" } });
ok("test notification sent", r.json.sent === 1 && pushCalls[0].payload.title === "Notifications are on" && pushCalls[0].sub.keys.auth === SUB.keys.auth);
ok("other members can't see your devices", (await call(push, { token: T.ben, body: { action: "status" } })).json.devices === 0);

// ---- reminder cron ----
const nudgeCron = await load("cron/nudge.js");
ok("nudge cron needs secret", (await call(nudgeCron, { method: "GET" })).status === 401);
const cron = () => call(nudgeCron, { method: "GET", headers: { authorization: "Bearer cron-secret" } });
sb._doc("data/users/" + amira.id + "/state", { account: { name: "Amira", created: "2026-10-01" }, hpw: 10, log: [{ d: "2026-11-09", h: 2 }], remind: { level: "persistent", hour: 19, tz: "Europe/London" } });
await new Promise((res) => setTimeout(res, 10));
globalThis.__testNow = "2026-11-12T19:30:00Z";
pushCalls.length = 0;
r = await cron();
ok("nudge pushes when the streak is at risk", r.json.due === 1 && r.json.pushed === 1 && pushCalls.length === 1 && /streak|weeks/i.test(pushCalls[0].payload.title + pushCalls[0].payload.body) && pushCalls[0].payload.url.endsWith("/#home"));
ok("nudge not repeated in the same slot", (await cron()).json.due === 0);
globalThis.__testNow = "2026-11-12T20:30:00Z";
ok("persistent: one a day", (await cron()).json.due === 0);
sb._doc("data/users/" + amira.id + "/state", { account: { name: "Amira", created: "2026-10-01" }, hpw: 10, log: [{ d: "2026-11-09", h: 2 }], remind: { level: "relentless", hour: 19, tz: "Europe/London" } });
await new Promise((res) => setTimeout(res, 10));
globalThis.__testNow = "2026-11-13T12:10:00Z";
globalThis.__testPush.fail = 410;
const sentBefore = sent.length;
r = await cron();
ok("dead device forgotten, falls back to email", r.json.emailed === 1 && !sb.tables.push_subs.some((x) => x.user_id === amira.id) && sent[sentBefore].to[0] === "amira@example.org" && /Settings/.test(sent[sentBefore].html) && sent[sentBefore].html.includes("unsubscribe"));
globalThis.__testNow = "2026-11-13T19:30:00Z";
r = await cron();
ok("relentless: second slot, but only one email a day", r.json.due === 1 && r.json.emailed === 0 && sent.length === sentBefore + 1);
sb._doc("data/users/" + amira.id + "/state", { account: { name: "Amira", created: "2026-10-01" }, hpw: 10, log: [{ d: "2026-11-14", h: 1 }, { d: "2026-11-09", h: 2 }], remind: { level: "relentless", hour: 19, tz: "Europe/London" } });
await new Promise((res) => setTimeout(res, 10));
globalThis.__testNow = "2026-11-14T19:30:00Z";
ok("quiet once you've logged today", (await cron()).json.due === 0);
r = await call(daily, { method: "GET", headers: { authorization: "Bearer cron-secret" } });
ok("daily cron leaves relentless members to the nudge cron", r.json.streak === 0 && r.json.comeback === 0);
delete globalThis.__testNow; delete globalThis.__testPush;

// ---- leagues ----
{
  const { rollLeagues, addNewcomers, weekXp, leagueSpot, zoneSize, GROUP_MAX } = await import("../server/_league.js");
  const W1 = "2026-11-02", W2 = "2026-11-09";
  const S = {};
  for (let i = 0; i < 10; i++) S["u" + i] = { name: "M" + i, at: "2026-11-08", wk: W1, wxp: i * 10 };
  S.quiet = { name: "Q", at: "2026-09-01", wk: W1, wxp: 0 };
  S.out = { name: "O", at: "2026-11-08", wk: W1, wxp: 999, lg: false };
  let L = rollLeagues(null, S, W1, "2026-11-08");
  ok("first week: active members join Bronze", Object.keys(L.group).length === 10 && Object.values(L.tier).every((t) => t === 0) && !L.group.quiet && !L.group.out);
  ok("zone size", zoneSize(10) === 2 && zoneSize(3) === 1 && zoneSize(1) === 0 && zoneSize(20) === 4);
  const spot = leagueSpot(L, S, "u8");
  ok("standing this week", spot.rank === 2 && spot.n === 10 && spot.zone === "up" && spot.tier === "Bronze");
  ok("standing outside the zone shows the gap", leagueSpot(L, S, "u5").gapUp === 31);
  // Members who've already rolled into week 2 keep last week's XP in lw.
  S.u9 = { name: "M9", at: "2026-11-09", wk: W2, wxp: 5, lw: { wk: W1, xp: 90 } };
  ok("last week's XP read from lw", weekXp(S.u9, W1) === 90 && weekXp(S.u9, W2) === 5 && weekXp(S.u0, W2) === 0);
  S.u0.wxp = 0;
  const L2 = rollLeagues(L, S, W2, "2026-11-09");
  ok("top two promoted to Silver", L2.tier.u9 === 1 && L2.tier.u8 === 1 && L2.tier.u7 === 0 && L2.last.u9.rank === 1 && L2.last.u9.to === 1);
  ok("nobody drops below Bronze", L2.tier.u0 === 0 && L2.last.u0.from === 0);
  ok("new week groups by tier", L2.group.u9.startsWith("1-") && L2.group.u7.startsWith("0-") && L2.wk === W2);
  // Silver week: zero XP drops a league; the top tier can't go higher.
  const S3 = { a: { name: "A", at: "2026-11-15", wk: W2, wxp: 0 }, b: { name: "B", at: "2026-11-15", wk: W2, wxp: 50 } };
  const L3 = rollLeagues({ wk: W2, tier: { a: 1, b: 5 }, group: { a: "1-0", b: "5-0" } }, S3, "2026-11-16", "2026-11-16");
  ok("no XP all week drops a league; Diamond stays Diamond", L3.tier.a === 0 && L3.tier.b === 5);
  // Groups stay at 20 or fewer.
  const big = {}; for (let i = 0; i < 45; i++) big["b" + i] = { name: "B" + i, at: "2026-11-08", wk: W1, wxp: i };
  const LB = rollLeagues(null, big, W1, "2026-11-08"), sizes = {}; Object.values(LB.group).forEach((g) => { sizes[g] = (sizes[g] || 0) + 1; });
  ok("big pool split into even groups of at most 20", Object.keys(sizes).length === 3 && Object.values(sizes).every((n) => n <= GROUP_MAX && n >= 15));
  const LN = rollLeagues(null, { x: { name: "X", at: "2026-11-08" } }, W1, "2026-11-08");
  ok("newcomers join midweek", addNewcomers(LN, { x: { name: "X", at: "2026-11-08" }, y: { name: "Y", at: "2026-11-10" } }, "2026-11-10") && LN.group.y === LN.group.x && LN.tier.y === 0);
  // The route writes content/league once a week and adds newcomers in between.
  const lroute = await load("cron/league.js");
  ok("league cron needs secret", (await call(lroute, { method: "GET" })).status === 401);
  globalThis.__testNow = "2026-11-16T00:20:00Z";
  sb._doc("learners/" + ben.id, { name: "Ben", at: "2026-11-15", wk: "2026-11-09", wxp: 40 });
  await new Promise((res) => setTimeout(res, 10));
  r = await call(lroute, { method: "GET", headers: { authorization: "Bearer cron-secret" } });
  const doc = sb.tables.docs.find((d) => d.path === "content/league");
  ok("league settled and saved where members can read it", r.json.rolled === true && doc && doc.data.wk === "2026-11-16" && doc.data.group[ben.id]);
  r = await call(lroute, { method: "GET", headers: { authorization: "Bearer cron-secret" } });
  ok("second call in the same week changes nothing", r.json.rolled === false && r.json.changed === false);
  const { pickCopy } = await import("../server/_nudge.js");
  const lc = pickCopy({ atRisk: false, quiet: 2, weeks: 0, left: 0, have: 0, need: 6, cur: "SQL", L: { dow: 6 }, league: { tier: "Gold", rank: 9, n: 10, zone: "down", k: 2, gapUp: 40 } }, "eve", "s");
  ok("relegation reminder on Saturday", /Gold|Relegation/.test(lc.title + lc.body) && /9th of 10/.test(lc.body));
  delete globalThis.__testNow;
}

// ---- portfolio pages ----
{
  const pfr = await load("portfolio.js");
  sb.tables.portfolios.push({ user_id: amira.id, slug: "amira-k", published: true, hidden: false, headline: "Analyst <b>to</b> AI engineer", about: "Built things.", links: { github: "https://github.com/amira", linkedin: "javascript:alert(1)", web: "" }, show: { projects: true, reviews: true, certs: true, stats: true, index: false } });
  sb._doc("subs/" + amira.id, { name: "Amira", items: { m7: { repo: "https://github.com/amira/rag", demo: "javascript:x", note: "RAG over policies", at: "2026-11-01" }, m8: { repo: "ftp://nope" } } });
  sb._doc("reviews/" + ben.id, { name: "Ben", given: { [amira.id + ":m7"]: { s: [3, 2, 3, 2], c: "Clear README and honest numbers on recall.", at: "2026-11-02" } } });
  sb._doc("content/m7", { title: "RAG assistant: project 1" });
  sb._doc("learners/" + amira.id, { name: "Amira", lvl: 4, hours: 31.4, pct: 22, cur: "Python", streak: 3 });
  await new Promise((res) => setTimeout(res, 10));
  r = await call(pfr, { method: "GET", url: "/api/portfolio?slug=amira-k" });
  ok("portfolio page renders", r.status === 200 && r.text.includes("<h1>Amira</h1>") && r.text.includes("RAG assistant") && r.text.includes("2.5 / 3</b> from 1 peer review") && r.text.includes("Clear README"));
  ok("portfolio escapes text and drops unsafe links", r.text.includes("Analyst &lt;b&gt;to&lt;/b&gt;") && !r.text.includes("javascript:") && !r.text.includes("ftp://") && r.text.includes('href="https://github.com/amira"'));
  ok("portfolio hidden from search engines unless chosen", r.text.includes('name="robots" content="noindex"'));
  ok("bad slug is a 404", (await call(pfr, { method: "GET", url: "/api/portfolio?slug=../x" })).status === 404);
  const adm = await load("admin-moderate.js");
  ok("members can't hide portfolios", (await call(adm, { token: T.ben, body: { action: "hideportfolio", uid: amira.id } })).status === 403);
  await call(adm, { token: T.owner, body: { action: "hideportfolio", uid: amira.id } });
  ok("owner hides a portfolio", (await call(pfr, { method: "GET", url: "/api/portfolio?slug=amira-k" })).status === 404);
  await call(adm, { token: T.owner, body: { action: "showportfolio", uid: amira.id } });
  sb._doc("learners/" + amira.id, { name: "Amira", suspended: true });
  await new Promise((res) => setTimeout(res, 10));
  ok("suspended member's page is hidden", (await call(pfr, { method: "GET", url: "/api/portfolio?slug=amira-k" })).status === 404);
  sb._doc("learners/" + amira.id, { name: "Amira", lvl: 4 });
  sb.tables.portfolios[0].published = false;
  await new Promise((res) => setTimeout(res, 10));
  ok("unpublished page is a 404", (await call(pfr, { method: "GET", url: "/api/portfolio?slug=amira-k" })).status === 404);
  sb.tables.portfolios[0].published = true;
}

// ---- batching ----
{
  const { pool } = await import("../server/_lib.js");
  const seen = []; let busy = 0, peak = 0;
  const left = await pool([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3, async (x) => { busy++; peak = Math.max(peak, busy); await new Promise((r) => setTimeout(r, 5)); seen.push(x); busy--; }, 0);
  ok("pool runs everything, a few at a time", left === 0 && seen.length === 10 && peak === 3);
  const left2 = await pool(Array.from({ length: 50 }, (_, i) => i), 2, async () => { await new Promise((r) => setTimeout(r, 10)); }, 25);
  ok("pool stops at the time budget and reports what's left", left2 > 30 && left2 < 50);
}

// ---- backups ----
{
  const bk = await load("backup.js"), { decrypt } = await import("../server/_backup.js");
  ok("backup needs the cron secret", (await call(bk, { method: "GET" })).status === 401);
  r = await call(bk, { method: "GET", headers: { authorization: "Bearer cron-secret" } });
  ok("no BACKUP_KEY: skipped with a reason", /BACKUP_KEY/.test(r.json.skipped));
  ok("owner download refused without a key", (await call(bk, { token: T.owner, body: {} })).json.code === "no_key");
  ok("members can't download backups", (await call(bk, { token: T.ben, body: {} })).status === 403);
  process.env.BACKUP_KEY = "correct horse battery staple";
  const before = sent.length;
  r = await call(bk, { method: "GET", headers: { authorization: "Bearer cron-secret" } });
  const m = sent[before], att = m && m.attachments && m.attachments[0];
  ok("backup emailed to the owner as an attachment", r.json.sent === true && m.to[0] === "owner@example.org" && /\.bwbak$/.test(att.filename));
  const file = Buffer.from(att.content, "base64");
  ok("backup is encrypted", !file.toString("latin1").includes("amira@example.org") && file.subarray(0, 5).toString() === "BWBK1");
  const dump = decrypt(file, "correct horse battery staple");
  ok("backup holds every table and the account list", dump.tables.docs.length > 5 && dump.tables.profiles.some((x) => x.email === "amira@example.org") && dump.tables.portfolios.length === 1 && dump.users.some((u) => u.email === "ben@example.org"));
  let wrong = ""; try { decrypt(file, "wrong passphrase!!"); } catch (e) { wrong = e.message; }
  ok("wrong passphrase refused", /Wrong passphrase/.test(wrong));
  const tampered = Buffer.from(file); tampered[tampered.length - 3] ^= 1; let bad = ""; try { decrypt(tampered, "correct horse battery staple"); } catch (e) { bad = e.message; }
  ok("tampered file refused", /damaged|Wrong/.test(bad));
  delete process.env.BACKUP_KEY;
}

// ---- study schedule: reminders follow it, and the calendar feed ----
{
  const wk = { MO: { t: "07:00", m: 45 }, WE: { t: "18:30", m: 60 }, SA: { t: "10:00", m: 120 } };
  const sm = (log) => ({ profile: { id: "u1" }, prefs: {}, state: { account: { created: "2026-10-01" }, hpw: 4, log, remind: { level: "persistent", tz: "Europe/London" }, sched: { days: wk } }, summary: { streak: 0, cur: "SQL basics" }, partnerSummary: null });
  const s1 = situation(sm([{ d: "2026-11-10", h: 1 }]), new Date("2026-11-11T19:05:00Z"));
  ok("schedule: reminder after a missed session, at the session's hour", dueSlot(s1) === "eve" && dueSlot(situation(sm([{ d: "2026-11-10", h: 1 }]), new Date("2026-11-11T18:40:00Z"))) === null);
  ok("schedule: copy names the session time", /18:30/.test(JSON.stringify(pickCopy(s1, "eve", "a")) + JSON.stringify(pickCopy(s1, "eve", "b"))));
  ok("schedule: rest days stay quiet unless the streak is at risk", dueSlot(situation(sm([{ d: "2026-11-08", h: 1 }]), new Date("2026-11-10T19:30:00Z"))) === null);
  const { buildCalendar } = await import("../server/_ics.js");
  const ics = buildCalendar({ sched: { tz: "Europe/London", until: "2027-09-30", days: wk, ms: [["2026-12-07", "Start APIs, services; more"]] } }, { uid: "abc", site: "https://bw.test", now: new Date("2026-11-10T12:00:00Z") });
  ok("calendar: one weekly event per study day", (ics.match(/BEGIN:VEVENT/g) || []).length === 4 && /RRULE:FREQ=WEEKLY;BYDAY=WE;UNTIL=20270930T235959Z/.test(ics));
  ok("calendar: first Wednesday at 18:30 local, an hour long", /DTSTART;TZID=Europe\/London:20261111T183000\r\nDTEND;TZID=Europe\/London:20261111T193000/.test(ics));
  ok("calendar: Monday's first session is next week", /DTSTART;TZID=Europe\/London:20261116T070000/.test(ics));
  ok("calendar: course dates as all-day events, text escaped", /DTSTART;VALUE=DATE:20261207\r\nSUMMARY:Start APIs\\, services\\; more/.test(ics) && ics.endsWith("END:VCALENDAR\r\n"));
  ok("calendar: lines folded at 75", ics.split("\r\n").every((l) => l.length <= 75));
  const prof = sb.tables.profiles.find((x) => x.id === amira.id); prof.cal_token = "11111111-2222-4333-8444-555555555555";
  sb._doc("data/users/" + amira.id + "/state", { sched: { tz: "Europe/London", days: wk } });
  await new Promise((res) => setTimeout(res, 10));
  const calR = await load("cal.js"), linkR = await load("cal-link.js");
  r = await call(calR, { method: "GET", url: "/api/cal?t=" + prof.cal_token + ".ics" });
  ok("calendar feed served by private link", r.status === 200 && /BYDAY=SA/.test(r.text) && /text\/calendar/.test(r.headers["content-type"]));
  ok("unknown link refused", (await call(calR, { method: "GET", url: "/api/cal?t=99999999-2222-4333-8444-555555555555" })).status === 404 && (await call(calR, { method: "GET", url: "/api/cal?t=../x" })).status === 404);
  ok("calendar link needs sign-in", (await call(linkR, { body: {} })).status === 401);
  r = await call(linkR, { token: T.amira, body: {} });
  ok("member gets their link", r.json.url.endsWith("/cal/" + prof.cal_token + ".ics"));
  const old = prof.cal_token;
  r = await call(linkR, { token: T.amira, body: { rotate: true } });
  ok("new link replaces the old one", !r.json.url.includes(old) && (await call(calR, { method: "GET", url: "/api/cal?t=" + old })).status === 404);
}

// ---- the single entry point (Vercel's free plan allows 12 functions) ----
{
  const fs = await import("node:fs"), path = await import("node:path");
  const idx = await import("../api/index.js"), src = fs.readFileSync(new URL("../api/index.js", import.meta.url), "utf8");
  const files = [];
  const walk = (d, pre) => { for (const f of fs.readdirSync(d)) { const full = path.join(d, f); if (fs.statSync(full).isDirectory()) walk(full, pre + f + "/"); else if (f.endsWith(".js") && !f.startsWith("_")) files.push(pre + f.replace(/\.js$/, "")); } };
  walk(new URL("../server", import.meta.url).pathname, "");
  ok("every server route is reachable", files.every((f) => src.includes('"../server/' + f + '.js"')) && fs.readdirSync(new URL("../api", import.meta.url).pathname).length === 1);
  ok("route from rewrite or path", idx.routeOf({ query: { r: "cron/nudge" } }) === "cron/nudge" && idx.routeOf({ query: { r: ["cron", "weekly"] } }) === "cron/weekly" && idx.routeOf({ url: "/api/tutor?x=1" }) === "tutor");
  r = await call(idx.default, { url: "/api/nope" });
  ok("unknown route is a 404", r.status === 404);
  r = await call(idx.default, { url: "/api/health", method: "GET" });
  ok("routes through to the handler", r.status !== 404);
}

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
r = await call(iv, { token: T.ben, body: { mode: "score", job: JOB, setup: SETUP, transcript: [{ role: "interviewer", kind: "question", n: 1, text: "Q1" }, { role: "candidate", text: "um I built it", dl: { s: 95, wpm: 152, f: 3 } }, { role: "candidate", text: "x", dl: { s: "<script>", wpm: 1, f: 1 } }], self: {} } });
last = ivCalls[ivCalls.length - 1];
ok("spoken answers carry delivery into the scoring prompt", /CANDIDATE \[spoken 1:35, 152 wpm, 3 fillers\]/.test(last.messages[0].content) && /transcribed by the browser/.test(last.system) && !/<script>/.test(last.messages[0].content));
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
r = await call(iv, { token: T.owner, body: { mode: "card", question: { title: "What makes a loop an agent", prompt: "Name the parts.", short: "Five parts.", full: "Buffer, registry, stop, budget, formatter.", followups: "", wrong: "A long prompt.", level: 1 }, answer: "It needs a tool registry, a message buffer and a way to stop the loop when done." } });
ok("bank answer marked against the model answer", r.status === 200 && r.json.verdict === "Adequate" && /<model_answer>/.test(ivCalls[ivCalls.length - 1].messages[0].content) && /level 1 question/.test(ivCalls[ivCalls.length - 1].system));
ok("bank answer too short refused", (await call(iv, { token: T.owner, body: { mode: "card", question: { title: "t", prompt: "p", short: "", full: "" }, answer: "short" } })).status === 400);
await call(iv, { token: T.owner, body: { mode: "ask", job: JOB, setup: SETUP, transcript: [], bank: [{ title: "Explain RAG", prompt: "Walk me through a RAG pipeline.", short: "Retrieve then generate." }] } });
ok("mock interview draws on bank questions", /Real interview questions you may draw on/.test(ivCalls[ivCalls.length - 1].system) && /Walk me through a RAG pipeline/.test(ivCalls[ivCalls.length - 1].system));
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
const { withErrors } = await import("../server/_lib.js");
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
ok("health runs every check", r.status === 200 && r.json.checks.length === 9 && r.json.checks.find((c) => c.name === "Backups").warn && r.json.checks.find((c) => c.name === "Database").ok && r.json.checks.find((c) => c.name === "Site address").ok);
ok("health flags missing captcha as optional", r.json.checks.find((c) => c.name === "Sign-up protection").warn === true);
r = await call(health, { token: T.owner, body: { test: "email" } });
ok("test email", r.status === 200 && sent[sent.length - 1].subject === "Benchwrk test email");

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
const { extractJob, htmlToText } = await import("../server/_html.js");
ok("plain page fallback", /Role/.test(extractJob("<html><head><title>AI role</title></head><body><nav>x</nav><main><h1>Role</h1><p>Do things &amp; stuff</p></main></body></html>").text) && htmlToText("a&nbsp;b &#8212; c") === "a b - c");

// ---- SMTP instead of Resend ----
delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM; process.env.SMTP_HOST = "json"; process.env.SMTP_USER = "benchwork.app@gmail.com"; globalThis.__smtpSent = [];
const { sendEmail } = await import("../server/_lib.js");
await sendEmail({ to: "ben@example.org", subject: "Hello", html: "<p>Hi</p>", text: "Hi", unsubscribe: "https://benchwork.test/api/unsubscribe?t=x&k=weekly" });
const m = JSON.parse(globalThis.__smtpSent[0].message);
ok("SMTP sends from the Gmail account", m.from.address === "benchwork.app@gmail.com" && m.to[0].address === "ben@example.org" && m.headers["List-Unsubscribe"].includes("unsubscribe"));
delete process.env.SMTP_HOST;
ok("no email provider: skipped quietly", (await sendEmail({ to: "a@b.c", subject: "x", html: "x", text: "x" })).skipped === true);

console.log(fails ? fails + " failures of " + n : "API: all " + n + " checks passed");
process.exit(fails ? 1 : 0);
