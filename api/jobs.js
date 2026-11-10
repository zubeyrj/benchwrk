// GET /api/jobs?q=AI engineer&where=London&remote=1 -> live job adverts from official job-board APIs.
// Uses Adzuna and Reed when their free keys are set, plus Remotive and Arbeitnow, which need none.
// (Scraping LinkedIn or Indeed breaks their terms, so Benchwork only reads feeds that are offered for this.)
import { htmlToText } from "./_html.js";
import { env, fail, requireUser, send, withErrors } from "./_lib.js";

const cache = new Map(); // key -> { at, body }
const TTL = 20 * 60 * 1000;

async function getJson(url, init = {}) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 7000);
  try { const r = await fetch(url, Object.assign({ signal: ctl.signal, headers: Object.assign({ accept: "application/json" }, init.headers || {}) })); if (!r.ok) throw new Error(String(r.status)); return await r.json(); }
  finally { clearTimeout(t); }
}
const snippet = (s, n = 320) => { const t = htmlToText(s || ""); return t.length > n ? t.slice(0, n).replace(/\s\S*$/, "") + "..." : t; };
const words = (q) => q.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1 && ["and", "or", "the", "in", "of", "for"].indexOf(w) < 0);
const matches = (title, q) => { const t = title.toLowerCase(), ws = words(q); return !ws.length || ws.some((w) => t.includes(w)) || /\b(ai|ml|llm|machine learning|genai|data scien)/.test(t); };
const money = (lo, hi, cur) => { const f = (n) => (cur || "£") + Math.round(n / 1000) + "k"; return lo && hi && lo !== hi ? f(lo) + " to " + f(hi) : lo || hi ? f(lo || hi) : ""; };

const SOURCES = {
  async adzuna(q, where) {
    if (!env("ADZUNA_APP_ID") || !env("ADZUNA_APP_KEY")) return null;
    const u = "https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=" + encodeURIComponent(env("ADZUNA_APP_ID")) + "&app_key=" + encodeURIComponent(env("ADZUNA_APP_KEY")) +
      "&results_per_page=25&what=" + encodeURIComponent(q) + (where ? "&where=" + encodeURIComponent(where) : "") + "&content-type=application/json&sort_by=date";
    const j = await getJson(u);
    return (j.results || []).map((r) => ({ id: "adzuna:" + r.id, source: "Adzuna", title: htmlToText(r.title), company: (r.company && r.company.display_name) || "", location: (r.location && r.location.display_name) || "", salary: money(r.salary_min, r.salary_max), posted: (r.created || "").slice(0, 10), url: r.redirect_url, snippet: snippet(r.description), full: false }));
  },
  async reed(q, where) {
    if (!env("REED_API_KEY")) return null;
    const u = "https://www.reed.co.uk/api/1.0/search?keywords=" + encodeURIComponent(q) + (where ? "&locationName=" + encodeURIComponent(where) : "") + "&resultsToTake=25";
    const j = await getJson(u, { headers: { authorization: "Basic " + Buffer.from(env("REED_API_KEY") + ":").toString("base64") } });
    const iso = (d) => { const m = String(d || "").match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? m[3] + "-" + m[2] + "-" + m[1] : ""; };
    return (j.results || []).map((r) => ({ id: "reed:" + r.jobId, source: "Reed", title: r.jobTitle, company: r.employerName || "", location: r.locationName || "", salary: money(r.minimumSalary, r.maximumSalary), posted: iso(r.date), url: r.jobUrl, snippet: snippet(r.jobDescription), full: false }));
  },
  async remotive(q) {
    const j = await getJson("https://remotive.com/api/remote-jobs?limit=40&search=" + encodeURIComponent(q));
    return (j.jobs || []).filter((r) => matches(r.title, q)).map((r) => ({ id: "remotive:" + r.id, source: "Remotive", title: r.title, company: r.company_name || "", location: "Remote" + (r.candidate_required_location ? " (" + r.candidate_required_location + ")" : ""), salary: r.salary || "", posted: (r.publication_date || "").slice(0, 10), url: r.url, snippet: snippet(r.description), text: htmlToText(r.description).slice(0, 15000), full: true }));
  },
  async arbeitnow(q) {
    const j = await getJson("https://www.arbeitnow.com/api/job-board-api");
    return (j.data || []).filter((r) => matches(r.title, q)).slice(0, 25).map((r) => ({ id: "arbeitnow:" + r.slug, source: "Arbeitnow", title: r.title, company: r.company_name || "", location: (r.remote ? "Remote, " : "") + (r.location || ""), salary: "", posted: r.created_at ? new Date(r.created_at * 1000).toISOString().slice(0, 10) : "", url: r.url, snippet: snippet(r.description), text: htmlToText(r.description).slice(0, 15000), full: true }));
  },
};

export async function searchJobs(q, where, remote) {
  const key = [q, where, remote].join("|").toLowerCase();
  const hit = cache.get(key); if (hit && Date.now() - hit.at < TTL) return hit.body;
  const names = remote ? ["remotive", "arbeitnow", "adzuna", "reed"] : ["adzuna", "reed", "remotive", "arbeitnow"];
  const settled = await Promise.allSettled(names.map((n) => SOURCES[n](q, remote ? "" : where)));
  const sources = [], seen = new Set(); let jobs = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled" && s.value === null) return; // not configured
    sources.push({ name: names[i], ok: s.status === "fulfilled", count: s.status === "fulfilled" ? s.value.length : 0 });
    if (s.status === "fulfilled") jobs = jobs.concat(s.value);
  });
  jobs = jobs.filter((j) => { const k = (j.title + "|" + j.company).toLowerCase().replace(/\s+/g, " "); if (seen.has(k)) return false; seen.add(k); return true; });
  jobs.sort((a, b) => (b.posted || "").localeCompare(a.posted || ""));
  const body = { jobs: jobs.slice(0, 50), sources, at: new Date().toISOString() };
  if (jobs.length) cache.set(key, { at: Date.now(), body });
  return body;
}

export default withErrors(async function handler(req, res) {
  if (req.method !== "GET") return fail(res, 405, "Use GET.");
  const user = await requireUser(req, res); if (!user) return;
  const p = new URL(req.url, "http://x").searchParams;
  const q = (p.get("q") || "AI engineer").slice(0, 80).trim() || "AI engineer", where = (p.get("where") || "").slice(0, 60).trim(), remote = p.get("remote") === "1";
  const id = p.get("id");
  if (id) {
    // Full description for a Reed advert (search only returns a summary).
    const m = id.match(/^reed:(\d+)$/);
    if (!m || !env("REED_API_KEY")) return fail(res, 400, "Bad request.");
    try {
      const j = await getJson("https://www.reed.co.uk/api/1.0/jobs/" + m[1], { headers: { authorization: "Basic " + Buffer.from(env("REED_API_KEY") + ":").toString("base64") } });
      return send(res, 200, { title: j.jobTitle, company: j.employerName, location: j.locationName, text: htmlToText(j.jobDescription).slice(0, 15000), url: j.jobUrl });
    } catch (e) { return fail(res, 502, "Reed didn't answer. Try again or paste the advert."); }
  }
  try { send(res, 200, await searchJobs(q, where, remote)); }
  catch (e) { fail(res, 502, "Job search is unavailable right now. Paste a job advert instead."); }
});
