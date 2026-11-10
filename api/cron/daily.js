// Vercel cron, daily 17:00 UTC. Only for members on the gentle reminder level.
// Friday and Saturday: "your streak ends Sunday" for members short of this week's target.
// Any day: a gentle come-back note after 10 quiet days (at most every 14 days, 3 in total).
import { SITE, adminClient, esc, footerFor, unsubLink, isoDay, layout, logEmail, mondayOf, p, requireCron, send, sendEmail, sentSince, weekHours, withErrors } from "../_lib.js";
import { loadMembers } from "./_members.js";
import { remindOf } from "../_nudge.js";

const r1 = (n) => Math.round(Number(n || 0) * 10) / 10;

export function streakEmail(m, monday) {
  const st = m.state, name = (st.account && st.account.name) || "there", need = r1(Number(st.hpw || 15) * 0.6), have = r1(weekHours(st, monday)), left = r1(need - have), weeks = m.summary.streak;
  const subject = "Your " + weeks + "-week streak ends Sunday";
  const lead = "You've logged " + have + " of the " + need + " hours that keep your streak alive. " + left + " more " + (left === 1 ? "hour" : "hours") + " before Sunday night and it carries on.";
  return { subject, html: layout({ preheader: lead, heading: "Keep it going, " + name, body: p(esc(lead)) + p("Pick one lesson or one exercise tonight. Small sessions count."), cta: "Log a session", ctaHref: SITE() + "/#home", footer: footerFor(m.profile, "streak", "reminders") }), text: subject + "\n\n" + lead + "\n\n" + SITE() };
}

export function comebackEmail(m, days) {
  const st = m.state, name = (st.account && st.account.name) || "there", cur = m.summary.cur || "your next lesson";
  const subject = "Pick up where you left off";
  const lead = "It's been " + days + " days since your last session. You were on " + cur + ", and your plan has moved its dates to fit.";
  return { subject, html: layout({ preheader: lead, heading: "Your bench is waiting, " + name, body: p(esc(lead)) + p("Twenty minutes is enough to get going again."), cta: "Continue " + cur, ctaHref: SITE() + "/#home", footer: footerFor(m.profile, "streak", "reminders") }), text: subject + "\n\n" + lead + "\n\n" + SITE() };
}

export default withErrors(async function handler(req, res) {
  if (!requireCron(req, res)) return;
  const now = new Date(), monday = mondayOf(now), ref = isoDay(monday), dow = now.getUTCDay();
  let streak = 0, comeback = 0, failed = 0;
  for (const m of await loadMembers()) {
    if (!m.prefs.streak || remindOf(m.state).level !== "gentle") continue; // persistent and relentless: cron/nudge.js
    const st = m.state, need = Number(st.hpw || 15) * 0.6, last = (st.log && st.log[0] && st.log[0].d) || null;
    const quiet = last ? Math.floor((Date.parse(isoDay(now)) - Date.parse(last)) / 864e5) : null;
    try {
      if ((dow === 5 || dow === 6) && (m.summary.streak || 0) >= 1 && weekHours(st, monday) < need && quiet !== null && quiet < 10 &&
          !(await sentSince(m.profile.id, "streak", new Date(monday).toISOString(), ref))) {
        await sendEmail(Object.assign({ to: m.profile.email, unsubscribe: unsubLink(m.profile, "streak") }, streakEmail(m, monday))); await logEmail(m.profile.id, "streak", ref); streak++;
      } else if (quiet !== null && quiet >= 10 && !(await sentSince(m.profile.id, "comeback", new Date(Date.now() - 14 * 864e5).toISOString())) &&
          (await sentSince(m.profile.id, "comeback", new Date(Date.now() - 120 * 864e5).toISOString())) < 3) {
        await sendEmail(Object.assign({ to: m.profile.email, unsubscribe: unsubLink(m.profile, "streak") }, comebackEmail(m, quiet))); await logEmail(m.profile.id, "comeback", last); comeback++;
      }
    } catch (err) { failed++; console.error("daily", m.profile.id, err.message); }
  }
  // Housekeeping: error reports are kept for 90 days (see the privacy notice).
  await adminClient().from("errors").delete().lt("at", new Date(Date.now() - 90 * 864e5).toISOString());
  send(res, 200, { streak, comeback, failed });
});
