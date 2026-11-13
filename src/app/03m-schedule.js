  /* ---------- Your study week: set for you or set yourself, and in your calendar ---------- */
  // S.sched = { mode: "auto" | "own", tod, weekends, avoid: [day], days: { MO: { t: "19:30", m: 60 }, ... }, until, ms: [[iso, title]] }
  // The schedule's total becomes your hours a week, which sets every date in the plan.
  const WEEK = [["MO", "Mon", "Monday"], ["TU", "Tue", "Tuesday"], ["WE", "Wed", "Wednesday"], ["TH", "Thu", "Thursday"], ["FR", "Fri", "Friday"], ["SA", "Sat", "Saturday"], ["SU", "Sun", "Sunday"]];
  const TOD = [["morning", "Early morning", "07:00"], ["lunch", "Lunchtime", "12:30"], ["evening", "Evening", "19:30"]];
  const LENGTHS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240];
  const fmtMins = (m) => (m < 60 ? m + " min" : Math.floor(m / 60) + (m % 60 ? " h " + (m % 60) + " min" : (m >= 120 ? " hours" : " hour")));
  const weekMins = (days) => Object.keys(days || {}).reduce((a, k) => a + (Number(days[k].m) || 0), 0);
  const okTime = (t) => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

  // Spreads your weekly hours over the week: shorter sessions on weekdays, longer at weekends if you want them.
  function autoDays(hpw, tod, weekends, avoid) {
    const total = Math.round(hpw * 60 / 15) * 15, at = (TOD.find((x) => x[0] === tod) || TOD[2])[2];
    const free = (d) => (avoid || []).indexOf(d) < 0;
    const wkend = weekends ? ["SA", "SU"].filter(free) : [], wkday = ["MO", "WE", "TH", "TU", "FR"].filter(free);
    const days = {}; let left = total;
    if (!wkday.length && !wkend.length) return days;
    const capD = total > 20 * 60 ? 150 : 90, capE = total > 20 * 60 ? 240 : 180;
    if (wkend.length) {
      const share = Math.min(capE * wkend.length, Math.round((wkday.length ? total * 0.4 : total) / wkend.length / 15) * 15 * wkend.length);
      wkend.forEach((d) => { const m = Math.max(30, Math.min(capE, Math.round(share / wkend.length / 15) * 15)); days[d] = { t: "10:00", m }; left -= m; });
    }
    if (left > 0 && wkday.length) {
      const n = Math.min(wkday.length, Math.max(Math.min(3, wkday.length), Math.ceil(left / capD)));
      // Whole quarter-hours, shared out so the week adds up to exactly your hours.
      const pick = wkday.slice(0, n), units = Math.round(left / 15), base = Math.floor(units / n), extra = units - base * n;
      pick.forEach((d, i) => { days[d] = { t: at, m: Math.max(15, (base + (i < extra ? 1 : 0)) * 15) }; });
    } else if (left > 0 && wkend.length) wkend.forEach((d) => { days[d].m = Math.min(300, days[d].m + Math.round(left / wkend.length / 15) * 15); });
    return days;
  }
  function schedOf() {
    const s = S.sched;
    if (s && s.days) return s;
    return { mode: "auto", tod: "evening", weekends: true, avoid: [], days: autoDays(S.hpw, "evening", true, []) };
  }
  // Course start dates for the calendar feed, refreshed whenever the plan moves.
  function schedMilestones() {
    if (!MOD.length) return [];
    const P = plan();
    const out = P.rows.filter((r) => !r.done && r.sd >= addDays(parseDate(today()), -1)).slice(0, 20).map((r) => [isoDate(r.sd), "Start " + r.m.title]);
    out.push([isoDate(P.end), "benchwrk plan complete"]);
    return out;
  }
  function saveSched(s) {
    const days = {};
    WEEK.forEach((w) => { const d = s.days && s.days[w[0]]; if (d && okTime(d.t) && Number(d.m) >= 10) days[w[0]] = { t: d.t, m: Math.min(480, Math.round(Number(d.m))) }; });
    const mins = weekMins(days);
    if (mins >= 180) S.hpw = Math.max(3, Math.min(40, Math.round(mins / 30) / 2));
    S.sched = { mode: s.mode === "own" ? "own" : "auto", tod: s.tod || "evening", weekends: s.weekends !== false, avoid: (s.avoid || []).filter((d) => WEEK.some((w) => w[0] === d)), days,
      until: MOD.length ? isoDate(plan().end) : isoDate(addDays(parseDate(today()), 7 * 52)), ms: [], tz: myTz() };
    S.sched.ms = schedMilestones();
    persist();
  }
  function todaySession() {
    const s = S.sched; if (!s || !s.days) return null;
    const i = (new Date().getDay() + 6) % 7, d = s.days[WEEK[i][0]];
    if (d) return { today: true, day: WEEK[i][2], t: d.t, m: d.m };
    for (let k = 1; k < 8; k++) { const j = (i + k) % 7, n = s.days[WEEK[j][0]]; if (n) return { today: false, day: k === 1 ? "tomorrow" : WEEK[j][2], t: n.t, m: n.m }; }
    return null;
  }
  // Keeps the calendar feed's course dates in step with the plan as you progress.
  function refreshSchedDates() {
    if (!S.sched || !S.sched.days || !MOD.length) return;
    const ms = schedMilestones(), until = isoDate(plan().end);
    if (JSON.stringify(ms) !== JSON.stringify(S.sched.ms) || until !== S.sched.until || S.sched.tz !== myTz()) { S.sched.ms = ms; S.sched.until = until; S.sched.tz = myTz(); persist(); }
  }
  function homeSchedCard() {
    if (!MOD.length) return "";
    refreshSchedDates();
    const t = todaySession();
    if (!t) return '<a class="card sched-mini" href="#schedule"><b>Set your study week</b><span class="small muted">Pick your days and times, or let benchwrk plan them, then add them to your calendar.</span></a>';
    const studied = S.log.some((e) => e.d === today());
    return '<a class="card sched-mini" href="#schedule"><span class="small muted">' + (t.today ? (studied ? "Today's session, done" : "Today's session") : "No session today") + "</span><b>" + (t.today ? esc(t.t) + ", " + fmtMins(t.m) : "Next: " + esc(t.day) + " at " + esc(t.t)) + '</b><span class="small muted">Your week: ' + fmtMins(weekMins(S.sched.days)) + "</span></a>";
  }

  function weekGrid(days) {
    return '<ol class="wk" aria-label="Your week">' + WEEK.map((w) => {
      const d = days[w[0]];
      return '<li class="' + (d ? "on" : "") + '"><b>' + w[1] + "</b>" + (d ? '<span class="wk-blk" style="--h:' + Math.max(18, Math.min(100, d.m / 2.4)) + '%"><span>' + esc(d.t) + "</span><span>" + fmtMins(d.m) + "</span></span>" : '<span class="wk-rest">Rest</span>') + "</li>";
    }).join("") + "</ol>";
  }
  function vSchedule() {
    const s = ui.schedDraft || (ui.schedDraft = JSON.parse(JSON.stringify(schedOf())));
    const auto = s.mode !== "own", days = auto ? autoDays(Number(s.hpw || S.hpw), s.tod, s.weekends !== false, s.avoid || []) : s.days;
    if (auto) s.days = days;
    const mins = weekMins(days), hp = Math.round(mins / 30) / 2;
    const saved = S.sched && JSON.stringify(S.sched.days) === JSON.stringify(days) && S.sched.mode === s.mode;
    let end = null;
    if (MOD.length && hp >= 3) end = plan(Object.assign({}, S, { hpw: Math.min(40, hp) })).end;
    const head = "<h1>Your study week</h1><p class=\"lede\">Study at the same times each week and it becomes a habit. Pick your own times, or let benchwrk spread your hours for you.</p>";
    const seg = '<div class="seg sched-seg" role="radiogroup" aria-label="How to set your week"><label><input type="radio" name="sc-mode" value="auto"' + (auto ? " checked" : "") + '><span>Set it for me</span></label><label><input type="radio" name="sc-mode" value="own"' + (auto ? "" : " checked") + "><span>I'll set my own</span></label></div>";
    let form;
    if (auto) {
      form = '<div class="sched-auto"><div class="field" style="max-width:200px"><label for="sc-hpw">Hours a week</label><input id="sc-hpw" type="number" min="3" max="40" step="0.5" value="' + esc(s.hpw || S.hpw) + '"></div>' +
        '<fieldset><legend>Best time of day</legend><div class="choice">' + TOD.map((x) => '<label><input type="radio" name="sc-tod" value="' + x[0] + '"' + ((s.tod || "evening") === x[0] ? " checked" : "") + "><span>" + x[1] + ' <span class="muted small">from ' + x[2] + "</span></span></label>").join("") + "</div></fieldset>" +
        '<label class="toggle"><span><b>Longer sessions at weekends</b><br><span class="small muted">Up to three hours on Saturday and Sunday, so weekdays stay short.</span></span><input type="checkbox" id="sc-weekends"' + (s.weekends !== false ? " checked" : "") + "></label>" +
        '<fieldset><legend>Days you can\'t study</legend><div class="days">' + WEEK.map((w) => '<label><input type="checkbox" data-scavoid="' + w[0] + '"' + ((s.avoid || []).indexOf(w[0]) >= 0 ? " checked" : "") + "><span>" + w[1] + "</span></label>").join("") + "</div></fieldset></div>";
    } else {
      form = '<div class="sched-own" role="group" aria-label="Your sessions"><div class="sched-row sched-hd" aria-hidden="true"><span>Day</span><span>Starts</span><span>Length</span></div>' + WEEK.map((w) => {
        const d = s.days[w[0]];
        return '<div class="sched-row' + (d ? "" : " off") + '"><label class="sched-day"><input type="checkbox" data-scday="' + w[0] + '"' + (d ? " checked" : "") + "><span>" + w[2] + "</span></label>" +
          '<label class="sr" for="sc-t-' + w[0] + '">' + w[2] + ' start time</label><input type="time" id="sc-t-' + w[0] + '" data-sct="' + w[0] + '" value="' + esc(d ? d.t : "19:30") + '"' + (d ? "" : " disabled") + ">" +
          '<label class="sr" for="sc-m-' + w[0] + '">' + w[2] + ' length</label><select id="sc-m-' + w[0] + '" data-scm="' + w[0] + '"' + (d ? "" : " disabled") + ">" + (d && LENGTHS.indexOf(d.m) < 0 ? LENGTHS.concat(d.m).sort((x, y) => x - y) : LENGTHS).map((m) => '<option value="' + m + '"' + ((d ? d.m : 60) === m ? " selected" : "") + ">" + fmtMins(m) + "</option>").join("") + "</select></div>";
      }).join("") + "</div>";
    }
    const total = '<p class="sched-total" aria-live="polite"><b>' + fmtMins(mins) + " a week</b>" + (mins < 180 ? '. <span class="err-text">Plan at least 3 hours a week so the dates make sense.</span>' : Object.keys(days).some((k) => days[k].m > 180) ? '. <span class="err-text">Some sessions are over three hours. Free up another day so each one is shorter.</span>' : end ? ". At that pace you finish the plan in " + end.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) + "." : ".") + "</p>";
    const actions = '<div class="row">' + (auto ? '<button class="btn line" data-act="scedit">Adjust it myself</button>' : "") + '<button class="btn' + (saved ? " line" : "") + '" data-act="scsave"' + (mins < 180 || saved ? " disabled" : "") + ">" + (saved ? "Saved" : "Save my week") + "</button></div>";
    return head + '<div class="cols sec"><div class="stack"><div class="card">' + seg + form + "</div>" + '<div class="card"><h2>This week</h2>' + weekGrid(days) + total + actions + "</div></div>" +
      "<aside>" + calCard() + "</aside></div>";
  }

  // Calendar: a live subscription that updates itself when you change your week, or a one-off file.
  function calCard() {
    const has = S.sched && S.sched.days && weekMins(S.sched.days) > 0;
    if (!has) return '<div class="card"><h2>Add it to your calendar</h2><p class="small muted">Save your week first, then add it to your phone or Google Calendar.</p></div>';
    const bw = window.BW, link = ui.calLink;
    if (bw && bw.calendar && !link && !ui.calLoading) { ui.calLoading = true; bw.calendar.link().then((u) => { ui.calLink = u; ui.calLoading = false; if (route().name === "schedule") render(); }).catch(() => { ui.calLoading = false; ui.calLink = ""; }); }
    let sub = "";
    if (link) {
      const webcal = link.replace(/^https?:/, "webcal:");
      sub = '<p class="small">Subscribe once and changes to your week appear by themselves.</p><div class="cal-links">' +
        '<a class="btn line" href="' + esc(webcal) + '">iPhone, iPad or Mac</a>' +
        '<a class="btn line" target="_blank" rel="noopener" href="https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(webcal) + '">Google Calendar and Android</a>' +
        '<a class="btn line" target="_blank" rel="noopener" href="https://outlook.live.com/calendar/0/addfromweb?url=' + encodeURIComponent(link) + '&name=benchwrk">Outlook</a></div>' +
        '<p class="xs muted">On Android, add it with Google Calendar and it shows in your phone\'s calendar app. Google checks for changes a few times a day; Apple about every hour.</p>' +
        '<details class="small"><summary>Copy the link, or stop it working</summary><p class="xs muted">Anyone with this link can see your study times, nothing else.</p><input class="cal-url" readonly value="' + esc(link) + '" aria-label="Calendar link" onclick="this.select()"><button class="link small" data-act="calrotate">Make a new link (the old one stops working)</button></details>';
    } else if (bw && bw.calendar) sub = '<p class="small muted">Preparing your calendar link…</p>';
    return '<div class="card"><h2>Add it to your calendar</h2>' + sub + '<p class="small" style="margin-top:12px">Or download a file with your sessions and course start dates. It works with every calendar app, but won\'t update if you change your week.</p><button class="btn line sm" data-act="calfile">Download calendar file</button></div>';
  }
  // The one-off file mirrors the server's feed (server/_ics.js).
  function schedIcs() {
    const s = S.sched, tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || "Europe/London", site = (window.BW && window.BW.site) || location.origin;
    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", until = (s.until || isoDate(addDays(parseDate(today()), 364))).replace(/-/g, "") + "T235959Z";
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//benchwrk//Study week//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:benchwrk"];
    const base = parseDate(today());
    WEEK.forEach((w, i) => {
      const d = s.days[w[0]]; if (!d) return;
      const first = new Date(base); while ((first.getDay() + 6) % 7 !== i) first.setDate(first.getDate() + 1);
      const [hh, mm] = d.t.split(":").map(Number); first.setHours(hh, mm, 0, 0); const stop = new Date(first.getTime() + d.m * 6e4);
      L.push("BEGIN:VEVENT", "UID:bw-" + uid + "-" + w[0] + "@benchwork", "DTSTAMP:" + stamp, "DTSTART;TZID=" + tz + ":" + icsLocal(first), "DTEND;TZID=" + tz + ":" + icsLocal(stop),
        "RRULE:FREQ=WEEKLY;BYDAY=" + w[0] + ";UNTIL=" + until, "SUMMARY:benchwrk study session", "DESCRIPTION:Open benchwrk and pick up where you left off: " + site, "URL:" + site,
        "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:benchwrk in 10 minutes", "END:VALARM", "END:VEVENT");
    });
    (s.ms || []).forEach((m, i) => { const d = m[0].replace(/-/g, ""); L.push("BEGIN:VEVENT", "UID:bw-" + uid + "-ms" + i + "-" + d + "@benchwork", "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + d, "SUMMARY:" + String(m[1]).replace(/[,;\\]/g, (c) => "\\" + c), "TRANSP:TRANSPARENT", "END:VEVENT"); });
    L.push("END:VCALENDAR");
    return L.join("\r\n") + "\r\n";
  }

  document.addEventListener("change", (e) => {
    const t = e.target; if (phase !== "ready" || route().name !== "schedule") return;
    const s = ui.schedDraft; if (!s) return;
    if (t.name === "sc-mode") { if (t.value === "own") { s.mode = "own"; s.days = JSON.parse(JSON.stringify(s.days || {})); } else s.mode = "auto"; render(); return; }
    if (t.id === "sc-hpw") { s.hpw = Math.max(3, Math.min(40, Number(t.value) || S.hpw)); render(); return; }
    if (t.name === "sc-tod") { s.tod = t.value; render(); return; }
    if (t.id === "sc-weekends") { s.weekends = t.checked; render(); return; }
    if (t.dataset.scavoid) { const d = t.dataset.scavoid; s.avoid = t.checked ? (s.avoid || []).concat(d) : (s.avoid || []).filter((x) => x !== d); render(); return; }
    if (t.dataset.scday) { const d = t.dataset.scday; if (t.checked) s.days[d] = { t: "19:30", m: 60 }; else delete s.days[d]; render(); return; }
    if (t.dataset.sct) { const d = s.days[t.dataset.sct]; if (d && okTime(t.value)) d.t = t.value; render(); return; }
    if (t.dataset.scm) { const d = s.days[t.dataset.scm]; if (d) d.m = Number(t.value) || 60; render(); }
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b || phase !== "ready") return;
    const a = b.dataset.act;
    if (a === "scedit") { const s = ui.schedDraft; s.mode = "own"; s.days = JSON.parse(JSON.stringify(s.days)); render(); return; }
    if (a === "scsave") { saveSched(ui.schedDraft); ui.schedDraft = null; toast("Saved. Your plan now runs at " + S.hpw + " hours a week."); render(); return; }
    if (a === "calfile") { saveFile("benchwrk-study-week.ics", schedIcs(), "text/calendar").then(() => toast("Calendar file saved. Open it to add your sessions.")).catch(() => {}); return; }
    if (a === "calrotate") { try { ui.calLink = await window.BW.calendar.link(true); toast("New link made. Subscribe again with it; the old one has stopped working."); render(); } catch (x) { toast("That didn't work. Try again."); } }
  });
