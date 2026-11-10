// POST /api/cal-link { rotate?: true } -> { url }: the member's private calendar link, or a fresh one.
import { SITE, adminClient, readJson, requireUser, send, fail, withErrors } from "./_lib.js";

export default withErrors(async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  const user = await requireUser(req, res); if (!user) return;
  const body = await readJson(req), db = adminClient();
  if (body.rotate) await db.from("profiles").update({ cal_token: crypto.randomUUID() }).eq("id", user.id);
  const { data } = await db.from("profiles").select("cal_token").eq("id", user.id).maybeSingle();
  if (!data || !data.cal_token) return fail(res, 404, "Couldn't find your profile.");
  send(res, 200, { url: SITE().replace(/\/$/, "") + "/cal/" + data.cal_token + ".ics" });
});
