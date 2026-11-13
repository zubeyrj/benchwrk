/* benchwrk: portal logic. Course content is never in this file: it is read from the
   portal database (collections "content" and "lessons"), readable only by invited members,
   and only after they have created an account. */
(function () {
  "use strict";
  const PHASES = { 1: "Foundations", 2: "Build", 3: "AI core", 4: "Ship and land" };
  const DOMAINS = { python: "Python", eng: "Engineering habits", web: "APIs and web", sql: "SQL and data", cloud: "Containers and cloud", ml: "Machine learning", llm: "LLM concepts" };
  const TOOLS = [
    ["python", "Python", "Writing scripts or notebooks"],
    ["terminal", "The terminal", "cd, ls, running commands"],
    ["git", "Git and GitHub", "Commits, branches, pushing"],
    ["sql", "SQL", "SELECT, JOIN, GROUP BY"],
    ["web", "Web APIs and JSON", "Calling an API, reading JSON"],
    ["cloud", "Docker and cloud", "Containers, deploying an app"],
    ["ml", "Machine learning", "Training a model, scikit-learn"],
    ["llm", "LLM APIs", "Calling a model from code, prompting"],
  ];
  const RATES = ["Never", "Tried it", "Sometimes", "Often"];
  const TOOL_DOMAIN = { python: "python", terminal: "eng", git: "eng", sql: "sql", web: "web", cloud: "cloud", ml: "ml", llm: "llm" };
  const BLOCKS = [
    ["Foundations", "Code from zero, Python, Git, tests"],
    ["Build", "APIs, data and vectors, containers"],
    ["AI core", "Machine learning, LLMs, retrieval, evals, agents"],
    ["Ship and land", "Safety, AI-103, interviews"],
  ];
  const DEMO_WEEK = [["Mon", 2, "Learn"], ["Tue", 2, "Build"], ["Wed", 0, "Rest"], ["Thu", 2, "Learn"], ["Fri", 2, "Build"], ["Sat", 5, "Project"], ["Sun", 2, "Review"]];
  const FACTOR = { start: 1, fast: 0.6, testout: 0.15 };
  const LVNAME = { start: "Start here", fast: "Fast track", testout: "Prove it" };
  const PROJECTS = ["m7", "m8", "m9"];
  const PTS = { lesson: 10, ex: 25, exSol: 10, quiz: 50, hour: 5, cp: 20, sub: 100, rev: 30, iv: 75 };
  const DAY = 864e5;
  // Five sections in the top bar; the pages inside each appear as tabs at the top of the section.
  const GROUPS = [
    { id: "today", label: "Today", pages: [["home", "Overview"], ["schedule", "Schedule"], ["log", "Study log"]] },
    { id: "learn", label: "Learn", pages: [["courses", "Courses"], ["library", "Library"], ["plan", "Your plan"], ["practice", "Practice"], ["toolkit", "Toolkit"]] },
    { id: "projects", label: "Projects", pages: [["projects", "Projects"]] },
    { id: "career", label: "Career", pages: [["interview", "Interview room"], ["applications", "Applications"], ["career", "CV and pitch"], ["portfolio", "Portfolio"], ["routes", "Specialisms"]] },
    { id: "cohort", label: "Cohort", pages: [["cohort", "Cohort"], ["league", "League"]] },
  ];
  const NAV = GROUPS.reduce((a, g) => a.concat(g.pages), []);
  const groupOf = (page) => GROUPS.find((g) => g.pages.some((p) => p[0] === page)) || null;
  const LEVELS = ["Starter", "Tinkerer", "Builder", "Maker", "Engineer", "Shipper", "Architect"];
  const QUESTS = [["hours", "Study your weekly hours", 100], ["lessons", "Read 3 lessons", 50], ["ex", "Solve 3 exercises", 75], ["quiz", "Pass or review a quiz", 50]];
  const $app = document.getElementById("app");
  const $shell = document.getElementById("shell");

  /* ---------- helpers ---------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rich = (s) => esc(s).replace(/&lt;(\/?)(code|strong|b)&gt;/g, "<$1$2>");
  function inline(s) {
    const parts = String(s).split(/(`[^`]+`)/g);
    return parts.map((p) => (p.length > 1 && p[0] === "`" && p[p.length - 1] === "`" ? "<code>" + esc(p.slice(1, -1)) + "</code>" : esc(p).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>"))).join("");
  }
  // A small, safe Markdown subset: paragraphs, fenced code, lists, inline code, bold, italics.
  function md(src) {
    const out = [], lines = String(src || "").replace(/\r/g, "").split("\n");
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (/^```/.test(l)) {
        const buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++; out.push('<pre tabindex="0"><code>' + esc(buf.join("\n")) + "</code></pre>"); continue;
      }
      if (!l.trim()) { i++; continue; }
      if (/^\s*[-*] /.test(l)) { const it = []; while (i < lines.length && /^\s*[-*] /.test(lines[i])) { it.push("<li>" + inline(lines[i].replace(/^\s*[-*] /, "")) + "</li>"); i++; } out.push("<ul>" + it.join("") + "</ul>"); continue; }
      if (/^\s*\d+\. /.test(l)) { const it = []; while (i < lines.length && /^\s*\d+\. /.test(lines[i])) { it.push("<li>" + inline(lines[i].replace(/^\s*\d+\. /, "")) + "</li>"); i++; } out.push("<ol>" + it.join("") + "</ol>"); continue; }
      if (/^#{1,3} /.test(l)) { out.push("<h3>" + inline(l.replace(/^#+ /, "")) + "</h3>"); i++; continue; }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^```|^\s*[-*] |^\s*\d+\. /.test(lines[i])) { buf.push(lines[i]); i++; }
      out.push("<p>" + inline(buf.join(" ")) + "</p>");
    }
    return out.join("");
  }
  function isoDate(d) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); }
  const today = () => isoDate(new Date());
  function parseDate(s) { const p = String(s || "").split("-").map(Number); if (p.length !== 3 || p.some(isNaN)) return new Date(); return new Date(p[0], p[1] - 1, p[2]); }
  function mondayOf(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function addDays(d, n) { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  const addWeeks = (d, w) => addDays(d, Math.round(w * 7));
  const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const fmtY = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const fmtLong = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const daysSince = (s) => Math.floor((parseDate(today()) - parseDate(s)) / DAY);
  const r1 = (n) => Math.round(n * 10) / 10;
  const uidGen = () => Math.random().toString(36).slice(2, 10);
  const clampH = (n) => Math.max(3, Math.min(40, Math.round(Number(n) * 2) / 2 || 15));
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
  const dateWords = (s) => (s ? parseDate(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "");
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const TICK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
  const CROSS = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
  document.addEventListener("input", (e) => { const t = e.target; if (t.dataset && t.dataset.words) { const el = document.getElementById(t.dataset.words); if (el) el.textContent = dateWords(t.value); } });

  /* ---------- state ---------- */
  function blank() { return { v: 4, account: null, tools: null, placement: null, hpw: 15, goal: "engineer", start: isoDate(mondayOf(new Date())), mods: {}, log: [], miss: {}, revs: 0, quests: {}, qxp: 0, onboarded: null, iv: { jobs: [], sessions: [], stories: [] }, apps: [], career: { cv: null, pitch: null, debriefs: [] }, blocked: [], cohort: "", notifSeen: 0 }; }
  function normalize(o) {
    const n = Object.assign(blank(), o && typeof o === "object" ? o : {});
    if (!n.mods || typeof n.mods !== "object") n.mods = {};
    if (!Array.isArray(n.log)) n.log = [];
    if (!n.miss || typeof n.miss !== "object") n.miss = {};
    if (!n.quests || typeof n.quests !== "object") n.quests = {};
    n.qxp = Number(n.qxp) || 0;
    if (!n.iv || typeof n.iv !== "object") n.iv = {};
    ["jobs", "sessions", "stories"].forEach((k) => { if (!Array.isArray(n.iv[k])) n.iv[k] = []; });
    if (!Array.isArray(n.apps)) n.apps = [];
    if (!n.career || typeof n.career !== "object") n.career = {};
    if (!Array.isArray(n.career.debriefs)) n.career.debriefs = [];
    if (!Array.isArray(n.blocked)) n.blocked = [];
    if (typeof n.cohort !== "string") n.cohort = "";
    n.notifSeen = Number(n.notifSeen) || 0;
    if (!n.remind || typeof n.remind !== "object") n.remind = null;
    n.path = n.path === "full" ? "full" : "lean";
    if (!n.extras || typeof n.extras !== "object" || Array.isArray(n.extras)) n.extras = {};
    if (!n.sched || typeof n.sched !== "object" || !n.sched.days || typeof n.sched.days !== "object") n.sched = null;
    if (!n.resume || typeof n.resume !== "object" || typeof n.resume.h !== "string" || !/^[a-z0-9-]{1,60}$/.test(n.resume.h)) n.resume = null;
    if (!n.learn || typeof n.learn !== "object" || !Array.isArray(n.learn.formats)) n.learn = null;
    if (!n.lib || typeof n.lib !== "object") n.lib = { done: {}, quiz: {}, prob: {}, route: "" };
    if (!n.act || typeof n.act !== "object" || Array.isArray(n.act)) n.act = {};
    if (!n.builds || typeof n.builds !== "object" || Array.isArray(n.builds)) n.builds = {};
    if (!n.lf || typeof n.lf !== "object" || Array.isArray(n.lf)) n.lf = {};
    n.hpw = clampH(n.hpw);
    return n;
  }
  let S = blank();
  const ui = { place: null, quiz: {}, prac: null, resetArm: false, busy: false, formErr: "", exres: {}, hintsOpen: {}, solArm: {}, solShown: {}, tutor: {}, admin: { doc: "", text: "", err: "" }, revOpen: null, shareOpen: {}, msgDraft: "" };
  let phase = "boot", db = null, user = null, uid = null, myName = "", myEmail = null, canWrite = null, isOwner = false;
  let CT = null, cohort = null, cohortErr = false, MOD = [], byId = {}, LX = {}, lxWait = {}, notice = null;
  let subs = null, reviews = null, sharedSubbed = false, pairs = null;
  let codeDoc = null, codeLoaded = false, sample = null, downloads = null;
  function mod(id) { if (!S.mods[id]) S.mods[id] = {}; return S.mods[id]; }

  /* ---------- placement and plan ---------- */
  function domainRating(d, st) {
    st = st || S; if (!st.tools) return null;
    const vals = Object.keys(TOOL_DOMAIN).filter((t) => TOOL_DOMAIN[t] === d).map((t) => st.tools[t]).filter((v) => v != null);
    return vals.length ? Math.min.apply(null, vals) : null;
  }
  // Placement questions come in ladders: up to six per tool, easiest first. A tool's score is the share of
  // its ladder answered correctly; questions not reached (two misses end a ladder) count as not known.
  function toolLadder(ans, diag) {
    const out = {};
    diag.forEach((q, i) => { if (!q.t) return; const o = out[q.t] = out[q.t] || { got: 0, of: 0 }; o.of++; if (ans[i] === q.a) o.got++; });
    return out;
  }
  function scorePlacement(ans, diag, st) {
    if (diag.some((q) => q.t)) {
      const tl = toolLadder(ans, diag), sum = {}, n = {};
      Object.keys(tl).forEach((t) => { const d = TOOL_DOMAIN[t]; sum[d] = (sum[d] || 0) + (100 * tl[t].got) / tl[t].of; n[d] = (n[d] || 0) + 1; });
      const out = {};
      Object.keys(DOMAINS).forEach((d) => { out[d] = n[d] ? Math.round(sum[d] / n[d]) : 0; if (domainRating(d, st) === 0) out[d] = 0; });
      return out;
    }
    const tot = {}, got = {};
    diag.forEach((q, i) => { tot[q.d] = (tot[q.d] || 0) + 1; if (ans[i] === q.a) got[q.d] = (got[q.d] || 0) + 1; });
    const out = {};
    Object.keys(DOMAINS).forEach((d) => { out[d] = tot[d] ? Math.round((100 * (got[d] || 0)) / tot[d]) : 0; });
    Object.keys(DOMAINS).forEach((d) => { if (domainRating(d, st) === 0) out[d] = 0; });
    return out;
  }
  const levelOf = (score) => (score == null ? "start" : score >= 80 ? "testout" : score >= 40 ? "fast" : "start");
  function needZero(st) {
    st = st || S;
    const py = st.tools ? st.tools.python : null, sc = st.placement ? st.placement.scores.python : null;
    if (py == null && sc == null) return true;
    return (py != null && py <= 1) || (sc != null && sc < 40);
  }
  function modLevel(m, st) {
    st = st || S;
    if (m.zero) return null;
    if (st.lf && st.lf[m.id]) return null; // they chose to take this course in full
    if (m.id === "m0") return st.tools && st.tools.python >= 2 && st.tools.git >= 2 && st.tools.terminal >= 2 ? "fast" : null;
    if (!m.domain || !st.placement) return null;
    if (domainRating(m.domain, st) === 0) return "start";
    return levelOf(st.placement.scores[m.domain]);
  }
  // The lean path (the default) leaves out optional extras and optional lessons; the full path keeps everything.
  // An extra joins the lean path when you add it, or once you've started it.
  const isFull = (st) => (st || S).path === "full";
  function extraOn(m, st) {
    st = st || S;
    if (!m.extra || isFull(st)) return true;
    const ms = (st.mods && st.mods[m.id]) || {};
    return !!((st.extras || {})[m.id] || ms.done || Object.keys(ms.checks || {}).length);
  }
  const optLesson = (m, i, st) => !isFull(st) && Array.isArray(m.opt) && m.opt.indexOf(i) >= 0;
  // Share of a course's core lessons ticked, for any state (the live one or a what-if copy).
  function fracOf(m, st) {
    const ch = ((st.mods && st.mods[m.id]) || {}).checks || {}, core = (m.lessons || []).map((_, i) => i).filter((i) => !optLesson(m, i, st));
    return core.length ? core.filter((i) => ch[i]).length / core.length : 0;
  }
  function plan(st, mods) {
    st = st || S; mods = mods || MOD;
    const hpw = clampH(st.hpw), start = parseDate(st.start || today());
    let cum = 0;
    const rows = mods.filter((m) => (!m.zero || needZero(st)) && extraOn(m, st)).map((m) => {
      const lv = modLevel(m, st);
      const base = !isFull(st) && m.lean ? m.lean : m.hours;
      const hours = Math.max(2, Math.round(base * FACTOR[lv || "start"]));
      const s = cum; cum += hours;
      const ms = (st.mods && st.mods[m.id]) || {};
      return { m, lv, hours, s, e: cum, sd: addWeeks(start, s / hpw), ed: addWeeks(start, cum / hpw), done: !!ms.done };
    });
    // The plan re-dates itself from where you actually are: finished courses keep their dates, and the work
    // still to do is laid out from today at your hours. Fall behind and the dates move later; get ahead and
    // they move earlier. "slip" is how far the finish has moved from the original plan.
    const base = addWeeks(start, cum / hpw), now0 = parseDate(today()), anchor = start > now0 ? start : now0;
    let t = 0;
    rows.forEach((r) => {
      if (r.done) return;
      const left = Math.max(0.5, r.hours * (1 - 0.8 * fracOf(r.m, st)));
      r.sd = addWeeks(anchor, t / hpw); t += left; r.ed = addWeeks(anchor, t / hpw);
    });
    const live = rows.filter((r) => !r.done), end = live.length ? live[live.length - 1].ed : base;
    // Two finished projects are enough to start applying on the lean path; the third finishes while you apply.
    const applyAfter = st.goal === "adjacent" || !isFull(st) ? "m8" : "m9";
    const ar = rows.find((r) => r.m.id === applyAfter) || rows[rows.length - 1];
    return { rows, total: cum, left: t, hpw, start, end, base, slip: Math.round((end - base) / DAY), race: addWeeks(end, 6), applyAt: ar ? ar.ed : start, applyAfter, weeks: Math.max(1, Math.ceil((end - mondayOf(start)) / (7 * DAY))) };
  }
  const inPlan = (id) => plan().rows.some((r) => r.m.id === id);
  const currentRow = (p) => p.rows.find((r) => !r.done) || null;
  // The course they are actually working in: the last one they opened, if it isn't finished, else the next in the plan.
  function activeRow(p) {
    p = p || plan();
    const R = S.resume, k = R && /^(?:lesson|ex|quiz|course)-(m\d+)/.exec(R.h);
    if (k) { const r = p.rows.find((x) => x.m.id === k[1] && !x.done); if (r) return r; }
    return currentRow(p);
  }
  const hasActivity = () => S.log.length > 0 || Object.keys(S.act || {}).length > 0 || Object.values(S.mods).some((x) => Object.keys(x.checks || {}).length || Object.keys(x.ex || {}).length || x.quiz);
  function lessonFrac(id) { const m = byId[id]; const ch = (S.mods[id] && S.mods[id].checks) || {}; const core = m.lessons.map((_, i) => i).filter((i) => !optLesson(m, i)); return core.length ? core.filter((i) => ch[i]).length / core.length : 0; }
  function progress() {
    const p = plan(); let done = 0;
    p.rows.forEach((r) => { done += r.done ? r.hours : r.hours * 0.8 * lessonFrac(r.m.id); });
    return { pct: p.total ? Math.round((100 * done) / p.total) : 0, p };
  }

  /* ---------- the weekly grid ---------- */
  function rhythm() {
    const src = (CT && CT.TK && CT.TK.rhythm) || DEMO_WEEK.map((d) => [d[0], d[1], d[2], ""]);
    const scale = S.hpw / 15;
    return src.map((d) => ({ name: d[0], hours: Math.round(d[1] * scale * 2) / 2, kind: String(d[2]).toLowerCase(), label: d[2], note: d[3] || "" }));
  }
  // Study time = time counted on benchwrk's study pages (S.act, seconds per day) plus sessions logged by hand
  // for time away from the site. The two never overlap: the log form only asks for time away.
  const autoH = (d) => ((S.act || {})[d] || 0) / 3600;
  function loggedByDate() { const o = {}; S.log.forEach((e) => { o[e.d] = (o[e.d] || 0) + Number(e.h || 0); }); Object.keys(S.act || {}).forEach((d) => { o[d] = (o[d] || 0) + autoH(d); }); return o; }
  function gridStart(p) { return mondayOf(p.start); }
  function weekIndex(p, d) { return Math.floor((mondayOf(d) - gridStart(p)) / (7 * DAY)); }
  function coursesInWeek(p, i) { const ws = addDays(gridStart(p), 7 * i), we = addDays(ws, 7); return p.rows.filter((r) => r.sd < we && r.ed > ws); }

  /* ---------- hours, streaks, points ---------- */
  const weekKey = (s) => isoDate(mondayOf(parseDate(s)));
  function hoursByWeek() { const o = {}; Object.entries(loggedByDate()).forEach(([d, h]) => { const k = weekKey(d); o[k] = (o[k] || 0) + h; }); return o; }
  const totalHours = () => S.log.reduce((a, e) => a + Number(e.h || 0), 0) + Object.keys(S.act || {}).reduce((a, d) => a + autoH(d), 0);
  function weekAuto(mon) { const from = isoDate(mon || mondayOf(new Date())), to = isoDate(addDays(parseDate(from), 7)); return Object.keys(S.act || {}).filter((d) => d >= from && d < to).reduce((a, d) => a + autoH(d), 0); }
  // First day with any study, for streak counting.
  const firstStudyDay = () => { const ds = S.log.map((e) => e.d).concat(Object.keys(S.act || {})).sort(); return ds.length ? ds[0] : null; };
  const thisWeekHours = () => hoursByWeek()[isoDate(mondayOf(new Date()))] || 0;
  // Weekly streak: a week counts at 60% of target. Every 4 weeks earns a freeze (max 2) that
  // covers one missed week, so one bad week doesn't wipe months of effort.
  function streakInfo() {
    const by = hoursByWeek(), need = S.hpw * 0.6, fd = firstStudyDay(), first = fd ? mondayOf(parseDate(fd)) : null;
    let w = mondayOf(new Date()), n = 0, used = 0;
    if ((by[isoDate(w)] || 0) < need) w = addDays(w, -7);
    while (n < 200 && first && w >= first) {
      if ((by[isoDate(w)] || 0) >= need) n++;
      else if (used < Math.min(2, Math.floor(n / 4)) && n > 0) used++;
      else break;
      w = addDays(w, -7);
    }
    return { weeks: n, used, freezes: Math.max(0, Math.min(2, Math.floor(n / 4)) - used), thisWeek: (by[isoDate(mondayOf(new Date()))] || 0) >= need };
  }
  const streak = () => streakInfo().weeks;
  function counts() {
    let lessons = 0, ex = 0, exSol = 0, quiz = 0, cp = 0, subsN = 0, done = 0;
    Object.keys(S.mods).forEach((id) => {
      const st = S.mods[id];
      lessons += Object.keys(st.checks || {}).length;
      Object.values(st.ex || {}).forEach((x) => { if (x.ok) { if (x.sol) exSol++; else ex++; } });
      if (st.quiz && st.quiz.best >= 80) quiz++;
      cp += Object.keys(st.cp || {}).length;
      if (st.sub) subsN++;
      if (st.done) done++;
    });
    Object.values(S.builds || {}).forEach((b) => { cp += Object.keys((b && b.cp) || {}).length; });
    const iv = ((S.iv && S.iv.sessions) || []).filter((x) => x.score).length;
    return { lessons, ex, exSol, quiz, cp, subs: subsN, done, revs: S.revs || 0, iv };
  }
  function points() {
    const c = counts();
    return c.lessons * PTS.lesson + c.ex * PTS.ex + c.exSol * PTS.exSol + c.quiz * PTS.quiz + Math.round(totalHours()) * PTS.hour + c.cp * PTS.cp + c.subs * PTS.sub + c.revs * PTS.rev + c.iv * PTS.iv + (S.qxp || 0) + libPoints();
  }
  // Levels get further apart as you climb: 150, 450, 900, 1500...
  function levelInfo(xp) {
    let L = 1; while (75 * L * (L + 1) <= xp) L++;
    const lo = 75 * (L - 1) * L, hi = 75 * L * (L + 1);
    return { level: L, title: LEVELS[Math.min(LEVELS.length - 1, Math.floor((L - 1) / 2))], into: xp - lo, need: hi - lo, f: (xp - lo) / (hi - lo) };
  }
  /* ---------- this week's quests ---------- */
  const thisMon = () => isoDate(mondayOf(new Date()));
  function weekCounts() {
    const mon = thisMon(); let lessons = 0, ex = 0, quiz = 0;
    Object.values(S.mods).forEach((st) => {
      Object.values(st.checks || {}).forEach((v) => { if (typeof v === "string" && v >= mon) lessons++; });
      Object.values(st.ex || {}).forEach((x) => { if (x.ok && x.ok >= mon) ex++; });
      ((st.quiz && st.quiz.passes) || []).forEach((d) => { if (d >= mon) quiz++; });
    });
    return { hours: thisWeekHours(), lessons, ex, quiz };
  }
  function quests() {
    const c = weekCounts(), claimed = S.quests[thisMon()] || {};
    const goal = { hours: S.hpw, lessons: 3, ex: 3, quiz: 1 };
    return QUESTS.map((q) => ({ id: q[0], title: q[0] === "hours" ? "Study " + S.hpw + " hours this week" : q[1], xp: q[2], got: Math.min(goal[q[0]], c[q[0]]), need: goal[q[0]], done: c[q[0]] >= goal[q[0]], claimed: !!claimed[q[0]] }));
  }
  // Award quest XP once per quest per week; returns the newly completed ones.
  function claimQuests() {
    const fresh = quests().filter((q) => q.done && !q.claimed);
    if (!fresh.length) return [];
    const k = thisMon(); S.quests[k] = Object.assign({}, S.quests[k]);
    fresh.forEach((q) => { S.quests[k][q.id] = 1; S.qxp = (S.qxp || 0) + q.xp; });
    const keys = Object.keys(S.quests).sort(); if (keys.length > 12) keys.slice(0, keys.length - 12).forEach((x) => delete S.quests[x]);
    persist();
    return fresh;
  }
  /* ---------- pace and countdowns ---------- */
  function pace() {
    const by = hoursByWeek(), mon = mondayOf(new Date()); let sum = 0, n = 0;
    const fd = firstStudyDay(); for (let i = 1; i <= 3; i++) { const k = isoDate(addDays(mon, -7 * i)); if (fd && parseDate(fd) <= addDays(mon, -7 * i + 6)) { sum += by[k] || 0; n++; } }
    const avg = n ? sum / n : 0;
    return { hpw: avg >= 1 ? avg : S.hpw, measured: avg >= 1, avg };
  }
  function countdowns() {
    const p = plan(), cur = currentRow(p), pc = pace(), now = parseDate(today());
    const left = (r) => (r.done ? 0 : r.hours * (1 - 0.8 * lessonFrac(r.m.id)));
    const days = (h) => Math.max(0, Math.ceil((h / pc.hpw) * 7));
    const out = { pace: pc, plan: p };
    if (cur) { const h = left(cur); out.course = { row: cur, hours: h, days: days(h), date: addDays(now, days(h)), planned: cur.ed }; }
    const total = p.rows.reduce((a, r) => a + left(r), 0);
    out.route = { hours: total, days: days(total), date: addDays(now, days(total)), planned: p.end };
    return out;
  }
  const dayDiff = (a, b) => Math.round((a - b) / DAY);

  /* ---------- quizzes ---------- */
  function quizInfo(id) { return (S.mods[id] && S.mods[id].quiz) || { best: 0, attempts: 0, passes: [] }; }
  function reviewDue(id) {
    const ps = quizInfo(id).passes || [];
    if (!ps.length) return false;
    const last = ps[ps.length - 1];
    return ps.length === 1 ? daysSince(last) >= 7 : ps.length === 2 ? daysSince(last) >= 30 : false;
  }
  function poolOf(id) {
    const m = byId[id], lx = LX[id], out = [];
    m.quiz.forEach((q, i) => out.push(Object.assign({ key: id + ":q" + i, mid: id }, q)));
    if (lx && lx.pool) lx.pool.forEach((q, i) => out.push(Object.assign({ key: id + ":b" + i, mid: id }, q)));
    return out;
  }
  function qByKey(key) { const id = key.split(":")[0]; return byId[id] ? poolOf(id).find((q) => q.key === key) : null; }
  function noteAnswer(key, right) { if (right) delete S.miss[key]; else S.miss[key] = (S.miss[key] || 0) + 1; }

  /* ---------- persistence ---------- */
  let saveT = null, chain = Promise.resolve(), lastSaved = "", lastSum = "";
  const stateRef = () => db.doc("data/users/" + uid + "/state");
  function persist() { clearTimeout(saveT); saveT = setTimeout(flush, 600); }
  function summary() {
    const c = counts();
    const days = Object.keys(loggedByDate()).sort();
    const out = { lvl: levelInfo(points()).level, name: (S.account && S.account.name) || "", goal: S.goal, hours: r1(totalHours()), week: r1(thisWeekHours()), wauto: r1(weekAuto()), at: today(), pts: points(), streak: streak(), qp: c.quiz, xs: c.ex + c.exSol, ls: c.lessons, last: days.length ? days[days.length - 1] : "", co: S.cohort || "" };
    if (MOD.length && (S.placement || hasActivity())) {
      const pr = progress(), cur = activeRow(pr.p), nx = currentRow(pr.p); out.pct = pr.pct; out.cur = cur ? cur.m.title : "Every course done";
      out.behind = Math.max(0, pr.p.slip); void nx;
    } else { out.pct = 0; out.cur = "Getting started"; out.behind = 0; }
    return leagueSummary(out);
  }
  function flush() {
    if (!db || !uid || !S.account) return;
    xwTick();
    const body = JSON.stringify(S);
    if (body !== lastSaved) { lastSaved = body; const data = JSON.parse(body); chain = chain.then(() => stateRef().set(data)).catch(onWriteErr); }
    const sum = JSON.stringify(summary());
    if (sum !== lastSum) { lastSum = sum; const sd = JSON.parse(sum); chain = chain.then(() => db.doc("learners/" + uid).set(sd)).catch(() => {}); }
  }
  function onWriteErr(e) {
    if (e && e.code === "quota_exceeded") toast("The portal's storage is full. Ask the owner to clear old entries.");
    else if (e && e.code === "invalid_argument") toast("Couldn't save just now. Check your connection; your work is kept until it goes through.");
    else { lastSaved = ""; toast("Couldn't save just now. Your next change will retry."); }
  }
  let codeT = null;
  function saveCode() { clearTimeout(codeT); codeT = setTimeout(() => { if (db && uid && codeDoc) chain = chain.then(() => db.doc("data/users/" + uid + "/code").set(JSON.parse(JSON.stringify(codeDoc)))).catch(() => {}); }, 900); }
  async function loadCode() {
    if (codeLoaded) return; codeLoaded = true;
    try { const s = await Promise.race([db.doc("data/users/" + uid + "/code").get(), timeout(8000)]); codeDoc = s && s !== "__timeout" && s.exists ? s.data() || {} : {}; } catch (e) { codeDoc = {}; }
  }

  /* ---------- boot ---------- */
  const timeout = (ms) => new Promise((res) => setTimeout(() => res("__timeout"), ms));
  // benchwrk's own runtime (platform.js) wins over any host-provided window.claude.
  const RT = () => window.BW_RUNTIME || window.claude;
  async function boot() {
    try {
      if (!RT() || typeof RT().use !== "function") throw new Error("runtime");
      user = await Promise.race([RT().use("user"), timeout(10000)]);
      if (user === "__timeout") user = null;
      db = await Promise.race([RT().use("db"), timeout(10000)]);
      if (db === "__timeout") db = null;
      if (!user || !db) throw new Error("signed-out");
      uid = await user.id();
      try { const me = await user.me(); myName = (me && me.name) || ""; myEmail = (me && me.email) || null; } catch (e) { myName = ""; myEmail = null; }
      try { isOwner = (await user.isOwner()) === true; } catch (e) { isOwner = false; }
      try { canWrite = await user.can("data.write"); } catch (e) { canWrite = null; }
      if (!uid) throw new Error("no-id");
      const snap = await Promise.race([stateRef().get(), timeout(10000)]);
      if (snap === "__timeout") throw new Error("timeout");
      if (snap.exists) { S = normalize(snap.data()); lastSaved = JSON.stringify(S); }
      if (S.account) { phase = "loading-content"; render(); await loadContent(); }
      else phase = canWrite === false ? "noaccess" : "signup";
    } catch (e) { phase = "noaccess"; }
    render();
    Promise.race([RT() && RT().use("sample"), timeout(10000)]).then((s) => { sample = s && s !== "__timeout" ? s : null; if (sample && phase === "ready") refreshTutors(); }).catch(() => {});
    Promise.race([RT() && RT().use("downloads"), timeout(10000)]).then((d) => { downloads = d && d !== "__timeout" ? d : null; }).catch(() => {});
  }
  async function loadContent() {
    try {
      const snap = await Promise.race([db.collection("content").get(), timeout(12000)]);
      if (snap === "__timeout") throw new Error("timeout");
      const docs = {}; snap.docs.forEach((d) => { docs[d.id] = d.data(); });
      const mods = Object.keys(docs).filter((k) => /^m\d+$/.test(k)).map((k) => docs[k]).sort((a, b) => a.order - b.order);
      if (!mods.length || !docs.diag || !docs.toolkit) { phase = "nocontent"; return; }
      MOD = mods.map((m) => Object.assign({}, m, { resources: (m.resources || []).map((r) => ({ t: r[0], by: r[1], cost: r[2], url: r[3], note: r[4] || "", fmt: String(r[5] || "reading").split("+") })) }));
      byId = Object.fromEntries(MOD.map((m) => [m.id, m]));
      CT = { LEAGUE: docs.league && docs.league.wk ? docs.league : null, DIAG: docs.diag.items, TK: docs.toolkit, COH: (docs.cohorts && Array.isArray(docs.cohorts.list)) ? docs.cohorts.list : [] };
      notice = docs.notice && docs.notice.text ? docs.notice : null;
      phase = "ready";
      // After a deploy with new course files, the owner's browser loads them into the database once.
      if (isOwner && window.BW && window.BW_CONTENT_V && (!docs.meta || docs.meta.v !== window.BW_CONTENT_V)) autoSeed();
      subscribeCohort();
      subscribePairs();
      subscribeShared();
      loadMyReports();
      flush();
    } catch (e) { phase = "nocontent"; }
  }
  let seededOnce = false;
  function autoSeed() {
    if (seededOnce) return; seededOnce = true;
    window.BW.api("/api/admin-seed", {}).then(() => { LX = {}; lxWait = {}; return loadContent(); }).then(() => { render(); toast("New course content loaded for everyone."); }).catch(() => {});
  }
  // Lesson text, exercises and question pools load per course, on first use.
  function needLX(id) {
    if (LX[id] || !byId[id]) return Promise.resolve(LX[id]);
    if (lxWait[id]) return lxWait[id];
    lxWait[id] = Promise.race([db.doc("lessons/" + id).get(), timeout(12000)]).then((s) => {
      LX[id] = s && s !== "__timeout" && s.exists ? s.data() : { lessons: [], ex: [], pool: [], missing: true };
      return LX[id];
    }).catch(() => { LX[id] = { lessons: [], ex: [], pool: [], missing: true }; return LX[id]; });
    return lxWait[id];
  }
  function subscribeCohort() {
    const t = setTimeout(() => { if (cohort === null) { cohortErr = true; if (["cohort", "admin"].includes(route().name)) render(); } }, 10000);
    db.collection("learners").onSnapshot((snap) => {
      clearTimeout(t); cohortErr = false;
      cohort = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      if (["cohort", "admin", "league"].includes(route().name)) render();
    }, () => { clearTimeout(t); cohortErr = true; if (["cohort", "admin"].includes(route().name)) render(); });
  }
  // Accountability partners: each member writes only pairs/<own id>; a pair is live when both point at each other.
  function subscribePairs() {
    db.collection("pairs").onSnapshot((s) => {
      pairs = s.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      const me = myPairDoc(), mate = me && me.req ? pairs.find((x) => x.id === me.req) : null;
      if (me && mate && mate.partner === uid && me.partner !== mate.id) savePair({ partner: mate.id, req: null });
      if (me && me.partner) { const p = pairs.find((x) => x.id === me.partner); if (p && p.partner && p.partner !== uid) savePair({ partner: null }); }
      if (["home", "cohort"].includes(route().name)) render(); else refreshNav();
    }, () => { pairs = pairs || []; });
  }
  const myPairDoc = () => (pairs || []).find((x) => x.id === uid) || null;
  function partnerInfo() {
    const me = myPairDoc(); if (!me || !me.partner) return null;
    const p = (pairs || []).find((x) => x.id === me.partner); if (!p || (p.partner !== uid && p.req !== uid)) return null;
    return { id: p.id, doc: p, sum: (cohort || []).find((c) => c.id === p.id) || {} };
  }
  function savePair(patch) {
    const cur = myPairDoc() || { name: (S.account && S.account.name) || "", partner: null, req: null, commit: null, msgs: [] };
    const next = Object.assign({}, cur, patch, { name: (S.account && S.account.name) || cur.name, at: today() }); delete next.id;
    next.msgs = (next.msgs || []).slice(-20);
    return db.doc("pairs/" + uid).set(JSON.parse(JSON.stringify(next))).catch(() => toast("Couldn't save that just now."));
  }
  function subscribeShared() {
    if (sharedSubbed) return; sharedSubbed = true;
    const rr = () => { if (["projects", "admin", "portfolio"].includes(route().name)) render(); else refreshNav(); };
    db.collection("subs").onSnapshot((s) => { subs = s.docs.map((d) => Object.assign({ id: d.id }, d.data())); rr(); }, () => { subs = subs || []; rr(); });
    db.collection("reviews").onSnapshot((s) => { reviews = s.docs.map((d) => Object.assign({ id: d.id }, d.data())); rr(); }, () => { reviews = reviews || []; rr(); });
  }

  /* ---------- ui bits ---------- */
  let toastT;
  // Screen readers hear changes through one live region that is always on the page; regions added
  // at the moment of the change are often missed.
  let annT;
  function announce(msg) { const el = document.getElementById("sr-live"); if (!el) return; el.textContent = ""; clearTimeout(annT); annT = setTimeout(() => { el.textContent = msg; }, 60); }
  function toast(msg) {
    document.querySelectorAll(".toast").forEach((x) => x.remove());
    const el = document.createElement("div"); el.className = "toast"; el.setAttribute("aria-hidden", "true"); el.textContent = msg; announce(msg);
    document.body.appendChild(el);
    clearTimeout(toastT);
    toastT = setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 160); }, 3000);
  }
  function lvTag(lv, done) { if (done) return '<span class="tag done">Done</span>'; return lv ? '<span class="tag ' + lv + '">' + LVNAME[lv] + "</span>" : ""; }
  function costTag(c) { const k = /^free/i.test(c) ? "k-build" : /coursera/i.test(c) ? "k-learn" : "k-project"; return '<span class="tag ' + k + '">' + esc(c) + "</span>"; }
  const firstName = () => ((S.account && S.account.name) || myName || "").split(" ")[0];
  function weekRange(p, r) { const a = weekIndex(p, r.sd) + 1, b = Math.max(a, weekIndex(p, addDays(r.ed, -1)) + 1); return a === b ? "Week " + a : "Weeks " + a + " to " + b; }
  const loading = (h) => '<div aria-busy="true"><div class="sk" style="height:40px;width:45%;margin-bottom:18px"></div><div class="sk" style="height:' + (h || 260) + 'px"></div></div>';
