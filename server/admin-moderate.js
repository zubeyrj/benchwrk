// POST /api/admin-moderate { action: "suspend" | "restore" | "hideportfolio" | "showportfolio", uid } -> owner only.
// Suspending signs the member out, stops them signing in and hides them from the cohort board.
import { adminClient, fail, getDoc, isAdmin, readJson, requireUser, send, withErrors } from "./_lib.js";

export default withErrors(async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  const user = await requireUser(req, res); if (!user) return;
  if (!(await isAdmin(user.id))) return fail(res, 403, "Only the site owner can do that.");
  const { action, uid } = await readJson(req);
  if (!/^[0-9a-f-]{36}$/.test(uid || "") || ["suspend", "restore", "hideportfolio", "showportfolio"].indexOf(action) < 0) return fail(res, 400, "Bad request.");
  if (action === "hideportfolio" || action === "showportfolio") {
    await adminClient().from("portfolios").update({ hidden: action === "hideportfolio" }).eq("user_id", uid);
    return send(res, 200, { ok: true, hidden: action === "hideportfolio" });
  }
  if (uid === user.id) return fail(res, 400, "You can't suspend yourself.");
  const db = adminClient();
  const { error } = await db.auth.admin.updateUserById(uid, { ban_duration: action === "suspend" ? "876000h" : "none" });
  if (error) return fail(res, 500, "Couldn't change that account: " + error.message);
  const cur = (await getDoc("learners/" + uid)) || {};
  await db.from("docs").upsert({ path: "learners/" + uid, data: Object.assign(cur, { suspended: action === "suspend" }) }, { onConflict: "path" });
  send(res, 200, { ok: true, suspended: action === "suspend" });
});
