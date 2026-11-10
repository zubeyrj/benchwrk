// POST /api/push { action: "status" | "subscribe" | "unsubscribe" | "test", subscription?, endpoint? }
// Saves or forgets this device for notifications, or sends a test one.
import { SITE, adminClient, fail, logEmail, readJson, requireUser, send, sentSince, withErrors } from "./_lib.js";
import { pushReady, pushTo } from "./_push.js";

const okEndpoint = (u) => typeof u === "string" && u.length <= 1000 && /^https:\/\/[^\s/]+\//.test(u);
const okKey = (k) => typeof k === "string" && k.length >= 8 && k.length <= 200 && /^[A-Za-z0-9_=-]+$/.test(k);

export default withErrors(async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  const user = await requireUser(req, res); if (!user) return;
  const body = await readJson(req), db = adminClient();
  if (body.action === "status") {
    const { data } = await db.from("push_subs").select("endpoint").eq("user_id", user.id);
    return send(res, 200, { ready: pushReady(), devices: (data || []).length, endpoints: (data || []).map((d) => d.endpoint) });
  }
  if (body.action === "subscribe") {
    const s = body.subscription || {};
    if (!okEndpoint(s.endpoint) || !s.keys || !okKey(s.keys.p256dh) || !okKey(s.keys.auth)) return fail(res, 400, "That device couldn't be registered.");
    const { data } = await db.from("push_subs").select("id, endpoint").eq("user_id", user.id);
    if ((data || []).length >= 10 && !(data || []).some((d) => d.endpoint === s.endpoint)) return fail(res, 400, "That's ten devices already. Turn notifications off on one you don't use.");
    // The same browser signed in as someone else takes the device over.
    await db.from("push_subs").delete().eq("endpoint", s.endpoint);
    await db.from("push_subs").insert({ user_id: user.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth });
    return send(res, 200, { ok: true });
  }
  if (body.action === "unsubscribe") {
    if (!okEndpoint(body.endpoint)) return fail(res, 400, "Bad request.");
    await db.from("push_subs").delete().eq("user_id", user.id).eq("endpoint", body.endpoint);
    return send(res, 200, { ok: true });
  }
  if (body.action === "test") {
    if (!pushReady()) return fail(res, 503, "Notifications aren't set up on this site yet.", "unavailable");
    if ((await sentSince(user.id, "pushtest", new Date(Date.now() - 864e5).toISOString())) >= 5) return fail(res, 429, "That's enough tests for today.", "daily_cap");
    const r = await pushTo(user.id, { title: "Notifications are on", body: "This is what a Benchwork reminder looks like. They get less polite if you skip.", url: SITE() + "/#home", tag: "bw-test" });
    await logEmail(user.id, "pushtest", null);
    return send(res, 200, r);
  }
  fail(res, 400, "Bad request.");
});
