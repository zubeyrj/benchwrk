// Settles the weekly leagues. Called by the hourly reminders job and the daily cron, so it runs
// within the first hour of Monday (UTC); safe to call any number of times.
import { adminClient, requireCron, send, withErrors } from "../_lib.js";
import { addNewcomers, mondayIso, rollLeagues } from "../_league.js";

export async function updateLeagues(now) {
  const db = adminClient();
  const [{ data: L }, { data: rows }] = await Promise.all([
    db.from("docs").select("data").eq("path", "content/league").maybeSingle(),
    db.from("docs").select("path, data").eq("parent", "learners").limit(10000),
  ]);
  const summaries = Object.fromEntries((rows || []).map((r) => [r.path.split("/")[1], r.data || {}]));
  const wk = mondayIso(now), today = now.toISOString().slice(0, 10), prev = L && L.data && L.data.wk ? L.data : null;
  let league, rolled = false;
  if (!prev || prev.wk !== wk) { league = rollLeagues(prev, summaries, wk, today); rolled = true; }
  else { league = prev; if (!addNewcomers(league, summaries, today)) return { rolled: false, changed: false, members: Object.keys(league.group).length }; }
  await db.from("docs").upsert({ path: "content/league", data: league }, { onConflict: "path" });
  return { rolled, changed: true, members: Object.keys(league.group).length };
}

export default withErrors(async function handler(req, res) {
  if (!requireCron(req, res)) return;
  send(res, 200, await updateLeagues(globalThis.__testNow ? new Date(globalThis.__testNow) : new Date()));
});
