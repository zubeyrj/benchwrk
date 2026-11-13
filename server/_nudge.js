// Reminder rules and copy. Pure functions, so the tests can run them at any time of day.
// Levels: off, gentle (the daily cron's two emails), persistent (one a day once you've skipped two days, or your
// streak is at risk), relentless (twice a day from the first skipped day). Nothing is sent between 21:00 and 08:00
// local time, nothing once you've logged a session that day, and it backs off to weekly after 14 quiet days.
import { lastStudyDay, mondayOf, weekHours } from "./_lib.js";

export const LEVELS = ["off", "gentle", "persistent", "relentless"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const r1 = (n) => Math.round(Number(n || 0) * 10) / 10;
const hrs = (n) => r1(n) + (r1(n) === 1 ? " hour" : " hours");

export function remindOf(state) {
  const r = (state && state.remind) || {};
  return { level: LEVELS.indexOf(r.level) >= 0 ? r.level : "gentle", hour: Math.min(20, Math.max(17, Number(r.hour) || 19)), tz: typeof r.tz === "string" && r.tz.length < 60 ? r.tz : "Europe/London" };
}

export function localParts(now, tz) {
  let f;
  try { f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" }); }
  catch (e) { f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" }); }
  const o = Object.fromEntries(f.formatToParts(now).map((p) => [p.type, p.value]));
  return { day: o.year + "-" + o.month + "-" + o.day, hour: Number(o.hour) % 24, dow: WD.indexOf(o.weekday) };
}

const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// What the member's week looks like right now, in their own time zone.
export function situation(m, now) {
  const st = m.state || {}, R = remindOf(st), L = localParts(now, R.tz), log = st.log || [];
  const last = lastStudyDay(st, L.day);
  const since = last || (st.account && st.account.created) || L.day;
  const monday = mondayOf(new Date(L.day + "T12:00:00Z")), need = r1(Number(st.hpw || 15) * 0.6), have = r1(weekHours(st, monday));
  const weeks = Number((m.summary && m.summary.streak) || 0);
  const ps = m.partnerSummary;
  // A study week saved on the Schedule page moves the evening reminder to today's session time.
  const sd = st.sched && st.sched.days && typeof st.sched.days === "object" ? st.sched.days : null;
  const sess = sd ? sd[["SU", "MO", "TU", "WE", "TH", "FR", "SA"][L.dow]] : null;
  const sessAt = sess && /^([01]\d|2[0-3]):[0-5]\d$/.test(sess.t) ? sess.t : null;
  return { R, L, sched: !!sd, sess: sessAt ? { t: sessAt, h: Math.min(20, Math.max(8, Number(sessAt.slice(0, 2)) + (Number(sessAt.slice(3)) > 0 ? 1 : 0))) } : null, today: last === L.day, quiet: daysBetween(since, L.day), need, have, left: r1(Math.max(0, need - have)), weeks,
    atRisk: weeks >= 1 && have < need && [4, 5, 6, 0].indexOf(L.dow) >= 0, sunday: L.dow === 0,
    cur: (m.summary && m.summary.cur) || "your next lesson", partner: ps && ps.name ? { name: ps.name, hours: r1(ps.week || 0) } : null };
}

// Which slot is due now, or null. Persistent has one slot in the evening; relentless adds lunchtime.
export function dueSlot(s) {
  const lvl = s.R.level;
  if (lvl !== "persistent" && lvl !== "relentless") return null;
  if (s.L.hour < 8 || s.L.hour >= 21 || s.today) return null;
  if (s.quiet > 60) return null;
  // With a schedule: the evening slot follows today's session (an hour into it, or at the top of the next hour),
  // and on a rest day persistent reminders only come when the streak is at risk.
  const eveAt = s.sess ? s.sess.h : s.R.hour;
  if (lvl === "persistent" && s.sched && !s.sess && !s.atRisk && s.quiet <= 14) return null;
  const slots = (lvl === "relentless" && !(s.sess && s.sess.h <= 13) ? [["noon", 12]] : []).concat([["eve", eveAt]]);
  const due = slots.filter((x) => s.L.hour >= x[1]);
  if (!due.length) return null;
  const slot = due[due.length - 1][0];
  if (s.quiet > 14) return s.sunday && slot === "eve" ? slot : null; // weekly once they've gone quiet
  if (lvl === "persistent" && !(s.atRisk || s.quiet >= 2 || (s.sess && s.quiet >= 1))) return null;
  if (lvl === "relentless" && s.quiet < 1 && !s.atRisk) return null;
  return slot;
}

const C = {
  last: [["Last call for your {w}-week streak", "{left} more by midnight or it goes back to zero. One session gets you most of the way."],
    ["Your {w}-week streak ends tonight", "You need {left}. It's Sunday. You know what to do."]],
  risk: [["Your {w}-week streak ends Sunday", "You're {left} short of keeping it. Tonight would be a good night."],
    ["{w} weeks. Don't let them go", "{have} of {need} logged this week. The streak needs {left} more."],
    ["Your streak is looking nervous", "{left} to go before Sunday. It's counting on you."]],
  partner: [["{p} is beating you this week", "{p} has logged {ph}. You've logged {have}. Just saying."],
    ["{p} studied. Did you?", "{p} is on {ph} this week. Your turn."]],
  ldown: [["You're about to drop out of {tier}", "You're {lr} of {ln}. Earn some XP before Sunday night or you go down a league."],
    ["Relegation zone", "{lr} of {ln} in the {tier} league. One lesson moves you up the table."]],
  lnear: [["{gap} XP from promotion", "You're {lr} in the {tier} league. The top {k} go up on Monday."]],
  sess: [["Your {st} session is waiting", "You booked it in, so it's yours. Even half of it counts."],
    ["It's past {st}", "That was your study slot. {cur} is open where you left it."]],
  d1: [["Your bench is getting cold", "No session yet today. Twenty minutes on {cur} counts."],
    ["Still waiting", "Today's lesson is ready when you are. It's been ready for a while."],
    ["Quick one?", "One exercise from {cur}. Ten minutes. We'll stop asking today."]],
  d2: [["{q} days without a session", "{cur} won't learn itself. One exercise tonight?"],
    ["Hello? It's benchwrk", "You haven't been in for {q} days. We're not upset. We're just noticing."]],
  d4: [["These reminders don't seem to be working", "We'll keep sending them anyway. Or you could log a session and make them stop."],
    ["{q} days. We're starting to worry", "Your plan has pushed its dates back. Twenty minutes puts it back on track."]],
  d7: [["A whole week off", "Your finish date has slipped. One short session tonight starts pulling it back."],
    ["{cur} misses you", "It's exactly where you left it, {q} days ago."]],
  d15: [["We'll keep this short", "It's been {q} days. One lesson this week? After that we'll go quiet for a bit."]],
};

export function pickCopy(s, slot, seed) {
  let pool;
  if (s.atRisk && s.sunday) pool = C.last;
  else if (s.atRisk && (s.quiet < 4 || slot === "eve")) pool = C.risk;
  else if (s.league && s.league.zone === "down" && s.L && [5, 6, 0].indexOf(s.L.dow) >= 0) pool = C.ldown;
  else if (s.league && s.league.gapUp && s.league.rank === s.league.k + 1 && s.quiet < 15) pool = C.lnear;
  else if (s.partner && s.partner.hours > s.have && s.quiet < 15 && (hash(seed + "p") % 3 === 0)) pool = C.partner;
  else if (s.sess && slot === "eve" && s.quiet < 4) pool = C.sess;
  else if (s.quiet > 14) pool = C.d15;
  else if (s.quiet >= 7) pool = C.d7;
  else if (s.quiet >= 4) pool = C.d4;
  else if (s.quiet >= 2) pool = C.d2;
  else pool = C.d1;
  const [t, b] = pool[hash(seed) % pool.length];
  const fill = (x) => x.replace(/\{w\}/g, s.weeks).replace(/\{left\}/g, hrs(s.left)).replace(/\{have\}/g, hrs(s.have)).replace(/\{need\}/g, hrs(s.need))
    .replace(/\{st\}/g, s.sess ? s.sess.t : "").replace(/\{q\}/g, s.quiet).replace(/\{cur\}/g, s.cur).replace(/\{p\}/g, s.partner ? s.partner.name : "Your partner").replace(/\{ph\}/g, s.partner ? hrs(s.partner.hours) : "")
    .replace(/\{tier\}/g, s.league ? s.league.tier : "").replace(/\{lr\}/g, s.league ? ordinal(s.league.rank) : "").replace(/\{ln\}/g, s.league ? s.league.n : "").replace(/\{gap\}/g, s.league ? s.league.gapUp : "").replace(/\{k\}/g, s.league ? s.league.k : "");
  return { title: fill(t), body: fill(b) };
}
