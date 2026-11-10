// POST /api/admin-seed -> loads (or refreshes) every course and lesson from the repo into the database.
// Owner only. Learner records are never touched.
import { CONTENT } from "./_content.js";
import { adminClient, fail, isAdmin, requireUser, send } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  const user = await requireUser(req, res); if (!user) return;
  if (!(await isAdmin(user.id))) return fail(res, 403, "Only the site owner can do that.");
  const rows = Object.entries(CONTENT).map(([path, data]) => ({ path, data }));
  const db = adminClient();
  for (let i = 0; i < rows.length; i += 10) {
    const { error } = await db.from("docs").upsert(rows.slice(i, i + 10), { onConflict: "path" });
    if (error) return fail(res, 500, "Loading stopped part-way: " + error.message);
  }
  send(res, 200, { loaded: rows.length });
}
