// Vercel cron, Sunday 18:00 UTC: each member's week in one email.
import { SITE, pool, esc, footerFor, unsubLink, isoDay, layout, logEmail, mondayOf, p, requireCron, send, sendEmail, sentSince, stats, weekHours, withErrors } from "../_lib.js";
import { emailBackup } from "../backup.js";
import { loadMembers } from "./_members.js";

const r1 = (n) => Math.round(Number(n || 0) * 10) / 10;

export function weeklyEmail(m, monday) {
  const s = m.summary, st = m.state, name = (st.account && st.account.name) || s.name || "there";
  const hrs = r1(weekHours(st, monday)), target = Number(st.hpw || 15), hit = hrs >= target * 0.6;
  const lastWeek = r1(weekHours(st, new Date(monday.getTime() - 7 * 864e5)));
  const heading = hrs === 0 ? "A quiet week, " + name : hit ? "Strong week, " + name : "Your week, " + name;
  const lead = hrs === 0 ? "No sessions logged this week. That's fine; one evening this week puts you back on track."
    : hit ? "You logged " + hrs + " hours" + (lastWeek ? " (" + lastWeek + " the week before)" : "") + " and kept your streak going."
    : "You logged " + hrs + " of your " + target + " hours. A bit more next week keeps the streak alive.";
  const rows = [["Hours this week", hrs + " of " + target], ["Weekly streak", (s.streak || 0) + (s.streak === 1 ? " week" : " weeks")], ["Level", (s.lvl || 1) + " · " + (s.pts || 0) + " XP"], ["Now on", s.cur || "Getting started"], ["Route complete", (s.pct || 0) + "%"]];
  if (s.behind > 0) rows.push(["Behind plan", s.behind + " days"]);
  let partner = "";
  if (m.partnerSummary) {
    const ps = m.partnerSummary, c = m.pair && m.pair.commit;
    partner = p("<b>" + esc(ps.name || "Your partner") + "</b> logged " + r1(ps.week) + " hours this week" + (ps.streak ? " and is on a " + ps.streak + "-week streak." : ".") + (c && c.wk === isoDay(monday) && c.text ? " Your commitment was: <i>" + esc(c.text) + "</i>." : ""));
  }
  const subject = hrs === 0 ? "Your Benchwork week: let's restart" : "Your Benchwork week: " + hrs + " hours" + (s.streak ? ", " + s.streak + "-week streak" : "");
  return {
    subject,
    html: layout({ preheader: lead, heading, body: p(esc(lead)) + stats(rows) + partner + p("Next week: set a commitment with your partner and pick the evenings now."), cta: "Plan next week", ctaHref: SITE() + "/#home", footer: footerFor(m.profile, "weekly", "weekly emails") }),
    text: heading + "\n\n" + lead + "\n\n" + rows.map((r) => r[0] + ": " + r[1]).join("\n") + "\n\n" + SITE(),
  };
}

export default withErrors(async function handler(req, res) {
  if (!requireCron(req, res)) return;
  const monday = mondayOf(new Date()), ref = isoDay(monday), since = new Date(Date.now() - 6 * 864e5).toISOString();
  let sent = 0, skipped = 0, failed = 0;
  const left = await pool(await loadMembers(), 8, async (m) => {
    if (!m.prefs.weekly || (await sentSince(m.profile.id, "weekly", since, ref))) { skipped++; return; }
    try { const e = weeklyEmail(m, monday); await sendEmail(Object.assign({ to: m.profile.email, unsubscribe: unsubLink(m.profile, "weekly") }, e)); await logEmail(m.profile.id, "weekly", ref); sent++; }
    catch (err) { failed++; console.error("weekly", m.profile.id, err.message); }
  }, 40000);
  let backup = null;
  try { backup = await emailBackup(); } catch (err) { backup = { error: err.message }; console.error("backup", err.message); }
  send(res, 200, { sent, skipped, failed, left, backup });
});
