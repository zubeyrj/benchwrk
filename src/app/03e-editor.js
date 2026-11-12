
  /* ---------- Course editor (owner): forms instead of raw JSON, exercises checked before saving ---------- */
  if (!ui.ed) ui.ed = { id: "", tab: "details", sel: 0, C: null, L: null, msg: "", err: "", busy: false, preview: false };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const lines = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);

  async function edLoad(id) {
    const E = ui.ed; E.id = id; E.C = null; E.L = null; E.sel = 0; E.msg = ""; E.err = ""; render();
    try {
      const [c, l] = await Promise.all([db.doc("content/" + id).get(), db.doc("lessons/" + id).get()]);
      E.C = c.exists ? c.data() : null; E.L = l.exists ? l.data() : { id, lessons: [], ex: [], pool: [] };
      ["lessons", "ex", "pool"].forEach((k) => { if (!Array.isArray(E.L[k])) E.L[k] = []; });
    } catch (x) { E.err = "Couldn't load that course."; }
    render();
  }
  const field = (id, label, val, o) => '<div class="field"><label for="' + id + '">' + label + "</label>" + (o && o.area ? '<textarea id="' + id + '" rows="' + (o.rows || 4) + '"' + (o.code ? ' class="mono" spellcheck="false"' : "") + ' data-ed="' + (o.key || "") + '">' + esc(val == null ? "" : val) + "</textarea>" : '<input id="' + id + '" value="' + esc(val == null ? "" : val) + '"' + (o && o.type ? ' type="' + o.type + '"' : "") + ' data-ed="' + ((o && o.key) || "") + '">') + (o && o.hint ? '<p class="hint">' + o.hint + "</p>" : "") + "</div>";

  function adminEditor() {
    const E = ui.ed;
    const pick = '<div class="row" style="align-items:flex-end"><div class="field" style="margin:0"><label for="ed-course">Course</label><select id="ed-course" data-edcourse><option value="">Choose a course</option>' + MOD.map((m) => '<option value="' + m.id + '"' + (E.id === m.id ? " selected" : "") + ">" + esc(m.title) + "</option>").join("") + "</select></div></div>";
    let body = "";
    if (E.id && !E.C) body = E.err ? '<p class="err">' + esc(E.err) + "</p>" : loading(80);
    else if (E.C) {
      const tabs = [["details", "Details"], ["lessons", "Lessons (" + E.L.lessons.length + ")"], ["ex", "Exercises (" + E.L.ex.length + ")"], ["pool", "Quiz bank (" + E.L.pool.length + ")"]];
      body = '<nav class="subnav" style="margin:16px 0 18px">' + tabs.map((t) => '<a href="#admin" data-edtab="' + t[0] + '"' + (E.tab === t[0] ? ' aria-current="page"' : "") + ">" + t[1] + "</a>").join("") + "</nav>" + edTab() +
        (E.err ? '<p class="err" role="alert">' + esc(E.err) + "</p>" : "") + (E.msg ? '<p class="notice" role="status">' + esc(E.msg) + "</p>" : "") +
        '<div class="row" style="margin-top:14px"><button class="btn" data-act="edsave"' + (E.busy ? " disabled" : "") + ">" + (E.busy ? E.busy : "Check and save") + '</button><button class="btn line" data-act="edreload">Discard changes</button><span class="xs muted">Exercises are run before saving: the answer must pass and the starter must not.</span></div>';
    }
    return '<div class="card sec" id="course-editor"><h2>Course editor</h2><p class="small muted">Edit a course with forms. Changes reach members on their next visit. The raw JSON editor below is still there for bulk edits.</p>' + pick + body + "</div>";
  }
  function itemPicker(list, label, add) {
    const E = ui.ed;
    return '<div class="row" style="align-items:flex-end;margin-bottom:12px"><div class="field" style="margin:0;flex:1;min-width:200px"><label for="ed-sel">' + label + '</label><select id="ed-sel" data-edsel>' + list.map((x, i) => '<option value="' + i + '"' + (E.sel === i ? " selected" : "") + ">" + (i + 1) + ". " + esc(x.t || x.q || "Untitled") + "</option>").join("") + "</select></div>" +
      '<button class="btn line sm" data-act="edadd">' + add + "</button>" + (list.length ? '<button class="btn line sm" data-act="edup"' + (E.sel === 0 ? " disabled" : "") + '>Move up</button><button class="link small" data-act="eddel" style="color:var(--fail)">' + (E.delArm ? "Click again to remove" : "Remove") + "</button>" : "") + "</div>";
  }
  function edTab() {
    const E = ui.ed, C = E.C, L = E.L;
    if (E.tab === "details") {
      const res = (C.resources || []).map((r, i) => '<tr><td><input aria-label="Resource ' + (i + 1) + ' title" value="' + esc(r[0]) + '" data-res="' + i + ':0"></td><td><input aria-label="By" value="' + esc(r[1]) + '" data-res="' + i + ':1"></td><td><input aria-label="Cost" value="' + esc(r[2]) + '" data-res="' + i + ':2" style="width:110px"></td><td><input aria-label="Link" value="' + esc(r[3]) + '" data-res="' + i + ':3"></td><td><select aria-label="Format" data-res="' + i + ':5">' + ["video", "reading", "interactive", "book", "video+interactive", "video+reading", "reading+interactive"].map((f) => '<option' + ((r[5] || "reading") === f ? " selected" : "") + ">" + f + "</option>").join("") + '</select></td><td><button class="link xs" data-act="edresdel" data-i="' + i + '">Remove</button></td></tr>').join("");
      return '<div class="two">' + field("ed-title", "Title", C.title, { key: "C.title" }) + field("ed-hours", "Hours", C.hours, { key: "C.hours", type: "number" }) + "</div>" +
        '<div class="two">' + field("ed-lean", "Hours on the lean path", C.lean || "", { key: "C.lean", type: "number", hint: "Leave empty if it's the same. Lower it when some lessons are optional." }) +
        '<label class="toggle" style="align-self:center"><span><b>Optional extra</b><br><span class="small muted">Left out of the lean path; members can add it.</span></span><input type="checkbox" id="ed-extra" data-ed="C.extra"' + (C.extra ? " checked" : "") + "></label></div>" +
        (C.extra ? field("ed-extrawhy", "Why someone would add it", C.extraWhy, { key: "C.extraWhy", area: true, rows: 2 }) : "") +
        field("ed-why", "Why this course", C.why, { key: "C.why", area: true, rows: 3 }) + field("ed-out", "Outcomes", (C.outcomes || []).join("\n"), { key: "C.outcomes", area: true, rows: 4, hint: "One per line." }) +
        field("ed-method", "How to study it", C.method, { key: "C.method", area: true, rows: 3 }) + field("ed-build", "The build", C.build, { key: "C.build", area: true, rows: 3 }) +
        '<h3>Resources</h3><div class="tblwrap"><table class="tbl ed-res"><thead><tr><th>Title</th><th>By</th><th>Cost</th><th>Link</th><th>Format</th><th></th></tr></thead><tbody>' + res + '</tbody></table></div><button class="btn line sm" data-act="edresadd" style="margin-top:8px">Add a resource</button>';
    }
    if (E.tab === "lessons") {
      const x = L.lessons[E.sel];
      return itemPicker(L.lessons, "Lesson", "Add a lesson") + (x ? '<div class="two">' + field("ed-lt", "Title", x.t, { key: "L.t" }) + field("ed-lmin", "Minutes", x.min, { key: "L.min", type: "number" }) + "</div>" +
        '<label class="toggle"><span><b>Optional on the lean path</b><br><span class="small muted">Shown as optional; progress counts the other lessons.</span></span><input type="checkbox" data-ed="L.opt"' + ((C.opt || []).indexOf(E.sel) >= 0 ? " checked" : "") + "></label>" +
        '<div class="row between"><b class="small">Lesson text (Markdown)</b><button class="link small" data-act="edpreview">' + (E.preview ? "Edit" : "Preview") + "</button></div>" +
        (E.preview ? '<div class="card lesson-preview">' + md(x.md || "") + "</div>" : field("ed-lmd", "Lesson text", x.md, { key: "L.md", area: true, rows: 16, code: true })) +
        "<h3>Check question</h3>" + qFields("L.check", x.check || { q: "", o: ["", "", "", ""], a: 0, e: "" }) : '<p class="muted">No lessons yet.</p>');
    }
    if (E.tab === "ex") {
      const x = L.ex[E.sel];
      if (!x) return itemPicker(L.ex, "Exercise", "Add an exercise") + '<p class="muted">No exercises yet.</p>';
      const kind = x.kind === "sql" ? "sql" : x.mode === "write-tests" ? "wt" : "py";
      return itemPicker(L.ex, "Exercise", "Add an exercise") + '<div class="two">' + field("ed-xt", "Title", x.t, { key: "X.t" }) +
        '<div class="field"><label for="ed-xk">Type</label><select id="ed-xk" data-ed="X.kind"><option value="py"' + (kind === "py" ? " selected" : "") + '>Python: code checked by tests</option><option value="wt"' + (kind === "wt" ? " selected" : "") + '>Python: learner writes the tests</option><option value="sql"' + (kind === "sql" ? " selected" : "") + ">SQL query</option></select></div></div>" +
        field("ed-xmd", "Instructions (Markdown)", x.md, { key: "X.md", area: true, rows: 5 }) +
        '<div class="two">' + field("ed-xs", "Starter code", x.start, { key: "X.start", area: true, rows: 9, code: true }) + field("ed-xsol", "Answer", x.sol, { key: "X.sol", area: true, rows: 9, code: true }) + "</div>" +
        (kind === "py" ? field("ed-xtests", "Tests", JSON.stringify(x.tests || [], null, 1), { key: "X.tests", area: true, rows: 8, code: true, hint: 'A JSON list of ["name", "python code with assert"].' }) : "") +
        (kind === "sql" ? field("ed-xsetup", "Tables and data (SQL)", x.setup, { key: "X.setup", area: true, rows: 5, code: true }) + '<label class="radio-row"><input type="checkbox" data-ed="X.ordered"' + (x.ordered ? " checked" : "") + "> Row order matters</label>" : "") +
        (kind === "wt" ? field("ed-ximpls", "Implementations to test against", JSON.stringify(x.impls || { good: "", bad: [] }, null, 1), { key: "X.impls", area: true, rows: 8, code: true, hint: 'JSON: {"good": "correct code", "bad": ["broken version", ...]}.' }) : "") +
        field("ed-xh", "Hints", (x.hints || []).join("\n"), { key: "X.hints", area: true, rows: 3, hint: "One per line, gentlest first." });
    }
    const x = L.pool[E.sel];
    return itemPicker(L.pool, "Question", "Add a question") + (x ? qFields("P", x) : '<p class="muted">No questions yet.</p>');
  }
  function qFields(key, q) {
    const o = (q.o || []).concat(["", "", "", ""]).slice(0, Math.max(4, (q.o || []).length));
    return field("ed-q", "Question", q.q, { key: key + ".q", area: true, rows: 2 }) +
      '<fieldset><legend class="small"><b>Options</b> (tick the right one)</legend>' + o.map((t, i) => '<div class="row" style="flex-wrap:nowrap;margin-bottom:6px"><input type="radio" name="ed-ans" aria-label="Option ' + (i + 1) + ' is right" data-ed="' + key + '.a" value="' + i + '"' + (q.a === i ? " checked" : "") + '><input aria-label="Option ' + (i + 1) + '" value="' + esc(t) + '" data-ed="' + key + ".o." + i + '" style="flex:1"></div>').join("") + "</fieldset>" +
      field("ed-qe", "Why it's right", q.e, { key: key + ".e", area: true, rows: 2 });
  }
  // Writes a form field straight into the draft.
  function edSet(key, el) {
    const E = ui.ed, val = el.type === "checkbox" ? el.checked : el.value;
    const [root, ...path] = key.split(".");
    let obj = root === "C" ? E.C : root === "L" ? E.L.lessons[E.sel] : root === "X" ? E.L.ex[E.sel] : E.L.pool[E.sel];
    if (!obj) return;
    if (root === "L" && path[0] === "opt") { const o = (E.C.opt || []).filter((i) => i !== E.sel); if (val) o.push(E.sel); E.C.opt = o.sort((a, b) => a - b); if (!E.C.opt.length) delete E.C.opt; return; }
    if (root === "C" && path[0] === "lean") { const n = Number(val); if (n > 0) E.C.lean = n; else delete E.C.lean; return; }
    if (root === "C" && path[0] === "extra") { if (val) E.C.extra = true; else { delete E.C.extra; delete E.C.extraWhy; } render(); return; }
    if (root === "L" && path[0] === "check") { obj.check = obj.check || { q: "", o: ["", "", "", ""], a: 0, e: "" }; obj = obj.check; path.shift(); }
    const k = path[0];
    if (k === "o") { obj.o = (obj.o || ["", "", "", ""]).slice(); obj.o[Number(path[1])] = val; return; }
    if (k === "a") { obj.a = Number(val); return; }
    if (k === "hours" || k === "min") { obj[k] = Number(val) || 0; return; }
    if (k === "outcomes" || k === "hints") { obj[k] = lines(val); return; }
    if (k === "tests" || k === "impls") { obj["_" + k] = val; return; }
    if (root === "X" && k === "kind") { if (val === "sql") { obj.kind = "sql"; delete obj.mode; obj.setup = obj.setup || ""; } else if (val === "wt") { obj.kind = "py"; obj.mode = "write-tests"; obj.impls = obj.impls || { good: "", bad: [] }; obj.tests = []; } else { obj.kind = "py"; delete obj.mode; obj.tests = obj.tests || []; } render(); return; }
    obj[k] = val;
  }
  function edValidate() {
    const E = ui.ed, C = E.C, L = E.L, errs = [];
    if (!String(C.title || "").trim()) errs.push("The course needs a title.");
    (C.resources || []).forEach((r, i) => { if (r[3] && !/^https?:\/\//.test(r[3])) errs.push("Resource " + (i + 1) + ": the link must start with https://"); });
    L.lessons.forEach((x, i) => { if (!String(x.t || "").trim()) errs.push("Lesson " + (i + 1) + " needs a title."); if (x.check && x.check.q && (x.check.o || []).filter((o) => String(o).trim()).length < 2) errs.push("Lesson " + (i + 1) + ": the check question needs at least two options."); });
    L.ex.forEach((x, i) => {
      if (x._tests !== undefined) { try { const t = JSON.parse(x._tests); if (!Array.isArray(t) || !t.every((r) => Array.isArray(r) && r.length === 2)) throw 0; x.tests = t; delete x._tests; } catch (e) { errs.push("Exercise " + (i + 1) + ": the tests aren't valid JSON pairs."); } }
      if (x._impls !== undefined) { try { const t = JSON.parse(x._impls); if (!t || typeof t.good !== "string" || !Array.isArray(t.bad)) throw 0; x.impls = t; delete x._impls; } catch (e) { errs.push("Exercise " + (i + 1) + ": the implementations aren't valid JSON."); } }
      if (!String(x.sol || "").trim()) errs.push("Exercise " + (i + 1) + " needs an answer.");
    });
    L.pool.forEach((q, i) => { const n = (q.o || []).filter((o) => String(o).trim()).length; if (!String(q.q || "").trim() || n < 2) errs.push("Quiz question " + (i + 1) + " needs a question and at least two options."); if (!String((q.o || [])[q.a] || "").trim()) errs.push("Quiz question " + (i + 1) + ": the ticked answer is empty."); });
    return errs;
  }
  async function edCheckExercises() {
    const E = ui.ed, orig = LX[E.id] ? LX[E.id].ex : [], probs = [];
    const changed = E.L.ex.filter((x) => { const o = orig.find((y) => y.id === x.id); return !o || JSON.stringify(o) !== JSON.stringify(x); });
    for (let i = 0; i < changed.length; i++) {
      const x = changed[i]; E.busy = "Checking exercise " + (i + 1) + " of " + changed.length + "…"; render();
      const pass = (r) => !r.error && r.tests.length && r.tests.every((t) => t[1]);
      const sol = await window.AILRunner.run(x, x.sol);
      if (!pass(sol)) { probs.push('"' + x.t + '": the answer doesn\'t pass its own tests' + (sol.error ? " (" + sol.error + ")" : "")); continue; }
      const st = await window.AILRunner.run(x, x.start || "");
      if (pass(st)) probs.push('"' + x.t + '": the starter already passes, so there\'s nothing to do');
    }
    return probs;
  }
  async function edSave() {
    const E = ui.ed;
    E.err = ""; E.msg = "";
    const errs = edValidate();
    if (errs.length) { E.err = errs.slice(0, 4).join(" "); render(); return; }
    let probs = [];
    try { probs = await edCheckExercises(); } catch (x) { probs = ["The exercise checker couldn't start: " + ((x && x.message) || "try again")]; }
    if (probs.length) { E.busy = false; E.err = "Not saved. " + probs.join(". ") + "."; render(); return; }
    E.busy = "Saving…"; render();
    try {
      E.L.pool.forEach((q) => { q.o = (q.o || []).filter((o, i) => String(o).trim() || i === q.a); });
      await db.doc("content/" + E.id).set(clone(E.C)); await db.doc("lessons/" + E.id).set(clone(E.L));
      LX[E.id] = clone(E.L); const i = MOD.findIndex((m) => m.id === E.id);
      if (i >= 0) { MOD[i] = Object.assign({}, MOD[i], E.C, { resources: (E.C.resources || []).map((r) => ({ t: r[0], by: r[1], cost: r[2], url: r[3], note: r[4] || "" })) }); byId[E.id] = MOD[i]; }
      E.msg = "Saved. Members see it on their next visit.";
    } catch (x) { E.err = "Couldn't save: " + ((x && x.message) || "try again"); }
    E.busy = false; render();
  }

  document.addEventListener("click", (e) => {
    if (!isOwner || phase !== "ready") return;
    const t = e.target.closest("[data-edtab]"); if (t) { e.preventDefault(); ui.ed.tab = t.dataset.edtab; ui.ed.sel = 0; ui.ed.preview = false; ui.ed.delArm = false; render(); return; }
    const b = e.target.closest("[data-act]"); if (!b) return;
    const E = ui.ed, a = b.dataset.act, listKey = E.tab === "lessons" ? "lessons" : E.tab === "ex" ? "ex" : "pool";
    if (a === "edsave") { edSave(); return; }
    if (a === "edreload") { edLoad(E.id); return; }
    if (a === "edpreview") { E.preview = !E.preview; render(); return; }
    if (a === "edresadd") { E.C.resources = (E.C.resources || []).concat([["", "", "Free", "", "", "reading"]]); render(); return; }
    if (a === "edresdel") { E.C.resources.splice(Number(b.dataset.i), 1); render(); return; }
    if (a === "edadd") {
      const L = E.L[listKey];
      if (listKey === "lessons") L.push({ t: "New lesson", min: 15, md: "", check: { q: "", o: ["", "", "", ""], a: 0, e: "" } });
      else if (listKey === "ex") L.push({ id: "e" + Date.now().toString(36), t: "New exercise", kind: "py", md: "", start: "def solve():\n    pass\n", sol: "def solve():\n    return 1\n", tests: [["returns 1", "assert solve() == 1"]], hints: [] });
      else L.push({ q: "", o: ["", "", "", ""], a: 0, e: "" });
      E.sel = L.length - 1; render(); return;
    }
    if (a === "edup") { const L = E.L[listKey], i = E.sel; if (i > 0) { [L[i - 1], L[i]] = [L[i], L[i - 1]]; E.sel = i - 1; render(); } return; }
    if (a === "eddel") { if (!E.delArm) { E.delArm = true; render(); setTimeout(() => { E.delArm = false; }, 4000); return; } E.L[listKey].splice(E.sel, 1); E.sel = Math.max(0, E.sel - 1); E.delArm = false; render(); return; }
  });
  document.addEventListener("input", (e) => {
    const el = e.target; if (!isOwner || !el.dataset) return;
    if (el.dataset.ed) edSet(el.dataset.ed, el);
    else if (el.dataset.res) { const [i, j] = el.dataset.res.split(":").map(Number); ui.ed.C.resources[i][j] = el.value; }
  });
  document.addEventListener("change", (e) => {
    const el = e.target; if (!isOwner || !el.dataset) return;
    if (el.dataset.edcourse !== undefined) { if (el.value) edLoad(el.value); return; }
    if (el.dataset.edsel !== undefined) { ui.ed.sel = Number(el.value); ui.ed.preview = false; render(); return; }
    if (el.dataset.res) { const [i, j] = el.dataset.res.split(":").map(Number); ui.ed.C.resources[i][j] = el.value; return; }
    if (el.dataset.ed && (el.type === "radio" || el.type === "checkbox" || el.tagName === "SELECT")) edSet(el.dataset.ed, el);
  });
