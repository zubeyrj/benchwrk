// GET /cal/<token>.ics (rewritten to /api/cal?t=<token>): a member's study calendar, for calendar apps to subscribe to.
import { SITE, adminClient, getDoc, withErrors } from "./_lib.js";
import { buildCalendar } from "./_ics.js";

export default withErrors(async function handler(req, res) {
  const q = req.query || Object.fromEntries(new URL(req.url || "/", "http://x").searchParams);
  const t = String(q.t || "").replace(/\.ics$/, "");
  if (!/^[0-9a-f-]{36}$/.test(t)) { res.statusCode = 404; return res.end("Not found"); }
  const { data: p } = await adminClient().from("profiles").select("id").eq("cal_token", t).maybeSingle();
  if (!p) { res.statusCode = 404; return res.end("This calendar link has been replaced. Get the new one from Benchwrk > Schedule."); }
  const state = (await getDoc("data/users/" + p.id + "/state")) || {};
  res.statusCode = 200;
  res.setHeader("content-type", "text/calendar; charset=utf-8");
  res.setHeader("content-disposition", 'inline; filename="benchwrk.ics"');
  res.setHeader("cache-control", "private, max-age=900");
  res.setHeader("x-robots-tag", "noindex");
  res.end(buildCalendar(state, { uid: p.id.slice(0, 8), site: SITE() }));
});
