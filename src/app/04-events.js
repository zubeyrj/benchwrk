
  /* ---------- events ---------- */
  function addLog(h, d, m, n, k) {
    const e = { id: uidGen(), d, h, m, n: n || "" }; if (k) e.k = k;
    S.log.unshift(e);
    S.log.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
    if (S.log.length > 800) S.log = S.log.slice(0, 800);
    persist();
  }
  function scrollTop() { window.scrollTo(0, 0); }
  async function runEx(id, exId) {
    const ex = LX[id].ex.find((x) => x.id === exId), k = exKey(id, exId), ta = document.getElementById("code");
    const code = ta ? ta.value : (codeDoc && codeDoc[k]) || ex.start;
    if (codeDoc) { codeDoc[k] = code; saveCode(); }
    ui.exres[k] = { running: true }; render();
    const res = await window.AILRunner.run(ex, code);
    ui.exres[k] = res;
    const st = mod(id); st.ex = st.ex || {}; const s = st.ex[exId] = st.ex[exId] || {};
    s.runs = (s.runs || 0) + 1;
    const all = !res.error && res.tests.length && res.tests.every((t) => t[1]);
    if (all && !s.ok) { s.ok = today(); if (ui.solShown[k]) s.sol = 1; setTimeout(() => celebrate("Exercise solved: " + ex.t, "+" + (s.sol ? PTS.exSol : PTS.ex) + " XP"), 60); }
    persist();
    if (route().name === "ex" && route().ex === exId) { render(); const v = document.querySelector(".verdict"); if (v) v.scrollIntoView({ block: "nearest", behavior: "auto" }); }
  }
  async function startPractice(mode) {
    const sel = document.getElementById("p-mod");
    const ids = mode === "one" ? [sel ? sel.value : MOD[0].id] : mode === "miss" ? Array.from(new Set(Object.keys(S.miss).map((k) => k.split(":")[0]))) : (() => {
      const st = MOD.filter((m) => inPlan(m.id) && S.mods[m.id] && (Object.keys(S.mods[m.id].checks || {}).length || S.mods[m.id].quiz || S.mods[m.id].done)).map((m) => m.id);
      return st.length ? st : [plan().rows[0].m.id];
    })();
    ui.prac = { loading: true, mode }; render();
    await Promise.all(ids.map(needLX));
    let pool = ids.flatMap(poolOf).map((q) => q.key);
    const missed = shuffle(pool.filter((k) => S.miss[k]));
    if (mode === "miss") pool = missed;
    const rest = shuffle(pool.filter((k) => !S.miss[k]));
    const qs = missed.slice(0, 5).concat(rest).concat(missed.slice(5)).slice(0, 10);
    ui.prac = { mode, qs: shuffle(qs), i: 0, ans: {}, res: [] };
    render(); scrollTop();
  }
  // Close the account menu on any click outside it, and on Escape.
  document.addEventListener("click", (e) => { const m = document.querySelector("details.acct[open]"); if (m && !m.contains(e.target)) m.removeAttribute("open"); }, true);
  document.addEventListener("keydown", (e) => {
    if ((e.key !== "ArrowRight" && e.key !== "ArrowLeft") || e.altKey || e.ctrlKey || e.metaKey || route().name !== "lesson") return;
    const t = e.target; if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    const b = document.querySelector('[data-act="lpart"][data-d="' + (e.key === "ArrowRight" ? 1 : -1) + '"]:not([disabled])'); if (b) { e.preventDefault(); b.click(); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { const m = document.querySelector("details.acct[open]"); if (m) { m.removeAttribute("open"); m.querySelector("summary").focus(); } } });
  document.addEventListener("click", (e) => {
    const sk = e.target.closest(".skip"); if (sk) { e.preventDefault(); $app.focus(); return; }
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act, id = b.dataset.id;
    if (act === "reload") { location.reload(); return; }
    if (act === "signout") { if (window.BW) window.BW.signOut(); return; }
    if (act === "seed") {
      if (!window.BW || ui.seeding) return;
      ui.seeding = true; render();
      window.BW.api("/api/admin-seed", {}).then((r) => { toast("Loaded " + r.loaded + " course documents."); ui.seeding = false; LX = {}; lxWait = {}; if (phase === "nocontent") { phase = "loading-content"; render(); return loadContent().then(render); } render(); })
        .catch((err) => { ui.seeding = false; toast((err && err.message) || "Couldn't load the content."); render(); });
      return;
    }
    if (act === "pwreset") {
      const bw = window.BW; if (!bw) return;
      bw.client.auth.resetPasswordForEmail(bw.email, { redirectTo: bw.site.replace(/\/$/, "") + "/?reset=1" }).then(({ error }) => { if (error) toast("Couldn't send the link. Try again in a minute."); else { ui.pwSent = true; render(); } });
      return;
    }
    if (act === "calics") { saveFile("benchwrk-study-sessions.ics", buildIcs(ui.cal), "text/calendar").then(() => toast("Calendar file saved. Open it to add the sessions.")).catch(() => {}); return; }
    if (act === "export") {
      if (!window.BW || ui.exporting) return;
      ui.exporting = true; render();
      window.BW.api("/api/me-export").then((d) => saveFile("benchwrk-my-data-" + today() + ".json", JSON.stringify(d, null, 2), "application/json")).then(() => toast("Your data is downloading."))
        .catch(() => toast("Couldn't prepare your data. Try again.")).then(() => { ui.exporting = false; render(); });
      return;
    }
    if (act === "delopen") { ui.delOpen = true; ui.delErr = ""; render(); const el = document.getElementById("del-confirm"); if (el) el.focus(); return; }
    if (act === "delcancel") { ui.delOpen = false; render(); return; }
    if (act === "certshare") {
      if (!window.BW || ui.certBusy) return;
      const m = byId[id], st = S.mods[id] || {}; ui.certBusy = true; render();
      const hours = r1(S.log.filter((x) => x.m === id).reduce((a, x) => a + Number(x.h || 0), 0));
      window.BW.issueCert({ name: S.account.name, course: id, course_title: m.title, hours, issued: st.done || today() })
        .then((url) => { ui.certUrl = ui.certUrl || {}; ui.certUrl[id] = url; }).catch(() => toast("Couldn't create the link. Try again."))
        .then(() => { ui.certBusy = false; render(); });
      return;
    }
    if (act === "copycert") { const el = document.getElementById("cert-url"); if (el && navigator.clipboard) navigator.clipboard.writeText(el.value).then(() => toast("Link copied."), () => { el.select(); }); return; }
    if (act === "mailopen") { ui.admin.mail = { id }; render(); scrollTop(); const el = document.getElementById("mail-subj"); if (el) el.focus(); return; }
    if (act === "mailclose") { ui.admin.mail = null; render(); return; }
    if (act === "tour") { e.preventDefault(); tourStep(0); return; }
    if (act === "tournext") { tourStep(tourI + 1); return; }
    if (act === "tourback") { tourStep(tourI - 1); return; }
    if (act === "tourskip" || act === "welcomedone") { endTour(); return; }
    if (phase !== "ready") return;
    if (act === "tick") { tickToday(); return; }
    if (act === "lpart") { const r = route(), k = r.id + "-" + r.i; ui.lessonPart = ui.lessonPart || {}; ui.lessonPart[k] = Math.max(0, (ui.lessonPart[k] || 0) + Number(b.dataset.d)); render(); const h = document.querySelector(".part-h"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } window.scrollTo(0, Math.max(0, (document.querySelector("article") || {}).offsetTop - 80 || 0)); return; }
    if (act === "lall") { ui.lessonAll = !ui.lessonAll; render(); return; }
    if (act === "qlog") {
      const h = Number(b.dataset.h), cur = currentRow(plan());
      const td = thisWeekDays().find((d) => d.today);
      ui.just = { f0: td && td.hours ? Math.min(1, td.logged / td.hours) : td && td.logged ? 1 : 0 };
      addLog(h, today(), cur ? cur.m.id : "", "");
      render(); ui.just = null; celebrate("Logged " + plural(h, "hour"), "+" + h * PTS.hour + " XP"); return;
    }
    if (act === "retools") { e.preventDefault(); ui.place = { stage: "tools", tools: Object.assign({}, S.tools || {}) }; if (location.hash === "#placement") render(); else location.hash = "placement"; return; }
    if (act === "toolsave") {
      S.tools = Object.assign({}, ui.place.tools); persist();
      ui.place = newPlacement();
      render(); scrollTop(); return;
    }
    if (act === "pstart" || act === "preset") {
      ui.place = S.tools ? newPlacement() : { stage: "tools", tools: {} };
      if (act === "pstart") { render(); scrollTop(); } return;
    }
    if (act === "learnfull") { S.lf = S.lf || {}; if (S.lf[id]) delete S.lf[id]; else S.lf[id] = 1; persist(); render(); toast(S.lf[id] ? "This course is now in your plan in full." : "Back to your placement result for this course."); return; }
    if (act === "pick") {
      const P = ui.place; P.ans[P.i] = Number(b.dataset.i); P.hist.push(P.i);
      const nx = placeNext(P, P.i + 1); if (nx < 0) P.stage = "result"; else P.i = nx;
      render(); scrollTop(); const f = document.querySelector(".popt"); if (f) f.focus(); return;
    }
    if (act === "pskiptool") {
      const P = ui.place, t = P.diag[P.i].t;
      let j = P.i; while (j < P.diag.length && P.diag[j].t === t) { P.ans[j] = -1; j++; }
      P.hist.push(P.i); const nx = placeNext(P, j); if (nx < 0) P.stage = "result"; else P.i = nx;
      render(); scrollTop(); return;
    }
    if (act === "pback") { const P = ui.place, k = P.hist.pop(); if (k == null) return; Object.keys(P.ans).forEach((x) => { if (Number(x) >= k) delete P.ans[x]; }); P.i = k; P.stage = "q"; render(); return; }
    if (act === "psave") { const P = ui.place, tl = toolLadder(P.ans, P.diag); S.placement = { scores: scorePlacement(P.ans, P.diag), at: today(), answers: P.ans, tools: Object.fromEntries(Object.entries(tl).map(([k, v]) => [k, v.got])) }; S.lf = Object.assign({}, P.lf); ui.place = null; persist(); toast("Plan saved."); location.hash = "plan"; return; }
    if (act === "lread") {
      const st = mod(id); st.checks = st.checks || {}; st.checks[b.dataset.i] = today(); persist();
      location.hash = b.dataset.next.slice(1); celebrate("Lesson read", "+" + PTS.lesson + " XP"); return;
    }
    if (act === "hint") { const st = mod(id); st.ex = st.ex || {}; const s = st.ex[b.dataset.ex] = st.ex[b.dataset.ex] || {}; s.hints = (s.hints || 0) + 1; persist(); render(); return; }
    if (act === "sol") { const k = exKey(id, b.dataset.ex); if (!ui.solArm[k]) { ui.solArm[k] = true; render(); return; } ui.solShown[k] = true; ui.solArm[k] = false; render(); return; }
    if (act === "usesol") { const [mid, ex] = b.dataset.k.split("."); const sol = LX[mid].ex.find((x) => x.id === ex).sol; const ta = document.getElementById("code"); if (ta) ta.value = sol; if (codeDoc) { codeDoc[b.dataset.k] = sol; saveCode(); } return; }
    if (act === "run") { runEx(id, b.dataset.ex); return; }
    if (act === "resetcode") { const k = exKey(id, b.dataset.ex), ex = LX[id].ex.find((x) => x.id === b.dataset.ex); if (codeDoc) { delete codeDoc[k]; saveCode(); } const ta = document.getElementById("code"); if (ta) ta.value = ex.start; delete ui.exres[k]; render(); return; }
    if (act === "submit") {
      const qs = ui.quiz[id], list = qs.set.map(qByKey);
      let right = 0; list.forEach((q, i) => { const ok = qs.ans[i] === q.a; if (ok) right++; noteAnswer(q.key, ok); });
      const score = Math.round((100 * right) / list.length);
      qs.done = true; qs.score = score;
      const st = mod(id), qi = st.quiz || { best: 0, attempts: 0, passes: [] };
      qi.attempts += 1; qi.best = Math.max(qi.best, score);
      if (score >= 80 && qi.passes[qi.passes.length - 1] !== today()) { qi.passes.push(today()); qi.passes = qi.passes.slice(-6); }
      const firstPass = score >= 80 && qi.passes.length === 1 && qi.passes[0] === today() && qi.attempts >= 1 && !st.quizCelebrated;
      if (firstPass) st.quizCelebrated = 1;
      st.quiz = qi; persist(); render();
      if (score >= 80) celebrate(firstPass ? "Quiz passed: " + byId[id].title : "Quiz review passed", firstPass ? "+" + PTS.quiz + " XP" : "Memory refreshed");
      const el = document.getElementById("quiz"); if (el) el.scrollIntoView({ block: "start" });
      return;
    }
    if (act === "retry") { delete ui.quiz[id]; render(); scrollTop(); return; }
    if (act === "complete") { mod(id).done = today(); persist(); location.hash = "cert-" + id; celebrate("Course complete: " + byId[id].title, "Your certificate is ready"); return; }
    if (act === "reopen") { delete mod(id).done; persist(); toast(byId[id].title + " reopened."); render(); return; }
    if (act === "dellog") { S.log = S.log.filter((x) => x.id !== id); persist(); toast("Session deleted."); render(); return; }
    if (act === "pstartp") { startPractice(b.dataset.mode); return; }
    if (act === "ppick") { const P = ui.prac, q = qByKey(P.qs[P.i]), a = Number(b.dataset.i); P.ans[P.i] = a; P.res[P.i] = a === q.a; noteAnswer(q.key, a === q.a); persist(); render(); return; }
    if (act === "pnext") { ui.prac.i++; render(); scrollTop(); return; }
    if (act === "pexit") { ui.prac = null; render(); return; }
    if (act === "shareopen") { ui.shareOpen[id] = true; render(); const el = document.getElementById("s-repo-" + id); if (el) el.focus(); return; }
    if (act === "pairask") { savePair({ req: id }); toast("Request sent. You'll be paired when they accept."); return; }
    if (act === "paircancel") { savePair({ req: null }); return; }
    if (act === "pairaccept") { savePair({ partner: id, req: null }).then(() => celebrate("You have an accountability partner", "Set this week's commitment on Today")); return; }
    if (act === "unpair") { if (!ui.unpairArm) { ui.unpairArm = true; toast("Click again to end the partnership."); setTimeout(() => { ui.unpairArm = false; }, 4000); return; } ui.unpairArm = false; savePair({ partner: null, req: null }); return; }
    if (act === "cheer" || act === "nudge") {
      const P = partnerInfo(); if (!P) return;
      const mine = myPairDoc() || {}, recent = (mine.msgs || []).filter((m) => m.at === today()).length;
      if (recent >= 3) { toast("That's three for today. Save the rest for tomorrow."); return; }
      const texts = act === "cheer" ? ["Great week, keep going.", "Nice work. You're on track.", "Proud of the progress. Onwards."] : ["How's this week going? Tonight's a good night for an hour.", "Friendly nudge: a short session still counts.", "Checking in. What's one small step tonight?"];
      const msg = texts[Math.floor(Math.random() * texts.length)];
      if (window.BW) window.BW.api("/api/nudge", { to: P.id, kind: act, text: msg }).catch(() => {});
      savePair({ msgs: (mine.msgs || []).concat([{ to: P.id, kind: act, text: msg, at: today(), ts: Date.now() }]) }).then(() => toast(act === "cheer" ? "Cheer sent." : "Nudge sent."));
      return;
    }
    if (act === "revopen") { ui.revOpen = ui.revOpen === b.dataset.k ? null : b.dataset.k; render(); return; }
    if (act === "tstart") { askTutor(b.dataset.k, "Start the mock interview."); return; }
    if (act === "certdl") {
      const svg = certSvg(byId[id]);
      downloads.save({ filename: "certificate-" + byId[id].title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".svg", data: svg }).then(() => toast("Certificate saved.")).catch((err) => { if (!err || err.code !== "declined") toast("The download didn't go through."); });
      return;
    }
    if (act === "copycsv") {
      const head = "name,last_log,week_h,total_h,lessons,exercises,quizzes,route_pct,points";
      const lines = (cohort || []).map((c) => [c.name, c.last, c.week, c.hours, c.ls, c.xs, c.qp, c.pct, c.pts].map((v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"').join(","));
      const csv = [head].concat(lines).join("\n");
      if (downloads) downloads.save({ filename: "cohort-" + today() + ".csv", data: csv }).catch((err) => { if (!err || err.code !== "declined") toast("The download didn't go through."); });
      else navigator.clipboard.writeText(csv).then(() => toast("Copied " + plural(lines.length, "row") + ".")).catch(() => toast("Copying isn't allowed here."));
      return;
    }
    if (act === "adload2") { adminLoad(ui.admin.doc); return; }
    if (act === "adsave") {
      const A = ui.admin, ta = document.getElementById("ad-text"); A.text = ta.value;
      let data; try { data = JSON.parse(A.text); } catch (err) { A.err = "Not valid JSON: " + err.message; A.arm = false; render(); return; }
      if (!data || typeof data !== "object" || Array.isArray(data)) { A.err = "The document must be a JSON object."; render(); return; }
      if (A.doc.indexOf("content/m") === 0 && !(data.title && Array.isArray(data.lessons) && Array.isArray(data.quiz))) { A.err = "A course needs title, lessons and quiz."; render(); return; }
      if (!A.arm) { A.arm = true; A.err = ""; render(); return; }
      A.arm = false;
      db.doc(A.doc).set(data).then(() => { toast("Saved. Members see it on their next load."); A.err = ""; if (A.doc.indexOf("lessons/") === 0) delete LX[A.doc.split("/")[1]], delete lxWait[A.doc.split("/")[1]]; render(); }).catch((err) => { A.err = "Couldn't save: " + ((err && err.message) || "unknown error"); render(); });
      return;
    }
    if (act === "reset") {
      if (!ui.resetArm) { ui.resetArm = true; render(); return; }
      const acct = S.account; ui.resetArm = false; S = blank(); S.account = acct; ui.quiz = {}; ui.exres = {}; persist(); toast("Progress reset."); location.hash = "home";
    }
  });
  async function adminLoad(path) {
    const A = ui.admin; A.doc = path; A.err = ""; A.arm = false;
    if (!path) { A.text = ""; render(); return; }
    A.loading = true; render();
    try { const s = await db.doc(path).get(); A.text = s.exists ? JSON.stringify(s.data(), null, 2) : "{}"; } catch (e) { A.text = ""; A.err = "Couldn't load that document."; }
    A.loading = false; render();
  }

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (phase !== "ready") return;
    if (t.dataset.pref && window.BW) {
      const prev = Object.assign({}, ui.prefs); ui.prefs[t.dataset.pref] = t.checked;
      window.BW.savePrefs(ui.prefs).then(() => toast(t.checked ? "Turned on." : "Turned off.")).catch(() => { ui.prefs = prev; render(); toast("Couldn't save that. Try again."); });
      return;
    }
    if (t.dataset.calday) { const d = t.dataset.calday, c = ui.cal; c.days = t.checked ? DAYS.map((x) => x[0]).filter((x) => x === d || c.days.indexOf(x) >= 0) : c.days.filter((x) => x !== d); render(); return; }
    if (t.dataset.caltime !== undefined) { ui.cal.time = t.value || "19:00"; render(); return; }
    if (t.dataset.check) {
      const [id, i] = t.dataset.check.split(":"); const st = mod(id);
      st.checks = st.checks || {}; if (t.checked) st.checks[i] = today(); else delete st.checks[i];
      persist(); return;
    }
    if (t.dataset.plf) { const P = ui.place; P.lf = P.lf || {}; if (t.checked) P.lf[t.dataset.plf] = 1; else delete P.lf[t.dataset.plf]; render(); const el = document.querySelector('[data-plf="' + t.dataset.plf + '"]'); if (el) el.focus(); return; }
    if (t.dataset.cp) {
      const [id, i] = t.dataset.cp.split(":"); const st = mod(id);
      st.cp = st.cp || {}; if (t.checked) st.cp[i] = 1; else delete st.cp[i];
      persist(); render(); if (t.checked) celebrate("Checkpoint ticked", "+" + PTS.cp + " XP"); return;
    }
    if (t.dataset.tool) {
      ui.place.tools[t.dataset.tool] = Number(t.value);
      const n = TOOLS.filter((x) => ui.place.tools[x[0]] != null).length, btn = document.querySelector('[data-act="toolsave"]'), c = document.getElementById("toolcount");
      if (btn) btn.disabled = n < TOOLS.length; if (c) c.textContent = n + " of " + TOOLS.length + " rated";
      return;
    }
    if (t.dataset.lc) { ui.quiz["lc-" + t.dataset.lc] = Number(t.value); render(); return; }
    if (t.dataset.themePick !== undefined) { try { localStorage.setItem("ail-theme", t.value); } catch (err) {} applyTheme(); return; }
    if (t.id === "ad-doc") { adminLoad(t.value); return; }
    if (t.dataset.q) {
      const [id, i] = t.dataset.q.split(":");
      const qs = ui.quiz[id]; qs.ans[i] = Number(t.value);
      const n = Object.keys(qs.ans).length, tot = qs.set.length, btn = document.querySelector('[data-act="submit"][data-id="' + id + '"]'), c = document.getElementById("qcount");
      if (btn) btn.disabled = n < tot; if (c) c.textContent = n + " of " + tot + " answered";
    }
  });

  // Editor keys: Tab indents, Shift+Tab dedents, Enter keeps indentation, Ctrl/Cmd+Enter runs.
  document.addEventListener("keydown", (e) => {
    const ta = e.target;
    if (ta.id === "code" || ta.id === "ad-text") {
      const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && ta.id === "code") { e.preventDefault(); const btn = document.querySelector('[data-act="run"]'); if (btn && !btn.disabled) btn.click(); return; }
      if (e.key === "Tab" && !e.shiftKey && s === en) { e.preventDefault(); ta.setRangeText("    ", s, en, "end"); ta.dispatchEvent(new Event("input", { bubbles: true })); return; }
      if (e.key === "Tab" && e.shiftKey) { e.preventDefault(); const ls = v.lastIndexOf("\n", s - 1) + 1, m = v.slice(ls).match(/^ {1,4}/); if (m) { ta.setRangeText("", ls, ls + m[0].length, "preserve"); ta.selectionStart = ta.selectionEnd = Math.max(ls, s - m[0].length); ta.dispatchEvent(new Event("input", { bubbles: true })); } return; }
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && s === en) { const ls = v.lastIndexOf("\n", s - 1) + 1, line = v.slice(ls, s), ind = line.match(/^\s*/)[0] + (/:\s*$/.test(line) ? "    " : ""); e.preventDefault(); ta.setRangeText("\n" + ind, s, en, "end"); ta.dispatchEvent(new Event("input", { bubbles: true })); return; }
    }
    if (ta.closest && ta.closest("[data-tform]") && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ta.form.requestSubmit(); }
  });
  document.addEventListener("input", (e) => { const t = e.target; if (t.id === "code" && codeDoc) { codeDoc[t.dataset.k] = t.value; saveCode(); } });

  document.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.id === "delform") {
      const v = (document.getElementById("del-confirm").value || "").trim();
      if (v !== "DELETE") { ui.delErr = "Type DELETE in capitals to confirm."; render(); document.getElementById("del-confirm").focus(); return; }
      ui.deleting = true; ui.delErr = ""; render();
      try { await window.BW.api("/api/me-delete", { confirm: "DELETE" }); await window.BW.client.auth.signOut().catch(() => {}); location.href = "/?deleted=1"; }
      catch (err) { ui.deleting = false; ui.delErr = (err && err.message) || "Couldn't delete the account. Try again."; render(); }
      return;
    }
    if (f.id === "mailform") {
      const M = ui.admin.mail; M.subj = document.getElementById("mail-subj").value.trim(); M.body = document.getElementById("mail-body").value.trim();
      if (!M.subj || !M.body) { M.err = "Add a subject and a message."; render(); return; }
      M.busy = true; M.err = ""; render();
      try { await window.BW.api("/api/admin-email", { to: M.id, subject: M.subj, body: M.body }); ui.admin.mail = null; toast("Email sent."); }
      catch (err) { M.busy = false; M.err = (err && err.message) || "Couldn't send it."; }
      render(); return;
    }
    if (f.id === "signup") {
      if (ui.busy) return;
      const name = document.getElementById("a-name").value.trim();
      ui.signDraft = { name, hpw: document.getElementById("a-hpw").value, start: document.getElementById("a-start").value, remind: readRemind("a", "persistent") };
      const emailEl = document.getElementById("a-email"), email = myEmail || (emailEl ? emailEl.value.trim() : "");
      ui.emailDraft = email;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { ui.emailErr = email ? "That doesn't look like an email address. Check it and try again." : "Enter your email address. Accounts need one."; ui.formErr = name ? "" : "Enter a display name so other members can see who's on the plan."; render(); document.getElementById("a-email").focus(); return; }
      ui.emailErr = "";
      if (!name) { ui.formErr = "Enter a display name so other members can see who's on the plan."; render(); document.getElementById("a-name").focus(); return; }
      const learn = readLearn("a");
      if (!learn.formats.length) { ui.learnErr = "Pick at least one way you like to learn."; render(); const lq = document.querySelector('input[name="a-fmt"]'); if (lq) lq.focus(); return; }
      ui.learnErr = "";
      const invEl = document.getElementById("a-invite"), inv = invEl ? invEl.value.trim().toUpperCase() : "";
      ui.inviteDraft = inv;
      if (inv && !cohortByCode(inv, await loadCohortList())) { ui.inviteErr = "That code doesn't match an open cohort. Check it, or leave it blank and add it later."; render(); document.getElementById("a-invite").focus(); return; }
      ui.inviteErr = "";
      ui.formErr = ""; ui.busy = true;
      const g = f.querySelector('input[name="a-goal"]:checked');
      const next = normalize(Object.assign({}, S, { account: Object.assign({ name: name.slice(0, 40), created: today() }, myEmail ? { verified: true } : { email: email.slice(0, 120) }), hpw: clampH(document.getElementById("a-hpw").value), goal: g ? g.value : "engineer", start: document.getElementById("a-start").value || S.start }));
      render();
      try {
        if (inv) next.cohort = inv;
        next.learn = Object.assign(learn, { at: today() });
        next.remind = { level: readRemind("a", "persistent"), hour: 19, tz: myTz() };
        await stateRef().set(JSON.parse(JSON.stringify(next)));
        if (window.BW) { window.BW.saveName(name.slice(0, 40)).catch(() => {}); if (window.BW.clearInvite) window.BW.clearInvite(); }
        S = next; lastSaved = JSON.stringify(S); ui.busy = false;
        phase = "loading-content"; render();
        await loadContent();
        if (phase === "ready") { if (location.hash !== "#home") location.hash = "home"; }
        render();
        if (phase === "ready") showWelcome();
      } catch (err) {
        ui.busy = false;
        if (err && err.code === "invalid_argument") phase = "noaccess";
        else ui.formErr = "Your account couldn't be created just now. Check your connection and try again.";
        render();
      }
      return;
    }
    if (phase !== "ready") return;
    if (f.id === "logform") {
      const h = Number(document.getElementById("l-h").value), d = document.getElementById("l-d").value || today();
      if (!(h > 0 && h <= 16)) { toast("Enter between 0.25 and 16 hours."); return; }
      addLog(h, d, document.getElementById("l-m").value, document.getElementById("l-n").value.slice(0, 400));
      toast("Logged " + plural(h, "hour") + " away from benchwrk."); render(); return;
    }
    if (f.id === "sform") {
      const nm = document.getElementById("s-name").value.trim();
      if (nm) S.account.name = nm.slice(0, 40);
      S.hpw = clampH(document.getElementById("s-hpw").value);
      if (S.sched && S.sched.mode === "auto") { S.sched.days = autoDays(S.hpw, S.sched.tod, S.sched.weekends, S.sched.avoid); S.sched.until = isoDate(plan().end); S.sched.ms = schedMilestones(); }
      const g = f.querySelector('input[name="sgoal"]:checked'); S.goal = g ? g.value : S.goal;
      S.start = document.getElementById("s-start").value || S.start;
      persist(); toast("Settings saved."); location.hash = "plan"; return;
    }
    if (f.id === "noticeform") {
      const text = document.getElementById("n-text").value.trim();
      db.doc("content/notice").set({ text, at: today() }).then(() => { notice = text ? { text, at: today() } : null; toast(text ? "Notice published." : "Notice removed."); }).catch(() => toast("Couldn't publish the notice."));
      return;
    }
    if (f.dataset.commit !== undefined) {
      const h = Math.max(1, Math.min(40, Number(document.getElementById("c-h").value) || S.hpw)), text = document.getElementById("c-t").value.trim().slice(0, 80);
      savePair({ commit: { wk: thisMon(), hours: h, text } }).then(() => celebrate("Commitment set: " + h + " hours", "Your partner can see it"));
      return;
    }
    if (f.dataset.tform) {
      const ta = f.querySelector("textarea"), text = ta.value.trim();
      if (text) askTutor(f.dataset.tform, text.slice(0, 2000));
      return;
    }
    if (f.dataset.sub) {
      const id = f.dataset.sub, repo = document.getElementById("s-repo-" + id).value.trim(), demo = document.getElementById("s-demo-" + id).value.trim(), note = document.getElementById("s-note-" + id).value.trim();
      if (!/^https?:\/\//.test(repo) && !/^https?:\/\//.test(demo)) { toast("Add a repository or demo link starting with https://"); return; }
      const mine = (subs || []).find((s) => s.id === uid) || { items: {} };
      const val = (k, n) => { const el = document.getElementById("s-" + k + "-" + id); return el ? el.value.trim().slice(0, n) : ""; };
      const url = (k) => { const v = val(k, 400); return /^https:\/\/\S+$/.test(v) ? v : ""; };
      const items = Object.assign({}, mine.items || {}); items[id] = { repo, demo, note: note.slice(0, 600), at: today(), problem: val("problem", 300), result: val("result", 300), how: val("how", 600), stack: val("stack", 200), image: url("image"), video: url("video") };
      try { await db.doc("subs/" + uid).set({ name: S.account.name, at: today(), items }); mod(id).sub = today(); ui.shareOpen[id] = false; persist(); render(); celebrate("Project shared with the cohort", "+" + PTS.sub + " XP the first time"); }
      catch (err) { toast("Couldn't share it just now."); }
      return;
    }
    if (f.dataset.rev) {
      const key = f.dataset.rev, proj = key.split(":")[1], n = (LX[proj] && LX[proj].rubric || []).length;
      const s = []; for (let i = 0; i < n; i++) { const c = f.querySelector('input[name="rv' + i + '"]:checked'); if (!c) { toast("Score all " + n + " criteria."); return; } s.push(Number(c.value)); }
      const c = document.getElementById("rv-c").value.trim().slice(0, 400);
      const mine = (reviews || []).find((r) => r.id === uid) || { given: {} }, given = Object.assign({}, mine.given || {}), first = !given[key];
      given[key] = { s, c, at: today() };
      try { await db.doc("reviews/" + uid).set({ name: S.account.name, given }); if (first) { S.revs = (S.revs || 0) + 1; persist(); } ui.revOpen = null; render(); celebrate("Review sent", first ? "+" + PTS.rev + " XP" : "Updated"); }
      catch (err) { toast("Couldn't send the review just now."); }
    }
  });

  function applyTheme() { let t = "auto"; try { t = localStorage.getItem("ail-theme") || "auto"; } catch (e) {} if (t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t); }
  applyTheme();
  if (window.AILRunner) AILRunner.onState((s) => { const el = document.getElementById("pystate"); if (el) el.textContent = { cold: "Python starts on first run", loading: "Starting Python…", ready: "Python ready", failed: "Python couldn't start" }[s]; });
  render();
  boot();
  window.__AIL_TEST__ = { scorePlacement, levelOf, plan, blank, normalize, md, points };
})();
