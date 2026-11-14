// Builds public/: the app (concatenated), the sign-in layer (bundled with Supabase), and config.js from env vars.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { build } from "esbuild";
import { contentHash } from "./content-hash.mjs";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const pub = (f) => path.join(root, "public", f);

const src = fs.readdirSync(path.join(root, "src/app")).filter((f) => f.endsWith(".js")).sort().map((f) => fs.readFileSync(path.join(root, "src/app", f), "utf8")).join("\n");
fs.writeFileSync(pub("app.js"), "window.BW_CONTENT_V = " + JSON.stringify(contentHash(root)) + ";\n" + src);
execSync("node --check " + JSON.stringify(pub("app.js")));

// The public homepage's plan calculator and sample exercise come from the course content.
{
  const seed = path.join(root, "content/seed"), mods = fs.readdirSync(seed).filter((f) => /^m\d+\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(seed, f), "utf8"))).sort((a, b) => a.order - b.order);
  const ex = JSON.parse(fs.readFileSync(path.join(root, "content/seedx/lx-m1.json"), "utf8")).ex[0];
  const plan = { courses: mods.map((m) => ({ id: m.id, t: m.title, h: m.lean || m.hours, full: m.hours, extra: !!m.extra, ph: m.phase, zero: !!m.zero, job: !!m.interview, project: m.project || 0, why: m.project ? m.why : undefined })), ex: { t: ex.t, md: ex.md, sol: ex.sol, tests: ex.tests.map((t) => t[0]) } };
  fs.writeFileSync(path.join(root, "src/platform/plan-data.json"), JSON.stringify(plan, null, 1) + "\n");
}
await build({ entryPoints: [path.join(root, "src/platform/index.js")], bundle: true, minify: true, format: "iife", target: "es2020", outfile: pub("platform.js"), legalComments: "none" });

const env = (k) => process.env[k] || "";
const site = (/\.vercel\.app/i.test(env("SITE_URL")) ? "https://benchwrk.com" : env("SITE_URL")) || (env("VERCEL_PROJECT_PRODUCTION_URL") ? "https://" + env("VERCEL_PROJECT_PRODUCTION_URL") : "");
fs.writeFileSync(pub("config.js"), "window.BW_CONFIG = Object.assign(" + JSON.stringify({ supabaseUrl: env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL"), supabaseAnonKey: env("SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("SUPABASE_PUBLISHABLE_KEY"), siteUrl: site, turnstileSiteKey: env("TURNSTILE_SITE_KEY"), vapidPublicKey: env("VAPID_PUBLIC_KEY"), googleClientId: env("GOOGLE_CLIENT_ID") }) + ", window.BW_CONFIG || {});\n");

// A public worked example (project 1's mini RAG), so visitors can see a real build before signing up.
{
  const m7 = JSON.parse(fs.readFileSync(path.join(root, "content/seed/m7.json"), "utf8")), w = m7.proj && m7.proj.worked;
  if (w) {
    const h = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const inl = (t) => h(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    const mdx = (src) => {
      const out = []; let code = null, list = null, para = [];
      const flush = () => { if (para.length) { out.push("<p>" + inl(para.join(" ")) + "</p>"); para = []; } if (list) { out.push("<ul>" + list.map((x) => "<li>" + inl(x) + "</li>").join("") + "</ul>"); list = null; } };
      for (const line of src.split("\n")) {
        if (code !== null) { if (/^```/.test(line)) { out.push('<pre tabindex="0"><code>' + h(code.join("\n")) + "</code></pre>"); code = null; } else code.push(line); continue; }
        if (/^```/.test(line)) { flush(); code = []; continue; }
        if (/^- /.test(line)) { if (para.length) { out.push("<p>" + inl(para.join(" ")) + "</p>"); para = []; } (list = list || []).push(line.slice(2)); continue; }
        if (!line.trim()) { flush(); continue; }
        if (list) flush();
        para.push(line.trim());
      }
      flush(); return out.join("\n");
    };
    const tpl = fs.readFileSync(path.join(root, "src/pages/privacy.html"), "utf8");
    const head = tpl.slice(0, tpl.indexOf("</style>")).replace(/<title>[^<]*<\/title>/, "<title>" + h(w.t) + " · benchwrk worked example</title>") +
      "pre{background:#0e1726;color:#e8edf5;border-radius:12px;padding:16px;overflow-x:auto;font:14px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em}p code,li code{background:var(--line);padding:1px 5px;border-radius:5px}" +
      "ol.steps{list-style:none;counter-reset:s;padding:0;margin:24px 0 0}ol.steps>li{counter-increment:s;margin:0 0 28px}ol.steps>li>h2::before{content:counter(s) \". \";color:var(--accent)}.cta{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;margin-top:8px}" +
      "</style>";
    const body = '<meta name="description" content="' + h(w.intro) + '"></head><body><header><div style="max-width:760px;margin:0 auto"><a href="/"><img src="/icon.svg" width="28" height="28" alt="">benchwrk</a></div></header><div class="wrap"><main>' +
      '<p class="muted" style="margin:0 0 6px">Worked example from project 1, ' + h(m7.title.replace(/: project \d/i, "")) + "</p><h1>" + h(w.t) + "</h1><p>" + inl(w.intro) + "</p>" +
      '<ol class="steps">' + w.steps.map((st) => "<li><h2>" + h(st.t) + "</h2>" + mdx(st.md) + "</li>").join("") + "</ol>" +
      '<h2>Build the full version with benchwrk</h2><p>This is the small version. On benchwrk you build the real one step by step, with a plan that fits your week, exercises that check themselves and another member reviewing your project.</p><a class="cta" href="/?join">Build my plan, free</a>' +
      "</main></div></body></html>\n";
    fs.writeFileSync(pub("example.html"), head.replace(/<\/head>[\s\S]*$/, "") + body);
  }
}

// The library (AI Engineering from Scratch, MIT) is served as static JSON files.
const LIB = path.join(root, "content/aefs");
if (fs.existsSync(LIB)) { fs.rmSync(pub("library"), { recursive: true, force: true }); fs.cpSync(LIB, pub("library"), { recursive: true }); }

// Legal pages carry the owner's contact address from CONTACT_EMAIL, so it stays out of the repo.
for (const f of ["privacy.html", "terms.html"]) {
  const t = path.join(root, "src/pages", f);
  if (fs.existsSync(t)) fs.writeFileSync(pub(f), fs.readFileSync(t, "utf8").replaceAll("{{CONTACT_EMAIL}}", env("CONTACT_EMAIL") || "the email address on the benchwrk sign-in page").replaceAll("{{UPDATED}}", "10 November 2026"));
}
console.log("built" + (env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") ? "" : " (no SUPABASE_URL: the site will show its setup screen)"));
