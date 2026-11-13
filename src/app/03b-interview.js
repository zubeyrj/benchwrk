
  /* ---------- Interview room: job decode, AI mock interview, scorecard, storybank ---------- */
  const IVF = { screen: "Recruiter screen", behavioural: "Behavioural", technical: "Technical: AI engineering", design: "System design: LLM app", loop: "Mixed final round" };
  const IVD = [["substance", "Substance", "Evidence quality and depth"], ["structure", "Structure", "Clear story and flow"], ["relevance", "Relevance", "Answers the question asked, for this job"], ["credibility", "Credibility", "Specifics, numbers, what you personally did"], ["differentiation", "Differentiation", "Sounds like only you could say it"]];
  const IVSKILLS = ["Ownership", "Learning fast", "Technical depth", "Shipping under constraints", "Handling ambiguity", "Collaboration", "Failure and recovery", "Communication", "Customer focus"];
  const VERDICT = { "Strong Fit": "done", "Investable Stretch": "fast", "Long-Shot Stretch": "behind", "Weak Fit": "skip" };
  const SIGNAL = { "Strong Hire": "done", Hire: "done", Mixed: "behind", "No Hire": "skip" };
  const ivJob = (id) => S.iv.jobs.find((j) => j.id === id);
  const ivSess = (id) => S.iv.sessions.find((x) => x.id === id);
  const ivAvg = (sc) => (sc ? r1(IVD.reduce((a, d) => a + Number(sc[d[0]] || 0), 0) / IVD.length) : 0);
  const ivReady = () => !!window.BW;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!ui.iv) ui.iv = { tab: "paste", find: { q: "AI engineer", where: "London", remote: false, res: null, busy: false, err: "" }, busy: {}, err: {}, story: null, rec: null };

  function ivProfile() {
    const mine = (subs || []).find((s) => s.id === uid);
    const done = MOD.filter((m) => S.mods[m.id] && S.mods[m.id].done).map((m) => m.title);
    const sm = summary();
    return {
      name: (S.account && S.account.name) || "", aiming_for: S.goal === "adjacent" ? "an AI-adjacent role first" : "an applied AI engineer role",
      tool_self_ratings_0_to_3: S.tools || {}, courses_completed: done, current_course: sm.cur, route_complete_pct: sm.pct, hours_logged: sm.hours,
      projects: mine ? Object.keys(mine.items || {}).map((k) => ({ project: byId[k] ? byId[k].title : k, repo: mine.items[k].repo, demo: mine.items[k].demo, note: mine.items[k].note })) : [],
      stories: S.iv.stories.slice(0, 10).map((s) => ({ title: s.title, skill: s.skill, situation: s.s, task: s.t, action: s.a, result: s.r, earned_insight: s.e })),
    };
  }
  async function ivCall(body) { return window.BW.api("/api/interviewer", Object.assign({ profile: ivProfile() }, body)); }
  const jobPayload = (j) => ({ title: j.title || "", company: j.company || "", text: j.text });

  /* ----- views ----- */
  function vInterview(r) {
    if (!ivReady()) return '<div class="narrow"><h1>Interview room</h1><p class="lede">Mock interviews run on the Benchwrk website. Open Benchwrk in your browser to use them.</p></div>';
    if (r.sub === "new") return vIvNew();
    if (r.sub === "stories") return vIvStories();
    if (r.sub === "compare") return vIvCompare();
    if (r.sub === "job") return ivJob(r.key) ? vIvJob(ivJob(r.key)) : vIvHub();
    if (r.sub === "run") return ivSess(r.key) ? vIvRun(ivSess(r.key)) : vIvHub();
    if (r.sub === "report") { const x = ivSess(r.key); return x && x.score ? vIvReport(x) : x ? vIvRun(x) : vIvHub(); }
    return vIvHub();
  }

  function vIvHub() {
    const ses = S.iv.sessions.slice().sort((a, b) => (b.at || "").localeCompare(a.at || ""));
    const scored = ses.filter((x) => x.score).slice(0, 8).reverse();
    const trend = scored.length >= 2 ? '<div class="iv-trend" role="img" aria-label="Average score over your last ' + scored.length + ' interviews">' + scored.map((x) => { const a = ivAvg(x.score.scores); return '<span style="--h:' + Math.round((a / 5) * 100) + '%" title="' + esc(fmt(parseDate(x.at.slice(0, 10)))) + ": " + a + '"><b>' + a + "</b></span>"; }).join("") + "</div>" : "";
    const rows = ses.map((x) => {
      const j = ivJob(x.jobId) || { title: x.jobTitle || "A job", company: "" }, a = x.score ? ivAvg(x.score.scores) : null;
      return '<a class="iv-row" href="#iv-' + (x.score ? "report" : "run") + "-" + x.id + '"><div><b>' + esc(j.title) + "</b>" + (j.company ? '<span class="muted"> at ' + esc(j.company) + "</span>" : "") + '<div class="xs muted">' + esc(IVF[x.setup.format]) + " · " + esc(fmt(parseDate(x.at.slice(0, 10)))) + "</div></div>" +
        (x.score ? '<span class="tag ' + (SIGNAL[x.score.hire_signal] || "") + '">' + esc(x.score.hire_signal || "") + '</span><span class="iv-num">' + a + "</span>" : '<span class="tag behind">Unfinished</span><span></span>') + "</a>";
    }).join("");
    const jobs = S.iv.jobs.slice().reverse().map((j) => '<a class="iv-row" href="#iv-job-' + j.id + '"><div><b>' + esc(j.title || "Untitled job") + "</b>" + (j.company ? '<span class="muted"> at ' + esc(j.company) + "</span>" : "") + '<div class="xs muted">' + esc(j.source || "Pasted") + (j.location ? " · " + esc(j.location) : "") + "</div></div>" + (j.decoded && j.decoded.fit ? '<span class="tag ' + (VERDICT[j.decoded.fit.verdict] || "") + '">' + esc(j.decoded.fit.verdict) + "</span>" : "<span></span>") + "<span></span></a>").join("");
    return '<section class="banner iv-banner"><div><p class="crumb">Interview room</p><h1>Practise the interview before it counts</h1><p class="lede">Bring a real job advert, or find one here. Benchwrk decodes what the employer wants, an AI interviewer asks one question at a time, and you get a scorecard on five dimensions with a stronger version of each answer.</p>' +
      '<div class="row" style="margin-top:18px"><a class="btn lg" href="#iv-new">Start a mock interview</a><a class="btn line lg on-dark" href="#iv-stories">Your stories (' + S.iv.stories.length + ")</a>" + '<a class="btn line lg on-dark" href="#iv-bank">Question bank</a>' + (S.iv.jobs.length >= 2 ? '<a class="btn line lg on-dark" href="#iv-compare">Compare saved jobs</a>' : "") + "</div></div></section>" +
      '<div class="cols"><div>' +
      (ses.length ? '<div class="card sec"><div class="row between"><h2 style="margin:0">Your interviews</h2><span class="xs muted">' + plural(scored.length, "scored interview") + "</span></div>" + trend + '<div class="iv-list">' + rows + "</div></div>"
        : '<div class="card sec"><h2>How it works</h2><ol class="iv-steps"><li><b>Pick a job.</b> Paste an advert or a link, or search live AI roles.</li><li><b>Read the decode.</b> What they really want, how you fit and the gaps to frame.</li><li><b>Do the interview.</b> Type or speak your answers. The interviewer follows up when an answer is vague.</li><li><b>Reflect, then get scored.</b> Rate yourself first, then see Substance, Structure, Relevance, Credibility and Differentiation, with a stronger answer for each question.</li></ol></div>') +
      (jobs ? '<div class="card sec"><h2>Saved jobs</h2><div class="iv-list">' + jobs + "</div></div>" : "") +
      '</div><aside><div class="card sec"><h2>Before your first one</h2><p class="small muted">Interviewers remember stories, not lists. Add three or four STAR stories from your projects and past work, and the interviewer will draw on them.</p><a class="btn line" href="#iv-stories">' + (S.iv.stories.length ? "Edit your stories" : "Add your first story") + '</a></div>' +
      '<div class="card sec"><h2>The five scores</h2>' + IVD.map((d) => '<p class="small" style="margin:0 0 8px"><b>' + d[1] + '</b><br><span class="muted">' + d[2] + "</span></p>").join("") + '<p class="xs muted">Each scored mock interview earns ' + PTS.iv + " XP.</p></div></aside></div>";
  }

  function vIvNew() {
    const F = ui.iv.find, tab = ui.iv.tab, busy = ui.iv.busy, err = ui.iv.err;
    const tabs = '<div class="seg iv-tabs" role="radiogroup" aria-label="How to add the job" style="grid-template-columns:repeat(2,1fr);max-width:420px">' + [["paste", "Paste a job"], ["find", "Find live AI jobs"]].map((t) => '<label><input type="radio" name="ivtab" value="' + t[0] + '" data-ivtab' + (tab === t[0] ? " checked" : "") + "><span>" + t[1] + "</span></label>").join("") + "</div>";
    let body;
    if (tab === "paste") {
      const d = ui.iv.draft || (ui.iv.draft = { url: "", title: "", company: "", text: "" });
      body = '<form id="ivpaste" class="card sec"><div class="field"><label for="iv-url">Link to the advert <span class="muted">(optional)</span></label><div class="sharebox" style="margin:0"><input id="iv-url" type="url" inputmode="url" placeholder="https://..." value="' + esc(d.url) + '"><button type="button" class="btn line" data-iv="fetch"' + (busy.fetch ? " disabled" : "") + ">" + (busy.fetch ? "Reading…" : "Read the page") + '</button></div><p class="hint">Works with most company career pages and job boards. LinkedIn blocks this, so paste the text instead.</p>' + (err.fetch ? '<p class="err">' + esc(err.fetch) + "</p>" : "") + "</div>" +
        '<div class="two"><div class="field"><label for="iv-title">Job title</label><input id="iv-title" maxlength="140" value="' + esc(d.title) + '" placeholder="AI Engineer"></div><div class="field"><label for="iv-company">Company</label><input id="iv-company" maxlength="120" value="' + esc(d.company) + '"></div></div>' +
        '<div class="field"><label for="iv-text">Job description</label><textarea id="iv-text" rows="12" maxlength="15000" placeholder="Paste the full advert: responsibilities, requirements, nice-to-haves."' + (err.paste ? ' aria-invalid="true" aria-describedby="iv-text-err"' : "") + ">" + esc(d.text) + "</textarea>" + (err.paste ? '<p class="err" id="iv-text-err">' + esc(err.paste) + "</p>" : "") + "</div>" +
        '<button class="btn lg" type="submit">Decode this job</button></form>';
    } else {
      const res = F.res;
      const list = res ? (res.jobs.length ? res.jobs.map((j, i) => '<div class="iv-job"><div class="row between" style="align-items:flex-start"><div><b>' + esc(j.title) + '</b><div class="small muted">' + esc([j.company, j.location, j.salary].filter(Boolean).join(" · ")) + '</div></div><span class="tag">' + esc(j.source) + "</span></div>" +
        '<p class="small" style="margin:8px 0 10px">' + esc(j.snippet) + '</p><div class="row"><button class="btn sm" data-iv="usejob" data-i="' + i + '"' + (busy["use" + i] ? " disabled" : "") + ">" + (busy["use" + i] ? "Getting the full advert…" : "Practise for this job") + '</button><a class="btn line sm" target="_blank" rel="noopener" href="' + esc(j.url) + '">View advert</a>' + (j.posted ? '<span class="xs muted">Posted ' + esc(fmt(parseDate(j.posted))) + "</span>" : "") + "</div></div>").join("")
        : '<p class="muted">No matching jobs right now. Try a broader search such as "machine learning" or switch to remote.</p>') +
        '<p class="xs muted" style="margin-top:14px">Jobs from ' + res.sources.filter((s) => s.ok).map((s) => ({ adzuna: "Adzuna", reed: "Reed", remotive: '<a href="https://remotive.com" target="_blank" rel="noopener">Remotive</a>', arbeitnow: '<a href="https://www.arbeitnow.com" target="_blank" rel="noopener">Arbeitnow</a>' }[s.name])).join(", ") + ". Updated every 20 minutes.</p>" : "";
      body = '<form id="ivfind" class="card sec"><div class="iv-findrow"><div class="field"><label for="iv-q">Role</label><input id="iv-q" maxlength="80" value="' + esc(F.q) + '"></div><div class="field"><label for="iv-where">Location</label><input id="iv-where" maxlength="60" value="' + esc(F.where) + '"' + (F.remote ? " disabled" : "") + '></div><label class="iv-remote"><input type="checkbox" id="iv-remote"' + (F.remote ? " checked" : "") + '> Remote only</label><button class="btn" type="submit"' + (F.busy ? " disabled" : "") + ">" + (F.busy ? "Searching…" : "Search") + "</button></div>" + (F.err ? '<p class="err">' + esc(F.err) + "</p>" : "") + "</form>" +
        (F.busy ? loading(160) : list ? '<div class="sec iv-results">' + list + "</div>" : "");
    }
    return '<p class="crumb"><a href="#interview">Interview room</a> / New mock interview</p><h1>Which job are you preparing for?</h1><p class="lede">The more complete the advert, the sharper the interview. Everything stays private to you.</p><div class="sec" style="margin-top:22px">' + tabs + "</div>" + body;
  }

  function list(items) { return items && items.length ? "<ul class=\"iv-ul\">" + items.filter(Boolean).map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>" : '<p class="small muted">None found.</p>'; }

  function vIvJob(j) {
    const D = j.decoded, busy = ui.iv.busy["dec" + j.id], err = ui.iv.err["dec" + j.id];
    const st = ui.iv.setup || (ui.iv.setup = { format: "", count: 5, band: "early", directness: 3, voice: false });
    const fmtDefault = st.format || (D && D.likely_rounds && D.likely_rounds[0] && IVF[D.likely_rounds[0].format] ? D.likely_rounds[0].format : "behavioural");
    let dec;
    if (busy) dec = '<div class="card sec"><p class="muted">Reading the advert and comparing it with your progress…</p>' + loading(120) + "</div>";
    else if (err) dec = '<div class="card sec"><p class="err">' + esc(err) + '</p><button class="btn line" data-iv="decode" data-id="' + j.id + '">Try again</button></div>';
    else if (!D) dec = '<div class="card sec"><button class="btn" data-iv="decode" data-id="' + j.id + '">Decode this job</button></div>';
    else {
      const prep = (D.prep || []).map((p) => { const m = MOD.find((x) => p.course && x.title.toLowerCase() === String(p.course).toLowerCase()); return "<li>" + esc(p.action) + (m ? ' <a href="#course-' + m.id + '">' + esc(m.title) + "</a>" : "") + "</li>"; }).join("");
      dec = '<div class="card sec iv-decode"><div class="row between"><h2 style="margin:0">What they really want</h2>' + (D.fit ? '<span class="tag ' + (VERDICT[D.fit.verdict] || "") + '">' + esc(D.fit.verdict) + "</span>" : "") + "</div>" +
        '<p style="margin-top:10px">' + esc(D.summary || "") + "</p>" +
        '<h3>Top competencies</h3><ol class="iv-comp">' + (D.competencies || []).map((c) => "<li><b>" + esc(c.name) + "</b> " + esc(c.why || "") + (c.quote ? '<br><span class="xs muted">"' + esc(c.quote) + '"</span>' : "") + "</li>").join("") + "</ol>" +
        '<div class="two"><div><h3>Must-haves</h3>' + list(D.must_haves) + "</div><div><h3>Nice to have</h3>" + list(D.nice_to_haves) + "</div></div>" +
        (D.fit ? '<h3>Your fit <span class="xs muted">(confidence: ' + esc(D.fit.confidence || "Medium") + ")</span></h3>" + list(D.fit.signals) +
          '<div class="two"><div><h3>Gaps you can frame</h3>' + list(D.fit.frameable_gaps) + "</div><div><h3>Gaps a story won't fix</h3>" + list(D.fit.structural_gaps) + "</div></div>" : "") +
        (prep ? '<h3>Prepare by</h3><ul class="iv-ul">' + prep + "</ul>" : "") +
        (D.red_flags && D.red_flags.filter(Boolean).length ? "<h3>Worth asking about</h3>" + list(D.red_flags) : "") + "</div>";
    }
    const setup = D ? '<form id="ivsetup" class="card sec" data-id="' + j.id + '"><h2>Set up the interview</h2>' +
      '<fieldset><legend>Format</legend><div class="iv-formats">' + Object.keys(IVF).map((k) => { const why = (D.likely_rounds || []).find((x) => x.format === k); return '<label class="iv-format"><input type="radio" name="ivformat" value="' + k + '"' + (fmtDefault === k ? " checked" : "") + "><span><b>" + IVF[k] + "</b>" + (why ? '<span class="xs muted">Likely: ' + esc(why.why) + "</span>" : "") + "</span></label>"; }).join("") + "</div></fieldset>" +
      '<div class="iv-setrow"><div class="field"><label for="iv-count">Questions</label><select id="iv-count">' + [4, 5, 6].map((n) => "<option" + (st.count === n ? " selected" : "") + ">" + n + "</option>").join("") + '</select></div>' +
      '<div class="field"><label for="iv-band">Your experience</label><select id="iv-band">' + [["early", "Early career (0 to 3 years)"], ["mid", "Mid-career (4 to 8 years)"], ["senior", "Senior (8+ years)"]].map((b) => '<option value="' + b[0] + '"' + (st.band === b[0] ? " selected" : "") + ">" + b[1] + "</option>").join("") + "</select></div>" +
      '<div class="field"><label for="iv-direct">Feedback style</label><select id="iv-direct">' + [[1, "Encouraging"], [2, "Gentle"], [3, "Balanced"], [4, "Direct"], [5, "No softening"]].map((d) => '<option value="' + d[0] + '"' + (Number(st.directness) === d[0] ? " selected" : "") + ">" + d[1] + "</option>").join("") + "</select></div></div>" +
      ("speechSynthesis" in window ? '<label class="iv-remote iv-voiceopt" style="margin:0 0 16px"><input type="checkbox" id="iv-voice"' + (st.voice ? " checked" : "") + '><span><b>Spoken interview</b><br><span class="small muted">' + (SR ? "The interviewer reads each question aloud and you answer out loud. Benchwrk writes down what you say and tracks your pace and filler words." : "The interviewer reads each question aloud. This browser can't write down speech, so you'll type answers; Chrome, Edge and Safari can.") + "</span></span></label>" : "") +
      '<div class="row"><button class="btn lg" type="submit">Start the interview</button><span class="xs muted">About ' + (st.count * 4) + " minutes. Your answers stay private.</span></div></form>" : "";
    return '<p class="crumb"><a href="#interview">Interview room</a> / Job</p><div class="row between" style="align-items:flex-end"><div><h1 style="margin-bottom:4px">' + esc(j.title || "Untitled job") + '</h1><p class="muted" style="margin:0">' + esc([j.company, j.location, j.source].filter(Boolean).join(" · ")) + (j.url ? ' · <a href="' + esc(j.url) + '" target="_blank" rel="noopener">Original advert</a>' : "") + "</p></div>" +
      '<div class="row"><button class="btn line sm" data-act="trackjob" data-id="' + j.id + '">' + (S.apps.some((a) => a.jobId === j.id) ? "Tracked in Applications" : "Track this application") + '</button><button class="link small" data-iv="deljob" data-id="' + j.id + '" style="color:var(--fail)">' + (ui.iv.delArm === j.id ? "Click again to delete" : "Delete job") + "</button></div></div>" +
      '<div class="cols"><div>' + dec + setup + '</div><aside><details class="card sec"><summary><b>The advert</b> <span class="xs muted">' + Math.round(j.text.length / 6) + " words</span></summary><div class=\"iv-jd small\">" + esc(j.text).replace(/\n/g, "<br>") + "</div></details></aside></div>";
  }

  function vIvRun(x) {
    const j = ivJob(x.jobId) || { title: x.jobTitle || "", company: "" }, T = x.transcript, N = x.setup.count;
    const mains = T.filter((t) => t.role === "interviewer" && t.kind === "question").length;
    const last = T[T.length - 1], ended = x.ended || (last && last.role === "interviewer" && last.kind === "end");
    const busy = ui.iv.busy["run" + x.id], err = ui.iv.err["run" + x.id];
    const lastQ = T.map((t, i) => (t.role === "interviewer" ? i : -1)).filter((i) => i >= 0).pop();
    const bubbles = T.map((t, i) => '<div class="iv-msg ' + (t.role === "candidate" ? "you" : "them") + '"><span class="who">' + (t.role === "candidate" ? "You" : t.kind === "followup" ? "Interviewer · follow-up" : t.kind === "end" ? "Interviewer" : "Interviewer · question " + t.n) + "</span>" + (t.role === "candidate" ? "<p>" + esc(t.text).replace(/\n/g, "<br>") + "</p>" + (t.dl && t.dl.w > 5 ? '<span class="dl-chip">' + t.dl.wpm + " words a minute · " + t.dl.f + " filler" + (t.dl.f === 1 ? "" : "s") + "</span>" : "") : md(t.text) + (x.setup.voice && i === lastQ && !ended && "speechSynthesis" in window ? '<button type="button" class="link small" data-iv="replay" data-id="' + x.id + '">Hear it again</button>' : "")) + "</div>").join("");
    let foot;
    if (busy) foot = '<div class="iv-msg them"><span class="who">Interviewer</span><p class="thinking">' + (busy === "score" ? "Scoring your interview. This takes about 20 seconds…" : "Thinking…") + "</p></div>";
    else if (err) foot = '<p class="err">' + esc(err) + '</p><button class="btn line" data-iv="' + (ended ? "score" : "ask") + '" data-id="' + x.id + '">Try again</button>';
    else if (!T.length) foot = '<button class="btn" data-iv="ask" data-id="' + x.id + '">Begin</button>';
    else if (ended) {
      const qs = T.filter((t) => t.role === "interviewer" && t.kind === "question");
      const sel = (id, label) => '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '">' + qs.map((q) => '<option value="' + q.n + '">Question ' + q.n + "</option>").join("") + "</select></div>";
      foot = '<form id="ivself" class="card iv-self" data-id="' + x.id + '"><h2>Before you see the scores</h2><p class="small muted">Good interviewers know how they did. Take thirty seconds to judge yourself; the scorecard shows how close you were.</p>' +
        '<div class="two">' + sel("iv-best", "Your strongest answer") + sel("iv-worst", "Your weakest answer") + "</div>" +
        '<fieldset><legend>Overall, how did you do?</legend><div class="seg" style="grid-template-columns:repeat(5,1fr);max-width:360px">' + [1, 2, 3, 4, 5].map((n) => '<label><input type="radio" name="ivrate" value="' + n + '"' + (n === 3 ? " checked" : "") + "><span>" + n + "</span></label>").join("") + "</div></fieldset>" +
        '<div class="field"><label for="iv-note">Anything you\'d do differently? <span class="muted">(optional)</span></label><textarea id="iv-note" rows="3" maxlength="1000"></textarea></div><button class="btn lg" type="submit">Show my scorecard</button></form>';
    } else {
      const draft = (ui.iv.drafts && ui.iv.drafts[x.id]) || "";
      foot = '<form id="ivanswer" class="iv-answer" data-id="' + x.id + '"><label for="iv-ans" class="sr">Your answer</label><textarea id="iv-ans" rows="6" maxlength="5000" placeholder="Answer as you would out loud. Situation, what you did, the result.">' + esc(draft) + "</textarea>" +
        '<div class="row between"><div class="row">' + (SR ? '<button type="button" class="btn ' + (x.setup.voice ? "" : "line ") + 'sm" data-iv="mic" aria-pressed="' + (ui.iv.rec ? "true" : "false") + '">' + (ui.iv.rec ? "Stop listening" : x.setup.voice ? "Start answering" : "Speak my answer") + "</button>" : "") +
        '<span class="xs muted" id="iv-timer" aria-live="off"></span></div><div class="row"><button type="button" class="link small" data-iv="skip" data-id="' + x.id + '">Skip</button><button type="button" class="link small" data-iv="endearly" data-id="' + x.id + '">End here</button><button class="btn" type="submit">Send answer</button></div></div>' + (SR && x.setup.voice ? '<p class="xs muted dl-live" id="iv-live" aria-live="off">' + (ui.iv.rec ? "Listening…" : "Press Start answering, or just type.") + "</p>" : "") + "</form>";
    }
    const pct = Math.min(1, (ended ? N : Math.max(0, mains - 1)) / N);
    return '<p class="crumb"><a href="#interview">Interview room</a> / <a href="#iv-job-' + (x.jobId || "") + '">' + esc(j.title || "Job") + "</a> / Interview</p>" +
      '<div class="iv-runhead"><div><h1 style="margin:0">' + esc(IVF[x.setup.format]) + '</h1><p class="muted" style="margin:4px 0 0">' + esc(j.title || "") + (j.company ? " at " + esc(j.company) : "") + '</p></div><div class="iv-prog"><span class="xs muted">' + (ended ? "Finished" : "Question " + Math.max(1, mains) + " of " + N) + '</span><span class="bar"><i style="--f:' + pct.toFixed(3) + '"></i></span></div></div>' +
      '<div class="iv-room">' + bubbles + foot + "</div>";
  }

  function scoreBars(sc) {
    return '<div class="iv-bars">' + IVD.map((d) => { const v = Number(sc[d[0]] || 0); return '<div class="iv-bar"><span><b>' + d[1] + '</b><span class="xs muted">' + d[2] + '</span></span><span class="bar"><i style="--f:' + (v / 5).toFixed(3) + ";--c:" + (v >= 4 ? "var(--ok)" : v >= 3 ? "var(--xp)" : "var(--fail)") + '"></i></span><b class="iv-num">' + r1(v) + "</b></div>"; }).join("") + "</div>";
  }
  function vIvReport(x) {
    const j = ivJob(x.jobId) || { title: x.jobTitle || "", company: "" }, R = x.score, avg = ivAvg(R.scores);
    const selfTxt = { over: "You rated yourself higher than the scorecard.", under: "You were harder on yourself than the scorecard.", accurate: "Your self-rating matched the scorecard." }[R.self_delta] || "";
    const qs = (R.questions || []).map((q) => '<details class="iv-q"' + (q.n === R.weakest_question ? " open" : "") + '><summary><span><b>Question ' + esc(q.n) + "</b> " + esc(q.question) + "</span>" + (q.n === R.best_question ? '<span class="tag done">Strongest</span>' : q.n === R.weakest_question ? '<span class="tag behind">Weakest</span>' : "") + '<span class="iv-num">' + ivAvg(q.scores) + "</span></summary>" +
      '<p class="small"><b>What I heard:</b> ' + esc(q.heard || "") + "</p>" + scoreBars(q.scores || {}) + (q.note ? '<p class="small">' + esc(q.note) + "</p>" : "") +
      (q.stronger_answer ? '<div class="iv-better"><b>A stronger answer, in your words</b>' + md(q.stronger_answer) + "</div>" : "") + "</details>").join("");
    const ideas = (R.story_ideas || []).filter(Boolean);
    return '<p class="crumb"><a href="#interview">Interview room</a> / <a href="#iv-job-' + (x.jobId || "") + '">' + esc(j.title || "Job") + "</a> / Scorecard</p>" +
      '<section class="banner"><div class="iv-score-head"><div><p class="crumb" style="margin:0">' + esc(IVF[x.setup.format]) + " · " + esc(fmt(parseDate(x.at.slice(0, 10)))) + '</p><h1 style="margin:6px 0">' + esc(R.hire_signal || "Scorecard") + '</h1><p class="lede" style="margin:0">' + esc(j.title || "") + (j.company ? " at " + esc(j.company) : "") + ". Calibrated for " + esc(R.band || "your level") + ".</p></div>" +
      '<div class="iv-big">' + ring(avg / 5, 96, avg >= 4 ? "var(--ok)" : avg >= 3 ? "var(--xp)" : "var(--accent)", "Average " + avg + " out of 5") + "<b>" + avg + '</b><span class="xs">out of 5</span></div></div></section>' +
      '<div class="cols"><div>' +
      '<div class="card sec"><h2>Scorecard</h2>' + scoreBars(R.scores || {}) + '<p class="small muted" style="margin-top:12px"><b>Confidence: ' + esc(R.confidence || "") + ".</b> " + esc(R.confidence_reason || "") + "</p>" + (selfTxt ? '<p class="small"><b>' + esc(selfTxt) + "</b> " + esc(R.self_note || "") + "</p>" : "") + (R.scope_note ? '<p class="xs muted">' + esc(R.scope_note) + "</p>" : "") + "</div>" +
      deliveryCard(x) + '<div class="card sec"><h2>What I heard</h2><p>' + esc(R.what_i_heard || "") + '</p><div class="two"><div><h3>What is working</h3>' + list(R.what_is_working) + "</div><div><h3>Gaps to close</h3>" + list(R.gaps_to_close) + "</div></div></div>" +
      '<div class="sec"><h2>Question by question</h2>' + qs + "</div></div>" +
      '<aside><div class="card sec iv-priority"><h2>Priority move</h2><p>' + esc(R.priority_move || "") + '</p><h3>Next step</h3><p class="small">' + esc(R.next_step || "") + '</p><div class="row"><button class="btn" data-iv="again" data-id="' + x.id + '">Practise again</button><a class="btn line" href="#interview">Interview room</a></div></div>' +
      (ideas.length ? '<div class="card sec"><h2>Stories to add</h2>' + ideas.map((s, i) => '<p class="small">' + esc(s) + '</p><button class="btn line sm" data-iv="storyfrom" data-id="' + x.id + '" data-i="' + i + '">Add as a story</button>').join('<hr class="soft">') + "</div>" : "") +
      '<div class="card sec"><button class="link small" data-iv="transcript" data-id="' + x.id + '">Download the transcript</button></div></aside></div>';
  }

  function vIvStories() {
    const ed = ui.iv.story;
    const cards = S.iv.stories.map((s) => '<div class="card iv-story"><div class="row between"><div><b>' + esc(s.title) + '</b> <span class="tag">' + esc(s.skill) + '</span></div><div class="row"><button class="link small" data-iv="storyedit" data-id="' + s.id + '">Edit</button><button class="link small" data-iv="storydel" data-id="' + s.id + '" style="color:var(--fail)">' + (ui.iv.delArm === s.id ? "Click again" : "Delete") + "</button></div></div>" +
      '<p class="small" style="margin:8px 0 0"><b>S</b> ' + esc(s.s) + "<br><b>T</b> " + esc(s.t) + "<br><b>A</b> " + esc(s.a) + "<br><b>R</b> " + esc(s.r) + "</p>" + (s.e ? '<p class="xs muted" style="margin:6px 0 0">What only you know: ' + esc(s.e) + "</p>" : "") + "</div>").join("");
    const f = ed || {};
    const form = '<form id="ivstory" class="card sec"><h2>' + (f.id ? "Edit story" : "Add a story") + '</h2><div class="two"><div class="field"><label for="st-title">Title</label><input id="st-title" maxlength="80" value="' + esc(f.title || "") + '" placeholder="Shipped a RAG demo in a weekend"></div>' +
      '<div class="field"><label for="st-skill">Best shows</label><select id="st-skill">' + IVSKILLS.map((k) => "<option" + (f.skill === k ? " selected" : "") + ">" + k + "</option>").join("") + "</select></div></div>" +
      [["s", "Situation", "Where were you, what was going on?"], ["t", "Task", "What did you need to achieve?"], ["a", "Action", "What did you do, step by step? Use I, not we."], ["r", "Result", "What changed? A number if you have one."], ["e", "What only you know", "The insight you earned doing it, which a textbook wouldn't tell you."]].map((x) => '<div class="field"><label for="st-' + x[0] + '">' + x[1] + '</label><textarea id="st-' + x[0] + '" rows="2" maxlength="800" placeholder="' + esc(x[2]) + '">' + esc(f[x[0]] || "") + "</textarea></div>").join("") +
      (ui.iv.err.story ? '<p class="err">' + esc(ui.iv.err.story) + "</p>" : "") + '<div class="row"><button class="btn" type="submit">' + (f.id ? "Save story" : "Add story") + "</button>" + (ed ? '<button type="button" class="btn line" data-iv="storycancel">Cancel</button>' : "") + "</div></form>";
    return '<p class="crumb"><a href="#interview">Interview room</a> / Stories</p><h1>Your stories</h1><p class="lede">Four or five strong stories cover most interviews. The interviewer reads them and asks about them; the scorecard checks you told them well.</p>' +
      '<div class="cols"><div>' + (cards ? '<div class="sec iv-stories">' + cards + "</div>" : "") + form + '</div><aside><div class="card sec"><h2>What makes a story land</h2><ul class="iv-ul small"><li>One situation, told in under two minutes.</li><li>Your actions, not the team\'s.</li><li>A result with a number, even a rough one.</li><li>Something you learned that only doing it teaches you. That\'s what makes you memorable.</li></ul><p class="xs muted">Your projects make great stories: the bug that took a day, the eval that changed your design, the cost you cut.</p></div></aside></div>';
  }

  /* ----- actions ----- */
  function ivErr(e) { return (e && e.message) || "Something went wrong. Try again."; }
  function addJob(j) {
    const job = { id: uidGen(), title: (j.title || "").slice(0, 140), company: (j.company || "").slice(0, 120), location: (j.location || "").slice(0, 80), url: j.url || "", source: j.source || "Pasted", text: String(j.text || "").slice(0, 15000), at: new Date().toISOString(), decoded: null };
    S.iv.jobs.push(job);
    if (S.iv.jobs.length > 15) { const keep = new Set(S.iv.sessions.map((x) => x.jobId)); const drop = S.iv.jobs.find((x) => !keep.has(x.id)) || S.iv.jobs[0]; S.iv.jobs = S.iv.jobs.filter((x) => x !== drop); }
    persist(); return job;
  }
  async function decodeJob(j) {
    ui.iv.busy["dec" + j.id] = true; ui.iv.err["dec" + j.id] = ""; render();
    try {
      const d = await ivCall({ mode: "decode", job: jobPayload(j), courses: MOD.map((m) => m.title) });
      j.decoded = d; if (!j.title && d.title) j.title = d.title; if (!j.company && d.company) j.company = d.company;
      persist();
    } catch (e) { ui.iv.err["dec" + j.id] = ivErr(e); }
    ui.iv.busy["dec" + j.id] = false; if (route().key === j.id) render();
  }
  function speak(text, done) {
    try {
      if (!window.speechSynthesis) { if (done) done(); return; }
      speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(text).replace(/[*_#`]/g, "")); u.lang = "en-GB"; u.rate = 1;
      const v = speechSynthesis.getVoices().find((x) => /en-GB/i.test(x.lang)); if (v) u.voice = v;
      if (done) { let fired = false; const once = () => { if (!fired) { fired = true; done(); } }; u.onend = once; u.onerror = once; }
      speechSynthesis.speak(u);
    } catch (e) { if (done) done(); }
  }
  // In a spoken interview the microphone opens by itself once the question has been read out.
  function listenAfter(x) { return () => { if (!SR || !x.setup.voice || ui.iv.rec || route().key !== x.id) return; const b = document.querySelector('[data-iv="mic"]'); if (b) b.click(); }; }
  let ivTimer = null, ivQAt = 0;
  function startTimer() {
    clearInterval(ivTimer); ivQAt = Date.now();
    ivTimer = setInterval(() => { const el = document.getElementById("iv-timer"); if (!el) { clearInterval(ivTimer); return; } const s = Math.floor((Date.now() - ivQAt) / 1000); el.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") + (s > 150 ? " · aim for about two minutes" : ""); }, 1000);
  }
  async function askNext(x) {
    const j = ivJob(x.jobId); if (!j) return;
    ui.iv.busy["run" + x.id] = "ask"; ui.iv.err["run" + x.id] = ""; render();
    try {
      if (!x.bank) { x.bank = await bankFor(x.setup); persist(); }
      const turn = await ivCall({ mode: "ask", job: jobPayload(j), decoded: j.decoded, setup: x.setup, transcript: x.transcript, bank: x.bank });
      x.transcript.push(Object.assign({ role: "interviewer" }, turn)); persist();
      if (x.setup.voice) { ui.iv.voice = { id: x.id, talk: 0, t0: 0 }; speak(turn.text, turn.kind === "end" ? null : listenAfter(x)); }
      else announce("Interviewer: " + String(turn.text).replace(/[*_#`]/g, ""));
    } catch (e) { ui.iv.err["run" + x.id] = ivErr(e); }
    ui.iv.busy["run" + x.id] = false;
    if (route().key === x.id) { render(); const ta = document.getElementById("iv-ans"); if (ta) { ta.focus(); startTimer(); } }
  }
  async function scoreRun(x) {
    const j = ivJob(x.jobId); if (!j) return;
    ui.iv.busy["run" + x.id] = "score"; ui.iv.err["run" + x.id] = ""; render();
    try {
      const sc = await ivCall({ mode: "score", job: jobPayload(j), decoded: j.decoded, setup: x.setup, transcript: x.transcript, self: x.self || {} });
      const first = !x.score; x.score = sc; x.scoredAt = new Date().toISOString(); persist();
      ui.iv.busy["run" + x.id] = false;
      location.hash = "iv-report-" + x.id;
      if (first) setTimeout(() => celebrate("Mock interview scored", "+" + PTS.iv + " XP"), 300);
      return;
    } catch (e) { ui.iv.err["run" + x.id] = ivErr(e); }
    ui.iv.busy["run" + x.id] = false; if (route().key === x.id) render();
  }
  function stopMic() { const V = ui.iv.voice; if (V && V.t0) { V.talk += Date.now() - V.t0; V.t0 = 0; } if (ui.iv.rec) { try { ui.iv.rec.stop(); } catch (e) { /* ignore */ } ui.iv.rec = null; } }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-iv]"); if (!b || phase !== "ready") return;
    const a = b.dataset.iv, id = b.dataset.id;
    if (a === "fetch") {
      const url = (document.getElementById("iv-url").value || "").trim(); ui.iv.draft.url = url;
      ["title", "company", "text"].forEach((k) => { ui.iv.draft[k] = document.getElementById("iv-" + k).value; });
      if (!/^https?:\/\//i.test(url)) { ui.iv.err.fetch = "Paste a full link starting with https://"; render(); return; }
      ui.iv.busy.fetch = true; ui.iv.err.fetch = ""; render();
      window.BW.api("/api/job-fetch", { url }).then((r) => { Object.assign(ui.iv.draft, { title: r.title || ui.iv.draft.title, company: r.company || ui.iv.draft.company, text: r.text, location: r.location || "" }); toast("Advert read. Check it, then decode."); })
        .catch((err) => { ui.iv.err.fetch = ivErr(err); }).then(() => { ui.iv.busy.fetch = false; render(); });
      return;
    }
    if (a === "usejob") {
      const J = ui.iv.find.res.jobs[Number(b.dataset.i)]; if (!J) return;
      const go = (full) => { const job = addJob(Object.assign({}, J, full || {}, { source: J.source })); location.hash = "iv-job-" + job.id; decodeJob(job); };
      if (J.full && J.text) { go({ text: J.text }); return; }
      ui.iv.busy["use" + b.dataset.i] = true; render();
      const p = J.id.indexOf("reed:") === 0 ? window.BW.api("/api/jobs?id=" + encodeURIComponent(J.id)) : window.BW.api("/api/job-fetch", { url: J.url });
      p.then((r) => { ui.iv.busy["use" + b.dataset.i] = false; go({ text: r.text, company: J.company || r.company, title: J.title || r.title }); })
        .catch(() => { ui.iv.busy["use" + b.dataset.i] = false; toast("Only the summary was available, so the interview will be less specific. Paste the full advert for a sharper one."); go({ text: J.title + "\n" + J.company + "\n" + J.location + "\n\n" + J.snippet }); });
      return;
    }
    if (a === "decode") { const j = ivJob(id); if (j) decodeJob(j); return; }
    if (a === "deljob") {
      if (ui.iv.delArm !== id) { ui.iv.delArm = id; render(); setTimeout(() => { if (ui.iv.delArm === id) { ui.iv.delArm = null; render(); } }, 4000); return; }
      S.iv.jobs = S.iv.jobs.filter((x) => x.id !== id); ui.iv.delArm = null; persist(); location.hash = "interview"; return;
    }
    if (a === "ask") { const x = ivSess(id); if (x) askNext(x); return; }
    if (a === "score") { const x = ivSess(id); if (x) scoreRun(x); return; }
    if (a === "skip" || a === "endearly") {
      const x = ivSess(id); if (!x) return; stopMic();
      if (a === "skip") { x.transcript.push({ role: "candidate", text: "(skipped)" }); persist(); askNext(x); return; }
      if (!x.transcript.some((t) => t.role === "candidate")) { toast("Answer at least one question first."); return; }
      x.ended = true; persist(); render(); return;
    }
    if (a === "replay") { const x = ivSess(id); if (!x) return; const q = x.transcript.filter((t) => t.role === "interviewer").pop(); stopMic(); if (q) speak(q.text, listenAfter(x)); return; }
    if (a === "mic") {
      if (ui.iv.rec) { stopMic(); render(); return; }
      if (!SR) return;
      try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (x2) { /* ignore */ }
      const runId = route().key;
      if (!ui.iv.voice || ui.iv.voice.id !== runId) ui.iv.voice = { id: runId, talk: 0, t0: 0 };
      const rec = new SR(); rec.lang = "en-GB"; rec.continuous = true; rec.interimResults = true;
      const ta = document.getElementById("iv-ans"), base = ta.value ? ta.value.replace(/\s*$/, " ") : "";
      rec.onresult = (ev) => { let t = ""; for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; const el = document.getElementById("iv-ans"); if (el) { el.value = base + t; ui.iv.drafts = ui.iv.drafts || {}; ui.iv.drafts[runId] = el.value; } ui.iv.voice.spoke = true; liveDelivery(); };
      rec.onerror = () => { stopMic(); render(); toast("The microphone didn't start. Check your browser allowed it."); };
      rec.onend = () => { if (ui.iv.rec === rec) { stopMic(); const el = document.getElementById("iv-ans"), v = el && el.value; render(); const n = document.getElementById("iv-ans"); if (n && v) n.value = v; } };
      try { rec.start(); ui.iv.rec = rec; ui.iv.voice.t0 = Date.now(); b.textContent = "Stop listening"; b.setAttribute("aria-pressed", "true"); const lv = document.getElementById("iv-live"); if (lv) lv.textContent = "Listening…"; } catch (err) { toast("The microphone didn't start."); }
      return;
    }
    if (a === "again") {
      const x = ivSess(id); if (!x) return;
      const n = { id: uidGen(), jobId: x.jobId, jobTitle: x.jobTitle, at: new Date().toISOString(), setup: Object.assign({}, x.setup), transcript: [] };
      S.iv.sessions.push(n); persist(); location.hash = "iv-run-" + n.id; askNext(n); return;
    }
    if (a === "transcript") {
      const x = ivSess(id), j = ivJob(x.jobId) || {};
      const txt = "Benchwrk mock interview: " + (j.title || "") + (j.company ? " at " + j.company : "") + "\n" + IVF[x.setup.format] + ", " + x.at.slice(0, 10) + "\n\n" + x.transcript.map((t) => (t.role === "candidate" ? "YOU: " : "INTERVIEWER: ") + t.text).join("\n\n") + "\n";
      saveFile("interview-" + x.at.slice(0, 10) + ".txt", txt, "text/plain"); return;
    }
    if (a === "storyfrom") { const x = ivSess(id); ui.iv.story = { title: "", skill: IVSKILLS[0], s: x.score.story_ideas[Number(b.dataset.i)] || "" }; location.hash = "iv-stories"; return; }
    if (a === "storyedit") { ui.iv.story = Object.assign({}, S.iv.stories.find((s) => s.id === id)); render(); scrollTop(); return; }
    if (a === "storycancel") { ui.iv.story = null; ui.iv.err.story = ""; render(); return; }
    if (a === "storydel") {
      if (ui.iv.delArm !== id) { ui.iv.delArm = id; render(); setTimeout(() => { if (ui.iv.delArm === id) { ui.iv.delArm = null; render(); } }, 4000); return; }
      S.iv.stories = S.iv.stories.filter((s) => s.id !== id); ui.iv.delArm = null; persist(); render(); return;
    }
  });
  document.addEventListener("change", (e) => {
    const t = e.target; if (phase !== "ready") return;
    if (t.dataset.ivtab !== undefined) { ui.iv.tab = t.value; ui.iv.err = {}; render(); return; }
    if (t.id === "iv-remote") { ui.iv.find.remote = t.checked; const w = document.getElementById("iv-where"); if (w) w.disabled = t.checked; return; }
  });
  document.addEventListener("input", (e) => { if (e.target.id === "iv-ans") { const f = e.target.closest("form"); ui.iv.drafts = ui.iv.drafts || {}; ui.iv.drafts[f.dataset.id] = e.target.value; } });
  document.addEventListener("submit", (e) => {
    const f = e.target; if (phase !== "ready") return;
    if (f.id === "ivpaste") {
      e.preventDefault();
      const d = ui.iv.draft; ["url", "title", "company", "text"].forEach((k) => { d[k] = document.getElementById("iv-" + k).value.trim(); });
      if (d.text.split(/\s+/).length < 40) { ui.iv.err.paste = "Paste more of the advert (at least a few sentences on the role and requirements)."; render(); document.getElementById("iv-text").focus(); return; }
      ui.iv.err.paste = "";
      const job = addJob({ title: d.title, company: d.company, url: d.url, text: d.text, location: d.location, source: d.url ? (new URL(d.url).hostname.replace(/^www\./, "")) : "Pasted" });
      ui.iv.draft = null; location.hash = "iv-job-" + job.id; decodeJob(job); return;
    }
    if (f.id === "ivfind") {
      e.preventDefault();
      const F = ui.iv.find; F.q = document.getElementById("iv-q").value.trim() || "AI engineer"; F.where = document.getElementById("iv-where").value.trim(); F.remote = document.getElementById("iv-remote").checked;
      F.busy = true; F.err = ""; render();
      window.BW.api("/api/jobs?q=" + encodeURIComponent(F.q) + "&where=" + encodeURIComponent(F.where) + (F.remote ? "&remote=1" : "")).then((r) => { F.res = r; }).catch((err) => { F.err = ivErr(err); }).then(() => { F.busy = false; render(); });
      return;
    }
    if (f.id === "ivsetup") {
      e.preventDefault();
      const j = ivJob(f.dataset.id); if (!j) return;
      const st = { format: (f.querySelector('input[name="ivformat"]:checked') || {}).value || "behavioural", count: Number(document.getElementById("iv-count").value), band: document.getElementById("iv-band").value, directness: Number(document.getElementById("iv-direct").value), voice: !!(document.getElementById("iv-voice") || {}).checked };
      ui.iv.setup = Object.assign({}, st, { touched: true });
      const x = { id: uidGen(), jobId: j.id, jobTitle: j.title, at: new Date().toISOString(), setup: st, transcript: [] };
      S.iv.sessions.push(x);
      if (S.iv.sessions.length > 20) S.iv.sessions = S.iv.sessions.slice(-20);
      persist(); location.hash = "iv-run-" + x.id; askNext(x); return;
    }
    if (f.id === "ivanswer") {
      e.preventDefault();
      const x = ivSess(f.dataset.id); if (!x) return;
      const v = document.getElementById("iv-ans").value.trim(); stopMic();
      if (!v) { toast("Type or speak your answer, or press Skip."); return; }
      const V = ui.iv.voice, spoke = V && V.id === x.id && V.spoke && V.talk > 3000;
      x.transcript.push(Object.assign({ role: "candidate", text: v.slice(0, 5000), secs: Math.round((Date.now() - ivQAt) / 1000) }, spoke ? { dl: delivery(v, V.talk / 1000) } : {})); if (ui.iv.drafts) delete ui.iv.drafts[x.id];
      ui.iv.voice = null;
      persist(); askNext(x); return;
    }
    if (f.id === "ivself") {
      e.preventDefault();
      const x = ivSess(f.dataset.id); if (!x) return;
      x.self = { best: Number(document.getElementById("iv-best").value), worst: Number(document.getElementById("iv-worst").value), rating: Number((f.querySelector('input[name="ivrate"]:checked') || {}).value || 3), note: document.getElementById("iv-note").value.trim().slice(0, 1000) };
      persist(); scoreRun(x); return;
    }
    if (f.id === "ivstory") {
      e.preventDefault();
      const g = (k) => (document.getElementById("st-" + k).value || "").trim();
      const s = { id: (ui.iv.story && ui.iv.story.id) || uidGen(), title: g("title"), skill: g("skill"), s: g("s"), t: g("t"), a: g("a"), r: g("r"), e: g("e") };
      if (!s.title || !s.a) { ui.iv.err.story = "Give it a title and say what you did."; render(); return; }
      ui.iv.err.story = "";
      const i = S.iv.stories.findIndex((x) => x.id === s.id);
      if (i >= 0) S.iv.stories[i] = s; else { if (S.iv.stories.length >= 20) { toast("Twenty stories is plenty. Delete one first."); return; } S.iv.stories.push(s); }
      ui.iv.story = null; persist(); render(); toast(i >= 0 ? "Story saved." : "Story added. The interviewer will use it."); return;
    }
  });
