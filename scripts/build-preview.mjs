// Builds preview/: the real site plus demo.js (in-memory database, sample API answers) for a clickable preview.
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = path.join(root, "preview"); fs.mkdirSync(out, { recursive: true });
await build({ entryPoints: [path.join(root, "src/platform/index.js")], bundle: true, format: "iife", target: "es2020", outfile: path.join(out, "platform.js"), alias: { "@supabase/supabase-js": path.join(root, "preview-src/no-supabase.js") }, legalComments: "none" });
for (const f of ["app.js", "runner.js", "harness.txt", "icon.svg", "privacy.html", "terms.html"]) fs.copyFileSync(path.join(root, "public", f), path.join(out, f));
// A small slice of the library (the full one is 14 MB): three Agent Engineering lessons, one practice problem, 15 glossary terms.
{
  const lib = path.join(root, "public/library"), dst = path.join(out, "library");
  fs.rmSync(dst, { recursive: true, force: true }); fs.mkdirSync(path.join(dst, "lessons"), { recursive: true }); fs.mkdirSync(path.join(dst, "practice"));
  const ix = JSON.parse(fs.readFileSync(path.join(lib, "index.json"), "utf8"));
  const ph = ix.phases.find((x) => x.id === "lib-14"), keep = ph.lessons.slice(0, 3);
  const prob = ix.problems.filter((x) => x.id === "discounted-returns").map((x) => Object.assign({}, x, { lesson: "" }));
  const mini = { source: ix.source, phases: [Object.assign({}, ph, { count: keep.length, mins: keep.reduce((a, l) => a + (l.min || 0), 0), lessons: keep })], problems: prob,
    collections: ix.collections.filter((c) => prob.some((x) => (x.collections || []).indexOf(c.id) >= 0)), topics: [], cards: [], routes: [], projects: [], cheats: [] };
  fs.writeFileSync(path.join(dst, "index.json"), JSON.stringify(mini));
  for (const l of keep) fs.copyFileSync(path.join(lib, "lessons", l.id + ".json"), path.join(dst, "lessons", l.id + ".json"));
  for (const x of prob) { const d = JSON.parse(fs.readFileSync(path.join(lib, "practice", x.id + ".json"), "utf8")); d.lesson = ""; fs.writeFileSync(path.join(dst, "practice", x.id + ".json"), JSON.stringify(d)); }
  const g = JSON.parse(fs.readFileSync(path.join(lib, "glossary.json"), "utf8"));
  fs.writeFileSync(path.join(dst, "glossary.json"), JSON.stringify({ terms: g.terms.slice(0, 15) }));
  fs.copyFileSync(path.join(lib, "LICENSE"), path.join(dst, "LICENSE"));
}
const content = {};
for (const f of fs.readdirSync(path.join(root, "content/seed")).sort()) content["content/" + f.replace(/\.json$/, "")] = JSON.parse(fs.readFileSync(path.join(root, "content/seed", f), "utf8"));
for (const f of fs.readdirSync(path.join(root, "content/seedx")).sort()) { const d = JSON.parse(fs.readFileSync(path.join(root, "content/seedx", f), "utf8")); content["lessons/" + d.id] = d; }
fs.writeFileSync(path.join(out, "demo.js"), "window.__PREVIEW_CONTENT = " + JSON.stringify(content) + ";\n" + fs.readFileSync(path.join(root, "test/fake-supabase.js"), "utf8") + "\n" + fs.readFileSync(path.join(root, "preview-src/demo.js"), "utf8"));
let html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
html = html.replace('<script src="config.js"></script>\n<script src="platform.js"></script>', '<script src="demo.js"></script>\n<script src="platform.js"></script>');
html = html.replace(/<link rel="manifest"[^>]*>\n/, "").replace(/<link rel="icon"[^>]*>/, '<link rel="icon" href="icon.svg" type="image/svg+xml">').replace(/<link rel="apple-touch-icon"[^>]*>\n/, "").replace(/<meta property="og:image"[^>]*>\n/, "");
html = html.replace("</style>", ".preview-bar{position:relative;z-index:21;background:#fff4d6;color:#5a3b00;font-size:13.5px;line-height:1.4;padding:8px 16px;text-align:center}.preview-bar b{margin-right:6px}\n</style>");
html = html.replace("<title>Benchwrk</title>", "<title>Benchwrk preview</title>");
if (!html.includes('src="demo.js"')) throw new Error("script swap failed");
fs.writeFileSync(path.join(out, "index.html"), html);
console.log("preview built: " + fs.readdirSync(out).join(", "));
