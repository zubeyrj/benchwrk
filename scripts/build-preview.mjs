// Builds preview/: the real site plus demo.js (in-memory database, sample API answers) for a clickable preview.
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = path.join(root, "preview"); fs.mkdirSync(out, { recursive: true });
await build({ entryPoints: [path.join(root, "src/platform/index.js")], bundle: true, format: "iife", target: "es2020", outfile: path.join(out, "platform.js"), alias: { "@supabase/supabase-js": path.join(root, "preview-src/no-supabase.js") }, legalComments: "none" });
for (const f of ["app.js", "runner.js", "harness.txt", "icon.svg", "privacy.html", "terms.html"]) fs.copyFileSync(path.join(root, "public", f), path.join(out, f));
const content = {};
for (const f of fs.readdirSync(path.join(root, "content/seed")).sort()) content["content/" + f.replace(/\.json$/, "")] = JSON.parse(fs.readFileSync(path.join(root, "content/seed", f), "utf8"));
for (const f of fs.readdirSync(path.join(root, "content/seedx")).sort()) { const d = JSON.parse(fs.readFileSync(path.join(root, "content/seedx", f), "utf8")); content["lessons/" + d.id] = d; }
fs.writeFileSync(path.join(out, "demo.js"), "window.__PREVIEW_CONTENT = " + JSON.stringify(content) + ";\n" + fs.readFileSync(path.join(root, "test/fake-supabase.js"), "utf8") + "\n" + fs.readFileSync(path.join(root, "preview-src/demo.js"), "utf8"));
let html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
html = html.replace('<script src="config.js"></script>\n<script src="platform.js"></script>', '<script src="demo.js"></script>\n<script src="platform.js"></script>');
html = html.replace(/<link rel="manifest"[^>]*>\n/, "").replace(/<link rel="icon"[^>]*>/, '<link rel="icon" href="icon.svg" type="image/svg+xml">').replace(/<link rel="apple-touch-icon"[^>]*>\n/, "").replace(/<meta property="og:image"[^>]*>\n/, "");
html = html.replace("</style>", ".preview-bar{position:relative;z-index:21;background:#fff4d6;color:#5a3b00;font-size:13.5px;line-height:1.4;padding:8px 16px;text-align:center}.preview-bar b{margin-right:6px}\n</style>");
html = html.replace("<title>Benchwork</title>", "<title>Benchwork preview</title>");
if (!html.includes('src="demo.js"')) throw new Error("script swap failed");
fs.writeFileSync(path.join(out, "index.html"), html);
console.log("preview built: " + fs.readdirSync(out).join(", "));
