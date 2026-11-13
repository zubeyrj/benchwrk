
  /* ---------- How each member learns best: asked at sign-up, used to order and suggest resources ---------- */
  const LSTYLES = [["video", "Watching videos", "Lectures and walkthroughs"], ["reading", "Reading", "Guides, docs and articles"], ["interactive", "Hands-on practice", "Exercises and interactive tutorials"], ["build", "Building things", "Learning by making a project"]];
  const BUDGETS = [["free", "Free only"], ["coursera", "Free, plus Coursera Plus"], ["any", "Happy to buy a book or course"]];
  const FMTNAME = { video: "Video", reading: "Reading", interactive: "Interactive", book: "Book" };
  const learnSet = () => !!(S.learn && Array.isArray(S.learn.formats) && S.learn.formats.length);
  const isPaid = (cost) => !/^free/i.test(cost || "");
  const isCoursera = (cost) => /coursera/i.test(cost || "");

  // Higher is a better match: first-choice format, then second; anything outside the budget sinks.
  function resScore(r) {
    if (!learnSet()) return 0;
    const F = S.learn.formats, fm = r.fmt || ["reading"];
    let s = 0;
    F.forEach((f, i) => {
      const w = i === 0 ? 4 : 2;
      if (f === "build" ? fm.indexOf("interactive") >= 0 : fm.indexOf(f) >= 0) s += w;
      if (f === "reading" && fm.indexOf("book") >= 0) s += w / 2;
    });
    const b = S.learn.budget || "coursera";
    if (isPaid(r.cost) && (b === "free" || (b === "coursera" && !isCoursera(r.cost)))) s -= 10;
    return s;
  }
  function tailoredResources(m) {
    const list = (m.resources || []).map((r, i) => Object.assign({ i, score: resScore(r) }, r));
    if (!learnSet()) return list;
    return list.sort((a, b) => b.score - a.score || a.i - b.i);
  }
  const bestFor = (m, fmt) => tailoredResources(m).find((r) => r.score > 0 && (!fmt || (r.fmt || []).indexOf(fmt) >= 0)) || null;
  const fmtChips = (r) => (r.fmt || ["reading"]).map((f) => '<span class="fchip f-' + f + '">' + FMTNAME[f] + "</span>").join("");

  function resourceList(m) {
    const L = tailoredResources(m), top = learnSet() && L[0] && L[0].score > 0 ? L[0] : null;
    const outBudget = (r) => learnSet() && r.score < 0;
    const row = (x) => '<li' + (outBudget(x) ? ' class="dim"' : "") + '><span class="grow"><a class="ttl" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.t) + "</a>" + (x === top ? ' <span class="tag done">Best for you</span>' : "") +
      '<div class="xs muted">' + esc(x.by) + (x.note ? ". " + esc(x.note) : "") + '</div><div class="fchips">' + fmtChips(x) + (outBudget(x) ? '<span class="xs muted">Outside your budget</span>' : "") + "</div></span>" + costTag(x.cost) + "</li>";
    return (learnSet() ? '<p class="xs muted" style="margin:0 0 8px">Ordered for how you learn: ' + esc(S.learn.formats.map((f) => LSTYLES.find((s) => s[0] === f)[1].toLowerCase()).join(", then ")) + '. <a href="#settings">Change</a></p>' : '<p class="xs muted" style="margin:0 0 8px"><a href="#settings">Tell us how you learn best</a> and these get ordered for you.</p>') +
      '<ul class="rl">' + L.map(row).join("") + "</ul>";
  }

  // A short line at the top of a lesson, pointing at the format the member prefers.
  function lessonNudge(m, lx, i) {
    if (!learnSet()) return "";
    const f = S.learn.formats[0];
    if (f === "video") { const v = bestFor(m, "video"); return v ? '<p class="nudge">Prefer to watch? <a href="' + esc(v.url) + '" target="_blank" rel="noopener">' + esc(v.t) + "</a> covers this course. Watch a section, then come back for the check question.</p>" : ""; }
    if ((f === "interactive" || f === "build") && lx.ex && lx.ex.length) return '<p class="nudge">Learn by doing? Skim this, then try <a href="#ex-' + m.id + "-" + lx.ex[Math.min(i, lx.ex.length - 1)].id + '">' + esc(lx.ex[Math.min(i, lx.ex.length - 1)].t) + "</a> and come back when you get stuck.</p>";
    return "";
  }
  // On Today: the one outside resource that suits this member for the current course.
  function todayPick(m) {
    if (!learnSet()) return '<p class="pick">How do you learn best? <a href="#settings">Tell us</a> and benchwrk picks resources to match.</p>';
    const r = bestFor(m); if (!r) return "";
    return '<p class="pick">Best for you this course: <a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.t) + "</a> <span>(" + esc((r.fmt || []).map((f) => FMTNAME[f].toLowerCase()).join(" and ")) + ", " + esc(r.cost) + ")</span></p>";
  }
  function learnForTutor() {
    if (!learnSet()) return "";
    return "\nThe learner says they learn best by " + S.learn.formats.map((f) => LSTYLES.find((s) => s[0] === f)[1].toLowerCase()).join(", then ") + " (budget: " + (BUDGETS.find((b) => b[0] === S.learn.budget) || BUDGETS[1])[1].toLowerCase() + "). Shape explanations to suit: for video learners describe things step by step as if walking through on screen and suggest a video from the course resources; for hands-on learners give a tiny thing to try; for readers point to the relevant doc. Still make them think rather than handing over answers.";
  }
  const STYLE_TIPS = {
    video: ["Watch at 1.25x with the code open beside you; pause and type every example.", "After each video, close it and do the lesson's check question from memory."],
    reading: ["Read with a notebook open and rewrite each idea in one line of your own.", "Turn headings into questions and answer them before reading on."],
    interactive: ["Start each lesson with its exercise; read only when you're stuck.", "When an exercise passes, change one thing and predict what breaks."],
    build: ["Keep a scratch project open all week and add each new idea to it.", "Start the course build early and pull lessons in as you need them."],
  };
  function learnCard(compact) {
    if (!learnSet()) return "";
    const tips = S.learn.formats.reduce((a, f) => a.concat(STYLE_TIPS[f] || []), []).slice(0, 3);
    return '<div class="card' + (compact ? "" : " sec") + '"><h2>How you learn best</h2><p class="small muted">' + esc(S.learn.formats.map((f) => LSTYLES.find((s) => s[0] === f)[1]).join(", then ")) + ". Resources on every course are ordered to match, and the tutor adapts too.</p><ul class=\"iv-ul small\">" + tips.map((t) => "<li>" + esc(t) + "</li>").join("") + '</ul><p class="xs muted" style="margin-top:10px">Whatever your style, the exercises and quizzes stay: testing yourself is what makes things stick for everyone.</p></div>';
  }
  function learnFields(prefix, cur) {
    const F = (cur && cur.formats) || [], B = (cur && cur.budget) || "coursera";
    return '<fieldset class="learn-q"><legend>How do you learn best? <span class="muted">Pick one or two, favourite first</span></legend><div class="lgrid">' +
      LSTYLES.map((s) => { const i = F.indexOf(s[0]); return '<label class="lopt"><input type="checkbox" name="' + prefix + '-fmt" value="' + s[0] + '"' + (i >= 0 ? " checked" : "") + '><span><b>' + s[1] + '</b><span class="xs muted">' + s[2] + "</span>" + (i >= 0 ? '<i class="rank">' + (i + 1) + "</i>" : "") + "</span></label>"; }).join("") + "</div>" +
      (ui.learnErr ? '<p class="err" id="' + prefix + '-learn-err">' + esc(ui.learnErr) + "</p>" : "") + "</fieldset>" +
      '<fieldset><legend>Paid courses and books</legend><div class="choice">' + BUDGETS.map((b) => '<label><input type="radio" name="' + prefix + '-budget" value="' + b[0] + '"' + (B === b[0] ? " checked" : "") + "><span>" + b[1] + "</span></label>").join("") + "</div></fieldset>";
  }
  // Reads the form, keeping the order the boxes were ticked in.
  let tickOrder = [];
  function readLearn(prefix) {
    const on = Array.from(document.querySelectorAll('input[name="' + prefix + '-fmt"]:checked')).map((x) => x.value);
    const ordered = tickOrder.filter((v) => on.indexOf(v) >= 0).concat(on.filter((v) => tickOrder.indexOf(v) < 0)).slice(0, 2);
    const b = (document.querySelector('input[name="' + prefix + '-budget"]:checked') || {}).value || "coursera";
    return { formats: ordered, budget: b };
  }
  function settingsLearn() {
    if (ui.learnDraft === undefined) { ui.learnDraft = null; tickOrder = learnSet() ? S.learn.formats.slice() : []; }
    return '<form id="learnform" class="card sec"><h2>How you learn</h2>' + learnFields("st", ui.learnDraft || S.learn) + '<button class="btn" type="submit">Save</button></form>';
  }
  document.addEventListener("change", (e) => {
    const t = e.target; if (!t.name || !/-fmt$/.test(t.name)) return;
    if (t.checked) { tickOrder = tickOrder.filter((v) => v !== t.value).concat([t.value]); const on = document.querySelectorAll('input[name="' + t.name + '"]:checked'); if (on.length > 2) { const first = tickOrder.find((v) => v !== t.value && document.querySelector('input[name="' + t.name + '"][value="' + v + '"]:checked')); const el = document.querySelector('input[name="' + t.name + '"][value="' + first + '"]'); if (el) el.checked = false; tickOrder = tickOrder.filter((v) => v !== first); } }
    else tickOrder = tickOrder.filter((v) => v !== t.value);
    // Show 1 and 2 on the ticked boxes.
    document.querySelectorAll('input[name="' + t.name + '"]').forEach((el) => { const sp = el.nextElementSibling, old = sp.querySelector(".rank"); if (old) old.remove(); const i = tickOrder.indexOf(el.value); if (el.checked && i >= 0) { const r = document.createElement("i"); r.className = "rank"; r.textContent = String(i + 1); sp.appendChild(r); } });
  });
  document.addEventListener("submit", (e) => {
    const f = e.target; if (f.id !== "learnform" || phase !== "ready") return;
    e.preventDefault();
    const L = readLearn("st");
    if (!L.formats.length) { ui.learnErr = "Pick at least one."; render(); return; }
    ui.learnErr = ""; S.learn = Object.assign(L, { at: today() }); ui.learnDraft = undefined; persist(); toast("Saved. Resources are now ordered for you."); render();
  });
