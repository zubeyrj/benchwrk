// Accessibility: runs axe-core (WCAG 2.2 A and AA rules) on every main page, light and dark, desktop and phone.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path"), http = require("http");
const PUB = path.join(__dirname, "..", "public");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const MOCK = fs.readFileSync(path.join(__dirname, "mock.cjs.js"), "utf8");
const seed = {};
for (const f of fs.readdirSync(path.join(__dirname, "../content/seed"))) seed[f.replace(".json", "")] = JSON.parse(fs.readFileSync(path.join(__dirname, "../content/seed", f), "utf8"));
for (const f of fs.readdirSync(path.join(__dirname, "../content/seedx"))) { const d = JSON.parse(fs.readFileSync(path.join(__dirname, "../content/seedx", f), "utf8")); seed["lessons/" + d.id] = d; }
seed["learners/u2"] = { name: "Amira", goal: "engineer", hours: 31, week: 9, pts: 640, streak: 2, pct: 18, cur: "Python for engineers", lvl: 3 };
seed["subs/u2"] = { name: "Amira", items: { m7: { repo: "https://github.com/example/rag", note: "Check it" } } };
seed["reviews/u2"] = { name: "Amira", given: { "u1:m7": { s: [3, 2, 2, 3], c: "Nice", at: "2026-11-08" } } };
const STATE = { account: { name: "Zara", created: "2026-11-01" }, tools: { python: 1, git: 1, terminal: 1, sql: 2, web: 1, cloud: 0, llm: 0, ml: 0 }, placement: { scores: { python: 33, sql: 100 }, at: "2026-11-01" }, hpw: 15, goal: "engineer", start: "2026-11-01", mods: {}, log: [{ d: "2026-11-09", h: 2, m: "m13" }], onboarded: "2026-11-01",
  iv: { jobs: [{ id: "j1", title: "AI Engineer", company: "Acme", text: "Build RAG in Python. ".repeat(20), source: "Pasted", at: "2026-11-09T10:00:00Z", decoded: { summary: "RAG work", competencies: [{ name: "RAG", why: "core" }], fit: { verdict: "Investable Stretch", confidence: "Medium", signals: ["x"], frameable_gaps: ["y"], structural_gaps: [] }, likely_rounds: [{ format: "technical", why: "z" }], must_haves: ["Python"], nice_to_haves: [] } }],
    sessions: [{ id: "s1", jobId: "j1", at: "2026-11-09T11:00:00Z", setup: { format: "technical", count: 4, band: "early", directness: 3 }, transcript: [{ role: "interviewer", kind: "question", n: 1, text: "Tell me about RAG." }, { role: "candidate", text: "I built one." }],
      score: { band: "Early career", confidence: "Medium", hire_signal: "Mixed", scores: { substance: 3, structure: 4, relevance: 4, credibility: 3, differentiation: 2 }, what_i_heard: "x", what_is_working: ["a"], gaps_to_close: ["b"], priority_move: "c", next_step: "d", questions: [{ n: 1, question: "q", heard: "h", scores: { substance: 3, structure: 4, relevance: 4, credibility: 3, differentiation: 2 }, note: "n", stronger_answer: "s" }], best_question: 1, weakest_question: 1 } }], stories: [{ id: "st1", title: "RAG demo", skill: "Ownership", s: "s", t: "t", a: "a", r: "r", e: "e" }] },
  apps: [{ id: "a1", company: "Acme", role: "AI Engineer", stage: "applied", jobId: "j1", next: { what: "Phone screen", date: "2026-12-01" } }], career: { debriefs: [] }, blocked: [], cohort: "" };
const PAGES = ["home", "log", "courses", "course-m13", "lesson-m13-0", "ex-m13-z1", "plan", "practice", "toolkit", "projects", "interview", "iv-new", "iv-job-j1", "iv-report-s1", "iv-stories", "applications", "career", "career-cv", "career-pitch", "career-debrief", "cohort", "settings", "admin"];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".txt": "text/plain", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(PUB, u === "/" ? "index.html" : u); if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader("content-type", TYPES[path.extname(f)] || "application/octet-stream"); fs.createReadStream(f).pipe(r); });

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const BASE = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await chromium.launch();
  const all = [];
  for (const [label, ctx] of [["light", { viewport: { width: 1366, height: 900 } }], ["dark", { viewport: { width: 1366, height: 900 }, colorScheme: "dark" }], ["phone", { viewport: { width: 390, height: 844 } }]]) {
    const p = await browser.newPage(ctx);
    await p.addInitScript(({ MOCK, seed, STATE }) => { eval(MOCK); window.__mock(seed, { state: STATE, owner: true }); }, { MOCK, seed, STATE });
    await p.goto(BASE + "#home"); await p.waitForTimeout(1200);
    for (const pg of label === "light" ? PAGES : ["home", "courses", "lesson-m13-0", "interview", "iv-report-s1", "applications", "cohort", "settings"]) {
      await p.evaluate((h) => { location.hash = h; }, pg); await p.waitForTimeout(500);
      await p.evaluate(AXE);
      const res = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] })).violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n").slice(1, 2).join("")) })));
      res.forEach((v) => all.push(Object.assign({ page: pg, mode: label }, v)));
    }
    await p.close();
  }
  await browser.close(); server.close();
  const bad = all.filter((v) => v.impact === "serious" || v.impact === "critical");
  all.forEach((v) => console.log((v.impact === "serious" || v.impact === "critical" ? "FAIL " : "WARN ") + v.mode + " #" + v.page + " " + v.id + " (" + v.impact + "): " + v.help + "\n   " + v.nodes.join("\n   ")));
  console.log(bad.length ? bad.length + " serious accessibility problems" : "Accessibility: no serious problems (" + all.length + " minor)");
  process.exit(bad.length ? 1 : 0);
})();
