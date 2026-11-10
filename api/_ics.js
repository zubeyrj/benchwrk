// Builds a member's study calendar from their saved week (state.sched). The app's download uses the same shape.
const WEEK = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const okTime = (t) => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const okDate = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const text = (s) => String(s || "").replace(/[\r\n]+/g, " ").replace(/[,;\\]/g, (c) => "\\" + c).slice(0, 120);

// Local date and time parts for the first occurrence of weekday i (0 = Monday) on or after today in tz.
function firstOn(i, t, tz, now) {
  let f;
  try { f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }); }
  catch (e) { f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }); }
  const o = Object.fromEntries(f.formatToParts(now).map((p) => [p.type, p.value]));
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(o.weekday);
  const d = new Date(Date.UTC(Number(o.year), Number(o.month) - 1, Number(o.day)));
  d.setUTCDate(d.getUTCDate() + ((i - dow + 7) % 7));
  return d.toISOString().slice(0, 10).replace(/-/g, "") + "T" + t.replace(":", "") + "00";
}
function addMins(local, m) {
  const d = new Date(Date.UTC(+local.slice(0, 4), +local.slice(4, 6) - 1, +local.slice(6, 8), +local.slice(9, 11), +local.slice(11, 13)));
  d.setUTCMinutes(d.getUTCMinutes() + m);
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15);
}

export function buildCalendar(state, { uid, site, now = new Date() }) {
  const s = (state && state.sched) || {}, days = s.days || {};
  let tz = typeof s.tz === "string" && s.tz.length < 60 ? s.tz : "Europe/London";
  try { new Intl.DateTimeFormat("en-GB", { timeZone: tz }); } catch (e) { tz = "Europe/London"; }
  const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const until = (okDate(s.until) ? s.until : new Date(now.getTime() + 364 * 864e5).toISOString().slice(0, 10)).replace(/-/g, "") + "T235959Z";
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Benchwork//Study week//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Benchwork", "X-WR-TIMEZONE:" + tz, "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H"];
  WEEK.forEach((w, i) => {
    const d = days[w]; if (!d || !okTime(d.t)) return;
    const m = Math.max(10, Math.min(480, Math.round(Number(d.m) || 0))), start = firstOn(i, d.t, tz, now);
    L.push("BEGIN:VEVENT", "UID:bw-" + uid + "-" + w + "@benchwork", "DTSTAMP:" + stamp, "DTSTART;TZID=" + tz + ":" + start, "DTEND;TZID=" + tz + ":" + addMins(start, m),
      "RRULE:FREQ=WEEKLY;BYDAY=" + w + ";UNTIL=" + until, "SUMMARY:Benchwork study session", "DESCRIPTION:Open Benchwork and pick up where you left off: " + site, "URL:" + site,
      "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:Benchwork in 10 minutes", "END:VALARM", "END:VEVENT");
  });
  (Array.isArray(s.ms) ? s.ms.slice(0, 30) : []).forEach((x, i) => {
    if (!Array.isArray(x) || !okDate(x[0])) return;
    const d = x[0].replace(/-/g, "");
    L.push("BEGIN:VEVENT", "UID:bw-" + uid + "-ms" + i + "-" + d + "@benchwork", "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + d, "SUMMARY:" + text(x[1]), "TRANSP:TRANSPARENT", "END:VEVENT");
  });
  L.push("END:VCALENDAR");
  // Lines over 75 octets are folded, as the format requires.
  return L.map((l) => { let out = "", r = l; while (r.length > 74) { out += r.slice(0, 74) + "\r\n "; r = r.slice(74); } return out + r; }).join("\r\n") + "\r\n";
}
