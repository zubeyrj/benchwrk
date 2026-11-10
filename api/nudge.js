// POST /api/nudge { to, kind: "cheer" | "nudge", text } -> emails your accountability partner.
// Only between two members who have both accepted the pairing, at most 3 a day, and only if
// the partner hasn't switched partner emails off.
import { SITE, adminClient, esc, fail, footerFor, unsubLink, getDoc, layout, logEmail, p, readJson, requireUser, send, sendEmail, sentSince } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  const user = await requireUser(req, res); if (!user) return;
  const { to, kind, text } = await readJson(req);
  if (typeof to !== "string" || !/^[0-9a-f-]{36}$/.test(to) || (kind !== "cheer" && kind !== "nudge")) return fail(res, 400, "Bad request.");
  const [mine, theirs] = await Promise.all([getDoc("pairs/" + user.id), getDoc("pairs/" + to)]);
  const paired = mine && theirs && mine.partner === to && (theirs.partner === user.id || theirs.req === user.id);
  if (!paired) return fail(res, 403, "You can only message your accountability partner.", "not_partner");
  const since = new Date(Date.now() - 864e5).toISOString();
  if ((await sentSince(user.id, "partner", since)) >= 3) return send(res, 200, { emailed: false, reason: "limit" });
  const { data: profile } = await adminClient().from("profiles").select("email, name, prefs, unsub_token").eq("id", to).maybeSingle();
  if (!profile || !profile.email || (profile.prefs && profile.prefs.partner === false)) return send(res, 200, { emailed: false, reason: "off" });
  const from = (mine && mine.name) || "Your partner";
  const note = typeof text === "string" ? text.slice(0, 280) : "";
  const subject = kind === "cheer" ? from + " cheered you on" : from + " is checking in on you";
  const html = layout({
    preheader: note || subject, heading: subject,
    body: p(kind === "cheer" ? esc(from) + " saw your progress on Benchwork and sent a cheer." : esc(from) + " noticed it's been quiet and wants to know how this week is going.") +
      (note ? '<blockquote style="margin:4px 0 14px;padding:12px 16px;background:#f7f4ef;border-left:3px solid #c93c1a;border-radius:8px;font-size:16px;line-height:1.5">' + esc(note) + "</blockquote>" : "") +
      p(kind === "cheer" ? "Keep going. Reply with a cheer of your own from the Cohort tab." : "Even 30 minutes tonight keeps your streak alive."),
    cta: kind === "cheer" ? "Open Benchwork" : "Log a session", ctaHref: SITE() + (kind === "cheer" ? "/#cohort" : "/#log"),
    footer: footerFor(profile, "partner", "partner emails"),
  });
  await sendEmail({ to: profile.email, subject, html, unsubscribe: unsubLink(profile, "partner"), text: subject + (note ? '\n\n"' + note + '"' : "") + "\n\n" + SITE() });
  await logEmail(user.id, "partner", to);
  send(res, 200, { emailed: true });
}
