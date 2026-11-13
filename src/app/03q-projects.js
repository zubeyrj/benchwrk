  /* ---------- Projects: one page each, locked until you reach them in your plan ---------- */
  // The three portfolio projects open once every core course before them is done. Smaller builds open when
  // the course that teaches their skill is done. Dates come from the live plan, so they move as you do.
  const LOCK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const BUILD_STEPS = ["Write down who it's for and the one job it does", "Get the core working end to end, however rough", "Add tests and handle the failure cases", "Deploy it and write a README with a short demo"];
  function projList() {
    const p = plan(), core = PROJECTS.filter((id) => byId[id]).map((id, n) => ({ kind: "core", id, n: n + 1, m: byId[id], d: byId[id].proj || {} }));
    const extra = ((CT.TK && CT.TK.builds) || []).map((b) => ({ kind: "build", id: "x-" + b.id, b, d: b }));
    return { p, core, extra };
  }
  function projState(x, p) {
    p = p || plan();
    if (x.kind === "core") {
      const r = p.rows.find((y) => y.m.id === x.id), i = r ? p.rows.indexOf(r) : -1;
      const before = i >= 0 ? p.rows.slice(0, i).filter((y) => !y.m.extra) : [];
      const blocker = before.find((y) => !y.done) || null;
      const st = S.mods[x.id] || {}, started = !!(st.done || Object.keys(st.cp || {}).length || Object.keys(st.checks || {}).length);
      const open = !r ? false : !blocker || started;
      return { open, done: !!st.done, row: r, blocker, at: r ? r.sd : null, week: r ? weekIndex(p, r.sd) + 1 : null, hours: r ? r.hours : x.m.hours, cp: Object.keys(st.cp || {}).length };
    }
    const after = byId[x.b.after], r = p.rows.find((y) => y.m.id === x.b.after), st = (S.builds || {})[x.b.id] || {};
    const open = !!((S.mods[x.b.after] || {}).done || Object.keys(st.cp || {}).length);
    return { open, done: !!st.done, row: r, blocker: open ? null : r || { m: after }, at: r ? r.ed : null, week: r ? weekIndex(p, r.ed) + 1 : null, hours: x.b.hours, cp: Object.keys(st.cp || {}).length };
  }
  const durTxt = (h) => "About " + h + " hours, roughly " + plural(Math.max(1, Math.round(h / S.hpw)), "week") + " at " + S.hpw + " hours a week";
  function unlockTxt(s) {
    if (s.open) return "";
    const what = s.blocker && s.blocker.m ? s.blocker.m.title : "the courses before it";
    return "Opens when you finish " + what + (s.at ? ", around " + fmtY(s.at) + (s.week > 0 ? " (week " + s.week + ")" : "") : "") + ".";
  }
  function projCard(x, p) {
    const s = projState(x, p), d = x.d, title = x.kind === "core" ? d.title || x.m.title.replace(/: project \d/i, "") : x.b.t;
    const total = x.kind === "core" ? ((LX[x.id] || {}).checkpoints || []).length || 5 : BUILD_STEPS.length;
    const status = s.done ? '<span class="state ok">' + TICK + " Done</span>" : s.open ? '<span class="state">' + (s.cp ? s.cp + " of " + total + " milestones" : "Open now") + "</span>" : '<span class="state lockd">' + LOCK + " Locked</span>";
    return '<a class="card node proj-card' + (s.open ? "" : " locked") + '" href="#project-' + x.id + '">' +
      '<div class="row between" style="margin-bottom:8px"><span class="xs muted">' + (x.kind === "core" ? "Portfolio project " + x.n : "Smaller build") + "</span>" + status + "</div>" +
      "<h3>" + esc(title) + '</h3><p class="small muted" style="margin:0 0 10px">' + esc(firstSentence(d.about || "")) + "</p>" +
      '<div class="chips-sm">' + (d.tools || []).slice(0, 4).map((t) => "<span>" + esc(t) + "</span>").join("") + "</div>" +
      '<p class="xs muted" style="margin:10px 0 0">' + esc(durTxt(s.hours)) + (s.open ? "" : ". " + esc(unlockTxt(s))) + "</p></a>";
  }
  const firstSentence = (t) => { const m = String(t).match(/^.*?[.!?](\s|$)/); return m ? m[0].trim() : t; };
  function vProjects() {
    subscribeShared();
    const L = projList();
    const intro = '<h1>Projects</h1><p class="lede">Three portfolio projects built around what UK employers ask for in junior AI engineering adverts: retrieval (RAG), evaluation and agents, each deployed. Smaller builds give you extra practice and talking points. Each one opens when you reach it in your plan.</p>';
    let html = intro + '<div class="sec"><h2>Portfolio projects</h2><div class="grid3">' + L.core.map((x) => projCard(x, L.p)).join("") + "</div></div>";
    if (L.extra.length) html += '<div class="sec"><h2>Smaller builds</h2><p class="muted" style="max-width:66ch">Optional. Each one opens when you finish the course that teaches its skill.</p><div class="grid3">' + L.extra.map((x) => projCard(x, L.p)).join("") + "</div></div>";
    html += reviewQueue();
    html += '<details class="sec"><summary><h2 style="display:inline">More project ideas from the library</h2></summary>' + projectChallenges() + "</details>";
    return html;
  }
  function vProject(r) {
    const L = projList(), x = L.core.concat(L.extra).find((y) => y.id === r.key);
    if (!x) return vProjects();
    if (x.kind === "core" && !LX[x.id]) { needLX(x.id).then(() => { if (route().name === "project") render(); }); return loading(300); }
    const s = projState(x, L.p), d = x.d, title = x.kind === "core" ? x.m.title.replace(/: project \d/i, "") : x.b.t;
    const facts = '<dl class="facts">' +
      '<div><dt>Time</dt><dd class="n">' + s.hours + ' h</dd><dd class="muted">' + esc(durTxt(s.hours).replace(/^About \d+ hours, /, "")) + "</dd></div>" +
      '<div><dt>' + (s.open ? "Status" : "Opens") + "</dt><dd>" + (s.done ? "Done" : s.open ? "Open" : s.at ? fmt(s.at) : "Later") + '</dd><dd class="muted">' + (s.open ? (s.cp ? s.cp + " milestones ticked" : "Ready to start") : s.week > 0 ? "Week " + s.week + " of your plan" : "When you get there") + "</dd></div>" +
      '<div><dt>Builds on</dt><dd style="font-size:16px">' + esc(x.kind === "core" ? (s.row && L.p.rows[L.p.rows.indexOf(s.row) - 1] ? L.p.rows[L.p.rows.indexOf(s.row) - 1].m.title : "Earlier courses") : (byId[x.b.after] || {}).title || "") + "</dd></div></dl>";
    const about = '<div class="card sec"><h2>What you\'ll build</h2><p>' + esc(d.about || "") + "</p>" + (d.market ? '<h3 style="margin-top:16px">Why employers care</h3><p class="muted" style="margin:0">' + esc(d.market) + "</p>" : "") + "</div>";
    const tools = '<div class="card"><h3>Tools you\'ll use</h3><div class="chips-sm">' + (d.tools || []).map((t) => "<span>" + esc(t) + "</span>").join("") + "</div>" + (d.skills ? '<h3 style="margin-top:16px">Skills it shows</h3><ul class="small" style="margin:0;padding-left:18px">' + d.skills.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul>" : "") + "</div>";
    const lockedNote = s.open ? "" : '<div class="lock-panel">' + LOCK.replace('width="16" height="16"', 'width="22" height="22"') + "<div><b>Locked for now</b><p>" + esc(unlockTxt(s)) + " The date moves with your progress." + (isOwner ? " You can see the full page because you're the site owner." : "") + "</p></div></div>";
    let work = "";
    if (s.open || isOwner) {
      if (x.kind === "core") {
        const cps = LX[x.id].checkpoints || [], cp = (S.mods[x.id] || {}).cp || {};
        work = '<div class="card sec"><h2>Milestones</h2><p class="small muted">Build it in this order. Tick each one when it\'s working; your progress and the cohort board update.</p><ol class="checks ms-list">' + cps.map((c, i) => '<li><label><input type="checkbox" data-cp="' + x.id + ":" + i + '"' + (cp[i] ? " checked" : "") + (s.open || isOwner ? "" : " disabled") + "><span>" + esc(c) + "</span></label></li>").join("") + "</ol>" +
          '<p class="small" style="margin:12px 0 0">The lessons for this project are on the <a href="#course-' + x.id + '">' + esc(x.m.title) + "</a> course page.</p></div>" + projShare(x.id);
      } else {
        const cp = ((S.builds || {})[x.b.id] || {}).cp || {};
        work = '<div class="card sec"><h2>Milestones</h2><p class="small muted">A simple order that works for any small build.</p><ol class="checks ms-list">' + BUILD_STEPS.map((c, i) => '<li><label><input type="checkbox" data-bcp="' + x.b.id + ":" + i + '"' + (cp[i] ? " checked" : "") + (s.open || isOwner ? "" : " disabled") + "><span>" + esc(c) + "</span></label></li>").join("") + "</ol>" +
          '<p class="small" style="margin:12px 0 0">Stuck? The skill is taught in <a href="#course-' + x.b.after + '">' + esc((byId[x.b.after] || {}).title || "") + "</a>, and the tutor (bottom right) can help.</p></div>";
      }
    }
    return '<p class="crumb"><a href="#projects">Projects</a> / ' + esc(title) + "</p><h1>" + esc(title) + '</h1><p class="lede">' + esc(firstSentence(d.about || "")) + "</p>" + lockedNote + facts +
      '<div class="cols sec" style="margin-top:20px"><div class="stack">' + about + work + "</div><aside>" + tools + "</aside></div>";
  }
  // Sharing a finished project for peer review, and the reviews it got.
  function projShare(id) {
    const m = byId[id], mine = (subs || []).find((s) => s.id === uid) || { items: {} }, item = (mine.items || {})[id];
    const got = (reviews || []).filter((rv) => !isBlocked(rv.id)).map((rv) => ({ by: rv.name || "A member", byId: rv.id, r: (rv.given || {})[uid + ":" + id], self: rv.id === uid })).filter((x) => x.r && !x.self);
    const share = !item && !ui.shareOpen[id] ? '<button class="btn line" data-act="shareopen" data-id="' + id + '">Share for review</button>'
      : item && !ui.shareOpen[id] ? '<p class="small">' + [item.repo ? '<a href="' + esc(item.repo) + '" target="_blank" rel="noopener">Repository</a>' : "", item.demo ? '<a href="' + esc(item.demo) + '" target="_blank" rel="noopener">Live demo</a>' : ""].filter(Boolean).join(" · ") + '<span class="muted"> shared ' + fmt(parseDate(item.at)) + '</span></p><button class="link" data-act="shareopen" data-id="' + id + '">Edit the links</button>'
      : '<form data-sub="' + id + '"><div class="two"><div class="field"><label for="s-repo-' + id + '">Repository URL</label><input type="url" id="s-repo-' + id + '" value="' + esc(item ? item.repo : "") + '" placeholder="https://github.com/…"></div><div class="field"><label for="s-demo-' + id + '">Live demo URL</label><input type="url" id="s-demo-' + id + '" value="' + esc(item ? item.demo : "") + '" placeholder="https://…"></div></div>' +
        '<div class="field"><label for="s-note-' + id + '">What should reviewers look at?</label><textarea id="s-note-' + id + '" maxlength="600">' + esc(item ? item.note : "") + '</textarea></div><button class="btn" type="submit">' + (item ? "Update" : "Share with the cohort") + "</button></form>";
    return '<div class="card sec"><h2>Peer review</h2><p class="small muted">When it\'s deployed, share it. Two reviews from the cohort before you call it done.</p>' + share +
      '<h3 style="margin-top:18px">Reviews received</h3>' + (got.length ? '<ul class="rl">' + got.map((x) => '<li><span class="grow"><b>' + esc(x.by) + "</b> " + moreMenu(x.byId, x.by, "review", id, "Review of your " + m.title) + ' <span class="n">' + x.r.s.reduce((a, b) => a + b, 0) + " / " + x.r.s.length * 3 + '</span><div class="small muted">' + esc(x.r.c || "") + "</div></span></li>").join("") + "</ul>" : '<p class="small muted">' + (item ? "None yet. Ask someone on the cohort table." : "Share the project to get reviews.") + "</p>") + "</div>";
  }
  function reviewQueue() {
    const queue = (subs || []).filter((s) => s.id !== uid && !isBlocked(s.id) && !((cohort || []).find((c) => c.id === s.id) || {}).suspended).flatMap((s) => PROJECTS.filter((id) => s.items && s.items[id]).map((id) => ({ s, id, it: s.items[id] })));
    const myGiven = ((reviews || []).find((r) => r.id === uid) || {}).given || {};
    PROJECTS.forEach((id) => { if (!LX[id]) needLX(id).then(() => { if (route().name === "projects") render(); }); });
    return '<div class="card sec"><h2>Review the cohort</h2><p class="muted">Each review earns ' + PTS.rev + " points. Score four things from 1 (not yet) to 3 (strong) and leave one useful sentence.</p>" +
      (queue.length ? '<ul class="rl">' + queue.map((q) => {
        const key = q.s.id + ":" + q.id, done = myGiven[key], open = ui.revOpen === key, rub = (LX[q.id] && LX[q.id].rubric) || [];
        return '<li style="display:block"><div class="row between"><span><b>' + esc(q.s.name || "A member") + "</b>, " + esc(byId[q.id].title.replace(/: project \d/i, "")) + '</span><span class="row">' + (q.it.repo ? '<a href="' + esc(q.it.repo) + '" target="_blank" rel="noopener">Repo</a>' : "") + (q.it.demo ? '<a href="' + esc(q.it.demo) + '" target="_blank" rel="noopener">Demo</a>' : "") +
          '<button class="btn sm' + (done ? " line" : "") + '" data-act="revopen" data-k="' + key + '">' + (done ? "Edit review" : "Review") + "</button>" + moreMenu(q.s.id, q.s.name, "project", q.id, (q.s.name || "A member") + "'s " + byId[q.id].title) + "</span></div>" + (q.it.note ? '<p class="small muted" style="margin:6px 0 0">' + esc(q.it.note) + "</p>" : "") +
          (open ? '<form class="sec tight" data-rev="' + key + '">' + rub.map((c, i) => '<fieldset style="margin:0 0 12px"><legend class="small">' + esc(c) + '</legend><div class="seg" style="max-width:360px;grid-template-columns:repeat(3,1fr)">' + [1, 2, 3].map((v) => '<label><input type="radio" name="rv' + i + '" value="' + v + '"' + (done && done.s[i] === v ? " checked" : "") + "><span>" + ["Not yet", "Getting there", "Strong"][v - 1] + "</span></label>").join("") + "</div></fieldset>").join("") +
            '<div class="field"><label for="rv-c">One useful sentence</label><textarea id="rv-c" maxlength="400">' + esc(done ? done.c : "") + '</textarea></div><button class="btn" type="submit">Send review</button></form>' : "") + "</li>";
      }).join("") + "</ul>" : '<p class="small muted">' + (subs === null ? "Loading shared projects…" : "Nobody else has shared a project yet.") + "</p>") + "</div>";
  }
  // A project course's lessons stay closed until the project opens (the owner can always look).
  function projGate(id) {
    if (PROJECTS.indexOf(id) < 0 || isOwner) return "";
    const L = projList(), x = L.core.find((y) => y.id === id), s = x && projState(x, L.p);
    if (!s || s.open) return "";
    return '<div class="lock-panel">' + LOCK.replace('width="16" height="16"', 'width="22" height="22"') + "<div><b>This project is locked for now</b><p>" + esc(unlockTxt(s)) + ' <a href="#project-' + id + '">See what you\'ll build</a>.</p></div></div>';
  }
  document.addEventListener("change", (e) => {
    const t = e.target; if (!t.dataset || !t.dataset.bcp || phase !== "ready") return;
    const [id, i] = t.dataset.bcp.split(":"); S.builds = S.builds || {}; const b = S.builds[id] = S.builds[id] || { cp: {} };
    if (t.checked) b.cp[i] = today(); else delete b.cp[i];
    b.done = Object.keys(b.cp).length >= BUILD_STEPS.length ? b.done || today() : null;
    persist(); render(); if (t.checked) celebrate(b.done ? "Build finished" : "Milestone ticked", "+" + PTS.cp + " XP");
  });
