// POST /api/report-error { message, detail, url } -> records an error seen in a member's browser.
import { adminClient, fail, logError, readJson, send, withErrors } from "./_lib.js";

export default withErrors(async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  const b = await readJson(req);
  if (typeof b.message !== "string" || !b.message.trim()) return fail(res, 400, "Bad request.");
  let uid = null;
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) { const { data } = await adminClient().auth.getUser(h.slice(7)); uid = data && data.user ? data.user.id : null; }
  await logError({ source: "client", message: b.message, detail: b.detail, url: b.url, ua: req.headers["user-agent"], user_id: uid });
  send(res, 200, { ok: true });
});
