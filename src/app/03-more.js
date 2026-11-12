
  /* ---------- placement: tools first, then the quiz ---------- */
  function placementDiag(st) { return CT.DIAG.filter((q) => domainRating(q.d, st || S) !== 0); }
  function vPlacement() {
    const P = ui.place;
    if (!P) {
      if (!S.tools) ui.place = { stage: "tools", tools: {} };
      else return '<div class="narrow"><div class="steps"><span><i>1</i>Account</span><span><i>2</i>Your tools</span><span class="on"><i>3</i>Placement</span></div><h1>Placement</h1><p class="lede">Short questions in the areas you said you\'ve used decide which courses you take in full, fast-track or skip by passing a quiz.</p>' +
        '<ul class="card small" style="padding:18px 18px 18px 38px;margin:18px 0"><li>About ' + Math.max(2, Math.round(placementDiag().length * 0.45)) + " minutes. No notes and no searching.</li><li>Pick \"Not sure\" instead of guessing: a lucky guess skips a course you need.</li><li>You can retake it from Settings. Your progress stays.</li></ul>" +
        (S.placement ? '<p class="xs muted">You last took it on ' + fmtY(parseDate(S.placement.at)) + ".</p>" : "") +
        '<div class="row"><button class="btn" data-act="pstart">Start the placement</button><button class="btn line" data-act="retools">Change my tool ratings</button></div></div>';
    }
    const Q = ui.place;
    if (Q.stage === "tools") {
      const t = Q.tools, all = TOOLS.every((x) => t[x[0]] != null);
      return '<div class="narrow" style="max-width:860px"><div class="steps"><span><i>1</i>Account</span><span class="on"><i>2</i>Your tools</span><span><i>3</i>Placement</span></div><h1>How much have you used each of these?</h1><p class="lede">Be honest: anything you\'ve never used starts from the beginning and skips its placement questions. Nobody else sees this.</p>' +
        '<div class="rate" style="margin-top:24px">' + TOOLS.map((x) => '<div class="rrow" role="radiogroup" aria-label="' + esc(x[1]) + '"><b>' + esc(x[1]) + "<small>" + esc(x[2]) + '</small></b><div class="seg">' +
          RATES.map((lab, v) => '<label><input type="radio" name="tool-' + x[0] + '" value="' + v + '" data-tool="' + x[0] + '"' + (t[x[0]] === v ? " checked" : "") + "><span>" + lab + "</span></label>").join("") + "</div></div>").join("") + "</div>" +
        '<div class="row" style="margin-top:22px"><button class="btn" data-act="toolsave"' + (all ? "" : " disabled") + '>Continue to the placement</button><span class="xs muted" id="toolcount">' + TOOLS.filter((x) => t[x[0]] != null).length + " of " + TOOLS.length + " rated</span></div></div>";
    }
    const D = Q.diag;
    if (Q.stage === "q") {
      const q = D[Q.i];
      return '<div class="narrow"><div class="steps"><span><i>1</i>Account</span><span><i>2</i>Your tools</span><span class="on"><i>3</i>Placement</span></div><div class="pbar" aria-hidden="true">' + D.map((_, i) => '<i class="' + (i <= Q.i ? "on" : "") + '"></i>').join("") + "</div>" +
        '<p class="xs muted">Question <span class="n">' + (Q.i + 1) + " of " + D.length + "</span>, " + esc(DOMAINS[q.d]) + '</p><p class="pq">' + rich(q.q) + "</p>" +
        q.o.map((o, j) => '<button class="popt" data-act="pick" data-i="' + j + '">' + rich(o) + "</button>").join("") +
        '<button class="popt unsure" data-act="pick" data-i="-1">Not sure</button>' +
        (Q.i > 0 ? '<button class="link" data-act="pback">Back to question ' + Q.i + "</button>" : "") + "</div>";
    }
    const scores = scorePlacement(Q.ans, D);
    const temp = Object.assign({}, S, { placement: { scores } });
    const tp = plan(temp), full = plan(Object.assign({}, temp, { placement: null, tools: null })), saved = full.total - tp.total;
    const bars = Object.keys(DOMAINS).map((d) => { const s = scores[d] || 0, z = domainRating(d) === 0; return '<div class="dbar"><span>' + esc(DOMAINS[d]) + '</span><span class="bar"><i style="--f:' + Math.max(0.02, s / 100) + '"></i></span><span>' + (z ? '<span class="tag start">New to you</span>' : lvTag(levelOf(s))) + "</span></div>"; }).join("");
    return '<div class="narrow"><h1>Your starting point</h1><p class="lede">Your plan is <b class="n">' + tp.weeks + " weeks</b> at " + tp.hpw + " hours a week, finishing " + fmtY(tp.end) + (saved > 0 ? ". Your ratings and answers cut " + saved + " hours from the full plan." : ".") + "</p>" +
      (needZero(temp) ? '<p class="notice">You start with <b>Programming from zero</b>: 40 hours of basics in your browser, nothing to install.</p>' : "") +
      (saved > 0 ? '<p class="notice" style="background:var(--ok-soft)"><b>Head start: ' + plural(Math.round(saved / tp.hpw), "week") + ' saved.</b> What you already know counts. You begin ' + Math.round((100 * saved) / full.total) + '% of the way along the full route.</p>' : "") +
      '<div class="card sec">' + bars + "</div>" +
      '<p class="xs muted" style="margin-top:12px"><b>Start here</b>: the full course. <b>Fast track</b>: about 60% of the time, focus on the exercises and build. <b>Prove it</b>: pass the course quiz at 80% to skip it. Projects, certification and interview courses always run full length.</p>' +
      '<div class="row" style="margin-top:20px"><button class="btn" data-act="psave">Save my plan</button><button class="btn line" data-act="pstart">Retake the placement</button></div></div>';
  }

  /* ---------- Projects and peer review ---------- */
  function vProjects() {
    subscribeShared();
    const intro = '<h1>Projects</h1><p class="lede">Three deployed projects are the evidence that gets you hired. Tick checkpoints as you go, then share each one for peer review: two reviews from the cohort before you call it done.</p>';
    if (PROJECTS.some((id) => !LX[id])) { Promise.all(PROJECTS.map(needLX)).then(() => { if (route().name === "projects") render(); }); return intro + loading(300); }
    const mine = (subs || []).find((s) => s.id === uid) || { items: {} };
    let html = intro;
    PROJECTS.forEach((id, n) => {
      const m = byId[id], lx = LX[id], st = S.mods[id] || {}, cp = st.cp || {}, item = (mine.items || {})[id];
      const got = (reviews || []).filter((rv) => !isBlocked(rv.id)).map((rv) => ({ by: rv.name || "A member", byId: rv.id, r: (rv.given || {})[uid + ":" + id], self: rv.id === uid })).filter((x) => x.r && !x.self);
      const cps = (lx.checkpoints || []);
      html += '<div class="card sec"><div class="row between"><h2 style="margin:0">Project ' + (n + 1) + ": " + esc(m.title.replace(/: project \d/i, "")) + '</h2><span class="state">' + Object.keys(cp).length + " of " + cps.length + " checkpoints</span></div>" +
        '<div class="cols" style="margin-top:14px"><div><ul class="checks">' + cps.map((c, i) => '<li><label><input type="checkbox" data-cp="' + id + ":" + i + '"' + (cp[i] ? " checked" : "") + "><span>" + esc(c) + "</span></label></li>").join("") + "</ul>" +
        (!item && !ui.shareOpen[id] ? '<div class="sec tight"><button class="btn line" data-act="shareopen" data-id="' + id + '">Share for review</button></div>' : item && !ui.shareOpen[id] ? '<div class="sec tight"><h3>Shared with the cohort</h3><p class="small">' + [item.repo ? '<a href="' + esc(item.repo) + '" target="_blank" rel="noopener">Repository</a>' : "", item.demo ? '<a href="' + esc(item.demo) + '" target="_blank" rel="noopener">Live demo</a>' : ""].filter(Boolean).join(" · ") + '<span class="muted"> on ' + fmt(parseDate(item.at)) + '</span></p><button class="link" data-act="shareopen" data-id="' + id + '">Edit the links</button></div>' :
        '<form class="sec tight" data-sub="' + id + '"><h3>' + (item ? "Your shared project" : "Share for review") + '</h3><div class="two"><div class="field"><label for="s-repo-' + id + '">Repository URL</label><input type="url" id="s-repo-' + id + '" value="' + esc(item ? item.repo : "") + '" placeholder="https://github.com/…"></div><div class="field"><label for="s-demo-' + id + '">Live demo URL</label><input type="url" id="s-demo-' + id + '" value="' + esc(item ? item.demo : "") + '" placeholder="https://…"></div></div>' +
        '<div class="field"><label for="s-note-' + id + '">What should reviewers look at?</label><textarea id="s-note-' + id + '" maxlength="600">' + esc(item ? item.note : "") + "</textarea></div>" +
        '<button class="btn" type="submit">' + (item ? "Update" : "Share with the cohort") + "</button></form>") + "</div>" +
        "<aside class=\"flat\"><h3>Reviews received</h3>" + (got.length ? '<ul class="rl">' + got.map((x) => '<li><span class="grow"><b>' + esc(x.by) + "</b> " + moreMenu(x.byId, x.by, "review", id, "Review of your " + m.title) + ' <span class="n">' + x.r.s.reduce((a, b) => a + b, 0) + " / " + x.r.s.length * 3 + '</span><div class="small muted">' + esc(x.r.c || "") + "</div></span></li>").join("") + "</ul>" : '<p class="small muted">' + (item ? "None yet. Ask someone on the cohort table." : "Share the project to get reviews.") + "</p>") + "</aside></div></div>";
    });
    const queue = (subs || []).filter((s) => s.id !== uid && !isBlocked(s.id) && !((cohort || []).find((c) => c.id === s.id) || {}).suspended).flatMap((s) => PROJECTS.filter((id) => s.items && s.items[id]).map((id) => ({ s, id, it: s.items[id] })));
    const myGiven = ((reviews || []).find((r) => r.id === uid) || {}).given || {};
    const ideas = (CT.TK.ideas || []);
    if (ideas.length) html += '<div class="sec"><h2>More things to build</h2><p class="muted" style="max-width:66ch">Building beats watching. Once a topic makes sense, build something small with it. Each idea links to the course that teaches the skill.</p><div class="grid3" style="margin-top:14px">' + ideas.map((x) => '<a class="card node" style="display:block" href="#course-' + esc(x[2]) + '"><h3>' + esc(x[0]) + '</h3><p class="small muted" style="margin:0">' + esc(x[1]) + "</p></a>").join("") + "</div></div>";
    html += '<div class="card sec"><h2>Review the cohort</h2><p class="muted">Each review earns ' + PTS.rev + " points. Score four things from 1 (not yet) to 3 (strong) and leave one useful sentence.</p>" +
      (queue.length ? '<ul class="rl">' + queue.map((q) => {
        const key = q.s.id + ":" + q.id, done = myGiven[key], open = ui.revOpen === key, rub = (LX[q.id] && LX[q.id].rubric) || [];
        return '<li style="display:block"><div class="row between"><span><b>' + esc(q.s.name || "A member") + "</b>, " + esc(byId[q.id].title.replace(/: project \d/i, "")) + '</span><span class="row">' + (q.it.repo ? '<a href="' + esc(q.it.repo) + '" target="_blank" rel="noopener">Repo</a>' : "") + (q.it.demo ? '<a href="' + esc(q.it.demo) + '" target="_blank" rel="noopener">Demo</a>' : "") +
          '<button class="btn sm' + (done ? " line" : "") + '" data-act="revopen" data-k="' + key + '">' + (done ? "Edit review" : "Review") + "</button>" + moreMenu(q.s.id, q.s.name, "project", q.id, (q.s.name || "A member") + "'s " + byId[q.id].title) + "</span></div>" + (q.it.note ? '<p class="small muted" style="margin:6px 0 0">' + esc(q.it.note) + "</p>" : "") +
          (open ? '<form class="sec tight" data-rev="' + key + '">' + rub.map((c, i) => '<fieldset style="margin:0 0 12px"><legend class="small">' + esc(c) + '</legend><div class="seg" style="max-width:360px;grid-template-columns:repeat(3,1fr)">' + [1, 2, 3].map((v) => '<label><input type="radio" name="rv' + i + '" value="' + v + '"' + (done && done.s[i] === v ? " checked" : "") + "><span>" + ["Not yet", "Getting there", "Strong"][v - 1] + "</span></label>").join("") + "</div></fieldset>").join("") +
            '<div class="field"><label for="rv-c">One useful sentence</label><textarea id="rv-c" maxlength="400">' + esc(done ? done.c : "") + '</textarea></div><button class="btn" type="submit">Send review</button></form>' : "") + "</li>";
      }).join("") + "</ul>" : '<p class="small muted">' + (subs === null ? "Loading shared projects…" : "Nobody else has shared a project yet.") + "</p>") + "</div>";
    html += projectChallenges();
    return html;
  }

  /* ---------- Log ---------- */
  function vLog() {
    const by = hoursByWeek(), mon = mondayOf(new Date()), weeks = [];
    for (let i = 11; i >= 0; i--) { const d = addDays(mon, -7 * i); weeks.push({ d, h: by[isoDate(d)] || 0, cur: i === 0 }); }
    const max = Math.max(S.hpw * 1.3, ...weeks.map((w) => w.h), 1);
    const chart = '<div class="weeks" role="img" aria-label="Hours logged in each of the last 12 weeks"><div class="target" style="bottom:' + (100 * S.hpw) / max + '%"><span class="n">' + S.hpw + " h target</span></div>" +
      weeks.map((w) => '<div class="wk' + (w.h >= S.hpw ? " hit" : "") + (w.cur ? " cur" : "") + '"><i style="height:' + (100 * w.h) / max + '%" title="' + r1(w.h) + ' hours"></i><em>' + fmt(w.d) + "</em></div>").join("") + "</div>";
    const cur = S.placement ? currentRow(plan()) : null;
    const opts = MOD.filter((m) => inPlan(m.id)).map((m) => '<option value="' + m.id + '"' + (cur && cur.m.id === m.id ? " selected" : "") + ">" + esc(m.title) + "</option>").join("");
    const list = S.log.length ? '<ul class="rl">' + S.log.slice(0, 60).map((e) => '<li><span class="state n" style="width:60px;color:var(--ink)">' + fmt(parseDate(e.d)) + '</span><span class="n" style="width:56px"><b>' + r1(e.h) + ' h</b></span><span class="grow">' + esc(byId[e.m] ? byId[e.m].title : "General") + (e.n ? '<br><span class="xs muted">' + esc(e.n) + "</span>" : "") + '</span><button class="link xs" data-act="dellog" data-id="' + esc(e.id) + '">Delete</button></li>').join("") + "</ul>"
      : '<div class="empty"><h3>No sessions yet</h3><p>Log tonight\'s session with the form. Your plan fills cell by cell as you go.</p></div>';
    return '<h1>Study log</h1><p class="lede"><span class="n">' + r1(totalHours()) + "</span> hours logged, " + (streak() ? plural(streak(), "week") + " streak" : "no streak yet") + ". Logging takes ten seconds and keeps your dates honest.</p>" +
      '<div class="cols sec" style="margin-top:24px"><div class="stack"><div class="card"><h2>Weekly hours</h2>' + chart + '<p class="xs muted" style="margin:0">Green weeks hit your target. This week is in orange.</p></div><div class="card"><h2>Sessions</h2>' + list + "</div></div>" +
      '<aside><form id="logform" class="card"><h2>Log a session</h2>' +
      '<div class="two"><div class="field"><label for="l-d">Date</label><input id="l-d" type="date" value="' + today() + '" required></div>' +
      '<div class="field"><label for="l-h">Hours</label><input id="l-h" type="number" min="0.25" max="16" step="0.25" value="2" required></div></div>' +
      '<div class="field"><label for="l-m">Course</label><select id="l-m">' + opts + "</select></div>" +
      '<div class="field"><label for="l-n">Note</label><textarea id="l-n" maxlength="400" placeholder="What you built, where you got stuck"></textarea><p class="hint">Optional. Only you can see it.</p></div>' +
      '<button class="btn wide" type="submit">Log session</button></form></aside></div>';
  }

  /* ---------- Cohort ---------- */
  function vCohort() {
    const intro = '<h1>Cohort</h1><p class="lede">The club table, and where you find an accountability partner. Only display name, current course, hours, XP and progress are shared. Notes, code, quiz answers and placement stay private.</p>';
    if (cohort === null) return intro + '<div class="sec">' + (cohortErr ? "<h3>The cohort didn't load</h3><p class=\"muted\">Your own progress is unaffected. Reload to try again.</p>" : loading(160)) + "</div>";
    const CO = visibleCohort();
    const P = partnerInfo(), me = myPairDoc() || {}, inc = (pairs || []).filter((x) => x.req === uid && x.id !== uid && !isBlocked(x.id));
    const taken = new Set((pairs || []).filter((x) => x.partner).map((x) => x.id));
    const others = CO.filter((c) => c.id !== uid);
    const partnerSec = '<div class="card sec"><div class="row between"><h2 style="margin:0">Accountability partners</h2>' + (P ? '<button class="btn line sm" data-act="unpair">End partnership</button>' : "") + "</div>" +
      '<p class="muted small" style="max-width:66ch">Pair with one member. Each Monday you both set a commitment, you see each other\'s hours against it, and you can send a cheer or a nudge. Telling someone your goal makes you far more likely to keep it.</p>' +
      (P ? '<p><b>You\'re paired with ' + esc(P.doc.name || "a member") + '.</b> Their progress and your check-ins are on your Today page.</p>'
        : (inc.length ? inc.map((x) => '<div class="row between" style="padding:8px 0"><span><b>' + esc(x.name || "A member") + '</b> wants to be your partner</span><button class="btn sm" data-act="pairaccept" data-id="' + esc(x.id) + '">Accept</button></div>').join("") : "") +
          (others.length ? '<ul class="rl">' + others.map((c) => '<li><span class="avatar" style="width:34px;height:34px;font-size:14px;background:var(--p1)">' + esc((c.name || "?").slice(0, 1).toUpperCase()) + '</span><span class="grow"><b>' + esc(c.name || "A member") + '</b><div class="xs muted">' + esc(c.cur || "") + " · " + r1(Number(c.week) || 0) + " h this week</div></span>" +
            (taken.has(c.id) ? '<span class="state">Paired</span>' : me.req === c.id ? '<button class="btn line sm" data-act="paircancel">Cancel request</button>' : '<button class="btn sm" data-act="pairask" data-id="' + esc(c.id) + '">Ask to pair</button>') + "</li>").join("") + "</ul>" : '<p class="small muted">Nobody else has joined yet.</p>')) + "</div>";
    const scope = S.cohort ? '<div class="seg" role="radiogroup" aria-label="Whose results to show" style="grid-template-columns:repeat(2,1fr);max-width:360px;margin:0 0 14px">' + [["mine", esc(cohortName(S.cohort) || "My cohort")], ["all", "Everyone"]].map((x) => '<label><input type="radio" name="coscope" value="' + x[0] + '" data-coscope' + ((ui.coScope || "mine") === x[0] ? " checked" : "") + '><span>' + x[1] + '</span></label>').join("") + '</div>' : '<p class="small muted">Got an invite code from a group? Add it in <a href="#settings">Settings</a> to see your group first.</p>';
    if (!CO.length) return intro + scope + partnerSec;
    const rows = CO.slice().sort((a, b) => (Number(b.pts) || 0) - (Number(a.pts) || 0) || (Number(b.pct) || 0) - (Number(a.pct) || 0)).map((c, i) => {
      const pct = Math.max(0, Math.min(100, Number(c.pct) || 0)), mine = c.id === uid;
      return '<tr class="' + (mine ? "me-row" : "") + '"><td class="n"><b>' + (i + 1) + "</b></td><td><b>" + esc(c.name || "A member") + (mine ? " (you)" : "") + "</b> " + moreMenu(c.id, c.name, "member", "", c.name) + '<div class="xs muted">Level ' + (Number(c.lvl) || 1) + " · " + (c.goal === "adjacent" ? "AI-adjacent first" : "AI engineer") + '</div></td><td class="small">' + esc(c.cur || "") + '</td><td class="n">' + (Number(c.pts) || 0) + '</td><td class="n">' + r1(Number(c.week) || 0) + '</td><td class="n">' + (Number(c.streak) || 0) + '</td><td style="min-width:150px"><div class="row" style="gap:8px;flex-wrap:nowrap"><span class="bar" style="flex:1"><i style="--f:' + pct / 100 + '"></i></span><span class="n small">' + pct + "%</span></div></td></tr>";
    }).join("");
    return intro + scope + partnerSec + '<div class="sec"><h2>The table</h2><div class="tblwrap"><table class="tbl"><thead><tr><th>#</th><th>Member</th><th>Current course</th><th class="r">XP</th><th class="r">This week (h)</th><th class="r">Streak (wk)</th><th>Route done</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
  }

  /* ---------- Toolkit ---------- */
  function vToolkit() {
    const T = CT.TK, rh = rhythm();
    const notes = '<ul class="rl" style="margin-top:14px">' + rh.map((d) => '<li><b style="width:44px;flex:none">' + esc(d.name) + '</b><span class="grow small muted">' + esc(d.note) + "</span></li>").join("") + "</ul>";
    const rated = S.tools ? (t) => { const k = { "Python 3.12+": "python", "uv": "python", "Git and GitHub": "git", "WSL2 (Windows only)": "terminal", "Docker Desktop": "cloud", "Anthropic or OpenAI API": "llm", "Bruno": "web" }[t]; return k != null && S.tools[k] >= 2; } : () => false;
    const sw = '<div class="tblwrap"><table class="tbl"><thead><tr><th>Software</th><th>What it\'s for</th><th>Cost</th></tr></thead><tbody>' + T.software.map((s) => '<tr><td><a href="' + esc(s[3]) + '" target="_blank" rel="noopener" style="font-weight:650">' + esc(s[0]) + "</a>" + (rated(s[0]) ? '<div class="xs muted">You said you use this</div>' : "") + "</td><td>" + esc(s[1]) + "</td><td>" + costTag(s[2]) + "</td></tr>").join("") + "</tbody></table></div>";
    const certs = '<div class="tblwrap"><table class="tbl"><thead><tr><th>Certification</th><th>Cost</th><th>Verdict</th></tr></thead><tbody>' + T.certs.map((c, i) => "<tr><td><b>" + esc(c.name) + '</b><div class="xs muted">' + esc(c.by) + ". " + esc(c.note) + '</div></td><td class="n">' + esc(c.cost) + "</td><td>" + (i === 0 ? '<span class="tag testout">' + esc(c.verdict) + "</span>" : '<span class="small">' + esc(c.verdict) + "</span>") + "</td></tr>").join("") + "</tbody></table></div>";
    const budget = '<div class="tblwrap"><table class="tbl"><thead><tr><th>Item</th><th>Cost</th><th>Why</th></tr></thead><tbody>' + T.budget.map((b) => "<tr><td><b>" + esc(b[0]) + '</b></td><td class="n">' + esc(b[1]) + "</td><td>" + esc(b[2]) + "</td></tr>").join("") + "</tbody></table></div>";
    const methods = '<ul class="rl">' + T.methods.map((x) => '<li><span class="grow"><b>' + esc(x[0]) + '</b><div class="small muted">' + esc(x[1]) + "</div></span></li>").join("") + "</ul>";
    return '<h1>Toolkit</h1><p class="lede">Your weekly rhythm, how to learn, the software to install, which certification to take and what it all costs.</p>' + learnCard() +
      '<div class="card sec"><h2>Weekly rhythm at ' + S.hpw + " hours</h2>" + stripHtml(rh, { fill: false }) + notes + '</div><div class="card sec"><h2>How to learn on this plan</h2>' + methods + '</div><div class="sec"><h2>Software</h2>' + sw +
      '</div><div class="sec"><h2>Certifications</h2><p class="muted" style="max-width:62ch">Take one. AI-103 maps to applied LLM work and to UK job ads; the rest are here so you can skip them with confidence.</p>' + certs +
      '</div><div class="sec"><h2>Budget</h2><p class="muted">About £150 on top of Coursera Plus.</p>' + budget + "</div>";
  }

  /* ---------- Settings ---------- */
  function vSettings() {
    let theme = "auto"; try { theme = localStorage.getItem("ail-theme") || "auto"; } catch (e) {}
    return '<div class="narrow"><h1>Settings</h1><form id="sform" class="card sec">' +
      '<div class="field"><label for="s-email">Email</label><input id="s-email" type="email" readonly value="' + esc(myEmail || S.account.email || "") + '"><p class="hint">' + "Your sign-in address. Only the site owner can see it.</p></div>" +
      '<div class="field"><label for="s-name">Display name</label><input id="s-name" type="text" maxlength="40" value="' + esc(S.account.name) + '"><p class="hint">Shown on the cohort table.</p></div>' +
      '<div class="two"><div class="field"><label for="s-hpw">Hours a week</label><input id="s-hpw" type="number" min="3" max="40" step="0.5" value="' + S.hpw + '"' + (S.sched && S.sched.mode === "own" ? ' aria-describedby="s-hpw-h" readonly' : "") + '>' + (S.sched && S.sched.mode === "own" ? '<p class="xs muted" id="s-hpw-h" style="margin:6px 0 0">Set by <a href="#schedule">your schedule</a>.</p>' : "") + '</div>' +
      '<div class="field"><label for="s-start">Start date</label><input id="s-start" type="date" value="' + esc(S.start) + '" data-words="s-start-words"><p class="hint">Starts <span id="s-start-words">' + dateWords(S.start) + "</span></p></div></div>" +
      '<fieldset><legend>Aiming for</legend><div class="radio-row">' +
      '<label><input type="radio" name="sgoal" value="adjacent"' + (S.goal === "adjacent" ? " checked" : "") + "><span>An AI-adjacent role first</span></label>" +
      '<label><input type="radio" name="sgoal" value="engineer"' + (S.goal !== "adjacent" ? " checked" : "") + "><span>Applied AI engineer</span></label></div></fieldset>" +
      '<button class="btn" type="submit">Save settings</button></form>' +
      '<div class="card sec"><h2>Appearance</h2><div class="seg" role="radiogroup" aria-label="Colour theme" style="max-width:360px;grid-template-columns:repeat(3,1fr)">' + [["auto", "Match device"], ["light", "Light"], ["dark", "Dark"]].map((t) => '<label><input type="radio" name="theme" value="' + t[0] + '" data-theme-pick' + (theme === t[0] ? " checked" : "") + "><span>" + t[1] + "</span></label>").join("") + "</div></div>" +
      '<div class="card sec"><h2>Tour</h2><p class="muted">A two-minute walk through every tab.</p><button class="btn line" data-act="tour">Show me around again</button></div>' +
      '<div class="card sec"><h2>Tools and placement</h2><p class="muted">Update your tool ratings or retake the placement when your skills move on. Your progress stays.</p><div class="row"><button class="btn line" data-act="retools">Change my tool ratings</button><a class="btn line" href="#placement" data-act="preset">Retake the placement</a></div></div>' +
      pathCard() + settingsLearn() + settingsRemind() + settingsTrust() + settingsExtras() +
      '<div class="card sec"><h2>Reset</h2><p class="muted">Clears your tool ratings, placement, lessons read, exercises, quiz scores and sessions. Your account stays.</p><button class="btn line" data-act="reset" style="color:var(--fail)">' + (ui.resetArm ? "Click again to erase your progress" : "Reset my progress") + "</button></div></div>";
  }

  /* ---------- Settings extras: account, emails, calendar, your data ---------- */
  const BWX = () => window.BW || null;
  const DAYS = [["MO", "Mon"], ["TU", "Tue"], ["WE", "Wed"], ["TH", "Thu"], ["FR", "Fri"], ["SA", "Sat"], ["SU", "Sun"]];
  function settingsExtras() {
    const bw = BWX(); if (!bw) return "";
    if (!ui.prefs && !ui.prefsLoading) { ui.prefsLoading = true; bw.prefs().then((p) => { ui.prefs = Object.assign({ weekly: true, streak: true, partner: true }, p || {}); if (route().name === "settings") render(); }).catch(() => { ui.prefs = { weekly: true, streak: true, partner: true }; }); }
    const pr = ui.prefs || { weekly: true, streak: true, partner: true };
    const cal = ui.cal || (ui.cal = { days: ["MO", "WE", "TH"], time: "19:00" });
    const mins = calMinutes(cal);
    const google = bw.provider === "google";
    return '<div class="card sec"><h2>Account</h2><p class="muted">Signed in as <b>' + esc(bw.email || "") + "</b>" + (google ? " with Google" : "") + ".</p>" +
      '<div class="row">' + (google ? "" : '<button class="btn line" data-act="pwreset">Change my password</button>') + '<button class="btn line" data-act="signout">Sign out</button></div>' + (ui.pwSent ? '<p class="small muted" role="status">We\'ve emailed you a link to choose a new password.</p>' : "") + "</div>" +
      '<div class="card sec"><h2>Emails</h2><p class="muted">Choose what Benchwork sends you. Account emails such as password resets always arrive.</p>' +
      [["weekly", "Weekly progress", "Sunday evening: your hours, streak, XP and your partner's week."], ["streak", "Reminder emails", "The reminders set above, when they can\'t reach you as notifications."], ["partner", "Partner messages", "When your accountability partner cheers or nudges you."]]
        .map((t) => '<label class="toggle"><span><b>' + t[1] + '</b><br><span class="small muted">' + t[2] + '</span></span><input type="checkbox" data-pref="' + t[0] + '"' + (pr[t[0]] !== false ? " checked" : "") + (ui.prefs ? "" : " disabled") + "></label>").join("") + "</div>" +
      '<div class="card sec"><h2>Study schedule</h2><p class="muted">Your study days and times, and the link that puts them in your phone or Google Calendar, are on the <a href="#schedule">Schedule</a> page.</p></div>' +
      '<div class="card sec"><h2>Your data</h2><p class="muted">Download everything Benchwork holds about you, or delete your account and all of it for good.</p>' +
      '<div class="row"><button class="btn line" data-act="export"' + (ui.exporting ? " disabled" : "") + ">" + (ui.exporting ? "Preparing…" : "Download my data") + "</button></div>" +
      (ui.delOpen ? '<form id="delform" class="sec" style="margin-top:16px"><p><b>This can\'t be undone.</b> Your progress, projects, reviews, certificates and account are erased.</p><div class="field" style="max-width:280px"><label for="del-confirm">Type DELETE to confirm</label><input id="del-confirm" autocomplete="off"' + (ui.delErr ? ' aria-invalid="true" aria-describedby="del-err"' : "") + ">" + (ui.delErr ? '<p class="err" id="del-err">' + esc(ui.delErr) + "</p>" : "") + '</div><div class="row"><button class="btn" type="submit" style="background:var(--fail);border-color:var(--fail)"' + (ui.deleting ? " disabled" : "") + ">" + (ui.deleting ? "Deleting…" : "Delete my account") + '</button><button class="btn line" type="button" data-act="delcancel">Keep my account</button></div></form>'
        : '<button class="btn line" data-act="delopen" style="color:var(--fail);margin-top:10px">Delete my account</button>') + "</div>";
  }
  function calMinutes(cal) { return Math.max(20, Math.round(((S.hpw * 60) / Math.max(1, cal.days.length)) / 5) * 5); }
  function calRange(cal) {
    const cd = MOD.length && S.placement ? countdowns() : null;
    const startD = parseDate(today()), end = cd && cd.route && cd.route.planned ? cd.route.planned : addDays(startD, 7 * 26);
    const [hh, mm] = (cal.time || "19:00").split(":").map(Number);
    const first = new Date(startD); const want = cal.days.map((d) => DAYS.findIndex((x) => x[0] === d));
    while (want.indexOf((first.getDay() + 6) % 7) < 0) first.setDate(first.getDate() + 1);
    first.setHours(hh || 0, mm || 0, 0, 0);
    const stop = new Date(first.getTime() + calMinutes(cal) * 6e4);
    return { first, stop, end };
  }
  const icsLocal = (d) => d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "T" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0") + "00";
  function buildIcs(cal) {
    const r = calRange(cal), tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || "Europe/London";
    const until = r.end.getFullYear() + String(r.end.getMonth() + 1).padStart(2, "0") + String(r.end.getDate()).padStart(2, "0") + "T235959Z";
    const site = (BWX() && BWX().site) || location.origin;
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Benchwork//Study plan//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
      "UID:benchwork-" + uid + "-" + Date.now() + "@benchwork", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
      "DTSTART;TZID=" + tz + ":" + icsLocal(r.first), "DTEND;TZID=" + tz + ":" + icsLocal(r.stop),
      "RRULE:FREQ=WEEKLY;BYDAY=" + cal.days.join(",") + ";UNTIL=" + until,
      "SUMMARY:Benchwork study session", "DESCRIPTION:Open Benchwork and continue from Today: " + site, "URL:" + site,
      "BEGIN:VALARM", "TRIGGER:-PT15M", "ACTION:DISPLAY", "DESCRIPTION:Benchwork in 15 minutes", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n") + "\r\n";
  }
  function googleCalUrl(cal) {
    if (!cal.days.length) return "https://calendar.google.com/";
    const r = calRange(cal), site = (BWX() && BWX().site) || location.origin;
    const until = r.end.getFullYear() + String(r.end.getMonth() + 1).padStart(2, "0") + String(r.end.getDate()).padStart(2, "0");
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("Benchwork study session") + "&dates=" + icsLocal(r.first) + "/" + icsLocal(r.stop) +
      "&details=" + encodeURIComponent("Open Benchwork and continue from Today: " + site) + "&recur=" + encodeURIComponent("RRULE:FREQ=WEEKLY;BYDAY=" + cal.days.join(",") + ";UNTIL=" + until);
  }
  function saveFile(name, data, type) {
    if (downloads) return downloads.save({ filename: name, data, mimeType: type });
    const u = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return Promise.resolve();
  }

  /* ---------- Admin (owner only) ---------- */
  function vAdmin() {
    subscribeShared();
    const intro = '<h1>Admin</h1><p class="lede">Who is moving, who has gone quiet, what the cohort has shared, and the content itself. Only you, the site owner, can open this page or change course content.</p>';
    const list = cohort || [];
    if (user && list.length && ui.admin.emailsFor !== list.map((c) => c.id).join(",")) {
      ui.admin.emailsFor = list.map((c) => c.id).join(",");
      user.profiles(list.map((c) => c.id)).then((ps) => { ui.admin.emails = {}; Object.keys(ps || {}).forEach((k) => { ui.admin.emails[k] = ps[k].email || ""; }); if (route().name === "admin") render(); }).catch(() => {});
    }
    const emails = ui.admin.emails || {};
    const rows = list.slice().sort((a, b) => String(a.last || "").localeCompare(String(b.last || ""))).map((c) => {
      const quiet = c.last ? daysSince(c.last) : null, flag = quiet == null ? "Not started" : quiet >= 7 ? "Quiet " + quiet + " days" : c.behind > 7 ? "Behind " + c.behind + " days" : "";
      return "<tr><td><b>" + esc(c.name || "A member") + '</b>' + (BWX() && emails[c.id] ? ' <button class="link xs" style="margin-left:6px" data-act="mailopen" data-id="' + esc(c.id) + '">Email</button>' : "") + '<div class="xs muted">' + esc(emails[c.id] || "") + " · " + esc(c.cur || "") + "</div></td><td>" + (flag ? '<span class="tag behind">' + esc(flag) + "</span>" : '<span class="tag done">On track</span>') + '</td><td class="n">' + (c.last ? fmt(parseDate(c.last)) : "") + '</td><td class="n">' + r1(Number(c.week) || 0) + '</td><td class="n">' + r1(Number(c.hours) || 0) + '</td><td class="n">' + (Number(c.ls) || 0) + '</td><td class="n">' + (Number(c.xs) || 0) + '</td><td class="n">' + (Number(c.qp) || 0) + '</td><td class="n">' + (Number(c.pct) || 0) + "%</td></tr>";
    }).join("");
    const table = cohort === null ? loading(120) : '<div class="tblwrap"><table class="tbl"><thead><tr><th>Member</th><th>Status</th><th class="r">Last log</th><th class="r">Week (h)</th><th class="r">Total (h)</th><th class="r">Lessons</th><th class="r">Exercises</th><th class="r">Quizzes</th><th class="r">Route</th></tr></thead><tbody>' + (rows || '<tr><td colspan="9" class="muted">No members yet.</td></tr>') + "</tbody></table></div>";
    const shared = (subs || []).reduce((n, s) => n + Object.keys(s.items || {}).length, 0), revN = (reviews || []).reduce((n, r) => n + Object.keys(r.given || {}).length, 0);
    const A = ui.admin;
    const docOpts = ['<option value="">Choose a document</option>'].concat(MOD.map((m) => '<option value="content/' + m.id + '"' + (A.doc === "content/" + m.id ? " selected" : "") + ">" + esc(m.title) + " (course)</option>"), MOD.map((m) => '<option value="lessons/' + m.id + '"' + (A.doc === "lessons/" + m.id ? " selected" : "") + ">" + esc(m.title) + " (lessons, exercises, questions)</option>"), ["content/diag", "content/toolkit"].map((p) => '<option value="' + p + '"' + (A.doc === p ? " selected" : "") + ">" + p.split("/")[1] + "</option>")).join("");
    return intro + adminInsights(list) + adminMail(emails) + adminTrust() + adminEditor() + '<div class="sec"><h2>Members</h2>' + table + '<p class="xs muted" style="margin-top:10px">' + plural(shared, "project") + " shared for review, " + plural(revN, "review") + ' given. <button class="link" data-act="copycsv">' + (downloads ? "Download the table as CSV" : "Copy the table as CSV") + '</button></p></div>' +
      '<div class="card sec"><h2>Notice on everyone\'s Today page</h2><form id="noticeform"><div class="field"><label for="n-text">Message</label><textarea id="n-text" maxlength="400" placeholder="Saturday study call at 10:00. Project 1 reviews due Sunday.">' + esc(notice ? notice.text : "") + '</textarea><p class="hint">Leave empty to remove it.</p></div><button class="btn" type="submit">Publish notice</button></form></div>' +
      '<div class="card sec"><h2>Content editor</h2><p class="muted">Edit any course document as JSON. It\'s checked before saving and members see the change on their next load.</p>' +
      (BWX() ? '<p class="small muted">Changed the course files in the repo? <button class="link" data-act="seed"' + (ui.seeding ? " disabled" : "") + ">" + (ui.seeding ? "Reloading…" : "Reload all courses from the repo") + "</button>. Learner progress isn\'t touched.</p>" : "") +
      '<div class="field" style="max-width:520px"><label for="ad-doc">Document</label><select id="ad-doc" data-act-change="adload">' + docOpts + "</select></div>" +
      (A.doc ? (A.loading ? loading(200) : '<div class="editor"><div class="bar-top"><span>' + esc(A.doc) + '.json</span><span>' + (A.text.length / 1024).toFixed(1) + ' KB</span></div><textarea id="ad-text" spellcheck="false" style="min-height:420px">' + esc(A.text) + "</textarea></div>" + (A.err ? '<p class="err">' + esc(A.err) + "</p>" : "") + '<div class="row" style="margin-top:12px"><button class="btn" data-act="adsave">' + (A.arm ? "Click again to save for everyone" : "Save document") + '</button><button class="btn line" data-act="adload2">Discard changes</button></div>') : "") + "</div>";
  }

  function adminInsights(list) {
    const bw = BWX();
    if (bw && !ui.admin.usage && !ui.admin.usageLoading) { ui.admin.usageLoading = true; bw.tutorUsage().then((u) => { ui.admin.usage = u; if (route().name === "admin") render(); }).catch(() => { ui.admin.usage = []; }); }
    const q = (c) => (c.last ? daysSince(c.last) : null);
    const active = list.filter((c) => q(c) !== null && q(c) < 7).length, stalled = list.filter((c) => q(c) !== null && q(c) >= 14), never = list.filter((c) => q(c) === null).length;
    const behind = list.filter((c) => Number(c.behind) > 7).length;
    const drop = {}; stalled.forEach((c) => { const k = c.cur || "Unknown"; drop[k] = (drop[k] || 0) + 1; });
    const dropRows = Object.entries(drop).sort((a, b) => b[1] - a[1]).slice(0, 8), maxD = dropRows.length ? dropRows[0][1] : 1;
    const where = {}; list.forEach((c) => { const k = c.cur || "Not started"; where[k] = (where[k] || 0) + 1; });
    const whereRows = Object.entries(where).sort((a, b) => b[1] - a[1]).slice(0, 8), maxW = whereRows.length ? whereRows[0][1] : 1;
    const u = ui.admin.usage || [], tut = u.filter((r) => (r.kind || "tutor") === "tutor"), ivu = u.filter((r) => r.kind === "interview");
    const calls = tut.reduce((a, r) => a + r.calls, 0), ivCalls = ivu.reduce((a, r) => a + r.calls, 0);
    // Rough spend, in pounds: the tutor at Haiku-class prices ($1 in, $5 out per million tokens), the interviewer at Sonnet-class ($3, $15).
    const tok = (rows, k) => rows.reduce((a, r) => a + r[k], 0);
    const cost = ((tok(tut, "in_tokens") / 1e6) * 1 + (tok(tut, "out_tokens") / 1e6) * 5 + (tok(ivu, "in_tokens") / 1e6) * 3 + (tok(ivu, "out_tokens") / 1e6) * 15) * 0.79;
    const bars = (rows, max) => rows.length ? rows.map((r) => '<div class="bar-row"><span>' + esc(r[0]) + '</span><span class="track"><i style="width:' + Math.max(4, Math.round((r[1] / max) * 100)) + '%"></i></span><span class="r">' + r[1] + "</span></div>").join("") : '<p class="small muted">Nothing yet.</p>';
    return '<div class="card sec"><h2>At a glance</h2><div class="kpis">' +
      [[list.length, "members"], [active, "active this week"], [stalled.length, "quiet 14+ days"], [never, "not started"], [behind, "a week+ behind plan"]].map((k) => '<div class="kpi"><b>' + k[0] + "</b><span>" + k[1] + "</span></div>").join("") +
      (bw ? '<div class="kpi"><b>' + calls + '</b><span>tutor questions, 30 days</span></div><div class="kpi"><b>' + ivCalls + '</b><span>interviewer turns, 30 days</span></div><div class="kpi"><b>£' + cost.toFixed(2) + "</b><span>AI spend, 30 days (est.)</span></div>" : "") + "</div>" +
      '<div class="two"><div><h3>Where members are now</h3>' + bars(whereRows, maxW) + '</div><div><h3>Where quiet members stopped</h3>' + bars(dropRows, maxD) + "</div></div></div>";
  }
  function adminMail(emails) {
    const m = ui.admin.mail; if (!m) return "";
    const who = (cohort || []).find((c) => c.id === m.id) || {};
    return '<form id="mailform" class="card sec"><h2>Email ' + esc(who.name || "member") + '</h2><p class="small muted">To ' + esc(emails[m.id] || "") + '. Replies come to your own inbox.</p>' +
      '<div class="field"><label for="mail-subj">Subject</label><input id="mail-subj" maxlength="140" value="' + esc(m.subj || "") + '"></div>' +
      '<div class="field"><label for="mail-body">Message</label><textarea id="mail-body" rows="6" maxlength="5000">' + esc(m.body || "") + "</textarea></div>" +
      (m.err ? '<p class="err">' + esc(m.err) + "</p>" : "") +
      '<div class="row"><button class="btn" type="submit"' + (m.busy ? " disabled" : "") + ">" + (m.busy ? "Sending…" : "Send email") + '</button><button class="btn line" type="button" data-act="mailclose">Cancel</button></div></form>';
  }

  /* ---------- certificates ---------- */
  function certSvg(m) {
    const st = S.mods[m.id] || {}, name = (S.account && S.account.name) || "", date = st.done ? parseDate(st.done) : new Date();
    const hrs = r1(S.log.filter((e) => e.m === m.id).reduce((a, e) => a + Number(e.h || 0), 0)), q = quizInfo(m.id).best;
    const code = (uid || "x").slice(0, 4).toUpperCase() + "-" + m.id.toUpperCase() + "-" + isoDate(date).replace(/-/g, "");
    const x = (s) => esc(s), F = "Bricolage Grotesque, Figtree, Arial, sans-serif", B = "Figtree, Arial, sans-serif";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 720" role="img" aria-label="Certificate: ' + x(m.title) + '">' +
      '<rect width="1100" height="720" fill="#ffffff"/><rect width="1100" height="150" fill="#0e1726"/><circle cx="1010" cy="40" r="150" fill="none" stroke="#c93c1a" stroke-opacity=".25" stroke-width="40"/>' +
      '<g transform="translate(70 52)"><rect width="46" height="46" rx="13" fill="#c93c1a"/><rect x="11.5" y="8.6" width="6" height="28.7" rx="3" fill="#fff"/><circle cx="26.6" cy="27.3" r="8" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5.7"/><path d="M26.6 19.3a8 8 0 1 1-8 8" fill="none" stroke="#fff" stroke-width="5.7" stroke-linecap="round"/></g>' +
      '<text x="132" y="86" font-family="' + F + '" font-size="34" font-weight="800" fill="#ffffff" letter-spacing="-1">benchwork</text>' +
      '<text x="70" y="230" font-family="' + B + '" font-size="18" font-weight="700" fill="#c93c1a" letter-spacing="2">CERTIFICATE OF COMPLETION</text>' +
      '<text x="70" y="315" font-family="' + F + '" font-size="64" font-weight="800" fill="#0e1726" letter-spacing="-2">' + x(name) + "</text>" +
      '<text x="70" y="370" font-family="' + B + '" font-size="22" fill="#566173">has completed</text>' +
      '<text x="70" y="430" font-family="' + F + '" font-size="42" font-weight="750" fill="#0e1726" letter-spacing="-1">' + x(m.title) + "</text>" +
      '<line x1="70" y1="500" x2="1030" y2="500" stroke="#e1e5eb" stroke-width="2"/>' +
      [["Completed", fmtLong(date), 70], ["Hours logged", String(hrs), 370], ["Best quiz score", q + "%", 570], ["Reference", code, 800]].map((c) => '<text x="' + c[2] + '" y="548" font-family="' + B + '" font-size="15" fill="#566173">' + c[0] + '</text><text x="' + c[2] + '" y="580" font-family="' + F + '" font-size="' + (c[0] === "Reference" ? 18 : 24) + '" font-weight="700" fill="#0e1726">' + x(c[1]) + "</text>").join("") +
      '<text x="70" y="650" font-family="' + B + '" font-size="14" fill="#566173">' + x(m.outcomes.slice(0, 2).join(". ")) + ".</text></svg>";
  }
  function vCert(r) {
    const m = byId[r.id], st = S.mods[r.id] || {};
    if (!st.done) return '<div class="narrow"><h1>No certificate yet</h1><p class="lede">Pass the quiz and mark ' + esc(m.title) + ' complete to get one.</p><a class="btn" href="#course-' + m.id + '">Back to the course</a></div>';
    return '<p class="crumb"><a href="#courses">Courses</a> / <a href="#course-' + m.id + '">' + esc(m.title) + "</a> / Certificate</p><h1>Certificate</h1>" +
      '<div class="cert">' + certSvg(m) + "</div>" +
      '<div class="row" style="margin-top:16px">' + (downloads ? '<button class="btn" data-act="certdl" data-id="' + m.id + '">Download the certificate</button>' : "") + (BWX() ? '<button class="btn line" data-act="certshare" data-id="' + m.id + '"' + (ui.certBusy ? " disabled" : "") + ">" + (ui.certBusy ? "Creating the link…" : "Get a share link") + "</button>" : "") + '<a class="btn line" href="#course-' + m.id + '">Back to the course</a></div>' + certShare(m);
  }

  function certShare(m) {
    const url = ui.certUrl && ui.certUrl[m.id]; if (!url) return "";
    const st = S.mods[m.id] || {}, d = parseDate(st.done || today());
    const li = "https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=" + encodeURIComponent(m.title) + "&organizationName=Benchwork&issueYear=" + d.getFullYear() + "&issueMonth=" + (d.getMonth() + 1) + "&certUrl=" + encodeURIComponent(url) + "&certId=" + encodeURIComponent(url.split("/").pop());
    return '<div class="card sec" style="margin-top:16px"><h2>Share it</h2><p class="muted">Anyone with this link can check your certificate is real. It shows your display name, the course and the date.</p>' +
      '<div class="sharebox"><input id="cert-url" readonly value="' + esc(url) + '" aria-label="Certificate link"><button class="btn line" data-act="copycert">Copy</button></div>' +
      '<div class="row"><a class="btn" target="_blank" rel="noopener" href="' + esc(li) + '">Add to LinkedIn</a><a class="btn line" target="_blank" rel="noopener" href="' + esc(url) + '">Open the public page</a></div></div>';
  }

  /* ---------- the tutor (asks Claude through /api/tutor) ---------- */
  function tutorBlock(key, title, blurb, startLabel) {
    const T = ui.tutor[key] || { msgs: [] };
    if (!sample) return '<div class="tutor no-print" data-tutor="' + key + '" hidden></div>';
    return '<div class="tutor no-print" data-tutor="' + key + '"><h2>' + esc(title) + '</h2><p class="small muted">' + esc(blurb) + "</p>" +
      (T.msgs.length ? '<div class="msgs" aria-live="polite">' + T.msgs.map((x) => '<div class="msg ' + (x.role === "user" ? "you" : "") + '"><b>' + (x.role === "user" ? "You" : "Tutor") + "</b>" + (x.role === "user" ? "<p>" + esc(x.content) + "</p>" : x.content ? md(x.content) : '<p class="thinking">Thinking…</p>') + "</div>").join("") + "</div>" : "") +
      (T.err ? '<p class="err">' + esc(T.err) + "</p>" : "") +
      (startLabel && !T.msgs.length ? '<button class="btn line" data-act="tstart" data-k="' + key + '">' + esc(startLabel) + "</button>"
        : '<form data-tform="' + key + '"><textarea aria-label="Your message to the tutor" maxlength="2000" placeholder="' + (key.indexOf("interview") === 0 ? "Your answer" : "Your question") + '"' + (T.busy ? " disabled" : "") + '></textarea><button class="btn" type="submit"' + (T.busy ? " disabled" : "") + ">Send</button></form>") + "</div>";
  }
  function refreshTutors() { if (document.querySelector("[data-tutor][hidden]")) render(); }
  function tutorContext(key) {
    const base = "You are the tutor inside Benchwork, a course that takes beginners to applied AI engineer roles. Write in British English, plainly, without em dashes. Keep answers under 160 words unless asked for more. Use short code examples in fenced blocks when they help." + learnForTutor();
    let m;
    if ((m = key.match(/^lesson-(m\d+)-(\d+)$/))) { const L = LX[m[1]].lessons[Number(m[2])]; return base + "\n\nThe learner is reading this lesson from the course " + byId[m[1]].title + ":\n<lesson title=\"" + L.t + "\">\n" + L.md + "\n</lesson>\nAnswer their question about it. If they ask something unrelated to learning, steer them back."; }
    if ((m = key.match(/^ex-(m\d+)\.(\w+)$/))) {
      const ex = LX[m[1]].ex.find((x) => x.id === m[2]), k = m[1] + "." + m[2], code = (document.getElementById("code") || {}).value || (codeDoc && codeDoc[k]) || ex.start, res = ui.exres[k];
      return base + "\n\nThe learner is solving a coding exercise. Never give the full solution or more than three lines of corrected code. Point at the specific line or idea that is wrong, explain why and suggest the next step.\n<exercise title=\"" + ex.t + "\" language=\"" + (ex.kind === "sql" ? "SQL" : "Python") + "\">\n" + ex.md + "\n</exercise>\n<their_code>\n" + code + "\n</their_code>\n<last_result>\n" + (res && !res.running ? (res.error ? "Error: " + res.error + "\n" : "") + res.tests.map((t) => (t[1] ? "PASS " : "FAIL ") + t[0] + (t[2] ? ": " + t[2] : "")).join("\n") : "Not run yet") + "\n</last_result>";
    }
    if ((m = key.match(/^(lib-\d\d-\d\d)$/)) && L$.lessons[m[1]]) { const L = L$.lessons[m[1]]; return base + "\n\nThe learner is reading this lesson from the Benchwork library (AI Engineering from Scratch):\n<lesson title=\"" + L.t + "\">\n" + L.md.slice(0, 14000) + "\n</lesson>\nAnswer their question about it. Point to the part of the lesson that helps."; }
    if ((m = key.match(/^prob-([a-z0-9-]+)$/)) && L$.probs[m[1]]) {
      const P = L$.probs[m[1]], res = ui.probRes && ui.probRes[m[1]], code = (ui.probCode && ui.probCode[m[1]]) || P.starter;
      const fails = res && res.results ? res.results.filter((x) => x.status !== "pass").slice(0, 5).map((x) => "- " + x.name + ": " + x.message).join("\n") : "(not run yet)";
      return base + "\n\nThe learner is solving a NumPy coding problem. Never give the full solution or more than three lines of code. Point at the idea that is wrong and the next step.\n<problem title=\"" + P.title + "\">\n" + P.problem.slice(0, 5000) + "\n</problem>\n<their_code>\n" + code.slice(0, 6000) + "\n</their_code>\n<failing_checks>\n" + fails + "\n</failing_checks>";
    }
    if ((m = key.match(/^interview-(m\d+)$/))) {
      const bank = (byId[m[1]].bank || []).map((b) => b.type + ":\n" + b.qs.map((q) => "- " + q[0]).join("\n")).join("\n\n");
      return base + "\n\nRun a mock interview for an applied AI engineer role. Ask exactly one question at a time, drawn from this bank, mixing types. After each answer give feedback in three short parts: what worked, what to improve, and the outline of a stronger answer. Then ask the next question. Be encouraging but honest.\n<question_bank>\n" + bank + "\n</question_bank>";
    }
    return base;
  }
  async function askTutor(key, text) {
    const T = ui.tutor[key] = ui.tutor[key] || { msgs: [] };
    if (!sample || T.busy) return;
    T.err = ""; T.busy = true;
    T.msgs.push({ role: "user", content: text }); T.msgs.push({ role: "assistant", content: "" });
    render();
    const convo = T.msgs.slice(0, -1).map((x) => ({ role: x.role, content: x.content }));
    convo[0] = { role: "user", content: tutorContext(key) + "\n\n" + convo[0].content };
    const live = T.msgs[T.msgs.length - 1];
    let raf = 0;
    try {
      const out = await sample(convo, { cache: false, onText: (e) => { live.content = e.text; if (!raf) raf = requestAnimationFrame(() => { raf = 0; const el = document.querySelector('[data-tutor="' + key + '"] .msgs .msg:last-child'); if (el) el.innerHTML = "<b>Tutor</b>" + md(live.content); }); } });
      live.content = (out && out.text) || live.content || "No answer came back. Try again.";
    } catch (e) {
      T.msgs.pop(); T.msgs.pop();
      T.err = e && (e.code === "daily_cap" || e.code === "site_cap") && e.message ? e.message : e && e.code === "rate_limited" ? "The tutor is busy. Wait a minute and try again." : "The tutor couldn't answer just now.";
    }
    T.busy = false; render();
    const box = document.querySelector('[data-tutor="' + key + '"] textarea'); if (box) box.focus();
  }

  /* ---------- welcome: confetti, then a short tour of the tabs ---------- */
  const reduceMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function confetti() {
    if (reduceMotion()) return;
    const c = document.createElement("canvas"); c.className = "confetti"; c.setAttribute("aria-hidden", "true");
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; document.body.appendChild(c);
    const ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
    const cols = ["#c93c1a", "#f5a524", "#13a05a", "#2563d0", "#0e9f9e", "#ff8a66"];
    const parts = Array.from({ length: 160 }, (_, i) => { const left = i % 2 === 0; return { x: left ? -10 : W + 10, y: H * (0.55 + Math.random() * 0.3), vx: (left ? 1 : -1) * (6 + Math.random() * 9), vy: -(10 + Math.random() * 12), w: 6 + Math.random() * 6, h: 8 + Math.random() * 10, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, col: cols[i % cols.length] }; });
    const t0 = performance.now();
    (function frame(t) {
      const age = t - t0; ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => { p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2200) / 800); ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r))); ctx.restore(); });
      if (age < 3000) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }
  function showWelcome() {
    const name = firstName();
    const el = document.createElement("div"); el.className = "welcome-modal"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "wm-t");
    el.innerHTML = '<div class="wm-card"><span class="wm-badge">' + SVG.check.replace('width="18" height="18"', 'width="34" height="34"') + '</span><p class="label" style="color:var(--accent-text)">Step one done</p><h2 id="wm-t">Welcome to Benchwork' + (name ? ", " + esc(name) : "") + '</h2><p class="muted">You\'ve made the hardest move: you started. Your account is ready, and every evening from here moves you closer to your first AI engineering role.</p>' +
      '<div class="wm-xp"><span class="ico xp">' + SVG.bolt + '</span><div><b>Level 1: Starter</b><span class="bar xp thin" style="margin-top:6px"><i style="--f:.04"></i></span></div></div>' +
      '<div class="row" style="justify-content:center;margin-top:20px"><button class="btn lg" data-act="tour">Show me around</button><button class="btn lg line" data-act="welcomedone">Skip the tour</button></div></div>';
    document.body.appendChild(el);
    confetti();
    setTimeout(() => { const b = el.querySelector("[data-act=tour]"); if (b) b.focus(); }, 50);
  }
  const TOUR = [
    ["today", "Today", "Your home base: your next step, the countdown to your finish line, this week's quests and your partner. Your study log lives here too; log a session in ten seconds and everything updates."],
    ["learn", "Learn", "15 courses in four tracks, each with short lessons, coding exercises that run in your browser, a quiz and a build. Your dated plan and the toolkit sit alongside."],
    ["practise", "Practise", "Ten-question quiz rounds that bring back what you miss, and the Interview room: mock interviews built from a real job advert, with a scorecard."],
    ["projects", "Projects", "Three real projects with checkpoints. Share them for peer review and review others for XP."],
    ["cohort", "Cohort", "The club table, and where you pick an accountability partner to keep each other on track."],
    ["me", "Your streak, level and account", "Streaks count weeks you hit 60% of your hours. XP comes from real work. Tap your initial for settings."],
    ["start", "Last thing: your plan", "Two short steps build your plan: rate the tools you've used, then a quick placement. Do it now or after a look around."],
  ];
  let tourI = -1;
  function tourTarget(key) {
    if (key === "me") return document.getElementById("me");
    if (key === "start") return document.querySelector('.hero a.btn[href="#placement"]') || document.querySelector(".hero");
    return document.querySelector('#nav a[data-group="' + key + '"]');
  }
  function endTour() {
    tourI = -1; document.querySelectorAll(".tour-dim,.tour-pop,.tour-ring,.welcome-modal").forEach((x) => x.remove());
    if (!S.onboarded) { S.onboarded = today(); persist(); }
  }
  function tourStep(i) {
    document.querySelectorAll(".tour-dim,.tour-pop,.tour-ring,.welcome-modal").forEach((x) => x.remove());
    if (i < 0 || i >= TOUR.length) { endTour(); return; }
    tourI = i;
    if (route().name !== "home") { location.hash = "home"; setTimeout(() => tourStep(i), 80); return; }
    let st = TOUR[i]; if (st[0] === "start" && S.placement) st = ["start", "You're all set", "Your next step is always on Today. Log each session and watch the countdown move."];
    const t = tourTarget(st[0]);
    if (t && t.scrollIntoView) t.scrollIntoView({ block: "nearest", inline: "center" });
    const r = t ? t.getBoundingClientRect() : { left: innerWidth / 2 - 100, top: 80, width: 200, height: 40, bottom: 120 };
    const dim = document.createElement("div"); dim.className = "tour-dim"; dim.setAttribute("data-act", "tourskip"); document.body.appendChild(dim);
    const ring = document.createElement("div"); ring.className = "tour-ring";
    Object.assign(ring.style, { left: r.left - 6 + "px", top: r.top - 6 + "px", width: r.width + 12 + "px", height: r.height + 12 + "px" });
    document.body.appendChild(ring);
    const pop = document.createElement("div"); pop.className = "tour-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-live", "polite"); pop.setAttribute("aria-label", "Tour step " + (i + 1) + " of " + TOUR.length);
    pop.innerHTML = '<p class="xs muted" style="margin:0 0 4px">' + (i + 1) + " of " + TOUR.length + "</p><h3>" + esc(st[1]) + '</h3><p class="small" style="margin:0 0 14px">' + esc(st[2]) + '</p><div class="row between"><button class="link small" data-act="tourskip">Skip tour</button><div class="row">' + (i ? '<button class="btn line sm" data-act="tourback">Back</button>' : "") + '<button class="btn sm" data-act="tournext">' + (i === TOUR.length - 1 ? "Done" : "Next") + "</button></div></div>";
    document.body.appendChild(pop);
    const pw = Math.min(340, innerWidth - 24), below = r.bottom + 14 + 190 < innerHeight;
    pop.style.width = pw + "px";
    pop.style.left = Math.max(12, Math.min(innerWidth - pw - 12, r.left + r.width / 2 - pw / 2)) + "px";
    pop.style.top = (below ? r.bottom + 14 : Math.max(12, r.top - 14 - pop.offsetHeight)) + "px";
    const nb = pop.querySelector("[data-act=tournext]"); if (nb) nb.focus();
  }
  document.addEventListener("keydown", (e) => { if (tourI >= 0 && e.key === "Escape") endTour(); if (tourI < 0 && e.key === "Escape" && document.querySelector(".welcome-modal")) endTour(); });
  window.addEventListener("resize", () => { if (tourI >= 0) tourStep(tourI); });
