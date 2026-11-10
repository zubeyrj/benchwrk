
  /* ---------- Trust and community: cohorts, reports, blocking, notifications, owner tools ---------- */
  const isBlocked = (id) => S.blocked.indexOf(id) >= 0;
  const cohortByCode = (code, list) => (list || (CT && CT.COH) || []).find((c) => c.code === String(code || "").toUpperCase() && c.open !== false) || null;
  async function loadCohortList() {
    if (CT && CT.COH) return CT.COH;
    try { const s = await db.doc("content/cohorts").get(); return s.exists ? s.data().list || [] : []; } catch (e) { return []; }
  }
  const cohortName = (code) => { const c = ((CT && CT.COH) || []).find((x) => x.code === code); return c ? c.name : ""; };
  // Who you see on the board: never suspended or blocked members; by default only your own cohort.
  function visibleCohort(scope) {
    const all = (cohort || []).filter((c) => (c.id === uid || (!c.suspended && !isBlocked(c.id))));
    const sc = scope || ui.coScope || (S.cohort ? "mine" : "all");
    return sc === "mine" && S.cohort ? all.filter((c) => c.co === S.cohort || c.id === uid) : all;
  }
  // A small "More" menu next to someone's content: report it, or block them.
  function moreMenu(id, name, kind, ref, label) {
    if (!id || id === uid) return "";
    return '<details class="more"><summary class="link xs" aria-label="More options for ' + esc(name || "this member") + '">More</summary><div class="more-menu">' +
      '<button data-act="report" data-kind="' + kind + '" data-id="' + esc(id) + '" data-ref="' + esc(ref || "") + '" data-label="' + esc(label || name || "") + '">Report</button>' +
      '<button data-act="block" data-id="' + esc(id) + '" data-name="' + esc(name || "") + '">' + (isBlocked(id) ? "Unblock" : "Block") + "</button></div></details>";
  }
  const REASONS = { member: ["Spam or advertising", "Harassment or abuse", "Impersonation", "Something else"], review: ["Rude or hurtful", "Spam", "Not about the project", "Something else"], project: ["Not their own work", "Unsafe link", "Spam", "Something else"], message: ["Harassment or abuse", "Spam", "Something else"], content: ["Something is wrong", "A link is broken", "The exercise doesn't work", "A typo or unclear wording", "Something else"] };

  let myReports = [];
  async function loadMyReports() { try { const s = await db.doc("reports/" + uid).get(); myReports = s.exists ? (s.data().items || []) : []; refreshNav(); } catch (e) { myReports = []; } }

  function reportModal() {
    const R = ui.report; if (!R) return "";
    const reasons = REASONS[R.kind] || REASONS.member;
    return '<div class="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="rp-h"><form id="reportform" class="wm-card" style="text-align:left;max-width:460px">' +
      '<h2 id="rp-h" style="margin:0 0 6px">' + (R.kind === "content" ? "Report a problem" : "Report this") + '</h2><p class="small muted" style="margin:0 0 16px">' + esc(R.label || "") + (R.kind === "content" ? "" : ". Only the site owner sees reports; the member isn't told who sent it.") + "</p>" +
      '<fieldset><legend class="sr">Reason</legend>' + reasons.map((r, i) => '<label class="radio-row"><input type="radio" name="rp-reason" value="' + esc(r) + '"' + (i === 0 ? " checked" : "") + "> " + esc(r) + "</label>").join("") + "</fieldset>" +
      '<div class="field" style="margin-top:12px"><label for="rp-note">' + (R.kind === "content" ? "What's wrong?" : "Anything else? (optional)") + '</label><textarea id="rp-note" rows="3" maxlength="800"></textarea></div>' +
      (R.kind !== "content" ? '<label class="radio-row"><input type="checkbox" id="rp-block"> Also block ' + esc(R.name || "them") + "</label>" : "") +
      '<div class="row" style="margin-top:14px"><button class="btn" type="submit">Send report</button><button class="btn line" type="button" data-act="reportclose">Cancel</button></div></form></div>';
  }
  function openReport(r) { ui.report = r; let m = document.getElementById("report-host"); if (!m) { m = document.createElement("div"); m.id = "report-host"; document.body.appendChild(m); } m.innerHTML = reportModal(); const f = m.querySelector("input,textarea"); if (f) f.focus(); }
  function closeReport() { ui.report = null; const m = document.getElementById("report-host"); if (m) m.innerHTML = ""; }
  async function saveReport(item) {
    myReports = myReports.concat([item]).slice(-50);
    await db.doc("reports/" + uid).set({ name: S.account.name, items: JSON.parse(JSON.stringify(myReports)) });
  }
  function toggleBlock(id, name) {
    if (isBlocked(id)) { S.blocked = S.blocked.filter((x) => x !== id); persist(); toast("Unblocked " + (name || "them") + "."); render(); return; }
    S.blocked.push(id); persist();
    const me = myPairDoc();
    if (me && (me.partner === id || me.req === id)) savePair({ partner: me.partner === id ? null : me.partner, req: me.req === id ? null : me.req });
    toast("Blocked " + (name || "them") + ". You won't see their reviews, messages or requests.");
    render();
  }

  /* ----- notifications: worked out from what's already shared, nothing extra is stored ----- */
  function notifs() {
    const out = [], add = (ts, text, href, kind) => { if (ts && Number.isFinite(ts)) out.push({ ts, text, href, kind }); };
    const dts = (d) => Date.parse(String(d || "").slice(0, 10) + "T09:00:00");
    (pairs || []).forEach((p) => {
      if (p.id === uid || isBlocked(p.id)) return;
      if (p.req === uid && !(myPairDoc() || {}).partner) add(dts(p.at), (p.name || "A member") + " wants to be your accountability partner", "#cohort", "pair");
      (p.msgs || []).filter((m) => m.to === uid).forEach((m) => add(m.ts || dts(m.at), (p.name || "Your partner") + (m.kind === "nudge" ? " nudged you: " : " cheered you on: ") + m.text, "#home", m.kind));
    });
    (reviews || []).forEach((rv) => {
      if (rv.id === uid || isBlocked(rv.id)) return;
      Object.keys(rv.given || {}).forEach((k) => { const [to, proj] = k.split(":"); if (to === uid) add(dts(rv.given[k].at), (rv.name || "A member") + " reviewed your " + ((byId[proj] && byId[proj].title) || "project"), "#projects", "review"); });
    });
    if (notice && notice.text) add(notice.ts || dts(notice.at), "From the Benchwork team: " + notice.text, "#home", "notice");
    myReports.filter((r) => r.status === "resolved" && r.resolvedAt).forEach((r) => add(r.resolvedAt, "Your report about " + (r.label || "a member") + " was reviewed. Thank you.", "#settings", "report"));
    remindNotif(add);
    const now = Date.now();
    (S.apps || []).forEach((a) => { if (a.next && a.next.date) { const t = dts(a.next.date), days = Math.round((t - now) / 864e5); if (days >= -1 && days <= 3) add(Math.min(now, t - 2 * 864e5), (a.next.what || "Next step") + " with " + (a.company || "an employer") + " " + (days <= 0 ? "today" : days === 1 ? "tomorrow" : "on " + fmt(parseDate(a.next.date))), "#applications", "app"); } });
    return out.sort((a, b) => b.ts - a.ts).slice(0, 20);
  }
  function bellHtml() {
    const N = notifs(), unread = N.filter((n) => n.ts > (S.notifSeen || 0)).length;
    const bell = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
    return '<details class="acct bell"><summary class="chip bell-btn" aria-label="Notifications' + (unread ? ", " + unread + " new" : "") + '">' + bell + (unread ? '<span class="badge">' + (unread > 9 ? "9+" : unread) + "</span>" : "") + '</summary><div class="acct-menu bell-menu" role="menu"><div class="acct-who"><b>Notifications</b></div>' +
      (N.length ? N.map((n) => '<a role="menuitem" href="' + n.href + '"' + (n.ts > (S.notifSeen || 0) ? ' class="new"' : "") + "><span>" + esc(n.text) + '</span><span class="xs muted">' + esc(ago(n.ts)) + "</span></a>").join("") : '<p class="small muted" style="padding:10px 12px;margin:0">Nothing yet. Cheers from your partner, reviews of your projects and reminders show up here.</p>') + "</div></details>";
  }
  function ago(ts) { const d = Math.floor((Date.now() - ts) / 864e5); return d <= 0 ? "Today" : d === 1 ? "Yesterday" : d < 0 ? "Coming up" : d + " days ago"; }
  function refreshNav() { if (phase === "ready" && S.account) { const r = route(); const open = document.querySelector("details.bell[open]"); if (!open) renderNav(NAVOF[r.name] || r.name); } }

  /* ----- page footer: "Report a problem" on lessons and exercises ----- */
  function pageFooter(r) {
    if (r.name === "lesson" || r.name === "ex") {
      const what = r.name === "lesson" ? "lesson" : "exercise", ref = r.name === "lesson" ? r.id + ":lesson:" + r.i : r.id + ":ex:" + r.ex;
      const lx = LX[r.id], label = r.name === "lesson" ? (lx && lx.lessons[r.i] ? lx.lessons[r.i].t : "this lesson") : (lx && lx.ex.find((e) => e.id === r.ex) ? lx.ex.find((e) => e.id === r.ex).t : "this exercise");
      return '<p class="report-line"><button class="link small" data-act="report" data-kind="content" data-ref="' + esc(ref) + '" data-label="' + esc((byId[r.id] ? byId[r.id].title + ": " : "") + label) + '">Spotted a mistake? Report a problem with this ' + what + "</button></p>";
    }
    return "";
  }

  /* ----- Settings: cohort and blocked members ----- */
  function settingsTrust() {
    const c = S.cohort ? ((CT && CT.COH) || []).find((x) => x.code === S.cohort) : null;
    const blocked = S.blocked.map((id) => ({ id, name: ((cohort || []).find((x) => x.id === id) || {}).name || "A member" }));
    return '<div class="card sec"><h2>Your cohort</h2>' + (S.cohort ? '<p>You\'re in <b>' + esc(c ? c.name : S.cohort) + '</b>. Your cohort board shows this group first.</p><button class="btn line sm" data-act="coleave">Leave this cohort</button>'
      : '<p class="muted">Joined with friends or a class? Add their invite code to share a board.</p>') +
      '<form id="coform" class="row" style="margin-top:12px;align-items:flex-end"><div class="field" style="margin:0"><label for="co-code">' + (S.cohort ? "Switch with a code" : "Invite code") + '</label><input id="co-code" maxlength="12" autocomplete="off" style="text-transform:uppercase;width:180px"' + (ui.coErr ? ' aria-invalid="true" aria-describedby="co-err"' : "") + '></div><button class="btn sm" type="submit">Join</button></form>' + (ui.coErr ? '<p class="err" id="co-err">' + esc(ui.coErr) + "</p>" : "") + "</div>" +
      (blocked.length ? '<div class="card sec"><h2>Blocked members</h2><ul class="rl">' + blocked.map((b) => '<li><span class="grow">' + esc(b.name) + '</span><button class="btn line sm" data-act="block" data-id="' + esc(b.id) + '" data-name="' + esc(b.name) + '">Unblock</button></li>').join("") + "</ul></div>" : "");
  }

  /* ----- Admin: cohorts, reports, suspensions, errors, system check ----- */
  let allReports = null, reportsSubbed = false;
  function subscribeReports() {
    if (reportsSubbed || !isOwner) return; reportsSubbed = true;
    db.collection("reports").onSnapshot((s) => { allReports = s.docs.map((d) => Object.assign({ id: d.id }, d.data())); if (route().name === "admin") render(); }, () => { allReports = allReports || []; });
  }
  const nameOf = (id) => ((cohort || []).find((c) => c.id === id) || {}).name || "A member";
  function adminTrust() {
    subscribeReports();
    const A = ui.admin;
    // Cohorts
    const coh = (CT.COH || []), counts = {}; (cohort || []).forEach((c) => { if (c.co) counts[c.co] = (counts[c.co] || 0) + 1; });
    const site = (window.BW && window.BW.site) || location.origin;
    const cohSec = '<div class="card sec"><h2>Cohorts and invite links</h2><p class="small muted">Give each group its own code. Members with the same code share a board and see each other first when picking a partner. Anyone can still sign up without a code.</p>' +
      (coh.length ? '<div class="tblwrap"><table class="tbl"><thead><tr><th>Cohort</th><th>Code</th><th class="r">Members</th><th>Invite link</th><th></th></tr></thead><tbody>' + coh.map((c) => "<tr><td><b>" + esc(c.name) + "</b>" + (c.open === false ? ' <span class="tag skip">Closed</span>' : "") + '</td><td class="n"><code>' + esc(c.code) + '</code></td><td class="n">' + (counts[c.code] || 0) + '</td><td><button class="link small" data-act="copyinvite" data-code="' + esc(c.code) + '">Copy link</button></td><td><button class="link small" data-act="cotoggle" data-code="' + esc(c.code) + '">' + (c.open === false ? "Reopen" : "Close") + "</button></td></tr>").join("") + "</tbody></table></div>" : "") +
      '<form id="cocreate" class="row" style="margin-top:14px;align-items:flex-end"><div class="field" style="margin:0"><label for="co-name">New cohort name</label><input id="co-name" maxlength="60" placeholder="Spring 2027" style="width:240px"></div><button class="btn sm" type="submit">Create cohort</button></form>' +
      '<p class="xs muted" style="margin-top:8px">Links look like ' + esc(site.replace(/\/$/, "")) + "/?invite=CODE</p></div>";
    // Reports
    const items = [];
    (allReports || []).forEach((r) => (r.items || []).forEach((it, i) => items.push(Object.assign({ reporter: r.id, reporterName: r.name, idx: i }, it))));
    const open = items.filter((x) => x.status !== "resolved").sort((a, b) => (b.at || 0) - (a.at || 0)), done = items.filter((x) => x.status === "resolved").length;
    const evidence = (it) => {
      if (it.kind === "review") { const rv = (reviews || []).find((r) => r.id === it.target); const g = rv && rv.given ? Object.keys(rv.given).filter((k) => k.endsWith(":" + it.ref)).map((k) => rv.given[k].c).filter(Boolean) : []; return g.length ? '"' + esc(g[0]) + '"' : "Review not found (maybe removed)"; }
      if (it.kind === "message") { const p = (pairs || []).find((x) => x.id === it.target); const m = p && (p.msgs || []).slice(-3).map((x) => x.text).join(" / "); return m ? '"' + esc(m) + '"' : "No messages found"; }
      if (it.kind === "project") { const sb = (subs || []).find((x) => x.id === it.target); const p = sb && sb.items && sb.items[it.ref]; return p ? esc([p.repo, p.demo, p.note].filter(Boolean).join(" · ")) : "Project not found"; }
      if (it.kind === "content") return "Where: " + esc(it.label || it.ref);
      return "";
    };
    const act = (it) => {
      const base = 'data-rep="' + esc(it.reporter) + '" data-idx="' + it.idx + '"';
      const btns = ['<button class="btn sm" data-act="represolve" ' + base + ">Mark resolved</button>"];
      if (it.kind === "review") btns.push('<button class="btn line sm" data-act="rmreview" ' + base + ' data-target="' + esc(it.target) + '" data-ref="' + esc(it.ref) + '">Remove review</button>');
      if (it.kind === "project") btns.push('<button class="btn line sm" data-act="rmproject" ' + base + ' data-target="' + esc(it.target) + '" data-ref="' + esc(it.ref) + '">Remove project</button>');
      if (it.kind === "message") btns.push('<button class="btn line sm" data-act="rmmsgs" ' + base + ' data-target="' + esc(it.target) + '">Clear their messages</button>');
      if (it.kind === "content") { const [m] = String(it.ref || "").split(":"); if (byId[m]) btns.push('<a class="btn line sm" href="#' + (String(it.ref).indexOf(":ex:") > 0 ? "ex-" + m + "-" + it.ref.split(":")[2] : "lesson-" + m + "-" + it.ref.split(":")[2]) + '">Open it</a>'); }
      if (it.kind !== "content" && it.target) btns.push('<button class="btn line sm" data-act="suspend" data-id="' + esc(it.target) + '" style="color:var(--fail)">Suspend ' + esc(nameOf(it.target)) + "</button>");
      return '<div class="row" style="margin-top:8px">' + btns.join("") + "</div>";
    };
    const repSec = '<div class="card sec"><div class="row between"><h2 style="margin:0">Reports</h2><span class="xs muted">' + open.length + " open · " + done + " resolved</span></div>" +
      (allReports === null ? loading(60) : open.length ? open.map((it) => '<div class="rep"><div class="row between"><b>' + esc(it.kind === "content" ? "Content problem" : (it.kind[0].toUpperCase() + it.kind.slice(1)) + " from " + nameOf(it.target)) + '</b><span class="xs muted">' + esc(ago(it.at)) + " · from " + esc(it.reporterName || "a member") + '</span></div><p class="small" style="margin:6px 0 0"><b>' + esc(it.reason) + "</b>" + (it.note ? ": " + esc(it.note) : "") + '</p><p class="xs muted" style="margin:4px 0 0">' + evidence(it) + "</p>" + act(it) + "</div>").join("")
        : '<p class="small muted">No open reports.</p>') + "</div>";
    // Suspended
    const susp = (cohort || []).filter((c) => c.suspended);
    const suspSec = susp.length ? '<div class="card sec"><h2>Suspended members</h2><ul class="rl">' + susp.map((c) => '<li><span class="grow">' + esc(c.name || "A member") + '</span><button class="btn line sm" data-act="restore" data-id="' + esc(c.id) + '">Restore</button></li>').join("") + "</ul></div>" : "";
    // Errors
    if (window.BW && A.errors === undefined) { A.errors = null; window.BW.client.from("errors").select("id, at, source, message, url, resolved").eq("resolved", false).order("at", { ascending: false }).limit(30).then((r) => { A.errors = r.data || []; if (route().name === "admin") render(); }, () => { A.errors = []; }); }
    const errSec = window.BW ? '<div class="card sec"><div class="row between"><h2 style="margin:0">Errors</h2>' + (A.errors && A.errors.length ? '<button class="btn line sm" data-act="errclear">Mark all resolved</button>' : "") + '</div><p class="small muted">Crashes in members\' browsers and in the server. You get an email for the first one each hour.</p>' +
      (A.errors === null ? loading(40) : A.errors.length ? '<ul class="rl">' + A.errors.map((e) => '<li><span class="grow"><b class="small">' + esc(e.message) + '</b><div class="xs muted">' + esc(e.source) + " · " + esc(new Date(e.at).toLocaleString("en-GB")) + (e.url ? " · " + esc(e.url) : "") + "</div></span></li>").join("") + "</ul>" : '<p class="small muted">No errors. Good.</p>') + "</div>" : "";
    // System check
    const H = A.health;
    const sysSec = window.BW ? '<div class="card sec"><div class="row between"><h2 style="margin:0">System check</h2><div class="row"><button class="btn line sm" data-act="testemail"' + (A.testing ? " disabled" : "") + '>Send me a test email</button><button class="btn sm" data-act="health"' + (A.checking ? " disabled" : "") + ">" + (A.checking ? "Checking…" : H ? "Check again" : "Run checks") + "</button></div></div>" +
      (H ? '<ul class="rl sys">' + H.checks.map((c) => '<li><span class="dot ' + (!c.ok ? "bad" : c.warn ? "warn" : "ok") + '" aria-hidden="true"></span><span class="grow"><b>' + esc(c.name) + '</b><div class="xs muted">' + esc(c.note || "") + '</div></span><span class="xs muted">' + (!c.ok ? "Needs attention" : c.warn ? "Optional" : "Working") + "</span></li>").join("") + "</ul>" : '<p class="small muted">Checks the database, Claude key, email, scheduled jobs, job search and captcha. Run it after setup and after changing settings in Vercel.</p>') + "</div>" : "";
    // Backups and portfolios
    const bakSec = window.BW ? '<div class="card sec"><div class="row between"><h2 style="margin:0">Backups</h2><button class="btn line sm" data-act="backupnow"' + (A.backingUp ? " disabled" : "") + ">" + (A.backingUp ? "Preparing…" : "Download a backup now") + '</button></div><p class="small muted">An encrypted copy of the whole database is emailed to you every Sunday. The file opens only with your BACKUP_KEY passphrase; SETUP.md explains how to restore one.</p></div>' : "";
    if (window.BW && window.BW.portfolio && A.pfs === undefined) { A.pfs = null; window.BW.portfolio.list().then((l) => { A.pfs = l; if (route().name === "admin") render(); }).catch(() => { A.pfs = []; }); }
    const pfSec = window.BW && window.BW.portfolio ? '<div class="card sec"><h2>Public portfolios</h2>' + (A.pfs === null ? loading(40) : A.pfs.length ? '<ul class="rl">' + A.pfs.map((x) => '<li><span class="grow"><a href="' + esc(window.BW.portfolio.url(x.slug)) + '" target="_blank" rel="noopener"><b>/p/' + esc(x.slug) + '</b></a><div class="xs muted">' + esc(nameOf(x.user_id)) + (x.headline ? " · " + esc(x.headline) : "") + "</div></span>" + (x.hidden ? '<span class="tag behind">Hidden</span><button class="btn line sm" data-act="pfshow" data-id="' + esc(x.user_id) + '">Show</button>' : '<button class="btn line sm" data-act="pfhide" data-id="' + esc(x.user_id) + '">Hide</button>') + "</li>").join("") + "</ul>" : '<p class="small muted">Nobody has published a portfolio yet.</p>') + "</div>" : "";
    return sysSec + bakSec + repSec + suspSec + pfSec + cohSec + errSec;
  }

  /* ----- events ----- */
  document.addEventListener("click", async (e) => {
    const m = document.querySelector("details.more[open]"); if (m && !m.contains(e.target)) m.removeAttribute("open");
    const bell = e.target.closest("details.bell > summary");
    if (bell) { setTimeout(() => { const d = bell.parentElement; if (d.open) { S.notifSeen = Date.now(); persist(); const b = d.querySelector(".badge"); if (b) b.remove(); } }, 0); }
    const b = e.target.closest("[data-act]"); if (!b || phase !== "ready") return;
    const a = b.dataset.act;
    if (a === "report") { const md = b.closest("details"); if (md) md.removeAttribute("open"); openReport({ kind: b.dataset.kind, target: b.dataset.id || "", ref: b.dataset.ref || "", label: b.dataset.label || "", name: b.dataset.label }); return; }
    if (a === "reportclose") { closeReport(); return; }
    if (a === "block") { const md = b.closest("details"); if (md) md.removeAttribute("open"); toggleBlock(b.dataset.id, b.dataset.name); return; }
    if (a === "coleave") { S.cohort = ""; persist(); flush(); toast("You've left the cohort."); render(); return; }
    if (!isOwner) return;
    if (a === "copyinvite") { const link = ((window.BW && window.BW.site) || location.origin).replace(/\/$/, "") + "/?invite=" + b.dataset.code; try { await navigator.clipboard.writeText(link); toast("Invite link copied."); } catch (x) { toast(link); } return; }
    if (a === "cotoggle") { const L = (CT.COH || []).map((c) => (c.code === b.dataset.code ? Object.assign({}, c, { open: c.open === false }) : c)); await saveCohorts(L); return; }
    if (a === "represolve" || a === "rmreview" || a === "rmproject" || a === "rmmsgs") {
      const rep = (allReports || []).find((r) => r.id === b.dataset.rep), idx = Number(b.dataset.idx);
      try {
        if (a === "rmreview") { const rv = (reviews || []).find((r) => r.id === b.dataset.target); if (rv) { const g = Object.assign({}, rv.given); Object.keys(g).filter((k) => k.endsWith(":" + b.dataset.ref)).forEach((k) => delete g[k]); await db.doc("reviews/" + rv.id).set({ name: rv.name, given: g }); } }
        if (a === "rmproject") { const sb = (subs || []).find((x) => x.id === b.dataset.target); if (sb) { const it = Object.assign({}, sb.items); delete it[b.dataset.ref]; const d = Object.assign({}, sb, { items: it }); delete d.id; await db.doc("subs/" + sb.id).set(d); } }
        if (a === "rmmsgs") { const p = (pairs || []).find((x) => x.id === b.dataset.target); if (p) { const d = Object.assign({}, p, { msgs: [] }); delete d.id; await db.doc("pairs/" + p.id).set(d); } }
        if (rep) { const items = (rep.items || []).slice(); items[idx] = Object.assign({}, items[idx], { status: "resolved", resolvedAt: Date.now(), action: a }); await db.doc("reports/" + rep.id).set({ name: rep.name, items }); }
        toast(a === "represolve" ? "Marked resolved." : "Removed and resolved.");
      } catch (x) { toast("Couldn't do that. Try again."); }
      return;
    }
    if (a === "suspend" || a === "restore") {
      if (a === "suspend" && ui.admin.suspArm !== b.dataset.id) { ui.admin.suspArm = b.dataset.id; b.textContent = "Click again to suspend"; setTimeout(() => { ui.admin.suspArm = null; }, 4000); return; }
      try { await window.BW.api("/api/admin-moderate", { action: a, uid: b.dataset.id }); toast(a === "suspend" ? "Suspended. They're signed out and hidden from the board." : "Restored."); } catch (x) { toast((x && x.message) || "Couldn't do that."); }
      return;
    }
    if (a === "errclear") { try { await window.BW.client.from("errors").update({ resolved: true }).eq("resolved", false); ui.admin.errors = []; render(); } catch (x) { toast("Couldn't update."); } return; }
    if (a === "backupnow") {
      ui.admin.backingUp = true; render();
      try {
        const r = await window.BW.api("/api/backup", {}, { raw: true });
        if (!r.ok) { let m = "The backup didn't work."; try { m = (await r.json()).error || m; } catch (x) { /* not json */ } throw new Error(m); }
        const blob = await r.blob(), name = (/filename="([^"]+)"/.exec(r.headers.get("content-disposition") || "") || [])[1] || "benchwork-backup.bwbak";
        const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast("Backup downloaded. Keep it somewhere safe.");
      } catch (x) { toast((x && x.message) || "The backup didn't work."); }
      ui.admin.backingUp = false; render(); return;
    }
    if (a === "pfhide" || a === "pfshow") {
      try { await window.BW.api("/api/admin-moderate", { action: a === "pfhide" ? "hideportfolio" : "showportfolio", uid: b.dataset.id }); const x = (ui.admin.pfs || []).find((y) => y.user_id === b.dataset.id); if (x) x.hidden = a === "pfhide"; toast(a === "pfhide" ? "Portfolio hidden." : "Portfolio visible again."); }
      catch (x) { toast((x && x.message) || "Couldn't change that."); }
      render(); return;
    }
    if (a === "health") { ui.admin.checking = true; render(); try { ui.admin.health = await window.BW.api("/api/health"); } catch (x) { toast((x && x.message) || "The check didn't run."); } ui.admin.checking = false; render(); return; }
    if (a === "testemail") { ui.admin.testing = true; render(); try { const r = await window.BW.api("/api/health", { test: "email" }); toast("Test email sent to " + r.to + "."); } catch (x) { toast((x && x.message) || "Couldn't send it."); } ui.admin.testing = false; render(); return; }
  });
  async function saveCohorts(list) {
    try { await db.doc("content/cohorts").set({ list }); CT.COH = list; render(); } catch (x) { toast("Couldn't save the cohort."); }
  }
  document.addEventListener("submit", async (e) => {
    const f = e.target; if (phase !== "ready") return;
    if (f.id === "reportform") {
      e.preventDefault();
      const R = ui.report; if (!R) return;
      const reason = (f.querySelector('input[name="rp-reason"]:checked') || {}).value || "Something else", note = document.getElementById("rp-note").value.trim().slice(0, 800);
      if (R.kind === "content" && !note) { document.getElementById("rp-note").setAttribute("aria-invalid", "true"); document.getElementById("rp-note").focus(); return; }
      const blk = document.getElementById("rp-block");
      try { await saveReport({ id: uidGen(), kind: R.kind, target: R.target, ref: R.ref, label: R.label, reason, note, at: Date.now(), status: "open" }); closeReport(); toast("Thanks. The site owner will look at it."); if (blk && blk.checked && R.target && !isBlocked(R.target)) toggleBlock(R.target, R.name); }
      catch (x) { toast("Couldn't send the report. Try again."); }
      return;
    }
    if (f.id === "coform") {
      e.preventDefault();
      const code = document.getElementById("co-code").value.trim().toUpperCase();
      if (!cohortByCode(code)) { ui.coErr = "That code doesn't match an open cohort."; render(); return; }
      ui.coErr = ""; S.cohort = code; persist(); flush(); toast("You've joined " + cohortName(code) + "."); render(); return;
    }
    if (f.id === "cocreate" && isOwner) {
      e.preventDefault();
      const name = document.getElementById("co-name").value.trim().slice(0, 60); if (!name) return;
      const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let code = "";
      do { code = ""; for (let i = 0; i < 6; i++) code += A[Math.floor(Math.random() * A.length)]; } while ((CT.COH || []).some((c) => c.code === code));
      await saveCohorts((CT.COH || []).concat([{ code, name, open: true, created: today() }]));
      toast("Cohort created. Copy its invite link to share it."); return;
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ui.report) closeReport(); });
  document.addEventListener("change", (e) => { if (e.target.dataset && e.target.dataset.coscope !== undefined && phase === "ready") { ui.coScope = e.target.value; render(); } });
