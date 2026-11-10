// The one server function. Vercel's free plan allows 12 functions per deployment, so every /api/<route>
// is rewritten here (see vercel.json) and handed to its handler in server/, loaded only when needed.
const ROUTES = {
  "admin-email": () => import("../server/admin-email.js"),
  "admin-moderate": () => import("../server/admin-moderate.js"),
  "admin-seed": () => import("../server/admin-seed.js"),
  backup: () => import("../server/backup.js"),
  "cal-link": () => import("../server/cal-link.js"),
  cal: () => import("../server/cal.js"),
  cert: () => import("../server/cert.js"),
  health: () => import("../server/health.js"),
  interviewer: () => import("../server/interviewer.js"),
  "job-fetch": () => import("../server/job-fetch.js"),
  jobs: () => import("../server/jobs.js"),
  "me-delete": () => import("../server/me-delete.js"),
  "me-export": () => import("../server/me-export.js"),
  nudge: () => import("../server/nudge.js"),
  portfolio: () => import("../server/portfolio.js"),
  push: () => import("../server/push.js"),
  "report-error": () => import("../server/report-error.js"),
  tutor: () => import("../server/tutor.js"),
  unsubscribe: () => import("../server/unsubscribe.js"),
  "cron/daily": () => import("../server/cron/daily.js"),
  "cron/league": () => import("../server/cron/league.js"),
  "cron/nudge": () => import("../server/cron/nudge.js"),
  "cron/weekly": () => import("../server/cron/weekly.js"),
};

export function routeOf(req) {
  const q = req.query || {};
  let r = Array.isArray(q.r) ? q.r.join("/") : q.r;
  if (!r) { const m = (req.url || "").match(/^\/api\/([a-z0-9/-]+)/); r = m ? m[1] : ""; }
  return String(r || "").replace(/^\/+|\/+$/g, "");
}

export default async function handler(req, res) {
  const load = ROUTES[routeOf(req)];
  if (!load) { res.statusCode = 404; res.setHeader("content-type", "application/json"); return res.end(JSON.stringify({ error: "Not found." })); }
  if (req.query) delete req.query.r;
  return (await load()).default(req, res);
}
