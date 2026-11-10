  /* ---------- Reminders: how hard Benchwork pushes you, and phone or browser notifications ---------- */
  const RLEVELS = [
    ["off", "Off", "No reminders at all. Weekly progress emails are set separately."],
    ["gentle", "Gentle", "An email when your streak is about to end, and one after ten quiet days."],
    ["persistent", "Persistent", "A reminder every evening once you've skipped two days, or your streak is at risk."],
    ["relentless", "Relentless", "Lunchtime and evening from the first day you skip, and it gets personal. Duolingo would be proud."],
  ];
  const myTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London"; } catch (e) { return "Europe/London"; } };
  const remindLevel = () => (S.remind && S.remind.level) || "gentle";
  function remindFields(prefix, level) {
    return '<fieldset><legend>How hard should we push you?</legend><div class="choice">' + RLEVELS.map((l) => '<label><input type="radio" name="' + prefix + '-remind" value="' + l[0] + '"' + (level === l[0] ? " checked" : "") + "><span><b>" + l[1] + '</b><br><span class="small muted">' + l[2] + "</span></span></label>").join("") + "</div></fieldset>";
  }
  const readRemind = (prefix, fallback) => ((document.querySelector('input[name="' + prefix + '-remind"]:checked') || {}).value || fallback);

  function loadPush() {
    const P = window.BW && window.BW.push;
    if (!P) { ui.push = { support: "nokey", on: false }; return; }
    ui.push = { support: P.support(), on: false, loading: true };
    P.on().then((on) => { ui.push = Object.assign({}, ui.push, { on, loading: false }); if (route().name === "settings" || route().name === "home") render(); }).catch(() => { ui.push.loading = false; });
  }
  function pushBlock() {
    if (!ui.push) loadPush();
    const P = ui.push, lvl = remindLevel();
    const msg = {
      nokey: "Phone and browser notifications aren't set up on this site yet, so reminders come by email.",
      unsupported: "This browser can't show notifications, so reminders come by email.",
      "ios-install": "On an iPhone or iPad, add Benchwork to your Home Screen first: tap Share, then Add to Home Screen, and open it from there. Then come back here.",
      blocked: "Notifications are blocked for this site. Allow them in your browser's site settings, then reload.",
    }[P.support];
    let body;
    if (msg) body = '<p class="small muted" style="margin:0">' + esc(msg) + "</p>";
    else if (P.on) body = '<p class="small" style="margin:0 0 10px"><b>On for this device.</b> Reminders arrive here instead of by email.</p><div class="row"><button class="btn line sm" data-act="pushtest"' + (ui.pushBusy ? " disabled" : "") + '>Send me a test</button><button class="btn line sm" data-act="pushoff"' + (ui.pushBusy ? " disabled" : "") + ">Turn off on this device</button></div>";
    else body = '<p class="small muted" style="margin:0 0 10px">Get reminders on this ' + (/Mobi|Android/.test(navigator.userAgent) ? "phone" : "computer") + " as notifications. Without them, they come by email (at most one a day).</p>" + '<button class="btn sm" data-act="pushon"' + (ui.pushBusy || lvl === "off" ? " disabled" : "") + ">" + (ui.pushBusy ? "Asking…" : "Turn on notifications") + "</button>";
    return '<div class="push-box">' + body + "</div>";
  }
  function settingsRemind() {
    const R = S.remind || {}, hour = Number(R.hour) || 19;
    return '<div class="card sec" id="reminders"><h2>Reminders</h2><p class="muted">Reminders stop for the day as soon as you log a session, and never arrive between 9pm and 8am.</p>' +
      remindFields("st", remindLevel()) +
      '<div class="field" style="max-width:280px;margin-top:14px"><label for="st-rhour">Evening reminder at</label><select id="st-rhour"' + (remindLevel() === "persistent" || remindLevel() === "relentless" ? "" : " disabled") + ">" + [17, 18, 19, 20].map((h) => '<option value="' + h + '"' + (h === hour ? " selected" : "") + ">" + h + ":00</option>").join("") + '</select><p class="small muted" style="margin:6px 0 0">In your time zone, ' + esc(myTz().replace(/_/g, " ")) + ".</p></div>" +
      "<h3 style=\"margin-top:18px\">Notifications on this device</h3>" + pushBlock() + "</div>";
  }
  function saveRemind(patch) {
    S.remind = Object.assign({ level: "gentle", hour: 19 }, S.remind || {}, patch, { tz: myTz() });
    persist();
  }

  // What Today shows when you're about to lose something.
  function remindState() {
    if (!S.account || !S.log) return null;
    const t = today(), last = S.log.reduce((a, e) => (e.d <= t && (!a || e.d > a) ? e.d : a), null), studied = last === t;
    const quiet = last ? Math.round((parseDate(t) - parseDate(last)) / 864e5) : 0;
    const si = streakInfo(), dow = new Date().getDay(), left = r1(Math.max(0, S.hpw * 0.6 - thisWeekHours()));
    const risk = !studied && si.weeks >= 1 && !si.thisWeek && [4, 5, 6, 0].indexOf(dow) >= 0;
    return { studied, quiet, risk, sunday: dow === 0, weeks: si.weeks, left };
  }
  function remindBanner() {
    const s = remindState(); if (!s || s.studied) return "";
    let h, b;
    if (s.risk) { h = s.sunday ? "Last day for your " + s.weeks + "-week streak" : "Your " + s.weeks + "-week streak ends Sunday"; b = "Log " + s.left + (s.left === 1 ? " more hour" : " more hours") + (s.sunday ? " before midnight" : " this week") + " to keep it."; }
    else if (s.quiet >= 2) { h = s.quiet + " days since your last session"; b = s.quiet >= 4 ? "Your dates have started slipping. Twenty minutes tonight pulls them back." : "One lesson or one exercise is enough to get going again."; }
    else return "";
    const ask = (remindLevel() === "off" || remindLevel() === "gentle") && !(S.remind && S.remind.askedUp) ? ' <button class="link small" data-act="remindup">Want firmer reminders?</button>' : "";
    return '<div class="nudge-bar" role="status"><span class="ico fire">' + SVG.fire + "</span><div><b>" + esc(h) + "</b><br><span class=\"small\">" + esc(b) + ask + '</span></div><button class="btn sm" data-act="qlog" data-h="1">Log 1 hour</button></div>';
  }
  // A one-time card on Today offering notifications to members who chose firm reminders.
  function remindAskCard() {
    const lvl = remindLevel();
    if ((lvl !== "persistent" && lvl !== "relentless") || (S.remind && S.remind.askedPush)) return "";
    if (!ui.push) loadPush();
    if (ui.push.support !== "ready" || ui.push.on || ui.push.loading) return "";
    return '<div class="card"><h2>Get reminders on this device</h2><p class="small muted">You picked ' + esc(lvl) + " reminders. They land better as notifications than as emails.</p><div class=\"row\"><button class=\"btn sm\" data-act=\"pushon\">Turn on notifications</button><button class=\"btn line sm\" data-act=\"pushlater\">Not now</button></div></div>";
  }
  function remindNotif(add) {
    const s = remindState(); if (!s || s.studied || !s.risk) return;
    const d = new Date(); d.setHours(8, 0, 0, 0);
    add(d.getTime(), "Your " + s.weeks + "-week streak ends " + (s.sunday ? "tonight" : "Sunday") + ". " + s.left + (s.left === 1 ? " hour" : " hours") + " to go.", "#home", "streak");
  }

  document.addEventListener("change", (e) => {
    const t = e.target; if (phase !== "ready") return;
    if (t.name === "st-remind") { saveRemind({ level: t.value }); toast(t.value === "relentless" ? "Relentless it is. You asked for this." : t.value === "off" ? "Reminders off." : "Saved."); render(); return; }
    if (t.id === "st-rhour") { saveRemind({ hour: Number(t.value) || 19 }); toast("Evening reminders at " + t.value + ":00."); }
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b || phase !== "ready") return;
    const a = b.dataset.act, P = window.BW && window.BW.push;
    if (a === "remindup") { saveRemind({ askedUp: true }); location.hash = "#settings"; setTimeout(() => { const el = document.getElementById("reminders"); if (el) el.scrollIntoView({ block: "start" }); }, 50); return; }
    if (a === "pushlater") { saveRemind({ askedPush: true }); render(); return; }
    if (!P || (a !== "pushon" && a !== "pushoff" && a !== "pushtest")) return;
    ui.pushBusy = true; render();
    try {
      if (a === "pushon") {
        const r = await P.enable();
        saveRemind({ askedPush: true });
        if (r.ok) { ui.push = { support: "ready", on: true }; toast("Notifications on. We'll be in touch."); }
        else { ui.push = { support: r.reason === "blocked" ? "blocked" : P.support(), on: false }; toast(r.reason === "blocked" ? "Notifications are blocked for this site." : "Maybe later, then."); }
      } else if (a === "pushoff") { await P.disable(); ui.push = { support: P.support(), on: false }; toast("Notifications off for this device. Reminders come by email."); }
      else { const r = await P.test(); toast(r.sent ? "Sent. It should appear in a few seconds." : "This device isn't registered any more. Turn notifications on again."); if (!r.sent) ui.push.on = false; }
    } catch (x) { toast(x && x.message ? x.message : "That didn't work. Try again."); }
    ui.pushBusy = false; render();
  });
