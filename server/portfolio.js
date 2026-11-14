// GET /p/<slug> (rewritten to /api/portfolio?slug=<slug>) -> a member's public portfolio page:
// their projects with links and peer-review scores, certificates and study record. Only shown once
// they publish it; hidden if the owner hides it or the account is suspended.
import { SITE, adminClient, esc, withErrors } from "./_lib.js";

const PROJECTS = ["m7", "m8", "m9"];
export const safeUrl = (u) => (typeof u === "string" && u.length < 400 && /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : "");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthYear = (iso) => { const d = new Date(String(iso).slice(0, 10) + "T00:00:00Z"); return isNaN(d) ? "" : MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear(); };

export async function loadPortfolio(slug) {
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug || "")) return null;
  const db = adminClient();
  const { data: pf } = await db.from("portfolios").select("user_id, slug, published, headline, about, links, show, hidden, updated_at").eq("slug", slug).maybeSingle();
  if (!pf || !pf.published || pf.hidden) return null;
  const id = pf.user_id;
  const [sum, subs, prof, certs, reviews, mods] = await Promise.all([
    db.from("docs").select("data").eq("path", "learners/" + id).maybeSingle(),
    db.from("docs").select("data").eq("path", "subs/" + id).maybeSingle(),
    db.from("profiles").select("name").eq("id", id).maybeSingle(),
    db.from("certs").select("id, course_title, issued").eq("user_id", id),
    db.from("docs").select("data").eq("parent", "reviews").limit(5000),
    db.from("docs").select("path, data").in("path", PROJECTS.map((m) => "content/" + m)),
  ]);
  const S = (sum.data && sum.data.data) || {};
  if (S.suspended) return null;
  const title = Object.fromEntries((mods.data || []).map((r) => [r.path.split("/")[1], String((r.data && r.data.title) || "").replace(/: project \d/i, "")]));
  const items = (subs.data && subs.data.data && subs.data.data.items) || {};
  const projects = PROJECTS.filter((m) => items[m] && (safeUrl(items[m].repo) || safeUrl(items[m].demo))).map((m) => {
    const rs = (reviews.data || []).map((r) => r.data && r.data.given && r.data.given[id + ":" + m]).filter((g) => g && Array.isArray(g.s) && g.s.length);
    const avg = rs.length ? Math.round((rs.reduce((a, g) => a + g.s.reduce((x, y) => x + Number(y || 0), 0) / g.s.length, 0) / rs.length) * 10) / 10 : null;
    return { id: m, title: title[m] || "Project", repo: safeUrl(items[m].repo), demo: safeUrl(items[m].demo), note: String(items[m].note || "").slice(0, 400), at: items[m].at || "", problem: String(items[m].problem || "").slice(0, 300), result: String(items[m].result || "").slice(0, 300), how: String(items[m].how || "").slice(0, 600), stack: String(items[m].stack || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12), image: safeUrl(items[m].image), video: safeUrl(items[m].video), reviews: rs.length, avg, quotes: rs.map((g) => String(g.c || "").trim()).filter((c) => c.length > 12).slice(0, 2) };
  });
  return { pf, name: S.name || (prof.data && prof.data.name) || "A benchwrk member", stats: { level: Number(S.lvl) || 1, hours: Math.round(Number(S.hours) || 0), streak: Number(S.streak) || 0, pct: Number(S.pct) || 0, cur: S.cur || "" }, projects, certs: certs.data || [] };
}

export function renderPortfolio(P, site) {
  const pf = P.pf, show = Object.assign({ projects: true, certs: true, stats: true, reviews: true, index: false }, pf.show || {}), L = pf.links || {}, url = site + "/p/" + pf.slug;
  const links = [["GitHub", safeUrl(L.github)], ["LinkedIn", safeUrl(L.linkedin)], ["Website", safeUrl(L.web)]].filter((x) => x[1]);
  const desc = pf.headline || P.name + "'s AI engineering portfolio";
  const proj = show.projects && P.projects.length ? '<section><h2>Projects</h2>' + P.projects.map((x) => '<article class="proj"><h3>' + esc(x.title) + "</h3>" + (x.result ? "<p><b>" + esc(x.result) + "</b></p>" : "") + (x.note && !x.result ? "<p>" + esc(x.note) + "</p>" : "") + (x.problem ? '<p class="row"><a href="' + esc(url + "/" + x.id) + '">Read the case study</a></p>' : "") +
    '<p class="row">' + (x.repo ? '<a href="' + esc(x.repo) + '" rel="nofollow noopener ugc" target="_blank">Code</a>' : "") + (x.demo ? '<a href="' + esc(x.demo) + '" rel="nofollow noopener ugc" target="_blank">Live demo</a>' : "") + (x.at ? '<span class="muted">' + esc(monthYear(x.at)) + "</span>" : "") + "</p>" +
    (show.reviews && x.reviews ? '<p class="rev"><b>' + x.avg + " / 3</b> from " + x.reviews + " peer review" + (x.reviews === 1 ? "" : "s") + (x.quotes.length ? "</p>" + x.quotes.map((q) => "<blockquote>" + esc(q) + "</blockquote>").join("") : "</p>") : "") + "</article>").join("") + "</section>" : "";
  const certs = show.certs && P.certs.length ? "<section><h2>Certificates</h2><ul class=\"certs\">" + P.certs.map((c) => '<li><a href="' + esc(site + "/c/" + c.id) + '">' + esc(c.course_title) + '</a> <span class="muted">' + esc(monthYear(c.issued)) + "</span></li>").join("") + "</ul></section>" : "";
  const stats = show.stats ? '<div class="stats"><div><b>' + P.stats.hours + "</b>hours of logged study</div><div><b>Level " + P.stats.level + "</b>on benchwrk</div><div><b>" + P.stats.pct + "%</b>of the AI engineer route" + (P.stats.cur && P.stats.pct < 100 ? ", now on " + esc(P.stats.cur) : "") + "</div></div>" : "";
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(P.name)} · AI engineering portfolio</title>${show.index ? "" : '\n<meta name="robots" content="noindex">'}
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="profile"><meta property="og:url" content="${esc(url)}"><meta property="og:title" content="${esc(P.name)}: AI engineering portfolio"><meta property="og:description" content="${esc(desc)}">
<link rel="icon" href="/icon.svg">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Figtree:wght@400..700&display=swap" rel="stylesheet">
<style>
:root{--ink:#0e1726;--muted:#566173;--paper:#fffdf9;--bg:#f4f1ec;--accent:#ad3214;--line:#e6e0d6}
@media (prefers-color-scheme:dark){:root{--ink:#e8edf5;--muted:#a0abc0;--paper:#111a2c;--bg:#0a1120;--accent:#ff8a66;--line:#22304a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Figtree,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55;padding:32px 16px}
main{max-width:760px;margin:0 auto}a{color:var(--accent);font-weight:700}
header{margin-bottom:26px}.k{text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700;color:var(--accent);margin:0 0 8px}
h1{font-family:"Bricolage Grotesque",Figtree,sans-serif;font-size:clamp(34px,7vw,52px);line-height:1.03;letter-spacing:-.03em;margin:0 0 10px}
.head{font-size:clamp(17px,3vw,21px);color:var(--muted);margin:0 0 14px}.about{white-space:pre-line;margin:0 0 14px}
.row{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;margin:8px 0}.muted{color:var(--muted);font-weight:400;font-size:14px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 28px}.stats div{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:14px;font-size:13.5px;color:var(--muted)}.stats b{display:block;color:var(--ink);font-size:22px}
h2{font-family:"Bricolage Grotesque",Figtree,sans-serif;font-size:24px;margin:28px 0 12px}
.proj{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin:0 0 12px}.proj h3{margin:0 0 6px;font-size:19px}.proj p{margin:6px 0}
.rev{font-size:14.5px}blockquote{margin:8px 0 0;padding:8px 12px;border-left:3px solid var(--accent);background:var(--bg);border-radius:0 8px 8px 0;font-size:14.5px}
.certs{padding-left:18px}.certs li{margin:6px 0}
footer{margin-top:36px;font-size:14px;color:var(--muted);text-align:center}
@media (max-width:560px){.stats{grid-template-columns:1fr}}
</style></head><body><main>
<header><p class="k">AI engineering portfolio</p><h1>${esc(P.name)}</h1>${pf.headline ? `<p class="head">${esc(pf.headline)}</p>` : ""}${pf.about ? `<p class="about">${esc(pf.about)}</p>` : ""}
${links.length ? '<p class="row">' + links.map((l) => '<a href="' + esc(l[1]) + '" rel="me noopener" target="_blank">' + l[0] + "</a>").join("") + "</p>" : ""}</header>
${stats}${proj}${certs}
<footer>Projects reviewed by other learners on <a href="${esc(site)}">benchwrk</a>, a free training ground for AI engineers.</footer>
</main></body></html>`;
}

// GET /p/<slug>/<project> -> one project as a CV-ready case study: problem, result, how, tools, links.
// "?print=1" opens the print dialog so it can be saved as a PDF.
export function renderCaseStudy(P, id, site, print) {
  const x = P.projects.find((p) => p.id === id);
  if (!x || !x.problem) return null;
  const url = site + "/p/" + P.pf.slug + "/" + id, base = site + "/p/" + P.pf.slug;
  const links = [["Live demo", x.demo], ["Code", x.repo], ["Video", x.video]].filter((l) => l[1]);
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(x.title)} · ${esc(P.name)}</title><meta name="robots" content="noindex">
<meta name="description" content="${esc(x.result || x.problem)}">
<meta property="og:type" content="article"><meta property="og:url" content="${esc(url)}"><meta property="og:title" content="${esc(x.title)}: ${esc(P.name)}"><meta property="og:description" content="${esc(x.result || x.problem)}">${x.image ? `<meta property="og:image" content="${esc(x.image)}">` : ""}
<link rel="icon" href="/icon.svg">
<style>
:root{--ink:#0e1726;--muted:#566173;--accent:#ad3214;--line:#e6e0d6;--bg:#fffdf9}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.55;padding:40px 18px}
main{max-width:720px;margin:0 auto}a{color:var(--accent);font-weight:700}
.by{color:var(--muted);margin:0 0 6px;font-size:15px}h1{font-size:clamp(30px,6vw,44px);line-height:1.08;letter-spacing:-.02em;margin:0 0 18px}
.result{font-size:20px;font-weight:700;border-left:4px solid var(--accent);padding:4px 0 4px 14px;margin:0 0 24px}
h2{font-size:14px;letter-spacing:.06em;color:var(--muted);margin:24px 0 6px}p{margin:0 0 10px}
.tools{display:flex;flex-wrap:wrap;gap:6px;padding:0;margin:0;list-style:none}.tools li{border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:14px}
.links{display:flex;flex-wrap:wrap;gap:8px 18px;margin:22px 0}img{max-width:100%;border:1px solid var(--line);border-radius:10px;margin:18px 0}
footer{margin-top:34px;font-size:13.5px;color:var(--muted)}
@media print{body{padding:0}a{color:var(--ink)}a[href^="http"]::after{content:" (" attr(href) ")";font-weight:400;font-size:12px;color:var(--muted)}.noprint{display:none}}
</style></head><body><main>
<p class="by"><a href="${esc(base)}">${esc(P.name)}</a>, AI engineering portfolio</p>
<h1>${esc(x.title)}</h1>
${x.result ? `<p class="result">${esc(x.result)}</p>` : ""}
<h2>THE PROBLEM</h2><p>${esc(x.problem)}</p>
${x.how ? `<h2>HOW IT WORKS</h2><p>${esc(x.how)}</p>` : ""}
${x.stack.length ? `<h2>TOOLS</h2><ul class="tools">${x.stack.map((t) => "<li>" + esc(t) + "</li>").join("")}</ul>` : ""}
${x.image ? `<img src="${esc(x.image)}" alt="Screenshot of ${esc(x.title)}">` : ""}
${links.length ? '<p class="links">' + links.map((l) => '<a href="' + esc(l[1]) + '" rel="nofollow noopener ugc" target="_blank">' + l[0] + "</a>").join("") + "</p>" : ""}
${x.reviews ? `<p class="by">Peer reviewed: ${x.avg} / 3 from ${x.reviews} review${x.reviews === 1 ? "" : "s"}.</p>` : ""}
<footer class="noprint">Built on <a href="${esc(site)}">benchwrk</a>. <a href="${esc(base)}">See all projects</a>.</footer>
</main>${print ? "<script>addEventListener('load',()=>setTimeout(()=>print(),300))</script>" : ""}</body></html>`;
}

export default withErrors(async function handler(req, res) {
  const q = new URL(req.url, "http://x").searchParams;
  const slug = (q.get("slug") || "").toLowerCase(), proj = (q.get("proj") || "").toLowerCase();
  const P = await loadPortfolio(slug), site = SITE();
  if (P && proj) {
    const html = PROJECTS.includes(proj) && renderCaseStudy(P, proj, site, q.get("print") === "1");
    res.setHeader("content-type", "text/html; charset=utf-8");
    if (html) { res.statusCode = 200; res.setHeader("cache-control", "public, max-age=120"); return res.end(html); }
  }
  res.setHeader("content-type", "text/html; charset=utf-8");
  if (!P) {
    res.statusCode = 404;
    return res.end('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Portfolio not found · benchwrk</title></head><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f1ec;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px"><main style="background:#fff;border-radius:16px;padding:28px;max-width:420px;border:1px solid #e6e0d6"><h1 style="font-size:22px;margin:0 0 8px">No portfolio here</h1><p>This page doesn\'t exist or isn\'t public any more.</p><p><a href="' + esc(site) + '" style="color:#ad3214;font-weight:700">Go to benchwrk</a></p></main></body></html>');
  }
  res.statusCode = 200;
  res.setHeader("cache-control", "public, max-age=120");
  res.end(renderPortfolio(P, site));
});
