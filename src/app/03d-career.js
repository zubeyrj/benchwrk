
  /* ---------- Career: applications tracker, CV review, pitch, real-interview debrief, comparing adverts ---------- */
  const STAGES = [["saved", "Saved"], ["applied", "Applied"], ["screen", "Screening"], ["interview", "Interviewing"], ["offer", "Offer"], ["closed", "Closed"]];
  const STAGE = Object.fromEntries(STAGES);
  const appOf = (id) => S.apps.find((a) => a.id === id);
  if (!ui.car) ui.car = { busy: {}, err: {}, edit: null, cvJob: "", pitchAud: "manager", dbApp: "", cmp: [] };

  function careerCall(body) { return window.BW.api("/api/interviewer", Object.assign({ profile: ivProfile() }, body)); }

  /* ----- applications ----- */
  function vApplications() {
    const A = S.apps, E = ui.car.edit;
    const today0 = parseDate(today());
    const upcoming = A.filter((a) => a.next && a.next.date && parseDate(a.next.date) >= today0).sort((a, b) => a.next.date.localeCompare(b.next.date));
    const col = (st) => {
      const list = A.filter((a) => (a.stage || "saved") === st[0]);
      return '<section class="kcol" aria-label="' + st[1] + '"><h3>' + st[1] + ' <span class="xs muted">' + list.length + "</span></h3>" +
        (list.length ? list.map(appCard).join("") : '<p class="xs muted" style="margin:6px 2px">Nothing here.</p>') + "</section>";
    };
    const form = E ? appForm(E) : "";
    return '<div class="row between" style="align-items:flex-end"><div><h1>Applications</h1><p class="lede">Every role you\'re going for, where it stands and what\'s next. Link each one to its advert to practise for that interview.</p></div><button class="btn" data-act="appnew">Add an application</button></div>' +
      form +
      (upcoming.length ? '<div class="card sec"><h2>Coming up</h2><ul class="rl">' + upcoming.slice(0, 5).map((a) => '<li><span class="date-chip"><b>' + parseDate(a.next.date).getDate() + "</b>" + esc(fmt(parseDate(a.next.date)).split(" ")[1] || "") + '</span><span class="grow"><b>' + esc(a.next.what || "Next step") + "</b> · " + esc(a.company) + '<div class="xs muted">' + esc(a.role) + "</div></span>" + (a.jobId && ivJob(a.jobId) ? '<a class="btn sm" href="#iv-job-' + a.jobId + '">Practise</a>' : "") + '<button class="btn line sm" data-act="appics" data-id="' + a.id + '">Add to calendar</button></li>').join("") + "</ul></div>" : "") +
      (A.length ? '<div class="kanban sec">' + STAGES.map(col).join("") + "</div>"
        : '<div class="card sec empty-state"><h2>Nothing tracked yet</h2><p class="muted">Add the roles you\'re applying for. You\'ll see what\'s due, practise with the real advert and debrief after each interview.</p><div class="row"><button class="btn" data-act="appnew">Add an application</button>' + (S.iv.jobs.length ? '<span class="small muted">or use "Track this application" on a saved job in the Interview room.</span>' : "") + "</div></div>");
  }
  function appCard(a) {
    const j = a.jobId ? ivJob(a.jobId) : null, n = a.next && a.next.date ? a.next : null;
    const dbs = S.career.debriefs.filter((d) => d.appId === a.id).length;
    return '<article class="kcard"><div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><b>' + esc(a.company) + '</b><div class="small">' + esc(a.role) + "</div></div>" +
      '<button class="link xs" data-act="appedit" data-id="' + a.id + '">Edit</button></div>' +
      (n ? '<p class="xs" style="margin:8px 0 0"><b>' + esc(n.what || "Next") + "</b> " + esc(fmt(parseDate(n.date))) + "</p>" : "") +
      (a.applied ? '<p class="xs muted" style="margin:4px 0 0">Applied ' + esc(fmt(parseDate(a.applied))) + "</p>" : "") +
      '<div class="row" style="margin-top:10px;gap:6px"><label class="sr" for="st-' + a.id + '">Stage</label><select id="st-' + a.id + '" class="sm-select" data-appstage="' + a.id + '">' + STAGES.map((s) => '<option value="' + s[0] + '"' + ((a.stage || "saved") === s[0] ? " selected" : "") + ">" + s[1] + "</option>").join("") + "</select>" +
      (j ? '<a class="btn sm" href="#iv-job-' + j.id + '">Practise</a>' : "") + '<a class="btn line sm" href="#career-debrief" data-act="debriefapp" data-id="' + a.id + '">Debrief' + (dbs ? " (" + dbs + ")" : "") + "</a></div></article>";
  }
  function appForm(E) {
    const jobs = S.iv.jobs;
    return '<form id="appform" class="card sec"><h2>' + (E.id ? "Edit application" : "Add an application") + '</h2><div class="two"><div class="field"><label for="ap-company">Company</label><input id="ap-company" maxlength="120" value="' + esc(E.company || "") + '"></div><div class="field"><label for="ap-role">Role</label><input id="ap-role" maxlength="140" value="' + esc(E.role || "") + '"></div></div>' +
      '<div class="two"><div class="field"><label for="ap-stage">Stage</label><select id="ap-stage">' + STAGES.map((s) => '<option value="' + s[0] + '"' + ((E.stage || "saved") === s[0] ? " selected" : "") + ">" + s[1] + "</option>").join("") + '</select></div><div class="field"><label for="ap-applied">Date applied</label><input id="ap-applied" type="date" value="' + esc(E.applied || "") + '"></div></div>' +
      '<div class="two"><div class="field"><label for="ap-next">Next step</label><input id="ap-next" maxlength="80" placeholder="Phone screen" value="' + esc((E.next && E.next.what) || "") + '"></div><div class="field"><label for="ap-nextd">On</label><input id="ap-nextd" type="date" value="' + esc((E.next && E.next.date) || "") + '"></div></div>' +
      '<div class="two"><div class="field"><label for="ap-link">Link to the advert</label><input id="ap-link" type="url" maxlength="500" value="' + esc(E.link || "") + '"></div><div class="field"><label for="ap-job">Saved job (for practice)</label><select id="ap-job"><option value="">None</option>' + jobs.map((j) => '<option value="' + j.id + '"' + (E.jobId === j.id ? " selected" : "") + ">" + esc((j.title || "Job") + (j.company ? " at " + j.company : "")) + "</option>").join("") + "</select></div></div>" +
      '<div class="field"><label for="ap-notes">Notes</label><textarea id="ap-notes" rows="3" maxlength="2000" placeholder="Who you spoke to, salary range, what they care about">' + esc(E.notes || "") + "</textarea></div>" +
      (ui.car.err.app ? '<p class="err">' + esc(ui.car.err.app) + "</p>" : "") +
      '<div class="row"><button class="btn" type="submit">Save</button><button class="btn line" type="button" data-act="appcancel">Cancel</button>' + (E.id ? '<button class="link small" type="button" data-act="appdel" data-id="' + E.id + '" style="color:var(--fail);margin-left:auto">' + (ui.car.delArm === E.id ? "Click again to delete" : "Delete") + "</button>" : "") + "</div></form>";
  }
  function homeCareerCard() {
    const t0 = parseDate(today()), soon = S.apps.filter((a) => a.next && a.next.date && parseDate(a.next.date) >= t0 && (parseDate(a.next.date) - t0) / DAY <= 7).sort((a, b) => a.next.date.localeCompare(b.next.date));
    if (!soon.length) return "";
    return '<div class="card"><h2>This week\'s interviews</h2><ul class="rl">' + soon.map((a) => '<li><span class="grow"><b>' + esc(a.next.what || "Next step") + "</b> · " + esc(a.company) + '<div class="xs muted">' + esc(fmt(parseDate(a.next.date))) + "</div></span>" + (a.jobId && ivJob(a.jobId) ? '<a class="btn sm" href="#iv-job-' + a.jobId + '">Practise</a>' : '<a class="btn line sm" href="#applications">Open</a>') + "</li>").join("") + "</ul></div>";
  }

  /* ----- CV and pitch hub ----- */
  function vCareer(r) {
    if (!ivReady()) return '<h1>CV and pitch</h1><p class="lede">These tools run on the benchwrk website.</p>';
    if (r.sub === "cv") return vCv();
    if (r.sub === "pitch") return vPitch();
    if (r.sub === "debrief") return vDebrief();
    const C = S.career;
    const tile = (href, t, d, st) => '<a class="card node tile" href="' + href + '"><h3>' + t + '</h3><p class="small muted" style="margin:0 0 10px">' + d + "</p>" + (st ? '<span class="tag done">' + st + "</span>" : '<span class="tag">Start</span>') + "</a>";
    return '<h1>CV and pitch</h1><p class="lede">Get your story straight before the interview: a CV that survives a 30-second scan, an answer to "tell me about yourself", and an honest debrief after each real interview.</p>' +
      '<div class="grid3 sec">' + tile("#career-cv", "CV review", "Paste your CV and, if you like, pick a saved job. You get rewritten bullets, missing keywords and how to frame the move into AI.", C.cv && C.cv.review ? "Reviewed " + fmt(parseDate(C.cv.at.slice(0, 10))) : "") +
      tile("#career-pitch", "Tell me about yourself", "Answer four questions and get your pitch in 30, 60 and 90-second versions, built around what makes you different.", C.pitch && C.pitch.out ? "Written" : "") +
      tile("#career-debrief", "Debrief a real interview", "Straight after an interview, note what they asked and what you said. You get a scorecard, what to fix for the next round and a thank-you email.", C.debriefs.length ? plural(C.debriefs.length, "debrief") : "") + "</div>" +
      (C.debriefs.length ? '<div class="card sec"><h2>Past debriefs</h2><ul class="rl">' + C.debriefs.slice().reverse().map((d) => '<li><span class="grow"><b>' + esc(d.round || "Interview") + "</b>" + (d.company ? " · " + esc(d.company) : "") + '<div class="xs muted">' + esc(fmt(parseDate(d.at.slice(0, 10)))) + '</div></span><button class="btn line sm" data-act="dbopen" data-id="' + d.id + '">Open</button></li>').join("") + "</ul></div>" : "");
  }
  const listOr = (x) => list(x || []);
  function vCv() {
    const C = S.career.cv || {}, R = C.review, busy = ui.car.busy.cv, err = ui.car.err.cv;
    const out = R ? '<div class="card sec"><div class="row between"><h2 style="margin:0">Your review</h2><span class="row"><span class="tag ' + (R.overall === "Strong" ? "done" : R.overall === "Weak" ? "skip" : "behind") + '">' + esc(R.overall || "") + '</span><span class="tag">ATS: ' + esc(R.ats || "") + "</span></span></div>" +
      '<p style="margin-top:12px"><b>In 30 seconds a recruiter sees:</b> ' + esc(R.recruiter_scan || "") + "</p>" + (R.ats_note ? '<p class="small muted">' + esc(R.ats_note) + "</p>" : "") +
      '<div class="two"><div><h3>Strengths</h3>' + listOr(R.strengths) + "</div><div><h3>Fix first</h3>" + listOr(R.top_fixes) + "</div></div>" +
      (R.summary_rewrite ? '<h3>A profile for the top of your CV</h3><div class="iv-better">' + esc(R.summary_rewrite) + "</div>" : "") +
      (R.bullets && R.bullets.length ? "<h3>Bullets, rewritten</h3>" + R.bullets.map((b) => '<div class="cvb"><p class="small muted" style="margin:0"><s>' + esc(b.before) + '</s></p><p style="margin:4px 0"><b>' + esc(b.after) + '</b></p><p class="xs muted" style="margin:0">' + esc(b.why) + "</p></div>").join("") : "") +
      (R.missing_keywords && R.missing_keywords.length ? '<h3>Missing keywords</h3><p class="row" style="gap:6px">' + R.missing_keywords.map((k) => '<span class="tag">' + esc(k) + "</span>").join("") + "</p>" : "") +
      (R.transition_note ? "<h3>Framing your move into AI</h3><p>" + esc(R.transition_note) + "</p>" : "") + "</div>" : "";
    return '<p class="crumb"><a href="#career">CV and pitch</a> / CV review</p><h1>CV review</h1><p class="lede">Paste the text of your CV. It stays private; it\'s sent to Claude only to write the review.</p>' +
      '<form id="cvform" class="card sec"><div class="field"><label for="cv-job">Review against a saved job <span class="muted">(optional)</span></label><select id="cv-job"><option value="">No particular job</option>' + S.iv.jobs.map((j) => '<option value="' + j.id + '"' + ((C.jobId || ui.car.cvJob) === j.id ? " selected" : "") + ">" + esc((j.title || "Job") + (j.company ? " at " + j.company : "")) + "</option>").join("") + "</select></div>" +
      '<div class="field"><label for="cv-text">Your CV</label><textarea id="cv-text" rows="14" maxlength="15000" placeholder="Paste everything: profile, experience, education, skills."' + (err ? ' aria-invalid="true" aria-describedby="cv-err"' : "") + ">" + esc(C.text || "") + "</textarea>" + (err ? '<p class="err" id="cv-err">' + esc(err) + "</p>" : "") + "</div>" +
      '<button class="btn lg" type="submit"' + (busy ? " disabled" : "") + ">" + (busy ? "Reviewing… about 20 seconds" : R ? "Review again" : "Review my CV") + "</button></form>" + out;
  }
  function vPitch() {
    const P = S.career.pitch || {}, A = P.answers || {}, O = P.out, busy = ui.car.busy.pitch, err = ui.car.err.pitch;
    const q = (id, l, ph) => '<div class="field"><label for="pt-' + id + '">' + l + '</label><textarea id="pt-' + id + '" rows="3" maxlength="1200" placeholder="' + esc(ph) + '">' + esc(A[id] || "") + "</textarea></div>";
    const out = O ? '<div class="card sec"><h2>Your pitch</h2><p class="pitch-hook">' + esc(O.hook || "") + "</p>" +
      [["short", "30 seconds"], ["medium", "60 seconds"], ["long", "90 seconds"]].map((v) => '<details class="iv-q"' + (v[0] === "medium" ? " open" : "") + "><summary><b>" + v[1] + '</b><span></span><button type="button" class="link xs" data-act="copypitch" data-v="' + v[0] + '">Copy</button></summary><p style="white-space:pre-wrap">' + esc(O[v[0]] || "") + "</p></details>").join("") +
      (O.differentiator ? '<p class="small"><b>What makes you different:</b> ' + esc(O.differentiator) + "</p>" : "") +
      '<div class="two"><div><h3>Leave out</h3>' + listOr(O.avoid) + "</div><div><h3>They'll ask next</h3>" + listOr(O.follow_ups) + "</div></div></div>" : "";
    return '<p class="crumb"><a href="#career">CV and pitch</a> / Tell me about yourself</p><h1>Tell me about yourself</h1><p class="lede">The first question in almost every interview. Answer these in your own words; the pitch is built only from what you write.</p>' +
      '<form id="pitchform" class="card sec">' + q("past", "Where have you come from?", "Your last role or two, and what you were good at.") + q("why", "Why AI engineering, and why now?", "The moment it clicked.") + q("proof", "What have you built or done that proves it?", "A project, with a number if you have one.") + q("edge", "What do you know that most candidates don't?", "Something you learned the hard way, or a view you'd defend.") +
      '<fieldset><legend>Who is it for?</legend><div class="seg" style="grid-template-columns:repeat(3,1fr);max-width:480px">' + [["recruiter", "Recruiter"], ["manager", "Hiring manager"], ["networking", "Networking"]].map((x) => '<label><input type="radio" name="pt-aud" value="' + x[0] + '"' + ((P.audience || "manager") === x[0] ? " checked" : "") + "><span>" + x[1] + "</span></label>").join("") + "</div></fieldset>" +
      (err ? '<p class="err">' + esc(err) + "</p>" : "") + '<button class="btn lg" type="submit"' + (busy ? " disabled" : "") + ">" + (busy ? "Writing…" : O ? "Write it again" : "Write my pitch") + "</button></form>" + out;
  }
  function vDebrief() {
    const open = ui.car.dbOpen ? S.career.debriefs.find((d) => d.id === ui.car.dbOpen) : null;
    if (open) return debriefView(open);
    const busy = ui.car.busy.db, err = ui.car.err.db;
    return '<p class="crumb"><a href="#career">CV and pitch</a> / Debrief</p><h1>Debrief a real interview</h1><p class="lede">Do it within a few hours, while you still remember the questions. Rough notes are fine.</p>' +
      '<form id="dbform" class="card sec"><div class="two"><div class="field"><label for="db-app">Which application?</label><select id="db-app"><option value="">Not tracked</option>' + S.apps.map((a) => '<option value="' + a.id + '"' + (ui.car.dbApp === a.id ? " selected" : "") + ">" + esc(a.company + ": " + a.role) + "</option>").join("") + "</select></div>" +
      '<div class="field"><label for="db-round">Round</label><input id="db-round" maxlength="60" placeholder="Technical interview, round 2"></div></div>' +
      '<div class="field"><label for="db-notes">What did they ask, and what did you say?</label><textarea id="db-notes" rows="12" maxlength="15000" placeholder="Q: Tell me about a project you\'re proud of.\nMe: Talked about my RAG demo, forgot to mention the eval numbers...\n\nOr paste a transcript."' + (err ? ' aria-invalid="true" aria-describedby="db-err"' : "") + "></textarea>" + (err ? '<p class="err" id="db-err">' + esc(err) + "</p>" : "") + "</div>" +
      '<div class="field"><label for="db-feel">How did it feel? <span class="muted">(optional)</span></label><input id="db-feel" maxlength="300" placeholder="Rushed on the second question; they seemed keen on the eval work."></div>' +
      '<button class="btn lg" type="submit"' + (busy ? " disabled" : "") + ">" + (busy ? "Debriefing… about 20 seconds" : "Debrief it") + "</button></form>";
  }
  function debriefView(d) {
    const R = d.out;
    return '<p class="crumb"><a href="#career">CV and pitch</a> / <a href="#career-debrief" data-act="dbclose">Debrief</a> / ' + esc(d.round || "Interview") + "</p><h1>" + esc(d.round || "Interview debrief") + '</h1><p class="lede">' + esc([d.company, fmt(parseDate(d.at.slice(0, 10)))].filter(Boolean).join(" · ")) + "</p>" +
      '<div class="cols"><div><div class="card sec"><h2>Summary</h2><p>' + esc(R.summary || "") + '</p><p class="xs muted">Confidence: ' + esc(R.confidence || "") + ". Based on your notes, not a recording.</p>" + scoreBars(R.scores || {}) + "</div>" +
      '<div class="card sec"><h2>Signals</h2>' + listOr(R.signals) + "<h3>Patterns</h3>" + listOr(R.patterns) + "</div>" +
      '<div class="sec"><h2>Question by question</h2>' + (R.questions || []).map((q, i) => '<details class="iv-q"' + (i === 0 ? " open" : "") + "><summary><span><b>" + esc(q.question) + '</b></span><span class="tag">' + esc(q.competency || "") + '</span><span></span></summary><p class="small"><b>Landed:</b> ' + esc(q.landed || "") + '</p><p class="small"><b>Gap:</b> ' + esc(q.gap || "") + "</p>" + (q.stronger_answer ? '<div class="iv-better"><b>Next time</b>' + md(q.stronger_answer) + "</div>" : "") + "</details>").join("") + "</div></div>" +
      '<aside><div class="card sec iv-priority"><h2>For the next round</h2>' + listOr(R.next_round_prep) + "</div>" +
      (R.thank_you ? '<div class="card sec"><h2>Thank-you email</h2><p class="small" style="white-space:pre-wrap" id="ty-text">' + esc(R.thank_you) + '</p><button class="btn line sm" data-act="copyty">Copy</button></div>' : "") +
      ((R.stories_to_add || []).length ? '<div class="card sec"><h2>Stories to add</h2>' + listOr(R.stories_to_add) + '<a class="btn line sm" href="#iv-stories">Open your stories</a></div>' : "") +
      '<div class="card sec"><button class="link small" data-act="dbdel" data-id="' + d.id + '" style="color:var(--fail)">' + (ui.car.delArm === d.id ? "Click again to delete" : "Delete this debrief") + "</button></div></aside></div>";
  }

  /* ----- comparing saved adverts (in the Interview room) ----- */
  function vIvCompare() {
    const J = S.iv.jobs, sel = ui.car.cmp, R = ui.car.cmpOut, busy = ui.car.busy.cmp, err = ui.car.err.cmp;
    const out = R ? '<div class="card sec"><h2>Where to start</h2><p>' + esc(R.recommendation || "") + "</p>" + '<ol class="iv-comp">' + (R.ranking || []).slice().sort((a, b) => a.rank - b.rank).map((x) => { const j = ivJob(x.id) || {}; return "<li><b>" + esc(j.title || x.id) + "</b>" + (j.company ? " at " + esc(j.company) : "") + ' <span class="tag ' + (VERDICT[x.verdict] || "") + '">' + esc(x.verdict) + '</span> <span class="xs muted">Prep effort: ' + esc(x.prep_effort || "") + '</span><p class="small" style="margin:4px 0">' + esc(x.why) + '</p><p class="xs"><b>First step:</b> ' + esc(x.first_step || "") + "</p></li>"; }).join("") + "</ol>" + ((R.skip || []).filter(Boolean).length ? "<h3>Probably skip</h3>" + listOr(R.skip) : "") + "</div>" : "";
    return '<p class="crumb"><a href="#interview">Interview room</a> / Compare jobs</p><h1>Which should you apply for first?</h1><p class="lede">Pick two to five saved jobs. benchwrk ranks them on fit, stretch and the effort to prepare.</p>' +
      (J.length < 2 ? '<div class="card sec"><p class="muted">Save at least two jobs first.</p><a class="btn" href="#iv-new">Add a job</a></div>'
        : '<form id="cmpform" class="card sec"><fieldset><legend>Saved jobs</legend>' + J.map((j) => '<label class="radio-row"><input type="checkbox" name="cmp" value="' + j.id + '"' + (sel.indexOf(j.id) >= 0 ? " checked" : "") + "> <b>" + esc(j.title || "Untitled") + "</b>" + (j.company ? " at " + esc(j.company) : "") + "</label>").join("") + "</fieldset>" + (err ? '<p class="err">' + esc(err) + "</p>" : "") + '<button class="btn" type="submit"' + (busy ? " disabled" : "") + ">" + (busy ? "Comparing…" : "Compare") + "</button></form>") + out;
  }

  /* ----- events ----- */
  function icsFor(a) {
    const d = a.next.date.replace(/-/g, ""), site = (window.BW && window.BW.site) || location.origin;
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//benchwrk//Applications//EN", "BEGIN:VEVENT", "UID:benchwrk-app-" + a.id + "@benchwork", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
      "DTSTART;VALUE=DATE:" + d, "SUMMARY:" + (a.next.what || "Interview") + ": " + a.company, "DESCRIPTION:" + a.role + ". Practise first: " + site, "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Interview tomorrow", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n") + "\r\n";
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b || phase !== "ready") return;
    const a = b.dataset.act, id = b.dataset.id;
    if (a === "appnew") { ui.car.edit = { stage: "saved" }; ui.car.err.app = ""; render(); scrollTop(); const el = document.getElementById("ap-company"); if (el) el.focus(); return; }
    if (a === "appedit") { ui.car.edit = JSON.parse(JSON.stringify(appOf(id))); render(); scrollTop(); return; }
    if (a === "appcancel") { ui.car.edit = null; render(); return; }
    if (a === "appdel") { if (ui.car.delArm !== id) { ui.car.delArm = id; render(); setTimeout(() => { ui.car.delArm = null; }, 4000); return; } S.apps = S.apps.filter((x) => x.id !== id); ui.car.edit = null; persist(); render(); return; }
    if (a === "appics") { const ap = appOf(id); if (ap) saveFile("interview-" + ap.company.replace(/\W+/g, "-").toLowerCase() + ".ics", icsFor(ap), "text/calendar"); return; }
    if (a === "debriefapp") { ui.car.dbApp = id; ui.car.dbOpen = null; return; }
    if (a === "dbopen") { ui.car.dbOpen = id; location.hash = "career-debrief"; render(); return; }
    if (a === "dbclose") { ui.car.dbOpen = null; return; }
    if (a === "dbdel") { if (ui.car.delArm !== id) { ui.car.delArm = id; render(); setTimeout(() => { ui.car.delArm = null; }, 4000); return; } S.career.debriefs = S.career.debriefs.filter((d) => d.id !== id); ui.car.dbOpen = null; persist(); render(); return; }
    if (a === "copypitch") { e.preventDefault(); const t = ((S.career.pitch || {}).out || {})[b.dataset.v] || ""; navigator.clipboard && navigator.clipboard.writeText(t).then(() => toast("Copied.")); return; }
    if (a === "copyty") { const t = document.getElementById("ty-text"); navigator.clipboard && navigator.clipboard.writeText(t.textContent).then(() => toast("Copied.")); return; }
    if (a === "trackjob") { const j = ivJob(id); if (!j) return; let ap = S.apps.find((x) => x.jobId === j.id); if (!ap) { ap = { id: uidGen(), company: j.company || "Company", role: j.title || "Role", stage: "saved", jobId: j.id, link: j.url || "", at: today() }; S.apps.push(ap); persist(); toast("Added to Applications."); } location.hash = "applications"; return; }
  });
  document.addEventListener("change", (e) => {
    const t = e.target; if (phase !== "ready" || !t.dataset) return;
    if (t.dataset.appstage) { const ap = appOf(t.dataset.appstage); if (ap) { ap.stage = t.value; if (t.value === "applied" && !ap.applied) ap.applied = today(); persist(); render(); toast("Moved to " + STAGE[t.value] + "."); } }
  });
  document.addEventListener("submit", async (e) => {
    const f = e.target; if (phase !== "ready") return;
    const v = (id) => (document.getElementById(id) || {}).value || "";
    if (f.id === "appform") {
      e.preventDefault();
      const E = ui.car.edit, company = v("ap-company").trim(), role = v("ap-role").trim();
      if (!company || !role) { ui.car.err.app = "Add the company and the role."; render(); return; }
      const rec = Object.assign(E, { id: E.id || uidGen(), company: company.slice(0, 120), role: role.slice(0, 140), stage: v("ap-stage"), applied: v("ap-applied"), link: v("ap-link").trim(), jobId: v("ap-job"), notes: v("ap-notes").slice(0, 2000), next: v("ap-nextd") ? { what: v("ap-next").trim() || "Interview", date: v("ap-nextd") } : null });
      const i = S.apps.findIndex((x) => x.id === rec.id); if (i >= 0) S.apps[i] = rec; else { if (S.apps.length >= 60) { toast("Sixty applications is the limit. Delete a closed one."); return; } S.apps.push(rec); }
      ui.car.edit = null; ui.car.err.app = ""; persist(); render(); toast("Saved."); return;
    }
    if (f.id === "cvform") {
      e.preventDefault();
      const text = v("cv-text"), jobId = v("cv-job"), j = jobId ? ivJob(jobId) : null;
      S.career.cv = Object.assign(S.career.cv || {}, { text: text.slice(0, 15000), jobId }); persist();
      ui.car.busy.cv = true; ui.car.err.cv = ""; render();
      try { const out = await careerCall({ mode: "cv", cv: text, job: j ? jobPayload(j) : undefined }); S.career.cv.review = out; S.career.cv.at = new Date().toISOString(); persist(); toast("Review ready."); }
      catch (x) { ui.car.err.cv = ivErr(x); }
      ui.car.busy.cv = false; render(); return;
    }
    if (f.id === "pitchform") {
      e.preventDefault();
      const answers = { past: v("pt-past"), why: v("pt-why"), proof: v("pt-proof"), edge: v("pt-edge") }, audience = (f.querySelector('input[name="pt-aud"]:checked') || {}).value || "manager";
      S.career.pitch = Object.assign(S.career.pitch || {}, { answers, audience }); persist();
      ui.car.busy.pitch = true; ui.car.err.pitch = ""; render();
      try { S.career.pitch.out = await careerCall({ mode: "pitch", answers, audience }); persist(); }
      catch (x) { ui.car.err.pitch = ivErr(x); }
      ui.car.busy.pitch = false; render(); return;
    }
    if (f.id === "dbform") {
      e.preventDefault();
      const appId = v("db-app"), ap = appId ? appOf(appId) : null, j = ap && ap.jobId ? ivJob(ap.jobId) : null;
      const notes = v("db-notes"), round = v("db-round").trim(), feeling = v("db-feel");
      ui.car.busy.db = true; ui.car.err.db = ""; ui.car.dbApp = appId; render();
      try {
        const out = await careerCall({ mode: "debrief", notes, round, feeling, job: j ? jobPayload(j) : undefined, directness: 3 });
        const d = { id: uidGen(), at: new Date().toISOString(), appId, company: ap ? ap.company : "", round: round || "Interview", notes: notes.slice(0, 15000), out };
        S.career.debriefs.push(d); if (S.career.debriefs.length > 30) S.career.debriefs = S.career.debriefs.slice(-30);
        persist(); ui.car.dbOpen = d.id;
      } catch (x) { ui.car.err.db = ivErr(x); ui.car.busy.db = false; render(); const ta = document.getElementById("db-notes"); if (ta) ta.value = notes; const rd = document.getElementById("db-round"); if (rd) rd.value = round; return; }
      ui.car.busy.db = false; render(); scrollTop(); return;
    }
    if (f.id === "cmpform") {
      e.preventDefault();
      const ids = Array.from(f.querySelectorAll('input[name="cmp"]:checked')).map((x) => x.value); ui.car.cmp = ids;
      if (ids.length < 2 || ids.length > 5) { ui.car.err.cmp = "Pick between two and five jobs."; render(); return; }
      ui.car.busy.cmp = true; ui.car.err.cmp = ""; render();
      try { ui.car.cmpOut = await careerCall({ mode: "compare", jobs: ids.map((id) => Object.assign({ id }, jobPayload(ivJob(id)))) }); }
      catch (x) { ui.car.err.cmp = ivErr(x); }
      ui.car.busy.cmp = false; render(); return;
    }
  });
