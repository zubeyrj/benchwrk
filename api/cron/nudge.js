// Hourly (a GitHub Actions schedule calls it; see .github/workflows/nudge.yml).
// Sends each persistent or relentless member the reminder that's due in their own time zone:
// a phone or browser notification when they've switched those on, otherwise an email (at most one a day).
import { SITE, esc, footerFor, layout, logEmail, p, requireCron, send, sendEmail, sentSince, unsubLink, withErrors } from "../_lib.js";
import { dueSlot, pickCopy, situation } from "../_nudge.js";
import { pushTo } from "../_push.js";
import { loadMembers } from "./_members.js";

export function nudgeEmail(m, copy) {
  return { subject: copy.title, html: layout({ preheader: copy.body, heading: copy.title, body: p(esc(copy.body)) + p('<span style="color:#6b7280;font-size:14px">Too much? Change how hard Benchwork pushes you in Settings.</span>'), cta: "Log a session", ctaHref: SITE() + "/#home", footer: footerFor(m.profile, "streak", "reminder emails") }),
    text: copy.title + "\n\n" + copy.body + "\n\n" + SITE() + "/#home" };
}

export default withErrors(async function handler(req, res) {
  if (!requireCron(req, res)) return;
  const now = globalThis.__testNow ? new Date(globalThis.__testNow) : new Date();
  let pushed = 0, emailed = 0, failed = 0, due = 0;
  for (const m of await loadMembers()) {
    try {
      const s = situation(m, now), slot = dueSlot(s);
      if (!slot) continue;
      const ref = s.L.day + ":" + slot;
      if (await sentSince(m.profile.id, "nudge", new Date(Date.now() - 3 * 864e5).toISOString(), ref)) continue;
      due++;
      const copy = pickCopy(s, slot, m.profile.id + ref);
      const r = await pushTo(m.profile.id, { title: copy.title, body: copy.body, url: SITE() + "/#home", tag: "bw-nudge" });
      if (r.sent) pushed++;
      else if (m.prefs.streak !== false && !(await sentSince(m.profile.id, "nudge-email", new Date(Date.now() - 20 * 3600e3).toISOString()))) {
        await sendEmail(Object.assign({ to: m.profile.email, unsubscribe: unsubLink(m.profile, "streak") }, nudgeEmail(m, copy)));
        await logEmail(m.profile.id, "nudge-email", ref); emailed++;
      }
      await logEmail(m.profile.id, "nudge", ref);
    } catch (err) { failed++; console.error("nudge", m.profile.id, err.message); }
  }
  send(res, 200, { due, pushed, emailed, failed });
});
