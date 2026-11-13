  /* ---------- Study time: counted for you on study pages, logged by hand for time away ---------- */
  // Counting rules, kept deliberately strict so the number never flatters anyone:
  // - only on study pages (lessons, exercises, quizzes, practice, the library, projects, interview practice);
  // - only while this tab is visible and focused, so two tabs can't double-count;
  // - it stops 4 minutes after the last key press, click, scroll or touch;
  // - at most 14 hours a day.
  // Hand-logged sessions are for time away from benchwrk (videos, books, building in your own editor),
  // so the two add up without overlap.
  const STUDY_PAGES = ["lesson", "ex", "quiz", "course", "practice", "problems", "library", "glossary", "routes", "projects", "interview", "ivbank", "career"];
  const IDLE_MS = 4 * 60e3, TICK_S = 15;
  let lastInput = Date.now(), actBuf = 0;
  ["pointerdown", "keydown", "scroll", "wheel", "touchstart", "pointermove"].forEach((ev) => window.addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true, capture: true }));
  const counting = () => phase === "ready" && !!S.account && document.visibilityState === "visible" && document.hasFocus() && Date.now() - lastInput < IDLE_MS && STUDY_PAGES.indexOf(route().name) >= 0;
  function flushAct() {
    if (!actBuf) return;
    const d = today(); S.act = S.act || {};
    S.act[d] = Math.min(14 * 3600, (S.act[d] || 0) + actBuf); actBuf = 0;
    const ks = Object.keys(S.act).sort(); if (ks.length > 800) ks.slice(0, ks.length - 800).forEach((k) => delete S.act[k]);
    persist();
  }
  setInterval(() => { if (!counting()) return; actBuf += TICK_S; if (actBuf >= 60) flushAct(); }, TICK_S * 1000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushAct(); });
  window.addEventListener("pagehide", flushAct);

  const fmtH = (h) => { h = Math.max(0, h); if (h < 1) return Math.round(h * 60) + " min"; const r = Math.round(h * 4) / 4; return r1(r) + " h"; };
  // Today's planned session: from the saved study week if there is one, otherwise the default rhythm.
  function plannedToday() {
    const t = typeof todaySession === "function" ? todaySession() : null;
    if (S.sched && S.sched.days) return t && t.today ? t.m / 60 : 0;
    const d = rhythm()[(new Date().getDay() + 6) % 7]; return d ? d.hours : 0;
  }
  const tickEntry = () => S.log.find((e) => e.d === today() && e.k === "tick") || null;
  function weekCard() {
    const lb = loggedByDate(), have = lb[today()] || 0, auto = autoH(today()), manual = have - auto, plan0 = plannedToday(), tk = tickEntry();
    const todayTxt = '<p class="today-line"><b>Today: ' + fmtH(have) + "</b> studied" + (have > 0 ? " (" + fmtH(auto) + " counted on benchwrk" + (manual > 0.01 ? ", " + fmtH(manual) + " logged" : "") + ")" : "") + (plan0 ? '. Planned: ' + fmtH(plan0) + "." : ". No session planned today.") + "</p>";
    const btn = tk ? '<span class="state ok">' + TICK + ' Today\'s session ticked</span><button class="link small" data-act="tick">Undo</button>'
      : plan0 && have < plan0 - 0.01 ? '<button class="btn sm" data-act="tick">I did today\'s session</button>' : "";
    return '<div class="card"><div class="row between"><h2 style="margin:0">Your week</h2><a class="link small" href="#log">Study log</a></div>' + todayTxt +
      '<div class="row">' + btn + '<a class="btn line sm" href="#log">Log time away from benchwrk</a></div>' +
      '<div style="margin-top:14px">' + stripHtml(thisWeekDays()) + '</div><p class="xs muted" style="margin:10px 0 0">Time on lessons, exercises and practice is counted for you while you\'re active. Log anything you did elsewhere, such as videos or your own projects. <a href="#log">How hours are counted</a></p></div>';
  }
  function tickToday() {
    const tk = tickEntry();
    if (tk) { S.log = S.log.filter((e) => e !== tk); persist(); render(); toast("Tick removed."); return; }
    const need = plannedToday() - (loggedByDate()[today()] || 0);
    if (need <= 0.01) { toast("Today's planned time is already covered."); return; }
    const h = Math.max(0.25, Math.round(need * 4) / 4), cur = activeRow(plan());
    addLog(h, today(), cur ? cur.m.id : "", "Ticked today's session", "tick");
    render(); celebrate("Today's session done", "+" + Math.round(h * PTS.hour) + " XP");
  }
  // Rows for the study log: hand-logged sessions plus one "counted on benchwrk" row per day.
  function logRows() {
    const rows = S.log.map((e) => ({ d: e.d, h: Number(e.h || 0), e }));
    Object.keys(S.act || {}).forEach((d) => { if (S.act[d] >= 60) rows.push({ d, h: autoH(d), auto: true }); });
    return rows.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : a.auto ? -1 : 1));
  }
  const HOURS_HELP = '<div class="card"><h2>How hours are counted</h2><ul class="small" style="margin:0;padding-left:18px">' +
    "<li><b>Counted on benchwrk</b>: time on a lesson, exercise, quiz, practice round, library page or project while you're active. It stops after 4 minutes without a click, key press or scroll, and only the tab you're looking at counts.</li>" +
    "<li><b>Logged by you</b>: time away from benchwrk, such as a course video, a book or building your project in your own editor. Don't log time you spent here: it's already counted.</li>" +
    "<li><b>I did today's session</b> tops today up to your planned time. Use it when you studied but didn't log the details.</li>" +
    "<li>Your cohort sees your weekly total and how much of it was counted here.</li></ul></div>";
