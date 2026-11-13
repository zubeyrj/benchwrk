
  /* ---------- The library: "AI Engineering from Scratch" (Rohit Ghumare, MIT), served as static files ----------
     542 lessons with quizzes, 51 coding problems with their own checks, an interview bank of 482 questions,
     career routes, project challenges and a glossary. benchwrk adds progress, XP, the tutor and links into
     its own courses. */
  const LIBP = { lesson: 10, quiz: 20, easy: 30, medium: 45, hard: 60 };
  const L$ = { index: null, idxP: null, lessons: {}, probs: {}, banks: {}, gloss: undefined, harness: null, failed: false };
  const libUrl = (p) => "library/" + p;
  async function libJson(p) { const r = await fetch(libUrl(p)); if (!r.ok) throw new Error("library " + r.status); return r.json(); }
  function libIndex() {
    if (L$.index) return Promise.resolve(L$.index);
    if (!L$.idxP) L$.idxP = libJson("index.json").then((d) => { L$.index = d; return d; }, (e) => { L$.idxP = null; L$.failed = true; throw e; });
    return L$.idxP;
  }
  // Fetch-then-render: returns null while loading and re-renders when the data lands.
  function need(slot, key, path) {
    if (L$[slot][key]) return L$[slot][key];
    if (L$[slot][key] === undefined) { L$[slot][key] = null; libJson(path).then((d) => { L$[slot][key] = d; render(); }, () => { L$[slot][key] = false; render(); }); }
    return L$[slot][key];
  }
  const idx = () => { if (!L$.index && !L$.failed) libIndex().then(render, render); return L$.index; };
  const libState = () => { S.lib = S.lib || { done: {}, quiz: {}, prob: {}, route: "" }; ["done", "quiz", "prob"].forEach((k) => { S.lib[k] = S.lib[k] || {}; }); return S.lib; };
  const lessonMeta = (id) => { const I = L$.index; if (!I) return null; for (const p of I.phases) { const l = p.lessons.find((x) => x.id === id); if (l) return Object.assign({ phase: p }, l); } return null; };
  const libLoading = (what) => (L$.failed ? '<div class="empty"><h3>The library didn\'t load</h3><p class="muted">Check your connection and reload.</p></div>' : loading(220));
  function libPoints() {
    const L = libState(); let p = Object.keys(L.done).length * LIBP.lesson + Object.values(L.quiz).filter((v) => v >= 80).length * LIBP.quiz;
    Object.values(L.prob).forEach((x) => { if (x && x.ok) p += x.sol ? 10 : (LIBP[x.d] || LIBP.easy); });
    return p;
  }

  /* ----- markdown with tables, maths and diagrams (marked, DOMPurify, KaTeX and Mermaid load on first use) ----- */
  let mdLibs = null;
  const addScript = (src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  function loadMdLibs() {
    if (!mdLibs) mdLibs = Promise.all([addScript("https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"), addScript("https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js")]).then(() => { render(); }, () => { mdLibs = "failed"; });
    return mdLibs;
  }
  function richMd(src, ctx) {
    const blocks = [];
    let text = String(src || "").replace(/^```(math|mermaid|figure)\s*\n([\s\S]*?)^```\s*$/gm, (all, kind, body) => {
      blocks.push({ kind, body: body.replace(/\s+$/, "") }); return "\n\n@@BLOCK" + (blocks.length - 1) + "@@\n\n";
    });
    let html;
    if (window.marked && window.DOMPurify) html = window.DOMPurify.sanitize(window.marked.parse(text, { gfm: true, breaks: false }), { ADD_ATTR: ["target"] });
    else { loadMdLibs(); html = md(text); }
    return html.replace(/(?:<p>)?@@BLOCK(\d+)@@(?:<\/p>)?/g, (all, i) => {
      const b = blocks[Number(i)];
      if (b.kind === "math") return '<div class="math-block" data-tex="' + esc(b.body) + '"><code>' + esc(b.body) + "</code></div>";
      if (b.kind === "mermaid") return '<div class="mermaid-block" data-src="' + esc(b.body) + '"><pre><code>' + esc(b.body) + "</code></pre></div>";
      return '<div class="lib-figure"><b>Interactive figure: ' + esc(b.body.replace(/-/g, " ")) + '</b><span class="small muted">This lesson has an interactive diagram on the original site.</span>' + (ctx && ctx.site ? '<a class="btn line sm" href="' + esc(ctx.site) + '" target="_blank" rel="noopener">Open it</a>' : "") + "</div>";
    });
  }
  let katexP = null, mermaidP = null;
  function hydrateLib() {
    const maths = document.querySelectorAll(".math-block:not(.done)"), mers = document.querySelectorAll(".mermaid-block:not(.done)");
    document.querySelectorAll(".lib-prose a[href^='http']").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
    if (maths.length) {
      if (!katexP) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css"; document.head.appendChild(l); katexP = addScript("https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js").catch(() => null); }
      katexP.then(() => { if (!window.katex) return; maths.forEach((el) => { try { window.katex.render(el.dataset.tex, el, { displayMode: true, throwOnError: false }); el.classList.add("done"); } catch (e) { /* leave the source showing */ } }); });
    }
    if (mers.length) {
      if (!mermaidP) mermaidP = addScript("https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js").then(() => { const dark = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches); window.mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "neutral", securityLevel: "strict" }); }).catch(() => null);
      mermaidP.then(async () => { if (!window.mermaid) return; for (const el of mers) { try { const { svg } = await window.mermaid.render("mmd" + Math.random().toString(36).slice(2), el.dataset.src); el.innerHTML = svg; el.classList.add("done"); } catch (e) { el.classList.add("done"); } } });
    }
  }
  const origAfter = afterRender;
  afterRender = function () { origAfter(); hydrateLib(); };

  /* ----- views ----- */
  function vLibrary(r) {
    const I = idx(); if (!I) return libLoading();
    if (r.sub === "phase") return vLibPhase(I, r.key);
    if (r.sub === "lesson") return vLibLesson(I, r.key);
    return vLibHome(I);
  }
  function credit(I) { return '<p class="xs muted lib-credit">Library content: <a href="' + esc(I.source.repo) + '" target="_blank" rel="noopener">AI Engineering from Scratch</a> by ' + esc(I.source.author) + ', <a href="' + libUrl("LICENSE") + '" target="_blank" rel="noopener">MIT licence</a>. Version ' + esc(I.source.sha.slice(0, 7)) + ", imported " + esc(I.source.imported) + ".</p>"; }
  function phaseProgress(p) { const D = libState().done; return p.lessons.filter((l) => D[l.id]).length; }
  function vLibHome(I) {
    const q = (ui.libQ || "").trim().toLowerCase();
    const hits = q.length > 1 ? I.phases.flatMap((p) => p.lessons.filter((l) => (l.t + " " + l.motto).toLowerCase().includes(q)).map((l) => Object.assign({ phase: p }, l))).slice(0, 30) : null;
    const picks = libPicks(I);
    const D = libState().done, total = I.phases.reduce((a, p) => a + p.count, 0), doneN = Object.keys(D).length;
    return '<h1>Library</h1><p class="lede">' + plural(total, "deeper lesson") + " across " + plural(I.phases.length, "phase") + ", from maths to agents in production. Use it to go further on anything your course touches, or work through a whole phase. " + (doneN ? plural(doneN, "lesson") + " read so far." : "") + "</p>" +
      '<form id="libsearch" class="row" role="search" style="margin:18px 0 8px"><label class="sr" for="lib-q">Search the library</label><input id="lib-q" type="search" placeholder="Search lessons: RAG, attention, evals…" value="' + esc(ui.libQ || "") + '" style="flex:1;min-width:220px"><button class="btn line" type="submit">Search</button></form>' +
      (hits ? '<div class="card sec"><h2>' + plural(hits.length, "result") + ' for "' + esc(q) + '"</h2>' + (hits.length ? '<ul class="rl">' + hits.map(libRow).join("") + "</ul>" : '<p class="muted">Nothing matched. Try a shorter word.</p>') + "</div>" : "") +
      (picks.length && !hits ? '<div class="card sec"><h2>Picked for your current course</h2><ul class="rl">' + picks.map(libRow).join("") + "</ul></div>" : "") +
      '<div class="sec"><div class="row between"><h2 style="margin:0">Phases</h2><span class="xs muted"><a href="#problems">' + plural(I.problems.length, "coding problem") + '</a> · <a href="#glossary">Glossary</a></span></div><div class="grid3 lib-phases" style="margin-top:14px">' +
      I.phases.map((p) => { const d = phaseProgress(p); return '<a class="card node tile" href="#lib-' + p.n + '"><span class="xs muted">Phase ' + Number(p.n) + '</span><h3>' + esc(p.title) + '</h3><p class="small muted" style="margin:0 0 12px">' + esc(p.motto || "") + '</p><div class="row between xs muted"><span>' + plural(p.count, "lesson") + " · about " + Math.round(p.mins / 60) + " h</span><span>" + (d ? d + " read" : "") + '</span></div><span class="bar" style="margin-top:6px"><i style="--f:' + (d / p.count).toFixed(3) + '"></i></span></a>'; }).join("") + "</div></div>" + credit(I);
  }
  function libRow(l) {
    const D = libState().done;
    return '<li><span class="num' + (D[l.id] ? " ok" : "") + '">' + (D[l.id] ? SVG.check : Number(l.id.slice(-2))) + '</span><span class="grow"><a class="ttl" href="#' + l.id + '">' + esc(l.t) + '</a><div class="xs muted">' + (l.phase ? "Phase " + Number(l.phase.n) + ": " + esc(l.phase.title) + " · " : "") + (l.type ? esc(l.type) + " · " : "") + l.min + " min" + (l.q ? " · quiz" : "") + "</div></span></li>";
  }
  // Library lessons that go deeper on each benchwrk course.
  const COURSE_LIB = {
    m13: ["lib-00-01", "lib-00-10", "lib-00-13"], m0: ["lib-00-01", "lib-00-02", "lib-00-06", "lib-00-08", "lib-00-10"], m1: ["lib-00-13", "lib-00-05", "lib-00-12"],
    m2: ["lib-00-02", "lib-00-12", "lib-00-11"], m3: ["lib-00-04", "lib-11-03", "lib-11-09"], m4: ["lib-00-09", "lib-11-04", "lib-01-14"], m5: ["lib-00-07", "lib-00-03", "lib-17-01"],
    m14: ["lib-02-01", "lib-02-02", "lib-02-03", "lib-02-09", "lib-02-10", "lib-01-08", "lib-03-03"], m6: ["lib-10-01", "lib-07-02", "lib-07-07", "lib-11-01", "lib-11-02", "lib-11-05"],
    m7: ["lib-11-04", "lib-11-06", "lib-11-07", "lib-11-03"], m8: ["lib-11-10", "lib-10-10", "lib-14-30", "lib-14-24"], m9: ["lib-14-01", "lib-11-09", "lib-13-06", "lib-13-07", "lib-14-12", "lib-14-26"],
    m10: ["lib-11-12", "lib-11-11", "lib-14-27", "lib-18-15", "lib-17-20", "lib-17-25"], m11: ["lib-17-01"],
  };
  function libPicks(I) {
    const cur = MOD.length ? activeRow(progress().p) : null;
    const ids = cur ? COURSE_LIB[cur.m.id] || [] : COURSE_LIB.m13;
    return ids.map(lessonMeta).filter(Boolean);
  }
  function courseLibCard(m) {
    const ids = COURSE_LIB[m.id]; if (!ids) return "";
    const I = idx(); if (!I) return '<div class="card"><h3>Go deeper in the library</h3>' + loading(40) + "</div>";
    const L = ids.map(lessonMeta).filter(Boolean);
    return L.length ? '<div class="card"><h3>Go deeper in the library</h3><ul class="rl">' + L.map(libRow).join("") + '</ul><p class="xs muted" style="margin:8px 0 0">From <a href="#library">AI Engineering from Scratch</a> (MIT).</p></div>' : "";
  }
  function vLibPhase(I, n) {
    const p = I.phases.find((x) => x.n === n); if (!p) return vLibHome(I);
    const d = phaseProgress(p);
    return '<p class="crumb"><a href="#library">Library</a> / Phase ' + Number(n) + '</p><h1>' + esc(p.title) + '</h1><p class="lede">' + esc(p.motto || "") + " " + plural(p.count, "lesson") + ", about " + Math.round(p.mins / 60) + " hours. " + (d ? d + " read." : "") + "</p>" +
      '<div class="card sec"><ul class="rl">' + p.lessons.map((l) => libRow(l)).join("") + "</ul></div>" + credit(I);
  }
  function vLibLesson(I, id) {
    const m = lessonMeta(id); if (!m) return vLibHome(I);
    const L = need("lessons", id, "lessons/" + id + ".json");
    if (L === false) return '<div class="empty"><h3>That lesson didn\'t load</h3><p><a href="#lib-' + m.phase.n + '">Back to the phase</a></p></div>';
    if (!L) return '<p class="crumb"><a href="#library">Library</a> / <a href="#lib-' + m.phase.n + '">' + esc(m.phase.title) + "</a></p>" + loading(300);
    const LS = libState(), done = LS.done[id], ls = m.phase.lessons, i = ls.findIndex((x) => x.id === id), prev = ls[i - 1], next = ls[i + 1];
    const pre = L.quiz.filter((q) => q.st === "pre"), post = L.quiz.filter((q) => q.st !== "pre");
    const quizSec = L.quiz.length ? libQuiz(id, post.length ? post : L.quiz) : "";
    return '<p class="crumb"><a href="#library">Library</a> / <a href="#lib-' + m.phase.n + '">Phase ' + Number(m.phase.n) + ": " + esc(m.phase.title) + "</a> / Lesson " + (i + 1) + " of " + ls.length + "</p>" +
      '<div class="cols"><article><div class="card pad-lg"><h1>' + esc(L.t) + "</h1>" + (L.motto ? '<p class="lib-motto">' + esc(L.motto) + "</p>" : "") +
      '<p class="meta"><span>' + L.min + " min</span>" + (L.type ? "<span>" + esc(L.type) + "</span>" : "") + (L.langs ? "<span>" + esc(L.langs) + "</span>" : "") + "<span>+" + LIBP.lesson + " XP</span></p>" +
      (L.prereq ? '<p class="small muted" style="margin:6px 0 0"><b>Before this:</b> ' + esc(L.prereq) + "</p>" : "") +
      (pre.length ? '<details class="lib-pre"><summary>Warm up: ' + plural(pre.length, "question") + ' before you read</summary><div style="margin-top:10px">' + pre.map((q, k) => mcq(q, "lp-" + id + "-" + k, { attr: 'data-lq="' + id + ":p" + k + '"', done: ui.quiz["lp-" + id + "-" + k] != null, chosen: ui.quiz["lp-" + id + "-" + k] })).join("") + "</div></details>" : "") +
      '<div class="prose lib-prose" style="margin-top:20px">' + richMd(L.md, L) + "</div></div>" + quizSec +
      '<div class="row sec">' + (done ? '<span class="state ok">' + TICK + " Read</span>" : '<button class="btn lg" data-act="libdone" data-id="' + id + '">Mark as read</button>') + (next ? '<a class="btn line lg" href="#' + next.id + '">Next: ' + esc(next.t) + "</a>" : "") + "</div>" +
      tutorBlock(id, "Ask the tutor", "Stuck on something in this lesson? Ask in your own words.", null) + "</article>" +
      '<aside><div class="card"><h3>Code for this lesson</h3><p class="small muted">' + (L.code.length ? "The lesson's runnable code lives in the original repository: " + esc(L.code.slice(0, 4).join(", ")) + (L.code.length > 4 ? " and more" : "") + "." : "Open the lesson's folder on GitHub.") + '</p><div class="row"><a class="btn line sm" href="' + esc(L.gh) + '" target="_blank" rel="noopener">Open on GitHub</a><a class="btn line sm" href="' + esc(L.site) + '" target="_blank" rel="noopener">Original site</a></div></div>' +
      '<div class="card"><h3>In this phase</h3><ol class="toc">' + ls.map((x) => '<li><a class="' + (LS.done[x.id] ? "ok" : "") + '" href="#' + x.id + '"' + (x.id === id ? ' aria-current="page"' : "") + '><span class="n">' + Number(x.id.slice(-2)) + "</span>" + esc(x.t) + "</a></li>").join("") + "</ol></div>" +
      (prev ? '<a class="btn line wide" href="#' + prev.id + '">Previous: ' + esc(prev.t) + "</a>" : "") + "</aside></div>" + credit(I);
  }
  function libQuiz(id, qs) {
    const ans = qs.map((q, k) => ui.quiz["lq-" + id + "-" + k]), answered = ans.filter((a) => a != null).length, right = qs.filter((q, k) => ans[k] === q.a).length;
    const best = libState().quiz[id];
    return '<div class="card sec"><div class="row between"><h2 style="margin:0">Check yourself</h2><span class="xs muted">' + (best != null ? "Best " + best + "%" : "Pass at 80% for +" + LIBP.quiz + " XP") + "</span></div>" +
      qs.map((q, k) => mcq(q, "lq-" + id + "-" + k, { attr: 'data-lq="' + id + ":" + k + '"', done: ans[k] != null, chosen: ans[k] })).join("") +
      (answered === qs.length ? '<p class="notice">' + right + " of " + qs.length + " right. " + (right / qs.length >= 0.8 ? "That's a pass." : "Reread the parts you missed, then try again.") + ' <button class="link" data-act="libquizreset" data-id="' + id + '" data-n="' + qs.length + '">Try again</button></p>' : "") + "</div>";
  }

  /* ----- coding problems ----- */
  function vProblems() {
    const I = idx(); if (!I) return libLoading();
    const P = libState().prob, f = ui.probF || { col: "", diff: "" };
    const list = I.problems.filter((p) => (!f.col || p.collections.indexOf(f.col) >= 0) && (!f.diff || p.difficulty === f.diff));
    const solved = I.problems.filter((p) => P[p.id] && P[p.id].ok).length;
    return '<p class="crumb"><a href="#practice">Quizzes</a> / Coding problems</p><h1>Coding problems</h1><p class="lede">Write one real piece of AI code at a time: a loss, an attention step, a retrieval score. Each problem runs in your browser with NumPy and tells you which check failed and why. ' + solved + " of " + I.problems.length + " solved.</p>" +
      '<div class="row" style="margin:16px 0"><label class="sr" for="pf-col">Collection</label><select id="pf-col" data-probf="col"><option value="">All collections</option>' + I.collections.map((c) => '<option value="' + c.id + '"' + (f.col === c.id ? " selected" : "") + ">" + esc(c.title) + "</option>").join("") + '</select><label class="sr" for="pf-diff">Difficulty</label><select id="pf-diff" data-probf="diff"><option value="">Any difficulty</option>' + ["easy", "medium", "hard"].map((d) => '<option value="' + d + '"' + (f.diff === d ? " selected" : "") + ">" + d[0].toUpperCase() + d.slice(1) + "</option>").join("") + "</select></div>" +
      '<div class="card"><ul class="rl">' + list.map((p) => { const s = P[p.id] || {}; return '<li><span class="num' + (s.ok ? " ok" : "") + '">' + (s.ok ? SVG.check : "·") + '</span><span class="grow"><a class="ttl" href="#prob-' + p.id + '">' + esc(p.title) + '</a><div class="xs muted">' + esc(p.summary) + '</div></span><span class="tag ' + (p.difficulty === "easy" ? "done" : p.difficulty === "hard" ? "skip" : "behind") + '">' + esc(p.difficulty) + '</span><span class="state">' + p.minutes + " min</span></li>"; }).join("") + "</ul></div>" + credit(I);
  }
  function vProblem(r) {
    const I = idx(); if (!I) return libLoading();
    const meta = I.problems.find((p) => p.id === r.key); if (!meta) return vProblems();
    const P = need("probs", meta.id, "practice/" + meta.id + ".json");
    if (!P) return P === false ? '<div class="empty"><h3>That problem didn\'t load</h3></div>' : loading(300);
    const st = libState().prob[meta.id] || {}, res = ui.probRes && ui.probRes[meta.id], code = (ui.probCode && ui.probCode[meta.id]) || st.code || P.starter;
    const shown = st.hints || 0, lesson = P.lesson ? lessonMeta(P.lesson) : null;
    let out = "";
    if (res && res.running) out = '<div class="console"><p class="muted">Running the checks… the first run loads Python and NumPy, which takes a few seconds.</p></div>';
    else if (res && res.error) out = '<div class="console results"><p class="verdict fail">The checks didn\'t run</p><pre>' + esc(res.error) + "</pre></div>";
    else if (res) {
      const groups = {}; res.results.forEach((x) => { (groups[x.layer] = groups[x.layer] || []).push(x); });
      out = '<div class="console results" role="status"><div class="head"><p class="verdict ' + (res.summary.ok ? "pass" : "fail") + '">' + (res.summary.ok ? "All " + res.summary.total + " checks pass" : res.summary.passed + " of " + res.summary.total + " checks pass") + "</p></div>" +
        (res.load_error ? "<pre>" + esc(res.load_error) + "</pre>" : "") +
        Object.entries(groups).map(([layer, xs]) => "<h3>" + esc({ examples: "Examples", properties: "Properties", edge: "Edge cases", reference: "Reference" }[layer] || layer) + "</h3><ul>" + xs.map((x) => '<li class="' + (x.status === "pass" ? "pass" : "fail") + '">' + (x.status === "pass" ? TICK : CROSS) + "<span><b>" + esc(x.name) + "</b>" + (x.status !== "pass" ? '<span class="why">' + esc(x.message) + (x.expected ? "<br>Expected: <code>" + esc(x.expected) + "</code>" : "") + (x.actual ? "<br>Got: <code>" + esc(x.actual) + "</code>" : "") + "</span>" : "") + "</span></li>").join("") + "</ul>").join("") +
        (res.stdout ? '<h3>Output</h3><pre class="out">' + esc(res.stdout) + "</pre>" : "") + "</div>";
    }
    return '<p class="crumb"><a href="#practice">Quizzes</a> / <a href="#problems">Coding problems</a></p>' +
      '<div class="ex"><div class="card pad-lg"><div class="row between"><h1 style="margin:0">' + esc(P.title) + '</h1><span class="tag">' + esc(P.difficulty) + "</span></div>" + '<p class="meta"><span>' + P.minutes + " min</span><span>+" + (LIBP[P.difficulty] || LIBP.easy) + " XP</span><span>Python, NumPy</span></p>" +
      '<div class="prose lib-prose">' + richMd(P.problem) + "</div>" +
      (lesson ? '<div class="learn-first"><b>Learn this first</b><p class="small" style="margin:4px 0 0"><a href="#' + lesson.id + '">' + esc(lesson.t) + "</a>" + (lesson.phase ? ' <span class="muted">(library, phase ' + Number(lesson.phase.n) + ", " + (lesson.min || "") + " min)</span>" : "") + ". Read it, then come back: your code stays in the editor.</p></div>" : "") +
      (P.hints.length ? '<div class="sec tight"><h3>Hints</h3>' + P.hints.slice(0, shown).map((h, k) => '<div class="hint"><b>Hint ' + (k + 1) + "</b>" + richMd(h) + "</div>").join("") + (shown < P.hints.length ? '<button class="btn line sm" data-act="probhint" data-id="' + P.id + '">Show hint ' + (shown + 1) + " of " + P.hints.length + "</button>" : "") + "</div>" : "") +
      (st.ok ? '<div class="sec tight"><h3>What to know now</h3><div class="prose small">' + richMd(P.notes) + '</div><details><summary>Reference solution</summary><pre><code>' + esc(P.solution) + "</code></pre></details></div>" : "") + "</div>" +
      '<div><div class="editor"><div class="bar-top"><span>solution.py</span><span>' + esc(P.entry.join(", ")) + '</span></div><textarea id="prob-code" spellcheck="false" aria-label="Your code" data-prob="' + P.id + '">' + esc(code) + "</textarea></div>" +
      '<div class="row" style="margin-top:12px"><button class="btn" data-act="probrun" data-id="' + P.id + '"' + (res && res.running ? " disabled" : "") + '>Run the checks</button><button class="btn line" data-act="probreset" data-id="' + P.id + '">Reset to the starter</button>' + (st.ok ? '<span class="state ok">' + TICK + " Solved</span>" : "") + "</div>" + out +
      tutorBlock("prob-" + P.id, "Ask the tutor", "Stuck? The tutor sees the problem, your code and the failing checks, and won't hand you the answer.", null) + "</div></div>" + credit(I);
  }

  /* ----- glossary ----- */
  function vGlossary() {
    const I = idx(), G = L$.gloss || (L$.gloss === undefined ? (L$.gloss = null, libJson("glossary.json").then((d) => { L$.gloss = d; render(); }, () => { L$.gloss = false; render(); }), null) : L$.gloss);
    if (!I || !G) return libLoading();
    const q = (ui.glossQ || "").trim().toLowerCase();
    const terms = G.terms.filter((t) => !q || (t.term + " " + (t.what_it_actually_means || "")).toLowerCase().includes(q));
    return '<p class="crumb"><a href="#library">Library</a> / Glossary</p><h1>Glossary</h1><p class="lede">' + G.terms.length + ' terms in plain words, each with what it means in practice and what people mix it up with.</p>' +
      '<form id="glosssearch" class="row" role="search" style="margin:16px 0"><label class="sr" for="gl-q">Search the glossary</label><input id="gl-q" type="search" placeholder="Search: KV cache, LoRA, recall…" value="' + esc(ui.glossQ || "") + '" style="flex:1;min-width:220px"><button class="btn line" type="submit">Search</button></form>' +
      '<div class="gloss">' + terms.slice(0, 120).map((t) => '<details class="card gl"><summary><b>' + esc(t.term) + "</b>" + (t.category ? '<span class="xs muted">' + esc(t.category) + "</span>" : "") + '</summary><div class="small">' +
        "<p>" + inlineLib(t.what_it_actually_means) + "</p>" + (t.why_it_matters ? "<p><b>Why it matters:</b> " + inlineLib(t.why_it_matters) + "</p>" : "") + (t.in_practice ? "<p><b>In practice:</b> " + inlineLib(t.in_practice) + "</p>" : "") + (t.common_confusion ? "<p><b>Common confusion:</b> " + inlineLib(t.common_confusion) + "</p>" : "") + (t.learn_it ? "<p><b>Learn it:</b> " + inlineLib(t.learn_it) + "</p>" : "") + "</div></details>").join("") + "</div>" +
      (terms.length > 120 ? '<p class="small muted">Showing 120 of ' + terms.length + ". Search to narrow it down.</p>" : "") +
      '<div class="card sec"><h2>Cheat sheets</h2><p class="small muted">One-page references for ' + I.cheats.length + ' topics, on GitHub.</p><div class="chips">' + I.cheats.map((c) => '<a class="chip-link" href="' + esc(c.gh) + '" target="_blank" rel="noopener">' + esc(c.title) + "</a>").join("") + "</div></div>" + credit(I);
  }
  const inlineLib = (s) => (window.marked && window.DOMPurify ? window.DOMPurify.sanitize(window.marked.parseInline(String(s || ""))) : esc(s));

  /* ----- specialisms (career routes) ----- */
  function vRoutes(r) {
    const I = idx(); if (!I) return libLoading();
    const mine = libState().route;
    if (r.sub === "route") {
      const R = I.routes.find((x) => x.id === r.key); if (!R) return vRoutes({});
      const D = libState().done, proj = R.projects.map((id) => I.projects.find((p) => p.id === id)).filter(Boolean);
      return '<p class="crumb"><a href="#routes">Specialisms</a> / ' + esc(R.title) + '</p><div class="row between" style="align-items:flex-end"><div><h1 style="margin-bottom:4px">' + esc(R.title) + '</h1><p class="muted" style="margin:0">Job titles: ' + esc(R.titles.join(", ")) + "</p></div>" +
        (mine === R.id ? '<button class="btn line" data-act="routeset" data-id="">Stop following</button>' : '<button class="btn" data-act="routeset" data-id="' + R.id + '">Follow this specialism</button>') + "</div>" +
        '<p class="lede" style="margin-top:14px">' + esc(R.mission || R.summary) + "</p>" +
        '<div class="cols"><div>' + R.stages.map((s, k) => { const ls = s.lessons.map(lessonMeta).filter(Boolean), d = ls.filter((l) => D[l.id]).length; return '<div class="card sec"><div class="row between"><h2 style="margin:0">Stage ' + (k + 1) + ": " + esc(s.title) + '</h2><span class="xs muted">' + d + " of " + ls.length + ' read</span></div><p class="small muted">' + esc(s.outcome) + '</p><ul class="rl">' + ls.map(libRow).join("") + "</ul>" + (s.artifact ? '<p class="small"><b>You\'ll have:</b> ' + esc(s.artifact) + "</p>" : "") + "</div>"; }).join("") + "</div>" +
        '<aside><div class="card"><h3>A good fit if</h3>' + list(R.goodFitIf) + '</div><div class="card"><h3>Ready when you can</h3>' + list(R.readiness) + "</div>" + (R.proof ? '<div class="card"><h3>Portfolio proof: ' + esc(R.proof.title) + '</h3><p class="small">' + esc(R.proof.description) + "</p>" + list(R.proof.evidence) + "</div>" : "") +
        (proj.length ? '<div class="card"><h3>Projects for this route</h3><ul class="rl">' + proj.map((p) => '<li><span class="grow"><a class="ttl" href="' + esc(p.gh) + '" target="_blank" rel="noopener">' + esc(p.title) + '</a><div class="xs muted">' + esc(p.tagline) + "</div></span></li>").join("") + "</ul></div>" : "") +
        (R.claim ? '<p class="xs muted">' + esc(R.claim) + "</p>" : "") + "</aside></div>" + credit(I);
    }
    return '<h1>Specialisms</h1><p class="lede">Once the core route is done, pick the kind of AI engineer you want to be. Each specialism lists the library lessons in stages, what you\'ll be able to show and the projects that prove it.</p>' +
      '<div class="grid3 sec">' + I.routes.map((R) => '<a class="card node tile" href="#route-' + R.id + '"><h3>' + esc(R.title) + '</h3><p class="xs muted" style="margin:0 0 8px">' + esc(R.titles.slice(0, 3).join(" · ")) + '</p><p class="small muted" style="margin:0 0 10px">' + esc(R.summary) + '</p><span class="xs muted">' + plural(R.stages.length, "stage") + " · about " + Math.round(R.minutes / 60) + " h of lessons</span>" + (mine === R.id ? ' <span class="tag done">Following</span>' : "") + "</a>").join("") + "</div>" + credit(I);
  }
  function homeRouteCard() {
    const id = libState().route; if (!id) return "";
    const I = idx(); if (!I) return "";
    const R = I.routes.find((x) => x.id === id); if (!R) return "";
    const D = libState().done, next = R.stages.flatMap((s) => s.lessons).map(lessonMeta).filter(Boolean).find((l) => !D[l.id]);
    return '<div class="card"><h2>Your specialism</h2><p class="small"><b>' + esc(R.title) + "</b></p>" + (next ? '<p class="small muted">Next: <a href="#' + next.id + '">' + esc(next.t) + "</a></p>" : '<p class="small muted">Every lesson read. Build the portfolio proof next.</p>') + '<a class="btn line sm" href="#route-' + R.id + '">Open the route</a></div>';
  }
  function projectChallenges() {
    const I = idx(); if (!I) return "";
    const lv = ui.projLv || 0, P = I.projects.filter((p) => !lv || p.level === lv), shown = ui.projAll ? P : P.slice(0, 9);
    const levels = Array.from(new Set(I.projects.map((p) => p.level))).sort();
    return '<div class="sec"><div class="row between"><h2 style="margin:0">Project challenges from the library</h2><label class="sr" for="pj-lv">Level</label><select id="pj-lv" data-projlv><option value="0">All levels</option>' + levels.map((l) => '<option value="' + l + '"' + (lv === l ? " selected" : "") + ">Level " + l + " " + esc((I.projects.find((p) => p.level === l) || {}).levelName || "") + "</option>").join("") + '</select></div><p class="muted" style="max-width:66ch">' + I.projects.length + ' graded build challenges with a starter, staged tests and a reference solution. Build them in your own repo, then share the link here for review.</p><div class="grid3" style="margin-top:14px">' +
      shown.map((p) => '<a class="card node tile" href="' + esc(p.gh) + '" target="_blank" rel="noopener"><span class="xs muted">Level ' + p.level + (p.levelName ? " · " + esc(p.levelName) : "") + " · " + p.hours + " h · " + esc(p.languages.join(", ")) + '</span><h3>' + esc(p.title) + '</h3><p class="small muted" style="margin:0">' + esc(p.tagline) + "</p></a>").join("") + "</div>" +
      (P.length > 9 && !ui.projAll ? '<button class="btn line" data-act="projall" style="margin-top:12px">Show all ' + P.length + "</button>" : "") + "</div>";
  }

  /* ----- interview bank ----- */
  const cardOf = (qid) => { const I = L$.index; const c = I && I.cards.find((x) => x.id === qid); return c ? c.card : null; };
  function vIvBank(r) {
    const I = idx(); if (!I) return libLoading();
    if (r.sub === "q") return vIvQuestion(I, r.key);
    const topics = I.topics.filter((t) => t.mode === "cards"), groups = I.topics.filter((t) => t.mode === "groups");
    const count = (id) => I.cards.filter((c) => c.card === id).length;
    if (r.sub === "card") {
      const t = topics.find((x) => x.id === r.key) || { id: r.key, title: r.key };
      const qs = I.cards.filter((c) => c.card === r.key).sort((a, b) => a.level - b.level);
      const P = (S.iv.bank || {});
      return '<p class="crumb"><a href="#interview">Interview room</a> / <a href="#iv-bank">Question bank</a></p><h1>' + esc(t.title) + '</h1><p class="lede">' + esc(t.summary || "") + "</p>" +
        '<div class="card sec"><ul class="rl">' + qs.map((q) => '<li><span class="num' + (P[q.id] ? " ok" : "") + '">' + (P[q.id] ? SVG.check : q.level) + '</span><span class="grow"><a class="ttl" href="#ivq-' + q.id + '">' + esc(q.title) + '</a><div class="xs muted">' + esc(q.kind) + " · level " + q.level + " · " + q.minutes + " min</div></span></li>").join("") + "</ul></div>" + credit(I);
    }
    return '<p class="crumb"><a href="#interview">Interview room</a> / Question bank</p><h1>Question bank</h1><p class="lede">' + I.cards.length + " real AI engineering interview questions with model answers, follow-ups and the wrong answers interviewers hear. Answer one, and the interviewer marks it against the model answer.</p>" +
      groups.map((g) => { const ts = topics.filter((t) => t.group === g.id); return ts.length ? '<div class="sec"><h2>' + esc(g.title) + '</h2><p class="small muted">' + esc(g.summary || "") + '</p><div class="grid3">' + ts.map((t) => '<a class="card node tile" href="#ivb-' + t.id + '"><h3>' + esc(t.title) + '</h3><p class="small muted" style="margin:0 0 8px">' + esc(t.summary || "") + '</p><span class="xs muted">' + plural(count(t.id), "question") + "</span></a>").join("") + "</div></div>" : ""; }).join("") + credit(I);
  }
  function vIvQuestion(I, qid) {
    const card = cardOf(qid); if (!card) return vIvBank({});
    const B = need("banks", card, "interviews/" + card + ".json"); if (!B) return B === false ? '<div class="empty"><h3>That question didn\'t load</h3></div>' : loading(260);
    const q = B.questions.find((x) => x.id === qid); if (!q) return vIvBank({});
    const A = (ui.ivbAns || {})[qid] || {}, mark = A.mark, reveal = A.reveal || mark;
    return '<p class="crumb"><a href="#interview">Interview room</a> / <a href="#iv-bank">Question bank</a> / <a href="#ivb-' + card + '">' + esc(card.replace(/-/g, " ")) + "</a></p>" +
      '<div class="cols"><div><div class="card pad-lg"><p class="xs muted" style="margin:0">' + esc(q.kind) + " · level " + q.level + " · about " + q.minutes + ' min</p><h1 style="margin:6px 0 12px">' + esc(q.title) + '</h1><div class="prose lib-prose">' + richMd(q.prompt) + "</div></div>" +
      '<form id="ivbform" class="card sec" data-id="' + qid + '"><label for="ivb-ans"><b>Your answer</b></label><textarea id="ivb-ans" rows="8" maxlength="5000" placeholder="Answer as you would out loud.">' + esc(A.text || "") + '</textarea><div class="row" style="margin-top:10px"><button class="btn" type="submit"' + (A.busy ? " disabled" : "") + ">" + (A.busy ? "Marking…" : mark ? "Mark it again" : "Mark my answer") + '</button><button class="btn line" type="button" data-act="ivbreveal" data-id="' + qid + '">Show the model answer</button></div>' + (A.err ? '<p class="err">' + esc(A.err) + "</p>" : "") + "</form>" +
      (mark ? '<div class="card sec iv-priority"><div class="row between"><h2 style="margin:0">Marked</h2><span class="tag ' + (mark.verdict === "Strong" ? "done" : mark.verdict === "Weak" ? "skip" : "behind") + '">' + esc(mark.verdict || "") + "</span></div>" + scoreBars(mark.scores || {}) + '<div class="two"><div><h3>What landed</h3>' + list(mark.landed) + "</div><div><h3>What was missing</h3>" + list(mark.missing) + "</div></div>" + (mark.wrong_answer_hit ? '<p class="notice bad"><b>Watch out:</b> ' + esc(mark.wrong_answer_hit) + "</p>" : "") + (mark.follow_up ? '<p class="small"><b>The interviewer would ask next:</b> ' + esc(mark.follow_up) + "</p>" : "") + "</div>" : "") +
      (reveal ? '<div class="card sec"><h2>Model answer</h2><div class="prose lib-prose"><p><b>' + inlineLib(q.short) + "</b></p>" + richMd(q.full) + "</div>" + (q.followups ? "<h3>Follow-ups</h3><div class=\"prose small\">" + richMd(q.followups) + "</div>" : "") + (q.wrong ? "<h3>Wrong answers interviewers hear</h3><div class=\"prose small\">" + richMd(q.wrong) + "</div>" : "") + "</div>" : "") + "</div>" +
      '<aside><div class="card"><h3>Learn it</h3>' + (q.lessons.length ? '<ul class="rl">' + q.lessons.map(lessonMeta).filter(Boolean).map(libRow).join("") + "</ul>" : '<p class="small muted">No linked lesson.</p>') + '</div><div class="card"><h3>Tags</h3><p class="row" style="gap:6px">' + q.tags.map((t) => '<span class="tag">' + esc(t) + "</span>").join("") + "</p></div></aside></div>" + credit(I);
  }
  // Up to six bank questions that suit a mock interview's format and level, for the interviewer to draw on.
  const FORMAT_CARDS = { technical: ["rag", "evaluation", "prompting-structured-output", "agents", "tokenization-decoding", "cost-capacity", "transformers"], design: ["system-design", "rag", "agents", "inference-serving", "production-mlops"], behavioural: ["behavioral"], screen: ["behavioral"], loop: ["behavioral", "rag", "system-design", "evaluation"] };
  async function bankFor(setup) {
    try {
      const I = await libIndex(), want = FORMAT_CARDS[setup.format] || [], maxL = setup.band === "early" ? 2 : setup.band === "mid" ? 3 : 4;
      const pick = shuffle(I.cards.filter((c) => want.indexOf(c.card) >= 0 && c.level <= maxL && c.kind !== "take-home")).slice(0, 6);
      const out = [];
      for (const c of pick) { let B = L$.banks[c.card]; if (!B) { B = await libJson("interviews/" + c.card + ".json"); L$.banks[c.card] = B; } const q = B.questions.find((x) => x.id === c.id); if (q) out.push({ title: q.title, prompt: q.prompt.slice(0, 700), short: q.short.slice(0, 500) }); }
      return out;
    } catch (e) { return []; }
  }

  /* ----- events ----- */
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b || phase !== "ready") return;
    const a = b.dataset.act, id = b.dataset.id, LS = libState();
    if (a === "libdone") { if (!LS.done[id]) { LS.done[id] = today(); persist(); celebrate("Library lesson read", "+" + LIBP.lesson + " XP"); } render(); return; }
    if (a === "libquizreset") { for (let k = 0; k < Number(b.dataset.n); k++) delete ui.quiz["lq-" + id + "-" + k]; render(); return; }
    if (a === "probhint") { const st = LS.prob[id] = LS.prob[id] || {}; st.hints = (st.hints || 0) + 1; persist(); render(); return; }
    if (a === "probreset") { const P = L$.probs[id]; ui.probCode = ui.probCode || {}; ui.probCode[id] = P.starter; const st = LS.prob[id]; if (st) delete st.code; persist(); render(); return; }
    if (a === "probrun") {
      const P = L$.probs[id], ta = document.getElementById("prob-code"), code = ta ? ta.value : P.starter;
      ui.probCode = ui.probCode || {}; ui.probCode[id] = code; ui.probRes = ui.probRes || {}; ui.probRes[id] = { running: true }; render();
      try {
        if (!L$.harness) { const r = await fetch(libUrl("practice/practice_check.txt")); L$.harness = await r.text(); }
        const res = await window.AILRunner.runPractice(P, code, L$.harness);
        ui.probRes[id] = res;
        const st = LS.prob[id] = LS.prob[id] || {}; st.runs = (st.runs || 0) + 1; st.code = code.slice(0, 20000); st.d = P.difficulty;
        if (res && res.summary && res.summary.ok && !st.ok) { st.ok = today(); setTimeout(() => celebrate("Problem solved: " + P.title, "+" + (LIBP[P.difficulty] || LIBP.easy) + " XP"), 60); }
        persist();
      } catch (x) { ui.probRes[id] = { error: (x && x.message) || "The checks didn't run." }; }
      if (route().key === id) render();
      return;
    }
    if (a === "routeset") { LS.route = id || ""; persist(); toast(id ? "Following this specialism. Its next lesson shows on Today." : "Stopped following."); render(); return; }
    if (a === "projall") { ui.projAll = true; render(); return; }
    if (a === "ivbreveal") { ui.ivbAns = ui.ivbAns || {}; const A = ui.ivbAns[id] = ui.ivbAns[id] || {}; const ta = document.getElementById("ivb-ans"); if (ta) A.text = ta.value; A.reveal = true; render(); return; }
  });
  document.addEventListener("change", (e) => {
    const t = e.target; if (phase !== "ready" || !t.dataset) return;
    if (t.dataset.probf) { ui.probF = ui.probF || { col: "", diff: "" }; ui.probF[t.dataset.probf] = t.value; render(); return; }
    if (t.dataset.projlv !== undefined) { ui.projLv = Number(t.value); ui.projAll = false; render(); return; }
    const lq = t.closest && t.closest("[data-lq]");
    if (lq && t.type === "radio") {
      const [lid, k] = lq.dataset.lq.split(":"), key = (k[0] === "p" ? "lp-" + lid + "-" + k.slice(1) : "lq-" + lid + "-" + k);
      ui.quiz[key] = Number(t.value);
      if (k[0] !== "p") { const L = L$.lessons[lid]; if (L) { const post = L.quiz.filter((q) => q.st !== "pre"), qs = post.length ? post : L.quiz; const ans = qs.map((q, j) => ui.quiz["lq-" + lid + "-" + j]); if (ans.every((x) => x != null)) { const pct = Math.round((qs.filter((q, j) => ans[j] === q.a).length / qs.length) * 100), LS = libState(), was = LS.quiz[lid]; if (was == null || pct > was) { LS.quiz[lid] = pct; persist(); if (pct >= 80 && (was == null || was < 80)) setTimeout(() => celebrate("Library quiz passed", "+" + LIBP.quiz + " XP"), 60); } } } }
      render();
    }
  }, true);
  document.addEventListener("input", (e) => { if (e.target.id === "prob-code") { ui.probCode = ui.probCode || {}; ui.probCode[e.target.dataset.prob] = e.target.value; } });
  document.addEventListener("submit", async (e) => {
    const f = e.target; if (phase !== "ready") return;
    if (f.id === "libsearch") { e.preventDefault(); ui.libQ = document.getElementById("lib-q").value; render(); return; }
    if (f.id === "glosssearch") { e.preventDefault(); ui.glossQ = document.getElementById("gl-q").value; render(); return; }
    if (f.id === "ivbform") {
      e.preventDefault();
      const qid = f.dataset.id, card = cardOf(qid), B = L$.banks[card], q = B && B.questions.find((x) => x.id === qid); if (!q) return;
      ui.ivbAns = ui.ivbAns || {}; const A = ui.ivbAns[qid] = ui.ivbAns[qid] || {}; A.text = document.getElementById("ivb-ans").value.trim();
      if (A.text.split(/\s+/).length < 8) { A.err = "Write a fuller answer first: a few sentences."; render(); return; }
      A.busy = true; A.err = ""; render();
      try {
        A.mark = await window.BW.api("/api/interviewer", { mode: "card", profile: ivProfile(), question: { title: q.title, prompt: q.prompt, short: q.short, full: q.full, followups: q.followups, wrong: q.wrong, level: q.level }, answer: A.text });
        S.iv.bank = S.iv.bank || {}; S.iv.bank[qid] = today(); persist();
      } catch (x) { A.err = (x && x.message) || "Couldn't mark it just now."; }
      A.busy = false; render(); return;
    }
  });
