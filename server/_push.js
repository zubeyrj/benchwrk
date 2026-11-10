// Web push (the notifications a phone or browser shows). Keys: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
import { SITE, adminClient, env } from "./_lib.js";

export const pushReady = () => !!(globalThis.__testPush || (env("VAPID_PUBLIC_KEY") && env("VAPID_PRIVATE_KEY")));

let wp = null;
async function lib() {
  if (globalThis.__testPush) return globalThis.__testPush;
  if (!wp) {
    wp = (await import("web-push")).default;
    const subject = env("VAPID_SUBJECT") || (SITE().startsWith("https://") ? SITE() : "mailto:noreply@benchwork.invalid");
    wp.setVapidDetails(subject, env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));
  }
  return wp;
}

// Sends to every device the member switched notifications on for. Devices that have gone away are forgotten.
export async function pushTo(userId, payload) {
  const db = adminClient();
  const { data } = await db.from("push_subs").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  const subs = data || [];
  let sent = 0;
  if (!subs.length || !pushReady()) return { sent, devices: subs.length };
  const w = await lib();
  for (const s of subs) {
    try {
      await w.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 6 * 3600, urgency: "normal", topic: "bwnudge" });
      sent++;
      await db.from("push_subs").update({ last_ok: new Date().toISOString() }).eq("id", s.id);
    } catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) await db.from("push_subs").delete().eq("id", s.id);
      else console.error("push", userId, e && e.message);
    }
  }
  return { sent, devices: subs.length };
}
