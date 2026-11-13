// Imports "AI Engineering from Scratch" (github.com/rohitg00/ai-engineering-from-scratch, MIT licence)
// into benchwrk's library: lessons and quizzes for all 20 phases, coding problems, the interview bank,
// career routes, project challenges and the glossary.
//
//   git clone --depth 1 https://github.com/rohitg00/ai-engineering-from-scratch /tmp/aefs
//   node scripts/import-aefs.mjs /tmp/aefs && npm run content
//
// Output goes to content/aefs/ (one small JSON file per lesson, problem and interview topic). The build
// copies it to public/library/, where the site serves it as static files. The source's copyright notice
// is kept in content/aefs/LICENSE.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SRC = path.resolve(process.argv[2] || "");
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(root, "content/aefs");
if (!fs.existsSync(path.join(SRC, "phases"))) { console.error("Usage: node scripts/import-aefs.mjs <path to a clone of ai-engineering-from-scratch>"); process.exit(1); }
fs.rmSync(OUT, { recursive: true, force: true });
for (const d of ["", "lessons", "practice", "interviews"]) fs.mkdirSync(path.join(OUT, d), { recursive: true });

const REPO = "https://github.com/rohitg00/ai-engineering-from-scratch";
let SHA = "main"; try { SHA = execSync("git -C " + JSON.stringify(SRC) + " rev-parse HEAD").toString().trim(); } catch (e) { /* not a git clone */ }
const SITE = "https://aiengineeringfromscratch.com";
const read = (p) => fs.readFileSync(path.join(SRC, p), "utf8");
const exists = (p) => fs.existsSync(path.join(SRC, p));
const ls = (p) => fs.readdirSync(path.join(SRC, p)).sort();
const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data));
const ghTree = (p) => REPO + "/tree/" + SHA + "/" + p;
const ghBlob = (p) => REPO + "/blob/" + SHA + "/" + p;
const ghRaw = (p) => "https://raw.githubusercontent.com/rohitg00/ai-engineering-from-scratch/" + SHA + "/" + p;
const libId = (lessonPath) => { const m = String(lessonPath).match(/phases\/(\d\d)-[^/]+\/(\d\d)-([^/]+)/); return m ? "lib-" + m[1] + "-" + m[2] : null; };

// Links inside a lesson: other lessons become benchwrk routes, repo files go to GitHub, images to raw files.
function fixLinks(md, dir) {
  return md.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)([^)]*)\)/g, (all, bang, text, href, rest) => {
    if (/^(https?:|mailto:|#)/.test(href)) return all;
    const abs = path.posix.normalize(path.posix.join(dir, href.split("#")[0]));
    const lib = libId(abs);
    if (!bang && lib && /phases\/\d\d-[^/]+\/\d\d-[^/]+\/?$/.test(abs.replace(/\/docs(\/en\.md)?$/, ""))) return "[" + text + "](#" + lib + ")";
    return bang + "[" + text + "](" + (bang ? ghRaw(abs) : abs.endsWith("/") || !path.posix.extname(abs) ? ghTree(abs) : ghBlob(abs)) + rest + ")";
  });
}
function meta(md) {
  const get = (k) => { const m = md.match(new RegExp("^\\*\\*" + k + ":\\*\\*\\s*(.+)$", "m")); return m ? m[1].trim() : ""; };
  const title = (md.match(/^#\s+(.+)$/m) || [])[1] || "";
  const motto = (md.match(/^>\s*(.+)$/m) || [])[1] || "";
  const t = get("Time"), mins = Number((t.match(/(\d+)/) || [])[1]) || 30;
  return { title: title.trim(), motto: motto.trim(), type: get("Type"), langs: get("Languages"), prereq: get("Prerequisites"), min: mins };
}
function body(md) {
  // Drop the title, motto and the bold metadata lines: benchwrk shows those in the lesson header.
  const lines = md.split("\n"); let i = 0, seenTitle = false;
  for (; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!seenTitle && /^#\s/.test(l)) { seenTitle = true; continue; }
    if (!l || /^>/.test(l) || /^\*\*(Type|Languages|Prerequisites|Time|Related|Level|Difficulty):\*\*/.test(l)) continue;
    break;
  }
  return lines.slice(i).join("\n").trim();
}

/* ---------- phases and lessons ---------- */
const phases = [];
for (const pd of ls("phases").filter((d) => /^\d\d-/.test(d))) {
  const n = pd.slice(0, 2), readme = exists("phases/" + pd + "/README.md") ? read("phases/" + pd + "/README.md") : "";
  const title = ((readme.match(/^#\s+(.+)$/m) || [])[1] || pd.slice(3).replace(/-/g, " ")).replace(/^Phase\s+\d+:\s*/i, "").trim();
  const motto = ((readme.match(/^>\s*(.+)$/m) || [])[1] || "").trim();
  const lessons = [];
  for (const ld of ls("phases/" + pd).filter((d) => /^\d\d-/.test(d) && fs.statSync(path.join(SRC, "phases", pd, d)).isDirectory())) {
    const base = "phases/" + pd + "/" + ld, doc = base + "/docs/en.md";
    if (!exists(doc)) continue;
    const md = read(doc), mt = meta(md);
    let quiz = [];
    if (exists(base + "/quiz.json")) { try { quiz = JSON.parse(read(base + "/quiz.json")).map((q) => ({ q: q.question, o: q.options, a: q.correct, e: q.explanation || "", st: q.stage || "check" })).filter((q) => q.q && Array.isArray(q.o) && Number.isInteger(q.a)); } catch (e) { /* skip a broken quiz */ } }
    const code = exists(base + "/code") ? ls(base + "/code").filter((f) => fs.statSync(path.join(SRC, base, "code", f)).isFile()) : [];
    lessons.push({ id: "lib-" + n + "-" + ld.slice(0, 2), slug: ld, t: mt.title || ld.slice(3).replace(/-/g, " "), motto: mt.motto, type: mt.type, langs: mt.langs, prereq: mt.prereq, min: mt.min, md: fixLinks(body(md), base + "/docs"), quiz, code, gh: ghTree(base), site: SITE + "/lesson?path=" + base });
  }
  if (!lessons.length) continue;
  phases.push({ n, id: "lib-" + n, dir: pd, title, motto, count: lessons.length, mins: lessons.reduce((a, l) => a + l.min, 0),
    lessons: lessons.map((l) => ({ id: l.id, t: l.t, motto: l.motto, type: l.type, min: l.min, q: l.quiz.length })) });
  lessons.forEach((l) => write("lessons/" + l.id + ".json", l));
}

/* ---------- coding problems ---------- */
const collections = exists("practice/collections.json") ? JSON.parse(read("practice/collections.json")) : [];
const problems = [];
for (const id of ls("practice").filter((d) => !d.startsWith("_") && exists("practice/" + d + "/meta.json"))) {
  const P = "practice/" + id + "/", m = JSON.parse(read(P + "meta.json"));
  const opt = (f) => (exists(P + f) ? read(P + f) : "");
  const hints = opt("hints.md").split(/^##\s+Hint\s+\d+\s*$/m).map((x) => x.trim()).filter(Boolean);
  const doc = { id, title: m.title, summary: m.summary, kind: m.kind || "implement", difficulty: m.difficulty, tags: m.tags || [], lesson: libId(m.lesson || ""), lessonPath: m.lesson || "", minutes: m.minutes || 15, entry: m.entry || [], collections: m.collections || [], limit: m.time_limit_s || 10,
    problem: fixLinks(opt("problem.md"), P.slice(0, -1)), starter: opt("starter.py"), tests: opt("tests.py"), support: opt("support.py"), fixtures: opt("fixtures.json"), hints, notes: fixLinks(opt("notes.md"), P.slice(0, -1)), solution: opt("solution.py"), gh: ghTree(P.slice(0, -1)) };
  problems.push({ id, title: m.title, summary: m.summary, kind: doc.kind, difficulty: m.difficulty, tags: doc.tags, minutes: doc.minutes, collections: doc.collections, lesson: doc.lesson });
  write("practice/" + id + ".json", doc);
}
fs.copyFileSync(path.join(SRC, "practice/_harness/practice_check.py"), path.join(OUT, "practice", "practice_check.txt"));

/* ---------- interview bank ---------- */
function front(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/); if (!m) return [{}, md];
  const o = {};
  m[1].split("\n").forEach((l) => { const kv = l.match(/^([a-z_]+):\s*(.*)$/); if (!kv) return; let v = kv[2].trim(); if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(",").map((x) => x.trim()).filter(Boolean); else if (/^\d+$/.test(v)) v = Number(v); o[kv[1]] = v; });
  return [o, md.slice(m[0].length)];
}
const section = (md, name) => { const m = md.match(new RegExp("^##\\s+" + name + "\\s*\\n([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))", "m")); return m ? m[1].trim() : ""; };
const ivCards = [], ivByCard = {};
for (const card of ls("interviews/questions").filter((d) => fs.statSync(path.join(SRC, "interviews/questions", d)).isDirectory())) {
  for (const f of ls("interviews/questions/" + card).filter((f) => f.endsWith(".md") && f !== "README.md")) {
    const [fm, md] = front(read("interviews/questions/" + card + "/" + f));
    if (!fm.id || !fm.title) continue;
    const prompt = md.split(/^##\s/m)[0].trim();
    const q = { id: fm.id, title: fm.title, card, kind: fm.kind || "concept", level: Number(fm.level) || 1, roles: [].concat(fm.roles || []), rounds: [].concat(fm.rounds || []), tags: [].concat(fm.tags || []), minutes: Number(fm.minutes) || 8, lessons: [].concat(fm.lessons || []).map(libId).filter(Boolean),
      prompt: fixLinks(prompt, "interviews/questions/" + card), short: section(md, "Short answer"), full: fixLinks(section(md, "Full answer"), "interviews/questions/" + card), followups: section(md, "Follow-ups"), wrong: section(md, "Wrong answers"), gh: ghBlob("interviews/questions/" + card + "/" + f) };
    (ivByCard[card] = ivByCard[card] || []).push(q);
    ivCards.push({ id: q.id, title: q.title, card, kind: q.kind, level: q.level, roles: q.roles, rounds: q.rounds, tags: q.tags, minutes: q.minutes });
  }
}
Object.entries(ivByCard).forEach(([card, qs]) => write("interviews/" + card + ".json", { card, questions: qs }));
let topics = [];
if (exists("interviews/topics.yaml")) {
  // A small reader for the two lists the topics file holds (groups and cards).
  const y = read("interviews/topics.yaml"); let cur = null, mode = null;
  y.split("\n").forEach((l) => {
    if (/^cards:/.test(l)) { mode = "cards"; return; } if (/^groups:/.test(l)) { mode = "groups"; return; }
    const item = l.match(/^\s{2}-\s+id:\s*(.+)$/); if (item) { cur = { id: item[1].trim(), mode }; topics.push(cur); return; }
    const kv = l.match(/^\s{4}(title|group|summary):\s*(.+)$/); if (kv && cur) cur[kv[1]] = kv[2].trim().replace(/^"|"$/g, "");
  });
}

/* ---------- career routes ---------- */
const routes = [];
for (const f of ls("learning-paths").filter((f) => f.endsWith(".json"))) {
  let d; try { d = JSON.parse(read("learning-paths/" + f)); } catch (e) { continue; }
  if (d.kind !== "career-route" && !d.stages) continue;
  routes.push({ id: d.id || f.replace(".json", ""), title: d.title, titles: d.commonTitles || [], summary: d.summary || "", mission: d.mission || "", responsibilities: d.responsibilities || [], goodFitIf: d.goodFitIf || [], baseline: d.baseline || [],
    stages: (d.stages || []).map((s) => ({ id: s.id, title: s.title, outcome: s.outcome || "", lessons: (s.lessonPaths || []).map(libId).filter(Boolean), artifact: s.artifact || "" })),
    readiness: d.readinessCriteria || [], proof: d.portfolioProof || null, projects: d.projects || [], minutes: d.estimatedMinutes || 0, claim: d.completionClaim || "", gh: ghBlob("learning-paths/" + f) });
}

/* ---------- project challenges ---------- */
const projects = [];
for (const id of ls("projects").filter((d) => exists("projects/" + d + "/project.json"))) {
  let p; try { p = JSON.parse(read("projects/" + id + "/project.json")); } catch (e) { continue; }
  if (p.status && p.status !== "ready") continue;
  projects.push({ id, title: p.title, level: p.level || 1, levelName: p.levelName || "", tagline: p.tagline || p.summary || "", hours: p.hours || 0, languages: p.languages || [], skills: p.skills || [], gh: ghTree("projects/" + id) });
}

/* ---------- glossary ---------- */
const glossary = [];
if (exists("glossary/terms.md")) {
  read("glossary/terms.md").split(/^###\s+/m).slice(1).forEach((blk) => {
    const lines = blk.split("\n"), term = lines[0].trim(), e = { term };
    lines.slice(1).forEach((l) => { const m = l.match(/^-\s+\*\*([^*]+):\*\*\s*(.+)$/); if (m) e[m[1].trim().toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "")] = fixLinks(m[2].trim(), "glossary"); });
    if (e.what_it_actually_means) glossary.push(e);
  });
}

/* ---------- cheat sheets (linked, they use the source site's own diagram format) ---------- */
const cheats = ls("cheatsheets").filter((f) => f.endsWith(".md") && !/^[A-Z]/.test(f)).map((f) => { const [fm] = front(read("cheatsheets/" + f)); return fm.id ? { id: fm.id, title: fm.title || fm.id, subtitle: fm.subtitle || "", gh: ghBlob("cheatsheets/" + f) } : null; }).filter(Boolean);

write("index.json", { source: { title: "AI Engineering from Scratch", author: "Rohit Ghumare", repo: REPO, site: SITE, sha: SHA, licence: "MIT", imported: new Date().toISOString().slice(0, 10) }, phases, problems, collections, topics, cards: ivCards, routes, projects, cheats });
write("glossary.json", { terms: glossary });
fs.copyFileSync(path.join(SRC, "LICENSE"), path.join(OUT, "LICENSE"));
const total = phases.reduce((a, p) => a + p.count, 0), quizzes = phases.length;
console.log("Imported " + phases.length + " phases, " + total + " lessons, " + problems.length + " coding problems, " + ivCards.length + " interview questions, " + routes.length + " career routes, " + projects.length + " projects, " + glossary.length + " glossary terms, " + cheats.length + " cheat sheets. Source " + SHA.slice(0, 7) + ".");
