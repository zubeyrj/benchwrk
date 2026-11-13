// Vercel cron, Sunday 18:00 UTC: each member's week in one email. On the last Sunday of a month it covers the month too.
import { SITE, pool, esc, footerFor, unsubLink, isoDay, layout, logEmail, mondayOf, p, requireCron, send, sendEmail, sentSince, stats, weekHours, rangeHours, withErrors } from "../_lib.js";
import { emailBackup } from "../backup.js";
import { loadMembers } from "./_members.js";

const r1 = (n) => Math.round(Number(n || 0) * 10) / 10;

// What got done between two dates: lessons read, exercises solved, quizzes passed, courses finished.
function doneBetween(st, from, to) {
  const inR = (d) => typeof d === "string" && d >= from && d < to;
  let lessons = 0, ex = 0, quiz = 0, courses = 0;
  Object.values(st.mods || {}).forEach((m) => {
    Object.values(m.checks || {}).forEach((d) => { if (inR(d)) lessons++; });
    Object.values(m.ex || {}).forEach((x) => { if (x && inR(x.ok)) ex++; });
    ((m.quiz && m.quiz.passes) || []).forEach((d) => { if (inR(d)) quiz++; });
    if (inR(m.done)) courses++;
  });
  return { lessons, ex, quiz, courses };
}
const hrsTxt = (h) => r1(h) + (r1(h) === 1 ? " hour" : " hours");
// The last weekly email of each month (sent on the month's last Sunday) also covers the whole month.
export function isMonthEnd(monday) { const sun = new Date(monday.getTime() + 6 * 864e5), next = new Date(sun.getTime() + 7 * 864e5); return next.getUTCMonth() !== sun.getUTCMonth(); }

export function weeklyEmail(m, monday) {
  const s = m.summary, st = m.state, name = (st.account && st.account.name) || s.name || "there";
  const from = isoDay(monday), to = isoDay(new Date(monday.getTime() + 7 * 864e5));
  const hrs = r1(weekHours(st, monday)), auto = r1(weekHours(st, monday, "auto")), target = Number(st.hpw || 15), hit = hrs >= target * 0.6;
  const lastWeek = r1(weekHours(st, new Date(monday.getTime() - 7 * 864e5)));
  const D = doneBetween(st, from, to), month = isMonthEnd(monday);
  const heading = hrs === 0 ? "A quiet week, " + name : hit ? "Strong week, " + name : "Your week, " + name;
  const did = [D.lessons ? D.lessons + (D.lessons === 1 ? " lesson" : " lessons") : "", D.ex ? D.ex + (D.ex === 1 ? " exercise" : " exercises") : "", D.quiz ? D.quiz + (D.quiz === 1 ? " quiz" : " quizzes") + " passed" : ""].filter(Boolean);
  const lead = hrs === 0 ? "No study time this week. That's fine; one evening this week puts you back on track."
    : "You studied " + hrsTxt(hrs) + " of your " + target + (lastWeek ? " (" + lastWeek + " the week before)" : "") + (did.length ? " and finished " + did.join(", ").replace(/, ([^,]*)$/, " and $1") : "") + "." + (hit ? " Your streak carries on." : " A bit more next week keeps the streak alive.");
  const rows = [["Study time", hrs + " of " + target + " hours"], ["Counted on benchwrk", auto + " hours"], ["Logged by you", r1(hrs - auto) + " hours"], ["Lessons read", D.lessons], ["Exercises solved", D.ex], ["Weekly streak", (s.streak || 0) + (s.streak === 1 ? " week" : " weeks")], ["Now on", s.cur || "Getting started"], ["Plan complete", (s.pct || 0) + "%"]];
  if (s.behind > 0) rows.push(["Behind plan", s.behind + " days"]);
  let partner = "";
  if (m.partnerSummary) {
    const ps = m.partnerSummary, c = m.pair && m.pair.commit;
    partner = p("<b>" + esc(ps.name || "Your partner") + "</b> studied " + hrsTxt(ps.week) + " this week" + (ps.streak ? " and is on a " + ps.streak + "-week streak." : ".") + (c && c.wk === isoDay(monday) && c.text ? " Your commitment was: <i>" + esc(c.text) + "</i>." : ""));
  }
  let monthHtml = "", monthText = "";
  if (month) {
    const sun = new Date(monday.getTime() + 6 * 864e5), mStart = isoDay(new Date(Date.UTC(sun.getUTCFullYear(), sun.getUTCMonth(), 1))), mEnd = isoDay(new Date(Date.UTC(sun.getUTCFullYear(), sun.getUTCMonth() + 1, 1)));
    const MH = r1(rangeHours(st, mStart, mEnd)), MA = r1(rangeHours(st, mStart, mEnd, "auto")), MD = doneBetween(st, mStart, mEnd);
    const mName = sun.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
    const weeks = []; for (let w = mondayOf(new Date(mStart + "T12:00:00Z")); isoDay(w) < mEnd; w = new Date(w.getTime() + 7 * 864e5)) weeks.push([w, r1(weekHours(st, w))]);
    const mRows = [["Study time in " + mName, MH + " hours (" + MA + " counted on benchwrk)"], ["Weeks at 60% of target or more", weeks.filter((x) => x[1] >= target * 0.6).length + " of " + weeks.length], ["Lessons read", MD.lessons], ["Exercises solved", MD.ex], ["Courses finished", MD.courses]];
    monthHtml = '<h2 style="font-size:18px;margin:26px 0 8px">Your ' + esc(mName) + "</h2>" + stats(mRows) + p(weeks.map((x) => "Week of " + x[0].toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) + ": " + x[1] + " h").join("<br>"));
    monthText = "\n\nYour " + mName + "\n" + mRows.map((r) => r[0] + ": " + r[1]).join("\n");
  }
  const subject = (month ? "Your benchwrk week and month: " : "Your benchwrk week: ") + (hrs === 0 ? "let's restart" : hrsTxt(hrs) + (s.streak ? ", " + s.streak + "-week streak" : ""));
  const how = p('<span style="color:#5b6577;font-size:13px">Counted on benchwrk is active time on lessons, exercises and practice. It stops after 4 minutes without a click or key press. Logged by you is time you added for study away from the site.</span>');
  return {
    subject,
    html: layout({ preheader: lead, heading, body: p(esc(lead)) + stats(rows) + monthHtml + partner + p("Next week: set a commitment with your partner and pick the evenings now.") + how, cta: "Plan next week", ctaHref: SITE() + "/#plan", footer: footerFor(m.profile, "weekly", "weekly and monthly progress emails") }),
    text: heading + "\n\n" + lead + "\n\n" + rows.map((r) => r[0] + ": " + r[1]).join("\n") + monthText + "\n\n" + SITE(),
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
