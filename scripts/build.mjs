// Builds public/: the app (concatenated), the sign-in layer (bundled with Supabase), and config.js from env vars.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { build } from "esbuild";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const pub = (f) => path.join(root, "public", f);

const src = fs.readdirSync(path.join(root, "src/app")).filter((f) => f.endsWith(".js")).sort().map((f) => fs.readFileSync(path.join(root, "src/app", f), "utf8")).join("\n");
fs.writeFileSync(pub("app.js"), src);
execSync("node --check " + JSON.stringify(pub("app.js")));

await build({ entryPoints: [path.join(root, "src/platform/index.js")], bundle: true, minify: true, format: "iife", target: "es2020", outfile: pub("platform.js"), legalComments: "none" });

const env = (k) => process.env[k] || "";
const site = env("SITE_URL") || (env("VERCEL_PROJECT_PRODUCTION_URL") ? "https://" + env("VERCEL_PROJECT_PRODUCTION_URL") : "");
fs.writeFileSync(pub("config.js"), "window.BW_CONFIG = Object.assign(" + JSON.stringify({ supabaseUrl: env("SUPABASE_URL"), supabaseAnonKey: env("SUPABASE_ANON_KEY"), siteUrl: site, turnstileSiteKey: env("TURNSTILE_SITE_KEY"), vapidPublicKey: env("VAPID_PUBLIC_KEY") }) + ", window.BW_CONFIG || {});\n");

// The library (AI Engineering from Scratch, MIT) is served as static JSON files.
const LIB = path.join(root, "content/aefs");
if (fs.existsSync(LIB)) { fs.rmSync(pub("library"), { recursive: true, force: true }); fs.cpSync(LIB, pub("library"), { recursive: true }); }

// Legal pages carry the owner's contact address from CONTACT_EMAIL, so it stays out of the repo.
for (const f of ["privacy.html", "terms.html"]) {
  const t = path.join(root, "src/pages", f);
  if (fs.existsSync(t)) fs.writeFileSync(pub(f), fs.readFileSync(t, "utf8").replaceAll("{{CONTACT_EMAIL}}", env("CONTACT_EMAIL") || "the email address on the Benchwork sign-in page").replaceAll("{{UPDATED}}", "10 November 2026"));
}
console.log("built" + (env("SUPABASE_URL") ? "" : " (no SUPABASE_URL: the site will show its setup screen)"));
