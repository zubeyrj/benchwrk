// Checks every outside link in the course content. Prints a Markdown report; exits 1 if any link is broken.
// Run: npm run links   (the weekly GitHub Action runs it and opens an issue when something breaks)
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const found = new Map(); // url -> [where]
const add = (url, where) => { url = url.replace(/[).,;]+$/, ""); if (!/^https?:\/\//.test(url)) return; if (!found.has(url)) found.set(url, []); found.get(url).push(where); };
const scan = (text, where) => { for (const m of String(text || "").matchAll(/https?:\/\/[^\s"'<>\]]+/g)) add(m[0], where); };
for (const f of fs.readdirSync(path.join(root, "content/seed"))) {
  const d = JSON.parse(fs.readFileSync(path.join(root, "content/seed", f), "utf8")), name = d.title || f;
  (d.resources || []).forEach((r) => add(r[3], name + ": resources"));
  scan(JSON.stringify(Object.assign({}, d, { resources: [] })), name);
}
for (const f of fs.readdirSync(path.join(root, "content/seedx"))) {
  const d = JSON.parse(fs.readFileSync(path.join(root, "content/seedx", f), "utf8"));
  (d.lessons || []).forEach((l, i) => scan(l.md, d.id + " lesson " + (i + 1)));
  (d.ex || []).forEach((x) => scan(x.md, d.id + " exercise " + x.id));
}
const UA = "Mozilla/5.0 (compatible; BenchwrkLinkCheck/1.0)";
async function check(url) {
  for (const method of ["HEAD", "GET"]) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(url, { method, redirect: "follow", signal: ctl.signal, headers: { "user-agent": UA, accept: "text/html,*/*" } });
      if (r.ok) return { ok: true, status: r.status };
      if (method === "GET" || ![403, 405, 400, 501].includes(r.status)) return { ok: [401, 403, 429].includes(r.status), status: r.status, soft: [401, 403, 429].includes(r.status) };
    } catch (e) { if (method === "GET") return { ok: false, status: e.name === "AbortError" ? "timeout" : "unreachable" }; }
    finally { clearTimeout(t); }
  }
}
const urls = [...found.keys()], results = [];
for (let i = 0; i < urls.length; i += 8) results.push(...(await Promise.all(urls.slice(i, i + 8).map(async (u) => Object.assign({ url: u }, await check(u))))));
const broken = results.filter((r) => !r.ok), soft = results.filter((r) => r.soft);
console.log("# Link check\n\nChecked " + urls.length + " links in the course content: " + broken.length + " broken" + (soft.length ? ", " + soft.length + " that refuse automated checks (open them by hand)" : "") + ".\n");
if (broken.length) { console.log("| Link | Status | Where |\n|---|---|---|"); broken.forEach((b) => console.log("| " + b.url + " | " + b.status + " | " + found.get(b.url).slice(0, 3).join("; ") + " |")); console.log("\nFix them in Admin > Course editor, or in content/ and run `npm run content`."); }
process.exit(broken.length ? 1 : 0);
