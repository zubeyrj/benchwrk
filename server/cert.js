// GET /c/<id> (rewritten to /api/cert?id=<id>) -> a public page anyone can use to verify a certificate.
// Carries Open Graph tags so the link previews well on LinkedIn.
import { SITE, adminClient, esc, withErrors } from "./_lib.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (iso) => { const d = new Date(iso + "T00:00:00Z"); return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear(); };

export default withErrors(async function handler(req, res) {
  const id = new URL(req.url, "http://x").searchParams.get("id") || "";
  let c = null;
  if (/^[0-9a-f]{16}$/.test(id)) { const { data } = await adminClient().from("certs").select("id, name, course_title, hours, issued").eq("id", id).maybeSingle(); c = data; }
  const site = SITE(), url = site + "/c/" + id;
  res.setHeader("content-type", "text/html; charset=utf-8");
  if (!c) {
    res.statusCode = 404;
    return res.end('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Certificate not found · benchwrk</title></head><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f1ec;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px"><main style="background:#fff;border-radius:16px;padding:28px;max-width:420px;border:1px solid #e6e0d6"><h1 style="font-size:22px;margin:0 0 8px">No certificate here</h1><p>This link doesn\'t match a benchwrk certificate. Check it was copied in full.</p><p><a href="' + site + '" style="color:#c93c1a;font-weight:700">Go to benchwrk</a></p></main></body></html>');
  }
  res.statusCode = 200;
  res.setHeader("cache-control", "public, max-age=300");
  const title = c.name + " completed " + c.course_title;
  const hours = c.hours ? Math.round(Number(c.hours)) + " hours of logged study" : "";
  res.end(`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · benchwrk</title>
<meta name="description" content="${esc(title)} on benchwrk, issued ${esc(longDate(c.issued))}.">
<meta property="og:type" content="website"><meta property="og:url" content="${esc(url)}"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="Verified benchwrk certificate, issued ${esc(longDate(c.issued))}.${hours ? " " + esc(hours) + "." : ""}">
<meta property="og:image" content="${esc(site)}/og-cert.png"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icon.svg">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Figtree:wght@400..700&display=swap" rel="stylesheet">
<style>
:root{--ink:#0e1726;--muted:#5b6474;--paper:#fffdf9;--bg:#f4f1ec;--accent:#c93c1a;--line:#e6e0d6}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Figtree,-apple-system,Segoe UI,Roboto,sans-serif;min-height:100vh;display:grid;place-items:center;padding:28px 16px}
main{width:100%;max-width:760px}
.cert{background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:clamp(26px,6vw,56px);position:relative;overflow:hidden;box-shadow:0 30px 60px -30px rgb(14 23 38 / .25)}
.cert:before{content:"";position:absolute;inset:12px;border:1.5px solid var(--line);border-radius:12px;pointer-events:none}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px;letter-spacing:-.02em}.brand i{width:30px;height:30px;border-radius:8px;background:var(--accent);color:#fff;display:grid;place-items:center;font-style:normal}
.k{margin:34px 0 6px;text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700;color:var(--accent)}
h1{font-family:"Bricolage Grotesque",Figtree,sans-serif;font-size:clamp(34px,7vw,56px);line-height:1.02;letter-spacing:-.035em;margin:0 0 14px}
.course{font-size:clamp(18px,3.4vw,24px);margin:0 0 30px;color:var(--muted)}.course b{color:var(--ink)}
.meta{display:flex;flex-wrap:wrap;gap:12px 34px;font-size:14px;color:var(--muted)}.meta b{display:block;color:var(--ink);font-size:16px}
.ok{display:inline-flex;align-items:center;gap:8px;margin-top:22px;padding:8px 12px;border-radius:999px;background:#e7f6ee;color:#0d6b3c;font-weight:700;font-size:13px}
.foot{margin-top:18px;font-size:14px;color:var(--muted);text-align:center}.foot a{color:var(--accent);font-weight:700}
</style></head><body><main>
<article class="cert" aria-label="Certificate">
<div class="brand"><i>b</i>benchwrk</div>
<p class="k">Certificate of completion</p>
<h1>${esc(c.name)}</h1>
<p class="course">completed <b>${esc(c.course_title)}</b></p>
<div class="meta"><div>Issued<b>${esc(longDate(c.issued))}</b></div>${hours ? `<div>Study<b>${esc(hours)}</b></div>` : ""}<div>Certificate ID<b>${esc(c.id)}</b></div></div>
<span class="ok"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Verified by benchwrk</span>
</article>
<p class="foot">benchwrk takes people from zero to AI engineer. <a href="${esc(site)}">Start free</a></p>
</main></body></html>`);
});
