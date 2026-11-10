// POST /api/me-delete { confirm: "DELETE" } -> erases the member's account and everything tied to it.
import { adminClient, fail, isAdmin, readJson, requireUser, send } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  const user = await requireUser(req, res); if (!user) return;
  const { confirm } = await readJson(req);
  if (confirm !== "DELETE") return fail(res, 400, "Type DELETE to confirm.");
  if (await isAdmin(user.id)) return fail(res, 400, "You're the site owner. Hand ownership to someone else in Supabase before deleting this account.", "owner");
  const db = adminClient(), id = user.id;
  await db.from("docs").delete().like("path", "data/users/" + id + "/%");
  await db.from("docs").delete().in("path", ["learners/" + id, "subs/" + id, "reviews/" + id, "pairs/" + id]);
  // Profiles, certificates, tutor usage and email log rows go with the auth user (on delete cascade).
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return fail(res, 500, "Couldn't delete the account. Try again, or email the site owner.");
  send(res, 200, { deleted: true });
}
