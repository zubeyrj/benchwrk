// The public homepage: what Benchwork is, a plan calculator built from the real course hours, and the way in.
import PLAN from "./plan-data.json";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const PHASES = ["Foundations", "Services and data", "AI engineering", "Getting hired"];
export const HOURS = [5, 8, 10, 15, 20];

function nextMonday(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + ((8 - x.getDay()) % 7 || 7)); return x; }
const addWeeks = (d, w) => new Date(d.getTime() + w * 7 * 864e5);
const monthYear = (d) => MONTHS_LONG[d.getMonth()] + " " + d.getFullYear();
const shortMonth = (d) => MONTHS[d.getMonth()] + " " + d.getFullYear();
// Month ticks name the year on the first tick and whenever it changes.
const tickMonth = (d, first, prevYear) => MONTHS[d.getMonth()] + (first || d.getFullYear() !== prevYear ? " " + d.getFullYear() : "");

// The same arithmetic the app uses: each course takes its hours divided by your hours a week, back to back.
export function planFor(hpw, from, today) {
  const start = nextMonday(today || new Date());
  const rows = []; let cum = 0;
  PLAN.courses.forEach((c) => {
    if ((c.zero && from !== "zero") || c.extra) return; // the lean path: optional extras are left out
    rows.push(Object.assign({}, c, { s: cum, e: cum + c.h, sd: addWeeks(start, cum / hpw), ed: addWeeks(start, (cum + c.h) / hpw) }));
    cum += c.h;
  });
  // Applying starts once the second project is done; the third finishes alongside the job search.
  const p2 = rows.find((r) => r.project === 2) || rows[rows.length - 1];
  return { rows, total: cum, start, end: addWeeks(start, cum / hpw), apply: p2.ed, weeks: Math.ceil(cum / hpw) };
}
export const EXTRA_HOURS = PLAN.courses.filter((c) => c.extra).reduce((a, c) => a + c.full, 0) + PLAN.courses.filter((c) => !c.extra).reduce((a, c) => a + (c.full - c.h), 0);

export function readPlanChoice() {
  try { const p = JSON.parse(localStorage.getItem("bw-plan") || "null"); if (p && HOURS.indexOf(p.hpw) >= 0) return { hpw: p.hpw, from: p.from === "some" ? "some" : "zero" }; } catch (e) { /* storage blocked */ }
  return { hpw: 8, from: "zero" };
}
export function savePlanChoice(c) { try { localStorage.setItem("bw-plan", JSON.stringify(c)); } catch (e) { /* storage blocked */ } }

function ticks(P) {
  const span = P.end - P.start, step = span > 540 * 864e5 ? 4 : span > 270 * 864e5 ? 3 : span > 120 * 864e5 ? 2 : 1;
  const out = [], d = new Date(P.start.getFullYear(), P.start.getMonth() + 1, 1);
  let prev = null;
  for (; d < P.end; d.setMonth(d.getMonth() + step)) { out.push('<span style="left:' + (((d - P.start) / span) * 100).toFixed(2) + '%">' + tickMonth(d, prev === null, prev) + "</span>"); prev = d.getFullYear(); }
  return out.join("");
}
function phaseRows(P) {
  return PHASES.map((name, i) => {
    const rs = P.rows.filter((r) => r.ph === i + 1); if (!rs.length) return "";
    return '<li class="hp-ph p' + (i + 1) + '"><b>' + name + '</b><span class="hp-when">' + shortMonth(rs[0].sd) + " to " + shortMonth(rs[rs.length - 1].ed) + "</span><span>" + rs.map((r) => esc(r.t.replace(/: project \d/, ""))).join(", ") + "</span></li>";
  }).join("");
}
function summary(P, hpw) {
  return "you'd start applying for AI engineering jobs in <b>" + monthYear(P.apply) + "</b>, after your second project, and finish the plan by <b>" + monthYear(P.end) + "</b>. That's " + P.total + " hours, or about " + Math.round(P.weeks / 4.35) + " months at " + hpw + " hours a week, with " + EXTRA_HOURS + " hours of optional extras if you want them.";
}

// The parts that change when you move the controls, updated in place so the bar can animate.
export function updatePlan(root, choice) {
  const P = planFor(choice.hpw, choice.from);
  const out = root.querySelector("#hp-out"); if (out) out.innerHTML = summary(P, choice.hpw);
  const bar = root.querySelector(".hp-bar");
  if (bar) {
    const on = new Set(P.rows.map((r) => r.id));
    bar.querySelectorAll("li").forEach((li) => {
      const r = P.rows.find((x) => x.id === li.dataset.id);
      li.style.flexGrow = on.has(li.dataset.id) ? String(PLAN.courses.find((c) => c.id === li.dataset.id).h) : "0";
      li.classList.toggle("off", !on.has(li.dataset.id));
      const t = li.querySelector(".sr"); if (t) t.textContent = r ? r.t + ", " + r.h + " hours, " + shortMonth(r.sd) + " to " + shortMonth(r.ed) : "";
      li.title = r ? r.t + " (" + r.h + " hours)" : "";
    });
  }
  const tk = root.querySelector(".hp-ticks"); if (tk) tk.innerHTML = ticks(P);
  const ph = root.querySelector(".hp-phases"); if (ph) ph.innerHTML = phaseRows(P);
}

function sel(id, label, opts, val) {
  return '<label class="sr" for="' + id + '">' + label + '</label><span class="hp-sel"><select id="' + id + '">' + opts.map((o) => '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? " selected" : "") + ">" + o[1] + "</option>").join("") + "</select></span>";
}

const CODE = (s) => esc(s).replace(/\b(def|for|in|if|return)\b/g, '<i class="k">$1</i>').replace(/(&#39;[^&]*?&#39;)/g, '<i class="s">$1</i>').replace(/\b(dict|str|int)\b/g, '<i class="t">$1</i>');

const NOTES = [
  ["Your bench is getting cold", "No session yet today. Twenty minutes on Python for engineers counts.", "12:30"],
  ["Your partner is beating you this week", "Your partner has logged 5 hours. You've logged 2. Just saying.", "19:00"],
  ["These reminders don't seem to be working", "We'll keep sending them anyway. Or you could log a session and make them stop.", "19:00"],
];
const DIMS = [["Substance", 4], ["Structure", 3], ["Relevance", 4], ["Credibility", 2], ["Differentiation", 3]];

const FAQ = [
  ["How much does it cost?", "Nothing at the moment, and there's no card to enter. The tutor and the AI interviewer have a daily allowance so the site can stay free."],
  ["Do I need a maths or computing background?", "No. The plan starts with Programming from zero, and the LLM course explains the maths the projects use. A machine learning course is there as an optional extra. If you can already code, the placement test skips what you know."],
  ["How long does it take?", "About " + planFor(8, "zero").total + " hours from scratch, or " + planFor(8, "some").total + " if you already write some Python. You can start applying after the second of the three projects. Optional extras, such as machine learning and a Microsoft certification, add up to " + EXTRA_HOURS + " hours if you want them. The calculator at the top works out the dates for your hours."],
  ["Is it accredited?", "No. Your certificates can be checked online and added to LinkedIn, and an optional course prepares you for Microsoft's AI-103 certification exam, which employers do recognise."],
  ["Will it get me a job?", "No course can promise that. Benchwork gives you what hiring managers look for: three working projects, peer-reviewed, a public portfolio page and plenty of interview practice."],
  ["What happens to my data?", 'It\'s handled as the <a href="privacy.html">privacy notice</a> describes. You can download all of it, or delete your account, from Settings at any time.'],
];

export function homeView(choice, mark) {
  const P = planFor(choice.hpw, choice.from);
  const bar = '<ol class="hp-bar" aria-label="Your plan, course by course">' + PLAN.courses.map((c) => {
    const r = P.rows.find((x) => x.id === c.id);
    return '<li data-id="' + c.id + '" class="p' + c.ph + (r ? "" : " off") + (c.project ? " proj" : "") + '" style="flex-grow:' + (r ? c.h : 0) + '" title="' + esc(r ? c.t + " (" + c.h + " hours)" : "") + '"><span class="sr">' + esc(r ? c.t + ", " + c.h + " hours, " + shortMonth(r.sd) + " to " + shortMonth(r.ed) : "") + "</span></li>";
  }).join("") + "</ol>";
  const projects = PLAN.courses.filter((c) => c.project).map((c) => '<li><h3>' + esc(c.t.replace(/: project \d/, "")) + "</h3><p>" + esc(c.why) + "</p></li>").join("");
  const ex = PLAN.ex;

  return '<div class="hp">' +
    '<section class="hp-hero" aria-labelledby="hp-h1"><div class="hp-in">' +
      '<h1 id="hp-h1">Become an AI engineer from zero, one evening at a time.</h1>' +
      '<p class="hp-lede">Benchwork is a free, structured course for people with day jobs. You get a plan with a date on every course, lessons with Python exercises that run in your browser, three projects for your CV and interview practice with an AI interviewer.</p>' +
      '<div class="hp-calc"><p class="hp-sentence">At ' + sel("hp-hours", "Hours a week", HOURS.map((h) => [h, h + " hours"]), choice.hpw) + " a week, starting " +
        sel("hp-from", "Where you're starting", [["zero", "from scratch"], ["some", "knowing some Python"]], choice.from) + ', <span id="hp-out" aria-live="polite">' + summary(P, choice.hpw) + "</span></p>" +
        '<div class="hp-track"><div class="hp-ticks" aria-hidden="true">' + ticks(P) + "</div>" + bar + "</div>" +
        '<ul class="hp-phases" aria-label="The four stages">' + phaseRows(P) + "</ul>" +
        '<div class="hp-cta"><button class="btn lg" type="button" data-home="start">Build my plan</button><p class="small">Free, no card. Your placement test fine-tunes these dates by skipping what you already know.</p></div>' +
      "</div>" +
    "</div></section>" +

    '<section class="hp-sec hp-evening" aria-labelledby="hp-ev"><div class="hp-in hp-split">' +
      '<div><h2 id="hp-ev">What an evening looks like</h2><p class="hp-p">Most evenings are one short lesson, one exercise and a few quiz questions. It all runs in the browser, so there\'s nothing to install until the projects.</p>' +
        '<ol class="hp-steps"><li><b>Read</b><span>A lesson written for working adults. If you learn better from video or a book, it points you to the best one for that topic.</span></li>' +
        "<li><b>Code</b><span>The exercise checks itself when you run it. You get hints first, then a tutor if you're still stuck.</span></li>" +
        "<li><b>Recall</b><span>A few quiz questions now, and the same ideas again a week later so they stick.</span></li></ol></div>" +
      '<figure class="hp-code" aria-label="Example exercise: ' + esc(ex.t) + '"><figcaption><span>' + esc(ex.t) + '</span><span class="muted">Python for engineers</span></figcaption>' +
        '<pre><code>' + CODE(ex.sol.trim()) + "</code></pre>" +
        '<div class="hp-tests">' + ex.tests.map((t) => '<span class="ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' + esc(t) + "</span>").join("") + '<b class="n">' + ex.tests.length + " of " + ex.tests.length + " checks pass</b></div></figure>" +
    "</div></section>" +

    '<section class="hp-sec" aria-labelledby="hp-pj"><div class="hp-in"><h2 id="hp-pj">Three projects you can show an employer</h2>' +
      '<p class="hp-p">You build them in this order, each one on top of the last. Another member reviews each project against the rubric an interviewer would use, and your public portfolio page shows the result.</p>' +
      '<ol class="hp-projects">' + projects + "</ol></div></section>" +

    '<section class="hp-sec hp-night" aria-labelledby="hp-nag"><div class="hp-in hp-split">' +
      '<div><h2 id="hp-nag">It notices when you skip</h2><p class="hp-p">Teaching yourself is easy to start and easy to drop. Benchwork makes dropping it awkward. Pick how hard it pushes you, from off to relentless, then add an accountability partner, a weekly league of up to 20 learners and a streak that resets when you miss your hours.</p></div>' +
      '<div class="hp-notes" aria-label="Example reminders">' + NOTES.map((n) => '<div class="hp-note"><span class="hp-ico" aria-hidden="true">' + mark + '</span><div><b>' + esc(n[0]) + "</b><span>" + esc(n[1]) + '</span></div><time class="xs">' + n[2] + "</time></div>").join("") + "</div>" +
    "</div></section>" +

    '<section class="hp-sec" aria-labelledby="hp-iv"><div class="hp-in hp-split rev">' +
      '<div><h2 id="hp-iv">Practise the interview out loud</h2><p class="hp-p">Paste a job advert or pick one from live listings. The AI interviewer asks the questions that role would ask, listens to your spoken answers and scores each one, with a stronger version written in your own words.</p>' +
      '<p class="hp-p">There\'s also a CV review against the advert, a 30-second pitch and a debrief for after real interviews.</p></div>' +
      '<div class="hp-score" aria-label="Example scorecard"><div class="hp-score-h"><b>Applied AI Engineer</b><span class="muted small">Technical round, 5 answers</span></div>' +
        DIMS.map((d) => '<div class="hp-dim"><span>' + d[0] + '</span><i style="--w:' + d[1] * 20 + '%" class="s' + d[1] + '"></i><b class="n">' + d[1] + "</b></div>").join("") +
        '<p class="small"><b>Priority:</b> put a number in every result. You said the search "got faster"; say it went from 4 seconds to 600 milliseconds.</p></div>' +
    "</div></section>" +

    '<section class="hp-sec" aria-labelledby="hp-faq"><div class="hp-in hp-narrow"><h2 id="hp-faq">Questions people ask first</h2>' +
      FAQ.map((f) => "<details><summary>" + esc(f[0]) + "</summary><p>" + f[1] + "</p></details>").join("") + "</div></section>" +

    '<section class="hp-end" aria-labelledby="hp-go"><div class="hp-in"><h2 id="hp-go">Your first evening takes 20 minutes</h2>' +
      "<p>Rate the tools you've used, take a short placement test and get a plan with a date on every course.</p>" +
      '<button class="btn lg" type="button" data-home="start">Build my plan</button></div></section>' +

    '<footer class="hp-foot"><div class="hp-in"><span>Benchwork</span><nav aria-label="Footer"><a href="privacy.html">Privacy notice</a><a href="terms.html">Terms</a><a href="?signin" data-auth="to-signin">Sign in</a></nav></div></footer>' +
  "</div>";
}
