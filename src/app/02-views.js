
  /* ---------- router ---------- */
  const SIMPLE = ["home", "plan", "courses", "practice", "projects", "interview", "log", "cohort", "toolkit", "placement", "settings", "admin"];
  function route() {
    let h = decodeURIComponent((location.hash || "#home").slice(1));
    if (h === "roadmap") h = "plan";
    let m;
    if ((m = h.match(/^plan-w(\d+)$/))) return { name: "plan", week: Number(m[1]) };
    if ((m = h.match(/^course-(m\d+)$/))) return { name: "course", id: m[1] };
    if ((m = h.match(/^quiz-(m\d+)$/))) return { name: "quiz", id: m[1] };
    if ((m = h.match(/^cert-(m\d+)$/))) return { name: "cert", id: m[1] };
    if ((m = h.match(/^lesson-(m\d+)-(\d+)$/))) return { name: "lesson", id: m[1], i: Number(m[2]) };
    if ((m = h.match(/^ex-(m\d+)-([a-z0-9]+)$/))) return { name: "ex", id: m[1], ex: m[2] };
    if (h === "iv-new" || h === "iv-stories") return { name: "interview", sub: h.slice(3) };
    if ((m = h.match(/^iv-(job|run|report)-([a-z0-9]+)$/))) return { name: "interview", sub: m[1], key: m[2] };
    return { name: SIMPLE.indexOf(h) >= 0 ? h : "home" };
  }
  const SVG = {
    fire: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 3.5-1.6 5.3-1.6 8 0 1.4 1 2.4 2.2 2.4 1.5 0 2.4-1.2 2.4-3 2.6 1.9 4 4.4 4 7.1C19 20.4 15.9 23 12 23s-7-2.6-7-6.5C5 10.5 11 8.3 12 2z"/></svg>',
    bolt: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
    target: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
    clock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    flag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
    users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2a5 5 0 0 1 5.5 4.8"/></svg>',
    code: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/></svg>',
    book: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h6a2 2 0 0 1 2 2v13a1.5 1.5 0 0 0-1.5-1.5H4zM20 5h-6a2 2 0 0 0-2 2v13a1.5 1.5 0 0 1 1.5-1.5H20z"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  };
  function ring(f, size, color, label) {
    const r = 24, c = 2 * Math.PI * r, s = size || 56;
    return '<svg class="ring" style="--s:' + s + 'px;--c:' + (color || "var(--accent)") + '" viewBox="0 0 56 56" role="img" aria-label="' + esc(label || Math.round(f * 100) + "%") + '"><circle class="tr" cx="28" cy="28" r="' + r + '"/><circle class="fg" cx="28" cy="28" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - Math.max(0, Math.min(1, f)))).toFixed(1) + '" transform="rotate(-90 28 28)"/></svg>';
  }
  const GICON = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/></svg>',
    practise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
    projects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>',
    cohort: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  };
  function renderNav(active) {
    const g = groupOf(active);
    document.getElementById("nav").innerHTML = GROUPS.map((x) => '<a href="#' + x.pages[0][0] + '" data-group="' + x.id + '"' + (g && g.id === x.id ? ' aria-current="page"' : "") + ">" + GICON[x.id] + "<span>" + x.label + "</span></a>").join("");
    if (!S.account) { document.getElementById("me").innerHTML = ""; return; }
    const xp = points(), L = levelInfo(xp), st = streak();
    document.getElementById("me").innerHTML = '<span class="chip" title="Weekly streak">' + '<span style="color:#ff8a5c">' + SVG.fire + '</span><span class="n">' + st + '</span></span><span class="chip lvl" title="' + L.into + " of " + L.need + ' XP to the next level"><span style="color:var(--xp)">' + SVG.bolt + '</span><span class="n">Lv ' + L.level + " · " + xp + ' XP</span></span><details class="acct"><summary class="avatar" aria-label="Account menu for ' + esc(S.account.name) + '">' + esc((S.account.name || "?").slice(0, 1).toUpperCase()) + '</summary><div class="acct-menu" role="menu"><div class="acct-who"><b>' + esc(S.account.name) + "</b>" + (myEmail ? '<span>' + esc(myEmail) + "</span>" : "") + '</div><a role="menuitem" href="#settings"' + (active === "settings" ? ' aria-current="page"' : "") + ">Settings</a>" + (isOwner ? '<a role="menuitem" href="#admin"' + (active === "admin" ? ' aria-current="page"' : "") + ">Admin</a>" : "") + (window.BW ? '<button role="menuitem" data-act="signout">Sign out</button>' : "") + "</div></details>";
  }
  const NAVOF = { course: "courses", lesson: "courses", ex: "courses", quiz: "courses", cert: "courses", placement: "home" };
  function render() {
    const gated = phase !== "ready";
    $shell.classList.toggle("solo", gated);
    let html = "";
    try {
      if (phase === "boot" || phase === "loading-content") html = loading(300);
      else if (phase === "noaccess") html = vWelcome("noaccess");
      else if (phase === "signup") html = vWelcome("signup");
      else if (phase === "nocontent") html = vNoContent();
      else {
        const r = route();
        renderNav(NAVOF[r.name] || r.name);
        const V = { interview: vInterview, home: vHome, plan: vPlan, courses: vCourses, practice: vPractice, projects: vProjects, log: vLog, cohort: vCohort, toolkit: vToolkit, placement: vPlacement, settings: vSettings, admin: vAdmin, course: vCourse, quiz: vQuiz, lesson: vLesson, ex: vExercise, cert: vCert };
        if (r.id && !byId[r.id]) html = vHome();
        else if (r.name === "admin" && !isOwner) html = vHome();
        else html = V[r.name](r);
        const G = groupOf(r.name);
        if (G && G.pages.length > 1 && !r.sub && !r.id) html = '<nav class="subnav" aria-label="' + G.label + '">' + G.pages.map((p) => '<a href="#' + p[0] + '"' + (p[0] === r.name ? ' aria-current="page"' : "") + ">" + p[1] + "</a>").join("") + "</nav>" + html;
      }
    } catch (e) { console.error(e); html = '<div class="empty"><h3>This page didn\'t load</h3><p>Reload the portal. Your progress is saved.</p></div>'; }
    $app.innerHTML = html;
    afterRender();
  }
  function afterRender() {
    const ta = document.querySelector(".editor textarea");
    if (ta && window.AILRunner && AILRunner.state() === "cold") AILRunner.warm();
    document.querySelectorAll("[data-focus]").forEach((el) => { el.scrollIntoView({ block: "center" }); el.removeAttribute("data-focus"); });
    if (phase === "ready" && lastLevel === null) lastLevel = levelInfo(points()).level;
    if (phase === "ready" && S.placement) { const fresh = claimQuests(); if (fresh.length) setTimeout(() => celebrate("Quest complete: " + fresh[0].title, "+" + fresh.reduce((a, q) => a + q.xp, 0) + " XP"), 250); }
  }
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

  /* ---------- rewards: a short, specific moment when something real was finished ---------- */
  let rewardT, lastLevel = null;
  function celebrate(title, sub) {
    const xp = points(), L = levelInfo(xp), up = lastLevel !== null && L.level > lastLevel; lastLevel = L.level;
    document.querySelectorAll(".reward").forEach((x) => x.remove());
    const el = document.createElement("div"); el.className = "reward"; el.setAttribute("role", "status");
    el.innerHTML = '<span class="ico">' + SVG.bolt + "</span><div><b>" + esc(up ? "Level " + L.level + ": " + L.title : title) + "</b><span>" + esc(up ? title + ". " + (sub || "") : sub || "") + '</span><span class="bar xp thin"><i style="--f:' + L.f.toFixed(3) + '"></i></span></div>';
    document.body.appendChild(el);
    clearTimeout(rewardT); rewardT = setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 220); }, 3200);
    renderNav(NAVOF[route().name] || route().name);
  }

  /* ---------- shared pieces ---------- */
  function stripHtml(days, opts) {
    opts = opts || {};
    return '<div class="strip" role="list">' + days.map((d) => {
      const f = d.hours ? Math.min(1, (d.logged || 0) / d.hours) : d.logged ? 1 : 0;
      const just = ui.just && d.today && opts.fill !== false;
      const cls = ["day", "k-" + d.kind, d.hours ? "" : "rest", d.today ? "today" : "", d.past ? "past" : "", just ? "just" : ""].join(" ");
      return '<div class="' + cls + '" role="listitem" aria-label="' + esc(d.full || d.name) + ": " + (d.hours ? d.hours + " hours " + d.label : "rest day") + (d.logged ? ", " + r1(d.logged) + " hours logged" : "") + '">' +
        '<span class="dname"><span>' + esc(d.name) + "</span>" + (d.today ? "<span>Today</span>" : d.date ? '<span class="n">' + d.date.getDate() + "</span>" : "") + "</span>" +
        '<span class="hrs n">' + (d.hours ? d.hours + "<small>h</small>" : "Off") + "</span>" +
        (d.logged ? '<span class="got">' + r1(d.logged) + " h done</span>" : "") +
        '<span class="kind">' + esc(d.label) + "</span>" +
        (opts.fill === false ? "" : '<span class="fill" style="--f:' + f + (just ? ";--f0:" + ui.just.f0 : "") + '"></span>') + "</div>";
    }).join("") + "</div>";
  }
  function thisWeekDays() {
    const mon = mondayOf(new Date()), lb = loggedByDate(), t = today();
    return rhythm().map((d, i) => { const dt = addDays(mon, i), iso = isoDate(dt); return Object.assign({}, d, { date: dt, full: dt.toLocaleDateString("en-GB", { weekday: "long" }), logged: lb[iso] || 0, today: iso === t, past: iso < t }); });
  }
  function finishFlag() {
    let sq = ""; for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) if ((r + c) % 2 === 0) sq += '<rect x="' + c * 6 + '" y="' + r * 6 + '" width="6" height="6"/>';
    return '<svg width="36" height="18" viewBox="0 0 36 18" aria-hidden="true"><rect width="36" height="18" rx="2" fill="var(--surface)" stroke="var(--ink)"/><g fill="var(--ink)">' + sq + "</g></svg>";
  }
  function mcq(q, name, opts) {
    opts = opts || {};
    return '<div class="q"><p class="qt">' + (opts.num ? opts.num + ". " : "") + rich(q.q) + '</p><div class="opts">' + q.o.map((o, j) => {
      let cls = "opt"; if (opts.done) { if (j === q.a) cls += " right"; else if (j === opts.chosen) cls += " wrong"; }
      const mark = opts.done ? (j === q.a ? '<span class="mark">Correct answer</span>' : j === opts.chosen ? '<span class="mark">Your answer</span>' : "") : "";
      return '<label class="' + cls + '"><input type="radio" name="' + esc(name) + '" ' + (opts.attr || "") + ' value="' + j + '"' + (opts.chosen === j ? " checked" : "") + (opts.done ? " disabled" : "") + "><span>" + rich(o) + mark + "</span></label>";
    }).join("") + "</div>" + (opts.done && q.e ? '<p class="expl">' + rich(q.e) + "</p>" : "") + "</div>";
  }
  const PH_COLOR = { 1: "var(--p1)", 2: "var(--p2)", 3: "var(--p3)", 4: "var(--p4)" };
  function courseFrac(id) {
    const m = byId[id], st = S.mods[id] || {}, lx = LX[id];
    if (st.done) return 1;
    const lessons = Object.keys(st.checks || {}).length, exDone = Object.values(st.ex || {}).filter((x) => x.ok).length;
    const exN = lx ? lx.ex.length : 0, tot = m.lessons.length + exN + 1;
    return Math.min(0.99, (lessons + exDone + (quizInfo(id).best >= 80 ? 1 : 0)) / tot);
  }

  /* ---------- gated views: the sign-up ---------- */
  function vWelcome(kind) {
    const side = '<aside class="auth-side"><div><h1>Become an AI engineer, <em>from zero</em>, one evening at a time.</h1>' +
      '<p class="lede">Benchwork is a private training ground for a small cohort. You get a dated plan at your hours, lessons with coding exercises that run in your browser, and three real projects to ship.</p></div>' +
      '<div class="props">' +
      '<div class="prop"><span class="ico">' + SVG.target + '</span><div><b>A plan built around you</b><span>Rate the tools you\'ve used, take a short placement and skip what you already know.</span></div></div>' +
      '<div class="prop"><span class="ico">' + SVG.code + '</span><div><b>59 exercises, checked as you go</b><span>Python and SQL run in the browser. Hints and a tutor when you\'re stuck.</span></div></div>' +
      '<div class="prop"><span class="ico">' + SVG.users + '</span><div><b>Never study alone</b><span>An accountability partner, peer reviews and a cohort board.</span></div></div></div>' +
      '<div class="preview" aria-hidden="true"><div class="pv d"><i>' + SVG.check + '</i><div>Programming from zero<br><span>8 lessons, 9 exercises</span></div><span>Done</span></div>' +
      '<div class="pv cur"><i>2</i><div>Python for engineers<br><span>Lesson 3 of 6</span></div><span>12 days left</span></div>' +
      '<div class="pv"><i>3</i><div>Engineering habits<br><span>Starts after</span></div><span></span></div></div></aside>';
    let form;
    if (kind === "noaccess") {
      form = '<div class="auth-card"><h2 style="font-size:26px">Couldn\'t connect</h2><p class="muted">Benchwork couldn\'t reach its database. Check your connection and try again.</p>' +
        '<div class="row"><button class="btn" data-act="reload">Try again</button><button class="btn line" data-act="signout">Sign out</button></div></div>';
    } else {
      form = '<form id="signup" class="auth-card" novalidate><div class="steps" aria-label="Sign-up steps"><span class="on"><i>1</i>Account</span><span><i>2</i>Your tools</span><span><i>3</i>Placement</span></div>' +
        '<h2 style="font-size:28px;margin-bottom:6px">Create your account</h2><p class="muted" style="margin:0 0 22px">Takes a minute. Your plan appears after two short steps.</p>' +
        (myEmail ? '<div class="field"><label for="a-email">Email</label><input id="a-email" type="email" value="' + esc(myEmail) + '" readonly aria-describedby="a-email-hint"><p class="hint" id="a-email-hint">Confirmed when you signed in. Only the site owner can see it.</p></div>'
          : '<div class="field"><label for="a-email">Email</label><input id="a-email" type="email" maxlength="120" autocomplete="email" required value="' + esc(ui.emailDraft || "") + '"' + (ui.emailErr ? ' aria-invalid="true" aria-describedby="a-email-err"' : "") + '><p class="hint">Only the site owner can see it.</p>' + (ui.emailErr ? '<p class="err" id="a-email-err">' + esc(ui.emailErr) + "</p>" : "") + "</div>") +
        '<div class="field"><label for="a-name">Display name</label><input id="a-name" type="text" maxlength="40" autocomplete="nickname" value="' + esc(myName.split(" ")[0] || "") + '"' + (ui.formErr ? ' aria-invalid="true" aria-describedby="a-err"' : "") + '><p class="hint">Shown to other members.</p>' + (ui.formErr ? '<p class="err" id="a-err">' + esc(ui.formErr) + "</p>" : "") + "</div>" +
        '<div class="two"><div class="field"><label for="a-hpw">Hours a week</label><input id="a-hpw" type="number" min="3" max="40" step="1" value="' + S.hpw + '"><p class="hint">Sets every date.</p></div>' +
        '<div class="field"><label for="a-start">Start date</label><input id="a-start" type="date" value="' + esc(S.start) + '" data-words="a-start-words"><p class="hint" id="a-start-words">' + dateWords(S.start) + "</p></div></div>" +
        '<fieldset><legend>What are you aiming for first?</legend><div class="choice">' +
        '<label><input type="radio" name="a-goal" value="engineer"' + (S.goal !== "adjacent" ? " checked" : "") + '><span><b>AI engineer</b><br><span class="small muted">Apply once all three projects are live.</span></span></label>' +
        '<label><input type="radio" name="a-goal" value="adjacent"' + (S.goal === "adjacent" ? " checked" : "") + '><span><b>An AI-adjacent role first</b><br><span class="small muted">AI-enabled data or automation work. Apply after project 2.</span></span></label></div></fieldset>' +
        '<button class="btn lg wide" type="submit"' + (ui.busy ? ' aria-busy="true" disabled' : "") + ">" + (ui.busy ? "Creating your account…" : "Create my account") + "</button></form>";
    }
    return '<section class="auth">' + side + '<div class="auth-main">' + form + "</div></section>";
  }
  function vNoContent() {
    return '<div class="narrow"><div class="empty"><h3>The courses aren\'t available yet</h3><p>' +
      (isOwner ? "The course content isn't in the database yet. Load it now; it takes a few seconds and you only do it once." : "Your account is ready, but the course content couldn't be loaded. Reload in a minute; if it persists, tell the portal owner.") +
      '</p>' + (isOwner ? '<button class="btn" data-act="seed"' + (ui.seeding ? ' aria-busy="true" disabled' : "") + ">" + (ui.seeding ? "Loading the courses…" : "Load the course content") + "</button>" : '<button class="btn line" data-act="reload">Try again</button>') + "</div></div>";
  }

  /* ---------- Today ---------- */
  function nextStep(m) {
    const ch = (S.mods[m.id] && S.mods[m.id].checks) || {}, lx = LX[m.id];
    const li = m.lessons.findIndex((_, i) => !ch[i]);
    if (li >= 0) return { href: "#lesson-" + m.id + "-" + li, label: "Continue: lesson " + (li + 1), title: lx && lx.lessons[li] ? lx.lessons[li].t : m.lessons[li], mins: lx && lx.lessons[li] ? lx.lessons[li].min : null };
    if (lx && lx.ex) { const exs = (S.mods[m.id] && S.mods[m.id].ex) || {}; const e = lx.ex.find((x) => !(exs[x.id] && exs[x.id].ok)); if (e) return { href: "#ex-" + m.id + "-" + e.id, label: "Continue: solve the exercise", title: e.t }; }
    if (quizInfo(m.id).best < 80) return { href: "#quiz-" + m.id, label: "Take the quiz", title: "Five questions, pass mark 80%" };
    return { href: "#course-" + m.id, label: "Finish the course", title: "Mark it complete and get your certificate" };
  }
  function cdLine(date, planned) {
    const d = dayDiff(planned, date);
    return d > 1 ? '<span class="ahead">' + plural(d, "day") + " ahead of plan</span>" : d < -1 ? '<span class="late">' + plural(-d, "day") + " behind plan</span>" : "On plan";
  }
  function vHome() {
    const name = firstName();
    if (!S.tools || !S.placement) {
      const F = [
        ["courses", SVG.book, "Courses", "15 courses in four tracks, from your first line of code to job interviews. Short lessons with a quick check after each."],
        ["practice", SVG.target, "Practice", "Ten-question rounds with instant feedback. Questions you miss come back until they stick."],
        ["projects", SVG.code, "Projects", "Three real projects with checkpoints. Share each one and get reviews from the cohort."],
        ["cohort", SVG.users, "Cohort and partners", "See how everyone is doing and pair with an accountability partner."],
        ["plan", SVG.flag, "Plan", "Every week dated at your hours, from today to your first offer. Fills in as you log."],
        ["log", SVG.clock, "Log", "Log a session in ten seconds. Your streak, countdown and dates all come from it."],
        ["toolkit", SVG.bolt, "Toolkit", "Your weekly rhythm, the software to install, which certification to take and what it costs."],
      ];
      return '<div class="hero"><div style="position:relative;z-index:1"><p class="up">Welcome' + (name ? ", " + esc(name) : "") + '. You\'re in.</p><h1>This is your training ground</h1><p class="muted" style="margin:10px 0 18px;max-width:54ch">Have a look around first. When you\'re ready, two short steps build your personal plan: rate the tools you\'ve used, then a quick placement.</p>' +
        '<div class="row"><a class="btn lg" href="#placement">' + (S.tools ? "Finish my plan" : "Build my plan") + '</a><button class="btn lg dark" style="background:rgb(255 255 255 / .1)" data-act="tour">Show me around</button></div></div>' +
        '<div class="countdown"><div class="cd"><div class="big">' + (S.tools ? 1 : 2) + '<small>' + (S.tools ? "step" : "steps") + ' to your plan</small></div><div class="sub">About ' + (S.tools ? 4 : 6) + ' minutes. Nothing is graded.</div></div><div class="cd"><div class="big">59<small>exercises</small></div><div class="sub">Python and SQL that run right here, with hints and a tutor.</div></div></div></div>' +
        '<div class="sec"><h2>What\'s in Benchwork</h2><div class="grid3">' + F.map((f) => '<a class="card node" style="display:block" href="#' + f[0] + '" data-tour="' + f[0] + '"><span class="ico" style="margin-bottom:12px">' + f[1] + '</span><h3>' + f[2] + '</h3><p class="small muted" style="margin:0">' + f[3] + "</p></a>").join("") +
        '<div class="card" style="background:var(--xp-soft);border-color:transparent"><span class="ico xp" style="margin-bottom:12px;background:var(--surface)">' + SVG.fire + '</span><h3>XP, levels and streaks</h3><p class="small muted" style="margin:0">Every lesson, exercise and quiz earns XP. Weekly quests and a streak keep you coming back.</p></div></div></div>' +
        '<div class="sec card"><h2>Your week at ' + S.hpw + ' hours</h2><p class="small muted">Four evenings, a long Saturday and a Sunday review. Change your hours any time in Settings.</p>' + stripHtml(thisWeekDays()) + "</div>";
    }
    const pr = progress(), p = pr.p, cur = currentRow(p), CD = countdowns(), si = streakInfo(), xp = points(), L = levelInfo(xp), wk = thisWeekHours();
    if (cur && !LX[cur.m.id]) needLX(cur.m.id).then(() => { if (route().name === "home") render(); });
    const wi = weekIndex(p, new Date());
    let left;
    if (cur) {
      const m = cur.m, nx = nextStep(m), f = courseFrac(m.id);
      left = '<div style="position:relative;z-index:1"><p class="up">' + (name ? "Hi " + esc(name) + ". " : "") + (wi < 0 ? "Your plan starts " + fmt(gridStart(p)) : "Week " + (wi + 1) + " of " + p.weeks) + " · " + esc(m.title) + '</p>' +
        '<div class="next">' + rich(nx.title) + "</div>" +
        '<div class="row" style="margin-bottom:18px"><a class="btn lg" href="' + nx.href + '">' + esc(nx.label) + '</a><a class="btn lg dark" style="background:rgb(255 255 255 / .1)" href="#course-' + m.id + '">Course overview</a></div>' +
        '<div class="row between xs muted" style="margin-bottom:6px"><span>' + esc(m.title) + '</span><span class="n">' + Math.round(f * 100) + '% done</span></div><span class="bar"><i style="--f:' + f.toFixed(3) + '"></i></span></div>';
    } else left = '<div style="position:relative;z-index:1"><p class="up">Race day reached</p><h1>Every course is complete</h1><p class="muted">Keep applying, keep quizzes fresh in Practice and log interview rounds.</p></div>';
    const cdHtml = '<div class="countdown">' + (CD.course ? '<div class="cd"><div class="big n">' + CD.course.days + "<small>days</small></div><div class=\"sub\">to finish " + esc(CD.course.row.m.title) + ", around " + fmt(CD.course.date) + ". " + cdLine(CD.course.date, CD.course.planned) + "</div></div>" : "") +
      '<div class="cd"><div class="big n">' + CD.route.days + '<small>days</small></div><div class="sub">to your last course, ' + fmtY(CD.route.date) + ". " + cdLine(CD.route.date, CD.route.planned) + ". " + (CD.pace.measured ? "Based on your last 3 weeks: " + r1(CD.pace.avg) + " h a week." : "Based on your " + S.hpw + " hours a week until you have 3 weeks of logs.") + "</div></div></div>";
    const hero = '<div class="hero">' + left + cdHtml + "</div>";
    const note = notice ? '<p class="notice"><b>From the Benchwork team:</b> ' + esc(notice.text) + "</p>" : "";
    const stats = '<div class="stats">' +
      '<div class="card tight stat"><span class="ico fire">' + SVG.fire + '</span><div><div class="v n">' + si.weeks + '<small> wk</small></div><div class="k">Streak' + (si.freezes ? ", " + plural(si.freezes, "freeze") + " saved" : "") + (si.thisWeek ? "" : ". Log " + r1(Math.max(0, S.hpw * 0.6 - wk)) + " h more to keep it") + "</div></div></div>" +
      '<div class="card tight stat">' + ring(Math.min(1, wk / S.hpw), 44, "var(--ok)", r1(wk) + " of " + S.hpw + " hours") + '<div><div class="v n">' + r1(wk) + "<small> / " + S.hpw + ' h</small></div><div class="k">This week</div></div></div>' +
      '<div class="card tight stat"><span class="ico xp">' + SVG.bolt + '</span><div style="flex:1"><div class="v n">Lv ' + L.level + " <small>" + esc(L.title) + '</small></div><span class="bar xp thin"><i style="--f:' + L.f.toFixed(3) + '"></i></span><div class="k" style="margin-top:4px">' + (L.need - L.into) + " XP to level " + (L.level + 1) + "</div></div></div>" +
      '<div class="card tight stat"><span class="ico blue">' + SVG.flag + '</span><div><div class="v n">' + fmt(p.applyAt) + '</div><div class="k">Start applying</div></div></div></div>';
    const Q = quests();
    const questHtml = '<div class="card"><div class="row between"><h2 style="margin:0">This week\'s quests</h2><span class="xs muted">Resets Monday</span></div>' + Q.map((q) => '<div class="quest' + (q.done ? " done" : "") + '"><span class="qi">' + (q.done ? SVG.check : SVG.target) + '</span><div><div class="qt">' + esc(q.title) + '</div><span class="bar xp thin" style="margin-top:6px"><i style="--f:' + (q.got / q.need).toFixed(3) + '"></i></span></div><span class="qx n">' + (q.done ? "Done" : "+" + q.xp + " XP") + "</span></div>").join("") + "</div>";
    const due = MOD.filter((m) => inPlan(m.id) && reviewDue(m.id)), missN = Object.keys(S.miss).length;
    const review = (due.length || missN) ? '<div class="card"><h2>Keep it fresh</h2><ul class="rl">' + due.map((m) => '<li><span class="grow"><a class="ttl" href="#quiz-' + m.id + '">Quiz review due: ' + esc(m.title) + '</a></span><span class="state">+50 XP</span></li>').join("") + (missN ? '<li><span class="grow"><a class="ttl" href="#practice">Practise ' + plural(missN, "question") + ' you missed</a></span><span class="state">Practice</span></li>' : "") + "</ul></div>" : "";
    return hero + note + stats + '<div class="cols sec" style="margin-top:20px"><div class="stack">' +
      '<div class="card"><div class="row between"><h2 style="margin:0">Your week</h2><div class="row"><button class="btn line sm" data-act="qlog" data-h="1">Log 1 hour</button><button class="btn line sm" data-act="qlog" data-h="2">Log 2 hours</button></div></div><div style="margin-top:14px">' + stripHtml(thisWeekDays()) + "</div></div>" +
      '<div class="card"><div class="row between"><h2 style="margin:0">Your path</h2><a class="link small" href="#plan">See the dated plan</a></div>' + pathHtml(p, 5) + "</div></div>" +
      "<aside>" + partnerCard() + questHtml + review + "</aside></div>";
  }
  function pathHtml(p, around) {
    const rows = p.rows, cur = currentRow(p), ci = cur ? rows.indexOf(cur) : rows.length;
    let list = rows.map((r, i) => ({ r, i }));
    if (around) { const s = Math.max(0, ci - 1); list = list.slice(s, s + around); }
    let ph = 0, html = '<div class="path" style="margin-top:6px">';
    list.forEach(({ r, i }) => {
      if (r.m.phase !== ph) { ph = r.m.phase; html += '<div class="path-phase">' + esc(PHASES[ph]) + "</div>"; }
      const f = courseFrac(r.m.id), done = r.done, isCur = i === ci;
      html += '<a class="node' + (done ? " done" : isCur ? " cur" : "") + '" href="#course-' + r.m.id + '"><span class="dot">' + (done ? SVG.check : i + 1) + '</span><span><span class="t">' + esc(r.m.title) + '</span><br><span class="s">' + weekRange(p, r) + ", " + r.hours + " h" + (r.lv ? " · " + LVNAME[r.lv] : "") + "</span>" + (isCur ? '<span class="bar thin"><i style="--f:' + f.toFixed(3) + '"></i></span>' : "") + '</span><span class="state' + (done ? " ok" : "") + '">' + (done ? "Done" : isCur ? Math.round(f * 100) + "%" : fmt(r.sd)) + "</span></a>";
    });
    return html + "</div>";
  }
  function partnerCard() {
    const P = partnerInfo();
    if (pairs === null) return '<div class="card"><h2>Accountability partner</h2><div class="sk" style="height:40px"></div></div>';
    if (!P) {
      const me = myPairDoc(), inc = (pairs || []).filter((x) => x.req === uid && x.id !== uid);
      return '<div class="card"><h2>Accountability partner</h2><p class="small muted">People who tell someone their weekly goal are far more likely to hit it. Pair with one member, set a commitment each week and check in.</p>' +
        (inc.length ? inc.map((x) => '<div class="row between" style="margin-top:10px"><span><b>' + esc(x.name || "A member") + '</b> <span class="xs muted">wants to pair</span></span><button class="btn sm" data-act="pairaccept" data-id="' + esc(x.id) + '">Accept</button></div>').join("") : "") +
        (me && me.req ? '<p class="xs muted" style="margin-top:10px">Request sent to ' + esc(((cohort || []).find((c) => c.id === me.req) || {}).name || "a member") + '. <button class="link" data-act="paircancel">Cancel</button></p>' : '<a class="btn line sm" style="margin-top:6px" href="#cohort">Find a partner</a>') + "</div>";
    }
    const mine = (myPairDoc() || {}).commit, theirs = P.doc.commit, mon = thisMon();
    const myC = mine && mine.wk === mon ? mine : null, thC = theirs && theirs.wk === mon ? theirs : null;
    const theirWeek = Number(P.sum.week) || 0;
    const msgs = [].concat((P.doc.msgs || []).filter((m) => m.to === uid).map((m) => Object.assign({ from: P.doc.name }, m)), ((myPairDoc() || {}).msgs || []).filter((m) => m.to === P.id).map((m) => Object.assign({ from: "You" }, m))).sort((a, b) => (a.ts || 0) - (b.ts || 0)).slice(-4);
    return '<div class="card partner"><h2 style="margin:0">Accountability partner</h2>' +
      '<div class="pp p2"><span class="avatar">' + esc((P.doc.name || "?").slice(0, 1).toUpperCase()) + '</span><div style="flex:1"><b>' + esc(P.doc.name || "Partner") + '</b><div class="xs muted">' + (thC ? "Committed to " + thC.hours + " h" + (thC.text ? ": " + esc(thC.text) : "") : "No commitment set this week") + '</div><span class="bar ok thin" style="margin-top:6px"><i style="--f:' + (thC ? Math.min(1, theirWeek / thC.hours) : 0).toFixed(3) + '"></i></span><div class="xs muted" style="margin-top:3px">' + r1(theirWeek) + " h this week" + (P.sum.last ? ", last logged " + fmt(parseDate(P.sum.last)) : "") + "</div></div></div>" +
      '<div class="pp"><span class="avatar">' + esc((S.account.name || "?").slice(0, 1).toUpperCase()) + '</span><div style="flex:1"><b>You</b><div class="xs muted">' + (myC ? "Committed to " + myC.hours + " h" + (myC.text ? ": " + esc(myC.text) : "") : "Set this week's commitment") + '</div><span class="bar ok thin" style="margin-top:6px"><i style="--f:' + (myC ? Math.min(1, thisWeekHours() / myC.hours) : 0).toFixed(3) + '"></i></span></div></div>' +
      (myC ? "" : '<form data-commit class="row" style="gap:8px"><input type="number" id="c-h" min="1" max="40" value="' + S.hpw + '" style="width:76px" aria-label="Hours this week"><input type="text" id="c-t" maxlength="80" placeholder="And I will… (optional)" style="flex:1;min-width:120px" aria-label="Your goal this week"><button class="btn sm" type="submit">Commit</button></form>') +
      (msgs.length ? '<div class="msgs-mini">' + msgs.map((m) => "<div><b>" + esc(m.from) + ":</b> " + esc(m.text) + "</div>").join("") + "</div>" : "") +
      '<div class="row"><button class="btn line sm" data-act="cheer">Send a cheer</button><button class="btn line sm" data-act="nudge">Send a nudge</button></div></div>';
  }

  /* ---------- Plan ---------- */
  function vPlan(r) {
    const p = plan(), wiNow = weekIndex(p, new Date()), lb = loggedByDate(), rh = rhythm(), byW = hoursByWeek();
    const applyW = weekIndex(p, addDays(p.applyAt, -1)), focus = r && r.week ? r.week - 1 : -1;
    const head = S.placement
      ? '<h1>Your training plan</h1><p class="lede">' + p.weeks + " weeks at " + p.hpw + " hours a week, " + fmtY(gridStart(p)) + " to " + fmtY(p.end) + ". Logging a session fills its cell.</p>"
      : '<h1>The full plan</h1><p class="lede">Every course at full length. Your tool ratings and the placement trim what you already know.</p><div class="row" style="margin-top:16px"><a class="btn" href="#placement">' + (S.tools ? "Take the placement" : "Rate your tools") + "</a></div>";
    const legend = '<div class="legend">' + [["learn", "Learn"], ["build", "Build"], ["project", "Project"], ["review", "Review"]].map((k) => '<span class="tag k-' + k[0] + '">' + k[1] + "</span>").join("") + '<span class="tag" style="--c:var(--accent)">This week</span></div>';
    let rows = "";
    for (let i = 0; i < p.weeks; i++) {
      const ws = addDays(gridStart(p), 7 * i), crs = coursesInWeek(p, i);
      let cells = "";
      rh.forEach((d, j) => {
        const iso = isoDate(addDays(ws, j)), lg = lb[iso] || 0;
        const f = d.hours ? Math.min(1, lg / d.hours) : lg ? 1 : 0;
        const cellCls = f >= 1 ? " full" : f > 0 ? " part" : "";
        cells += '<td><div class="c k-' + d.kind + (d.hours ? "" : " rest") + cellCls + '" title="' + esc(d.name + " " + fmt(addDays(ws, j)) + ": " + (d.hours ? d.hours + " h " + d.label : "rest") + (lg ? ", " + r1(lg) + " h logged" : "")) + '"><i style="--f:' + f + '"></i><em><b>' + (lg ? r1(lg) : d.hours || "") + "</b></em></div></td>";
      });
      const wh = byW[isoDate(ws)] || 0;
      rows += '<tr id="w' + (i + 1) + '" class="' + (i === wiNow ? "now" : i === focus ? "focus" : i < wiNow ? "done-wk" : "") + '"' + (i === focus ? " data-focus" : "") + '><td class="wk"><b class="n">W' + (i + 1) + "</b><span>" + fmt(ws) + "</span></td>" +
        '<td class="crs">' + crs.slice(0, 2).map((x) => '<a href="#course-' + x.m.id + '">' + esc(x.m.title) + "</a>").join("") + "</td>" + cells +
        '<td class="tot n">' + (wh ? r1(wh) : "0") + " / " + p.hpw + "</td></tr>";
      if (i === applyW) rows += '<tr class="ms"><td colspan="10"><span class="hl">Start applying</span> <span class="xs muted" style="font-weight:400">from ' + fmtY(p.applyAt) + (S.goal === "adjacent" ? ", AI-adjacent roles first" : "") + ". Begin the first three lessons of Job search and interviews.</span></td></tr>";
    }
    rows += '<tr class="ms"><td colspan="10"><div class="finish">' + finishFlag() + '<span>Race day: first offer <span class="xs muted" style="font-weight:400">around ' + fmtY(p.race) + ". Interview rounds usually take about six weeks after the last course.</span></span></div></td></tr>";
    const table = '<div class="plan-wrap"><table class="plan"><thead><tr><th scope="col">Week</th><th scope="col">Courses</th>' + rh.map((d) => '<th scope="col">' + esc(d.name) + "</th>").join("") + '<th scope="col" style="text-align:right">Hours</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
    return head + legend + table;
  }

  /* ---------- Courses ---------- */
  function vCourses() {
    const p = plan(), c = counts();
    MOD.forEach((m) => { if (!LX[m.id]) needLX(m.id).then(() => { if (route().name === "courses" && MOD.every((x) => LX[x.id])) render(); }); });
    let html = '<h1>Courses</h1><p class="lede">' + plural(p.rows.length, "course") + " on your path, in four tracks. Short lessons, exercises that run in your browser, a quiz from a question bank and a build. " + plural(c.done, "course") + " complete.</p>";
    [1, 2, 3, 4].forEach((ph) => {
      const list = MOD.filter((m) => m.phase === ph);
      html += '<div class="sec"><div class="row" style="margin-bottom:12px"><span class="tag p' + ph + '">' + PHASES[ph] + '</span></div><div class="grid3">';
      list.forEach((m) => {
        const r = p.rows.find((x) => x.m.id === m.id), lx = LX[m.id], f = courseFrac(m.id), cur = currentRow(p);
        html += '<a class="card node" style="display:block;padding:18px" href="#course-' + m.id + '"><div class="row between" style="margin-bottom:10px">' + (r ? lvTag(r.lv, r.done) || '<span class="tag">Core</span>' : '<span class="tag skip">Skipped by placement</span>') + (cur && cur.m.id === m.id ? '<span class="tag" style="--c:var(--accent);background:var(--accent-soft);color:var(--accent-text)">Current</span>' : "") + "</div>" +
          '<h3 style="font-size:18px">' + esc(m.title) + '</h3><p class="xs muted" style="margin:0 0 12px">' + plural(m.lessons.length, "lesson") + (lx ? " · " + plural(lx.ex.length, "exercise") : "") + (r ? " · " + r.hours + " h · " + weekRange(p, r) : "") + '</p><span class="bar' + (f >= 1 ? " ok" : "") + '"><i style="--f:' + f.toFixed(3) + '"></i></span><p class="xs muted" style="margin:6px 0 0">' + Math.round(f * 100) + "% complete" + (quizInfo(m.id).attempts ? " · quiz best " + quizInfo(m.id).best + "%" : "") + "</p></a>";
      });
      html += "</div></div>";
    });
    return html;
  }

  function courseHead(m, r, p) {
    const f = courseFrac(m.id);
    return '<div class="banner" style="--pc:' + PH_COLOR[m.phase] + '"><div><p class="crumb"><a href="#courses">Courses</a> / ' + esc(PHASES[m.phase]) + "</p><h1>" + esc(m.title) + '</h1><p class="lede">' + esc(m.why) + "</p>" +
      '<div class="meta">' + (r ? lvTag(r.lv, r.done) || '<span class="tag">Core</span>' : '<span class="tag skip">Not in your plan</span>') +
      (r ? '<span><a href="#plan-w' + (weekIndex(p, r.sd) + 1) + '">' + weekRange(p, r) + "</a>, " + r.hours + " h, " + fmt(r.sd) + " to " + fmt(r.ed) + "</span>" : "") + "</div></div>" +
      '<div class="ringwrap">' + ring(f, 96, PH_COLOR[m.phase], Math.round(f * 100) + "% complete") + "<b>" + Math.round(f * 100) + "%</b><span>complete</span></div></div>";
  }
  function vCourse(r0) {
    const id = r0.id, m = byId[id], p = plan(), r = p.rows.find((x) => x.m.id === id), idx = MOD.indexOf(m), lx = LX[id];
    if (!lx) { needLX(id).then(() => { if (route().id === id) render(); }); return courseHead(m, r, p) + '<div class="sec">' + loading(200) + "</div>"; }
    const st = S.mods[id] || {}, ch = st.checks || {}, q = quizInfo(id), exs = st.ex || {}, prev = MOD[idx - 1], next = MOD[idx + 1];
    const lvNote = r && r.lv === "testout" ? '<p class="notice"><b>Prove it.</b> Your placement says you know this. Pass the quiz at 80% and mark it tested out, or work through whatever you miss.</p>'
      : r && r.lv === "fast" ? '<p class="notice"><b>Fast track.</b> Skim the lessons you know and spend the time on the exercises and the build.</p>' : "";
    const lessonsLeft = m.lessons.filter((_, i) => !ch[i]).length, exLeft = lx.ex.filter((e) => !(exs[e.id] && exs[e.id].ok)).length;
    const gradient = !r || !r.done ? '<p class="small" style="margin:0 0 4px"><b>' + (lessonsLeft + exLeft ? plural(lessonsLeft, "lesson") + " and " + plural(exLeft, "exercise") + " to go" : "Only the quiz to go") + "</b>" + (q.best >= 80 ? "" : ", then the quiz.") + "</p>" : "";
    const subOf = (t, L) => { if (!L) return ""; const raw = String(t).replace(/<[^>]+>/g, ""); if (raw.toLowerCase().indexOf(L.t.toLowerCase()) === 0) return raw.slice(L.t.length).replace(/^[\s:,]+/, ""); return raw === L.t ? "" : raw; };
    const lessons = '<ol class="rl">' + m.lessons.map((t, i) => { const L = lx.lessons[i], sub = subOf(t, L); return '<li><span class="num' + (ch[i] ? " ok" : "") + '">' + (ch[i] ? SVG.check : i + 1) + '</span><span class="grow">' + (L ? '<a class="ttl" href="#lesson-' + id + "-" + i + '">' + esc(L.t) + "</a>" : "<b>" + rich(t) + "</b>") + (sub ? '<div class="xs muted">' + esc(sub.charAt(0).toUpperCase() + sub.slice(1)) + "</div>" : "") + "</span>" + '<span class="state' + (ch[i] ? " ok" : "") + '">' + (ch[i] ? "Read" : L ? L.min + " min" : "") + "</span></li>"; }).join("") + "</ol>";
    const exList = lx.ex.length ? '<div class="card"><h2>Exercises</h2><ol class="rl">' + lx.ex.map((e, i) => { const s = exs[e.id] || {}; return '<li><span class="num' + (s.ok ? " ok" : "") + '">' + (s.ok ? SVG.check : i + 1) + '</span><span class="grow"><a class="ttl" href="#ex-' + id + "-" + e.id + '">' + esc(e.t) + '</a><div class="xs muted">' + (e.kind === "sql" ? "SQL" : e.mode === "write-tests" ? "Python: write the tests" : "Python") + '</div></span><span class="state' + (s.ok ? " ok" : "") + '">' + (s.ok ? (s.sol ? "Solved with the answer" : "+" + PTS.ex + " XP earned") : "+" + PTS.ex + " XP") + "</span></li>"; }).join("") + "</ol></div>" : "";
    const canDone = q.best >= 80;
    const doneBtn = r && r.done ? '<a class="btn" href="#cert-' + id + '">View certificate</a><button class="btn line" data-act="reopen" data-id="' + id + '">Reopen course</button>'
      : '<button class="btn" data-act="complete" data-id="' + id + '"' + (canDone ? "" : " disabled") + ">" + (r && r.lv === "testout" ? "Mark as tested out" : "Mark course complete") + "</button>" + (canDone ? "" : '<span class="xs muted">Pass the quiz at 80% first.</span>');
    const res = '<ul class="rl">' + m.resources.map((x) => '<li><span class="grow"><a class="ttl" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.t) + '</a><div class="xs muted">' + esc(x.by) + (x.note ? ". " + esc(x.note) : "") + "</div></span>" + costTag(x.cost) + "</li>").join("") + "</ul>";
    const bank = m.bank ? '<div class="card"><h2>Interview question bank</h2>' + m.bank.map((b) => "<h3 style=\"margin-top:16px\">" + esc(b.type) + '</h3><ul class="rl">' + b.qs.map((x) => '<li><span class="grow"><b>' + esc(x[0]) + '</b><div class="small muted">' + esc(x[1]) + "</div></span></li>").join("") + "</ul>").join("") + "</div>" : "";
    const project = PROJECTS.includes(id) ? '<div class="card"><h2>Project checkpoints</h2><p class="muted">Tick checkpoints and share your project for peer review on the Projects page.</p><a class="btn line" href="#projects">Open Projects</a></div>' : "";
    const mock = m.interview ? '<div class="card">' + tutorBlock("interview-" + id, "Mock interview", "Practise in writing: the tutor asks one question at a time from the question bank and gives feedback on each answer.", "Start a mock interview") + "</div>" : "";
    return courseHead(m, r, p) + lvNote +
      '<div class="cols sec" style="margin-top:20px"><div class="stack"><div class="card"><div class="row between"><h2 style="margin:0">Lessons</h2>' + gradient + "</div>" + lessons + "</div>" + exList +
      '<div class="card"><div class="row between"><h2 style="margin:0">Quiz</h2>' + (reviewDue(id) ? '<span class="tag behind">Review due</span>' : "") + '</div><p class="muted" style="margin-top:8px">Five questions drawn from a bank of ' + poolOf(id).length + ", so each attempt is different. Pass mark 80%." + (q.attempts ? " Best so far <b style=\"color:var(--ink)\">" + q.best + "%</b>." : "") + '</p><a class="btn' + (lessonsLeft + exLeft ? " line" : "") + '" href="#quiz-' + id + '">' + (q.attempts ? "Take it again" : "Take the quiz") + "</a></div>" +
      '<div class="card"><h2>Build</h2><p>' + rich(m.build) + '</p><h3 style="margin-top:16px">How to learn this</h3><p class="muted" style="margin:0">' + esc(m.method) + "</p></div>" + project + bank + mock +
      '<div class="row">' + doneBtn + "</div></div>" +
      '<aside><div class="card"><h3>You\'ll be able to</h3><ul style="margin:0;padding-left:18px" class="small">' + m.outcomes.map((o) => "<li>" + esc(o) + "</li>").join("") + "</ul></div>" +
      '<div class="card"><h3>Resources</h3>' + res + "</div></aside></div>" +
      '<div class="sec row between">' + (prev ? '<a class="btn line" href="#course-' + prev.id + '">Previous: ' + esc(prev.title) + "</a>" : "<span></span>") + (next ? '<a class="btn line" href="#course-' + next.id + '">Next: ' + esc(next.title) + "</a>" : "") + "</div>";
  }

  /* ---------- lesson reader ---------- */
  function vLesson(r) {
    const id = r.id, m = byId[id], lx = LX[id];
    if (!lx) { needLX(id).then(() => { if (route().id === id) render(); }); return loading(400); }
    const L = lx.lessons[r.i];
    if (!L) return '<div class="empty"><h3>That lesson doesn\'t exist</h3><p><a href="#course-' + id + '">Back to ' + esc(m.title) + "</a></p></div>";
    const ch = (S.mods[id] && S.mods[id].checks) || {}, read = !!ch[r.i], last = r.i === lx.lessons.length - 1;
    const toc = '<ol class="toc">' + lx.lessons.map((x, i) => '<li><a class="' + (ch[i] ? "ok" : "") + '" href="#lesson-' + id + "-" + i + '"' + (i === r.i ? ' aria-current="page"' : "") + '><span class="n">' + (ch[i] ? SVG.check.replace('width="18" height="18"', 'width="12" height="12"') : i + 1) + '</span><span style="flex:1">' + esc(x.t) + "</span></a></li>").join("") + "</ol>";
    const qc = L.check ? (() => { const k = id + "-" + r.i, a = ui.quiz["lc-" + k]; return '<div class="card sec"><h2>Quick check</h2>' + mcq(L.check, "lc-" + k, { attr: 'data-lc="' + k + '"', done: a != null, chosen: a }) + "</div>"; })() : "";
    const nextHref = last ? (lx.ex.length ? "#ex-" + id + "-" + lx.ex[0].id : "#quiz-" + id) : "#lesson-" + id + "-" + (r.i + 1);
    const nextLabel = last ? (lx.ex.length ? "Start the exercises" : "Take the quiz") : "Next lesson";
    const readN = Object.keys(ch).length;
    return '<p class="crumb"><a href="#courses">Courses</a> / <a href="#course-' + id + '">' + esc(m.title) + "</a> / Lesson " + (r.i + 1) + " of " + lx.lessons.length + "</p>" +
      '<div class="cols"><article><div class="card pad-lg"><h1>' + esc(L.t) + '</h1><p class="meta"><span>' + L.min + " min read</span><span>+" + PTS.lesson + " XP</span></p>" + '<div class="prose" style="margin-top:20px">' + md(L.md) + "</div></div>" + qc +
      '<div class="row sec">' + (read ? '<a class="btn lg" href="' + nextHref + '">' + nextLabel + '</a><span class="state ok">' + TICK + " Read</span>" : '<button class="btn lg" data-act="lread" data-id="' + id + '" data-i="' + r.i + '" data-next="' + nextHref + '">Mark as read, ' + nextLabel.toLowerCase() + "</button>") + "</div>" +
      '<div class="card sec">' + tutorBlock("lesson-" + id + "-" + r.i, "Ask the tutor", "Stuck on something in this lesson? Ask in your own words.", null) + "</div></article>" +
      '<aside><div class="card"><div class="row between" style="margin-bottom:8px"><h3 style="margin:0">' + esc(m.title) + '</h3><span class="xs muted n">' + readN + "/" + lx.lessons.length + '</span></div><span class="bar thin" style="margin-bottom:10px"><i style="--f:' + (readN / lx.lessons.length).toFixed(3) + '"></i></span>' + toc + "</div></aside></div>";
  }

  /* ---------- exercises ---------- */
  const exKey = (id, ex) => id + "." + ex;
  function vExercise(r) {
    const id = r.id, m = byId[id], lx = LX[id];
    if (!lx || !codeLoaded) { Promise.all([needLX(id), loadCode()]).then(() => { if (route().name === "ex") render(); }); return loading(400); }
    const ex = lx.ex.find((x) => x.id === r.ex);
    if (!ex) return '<div class="empty"><h3>That exercise doesn\'t exist</h3><p><a href="#course-' + id + '">Back to ' + esc(m.title) + "</a></p></div>";
    const k = exKey(id, ex.id), st = ((S.mods[id] || {}).ex || {})[ex.id] || {}, res = ui.exres[k], i = lx.ex.indexOf(ex);
    const code = codeDoc && codeDoc[k] != null ? codeDoc[k] : ex.start;
    const hintsShown = Math.min(st.hints || 0, ex.hints.length);
    const canSol = (st.runs || 0) >= 2 || hintsShown >= ex.hints.length;
    const next = lx.ex[i + 1];
    const pyState = ex.kind === "sql" ? "SQLite in your browser" : { cold: "Python starts on first run", loading: "Starting Python…", ready: "Python ready", failed: "Python couldn't start" }[window.AILRunner ? AILRunner.state() : "failed"];
    let out = "";
    if (res && res.running) out = '<div class="console"><div class="head"><p class="verdict thinking" role="status">Running the checks…</p></div></div>';
    else if (res) {
      const all = !res.error && res.tests.length && res.tests.every((t) => t[1]);
      out = '<div class="console results" role="status"><div class="head"><p class="verdict ' + (all ? "pass" : "fail") + '">' + (all ? "All checks pass" : res.error ? "Your code raised an error" : res.tests.filter((t) => !t[1]).length + " of " + res.tests.length + " checks failing") + "</p>" +
        (all ? (next ? '<a class="btn sm" href="#ex-' + id + "-" + next.id + '">Next exercise</a>' : '<a class="btn sm" href="#quiz-' + id + '">Take the quiz</a>') : "") + "</div>" +
        (res.error ? '<div class="out err">' + esc(res.error) + "</div>" : "") +
        (res.tests.length ? "<ul>" + res.tests.map((t) => '<li class="' + (t[1] ? "pass" : "fail") + '">' + (t[1] ? TICK : CROSS) + "<span>" + esc(t[0]) + (t[2] ? '<span class="why">' + esc(t[2]) + "</span>" : "") + "</span></li>").join("") + "</ul>" : "") +
        (res.table && res.table.columns.length ? '<div style="overflow-x:auto;border-top:1px solid var(--line)"><table class="sqltbl"><thead><tr>' + res.table.columns.map((c) => "<th>" + esc(c) + "</th>").join("") + "</tr></thead><tbody>" + res.table.values.map((row) => "<tr>" + row.map((v) => "<td>" + esc(v) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>" : "") +
        (res.stdout ? '<div class="out">' + esc(res.stdout) + "</div>" : "") + "</div>";
    }
    const hints = hintsShown ? '<ol class="hints">' + ex.hints.slice(0, hintsShown).map((h) => "<li>" + inline(h) + "</li>").join("") + "</ol>" : "";
    const sol = ui.solShown[k] ? '<div class="card sec"><h3>Model answer</h3><div class="prose"><pre><code>' + esc(ex.sol) + '</code></pre></div><button class="btn line sm" data-act="usesol" data-k="' + k + '">Put it in the editor</button></div>' : "";
    return '<p class="crumb"><a href="#courses">Courses</a> / <a href="#course-' + id + '">' + esc(m.title) + "</a> / Exercise " + (i + 1) + " of " + lx.ex.length + "</p>" +
      '<div class="ex"><div class="stack"><div class="card"><div class="row between"><span class="tag ' + (ex.kind === "sql" ? "k-learn" : "k-build") + '">' + (ex.kind === "sql" ? "SQL" : "Python") + "</span>" + (st.ok ? '<span class="state ok">' + TICK + " Solved</span>" : '<span class="state">+' + PTS.ex + " XP</span>") + '</div><h1 style="font-size:26px;margin-top:10px">' + esc(ex.t) + '</h1><div class="prose" style="font-size:16px;margin-top:12px">' + md(ex.md) + "</div>" +
      '<p class="xs muted" style="margin:0">' + (ex.kind === "sql" ? "Your query runs on a fresh copy of the tables and the rows are compared with the expected answer." : ex.mode === "write-tests" ? "Your tests run against a correct version and some broken ones." : "Your code runs, then a set of checks. Use print() freely: output shows in the console.") + "</p></div>" +
      '<div class="card"><h3>Stuck?</h3><div class="row"><button class="btn line sm" data-act="hint" data-id="' + id + '" data-ex="' + ex.id + '"' + (hintsShown >= ex.hints.length ? " disabled" : "") + ">" + (hintsShown >= ex.hints.length ? "No more hints" : "Show a hint (" + (ex.hints.length - hintsShown) + " left)") + "</button>" +
      '<button class="btn line sm" data-act="sol" data-id="' + id + '" data-ex="' + ex.id + '"' + (canSol && !ui.solShown[k] ? "" : " disabled") + ">" + (ui.solArm[k] ? "Click again to see the answer" : "Show the answer") + "</button></div>" +
      (canSol ? "" : '<p class="xs muted" style="margin:8px 0 0">The answer unlocks after two runs or every hint. Solving it yourself earns ' + PTS.ex + " XP; with the answer, " + PTS.exSol + ".</p>") + hints + "</div>" + sol + "</div>" +
      '<div><div class="editor"><div class="bar-top"><span><span class="dots"><i></i><i></i><i></i></span>' + (ex.kind === "sql" ? "query.sql" : "solution.py") + '</span><span id="pystate">' + esc(pyState) + '</span></div><textarea id="code" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Your code" data-k="' + k + '">' + esc(code) + "</textarea></div>" +
      '<div class="row" style="margin-top:12px"><button class="btn lg" data-act="run" data-id="' + id + '" data-ex="' + ex.id + '"' + (res && res.running ? " disabled" : "") + '>Run the checks</button><button class="btn line" data-act="resetcode" data-id="' + id + '" data-ex="' + ex.id + '">Reset</button><span class="xs muted">Ctrl or Cmd + Enter runs</span></div>' +
      out + '<div class="card sec">' + tutorBlock("ex-" + k, "Ask the tutor", "The tutor sees the exercise, your code and the last result. It gives hints, not answers.", null) + "</div></div></div>";
  }

  /* ---------- quiz ---------- */
  function vQuiz(r) {
    const id = r.id, m = byId[id];
    if (!LX[id]) { needLX(id).then(() => { if (route().id === id) render(); }); return loading(300); }
    let qs = ui.quiz[id];
    if (!qs || !qs.set) { const pool = poolOf(id); qs = ui.quiz[id] = { set: shuffle(pool).slice(0, Math.min(5, pool.length)).map((q) => q.key), ans: {}, done: false }; }
    const info = quizInfo(id), qsList = qs.set.map(qByKey).filter(Boolean);
    const body = qsList.map((q, i) => mcq(q, id + "-q" + i, { num: i + 1, attr: 'data-q="' + id + ":" + i + '"', done: qs.done, chosen: qs.ans[i] })).join("");
    const answered = Object.keys(qs.ans).length;
    const foot = qs.done
      ? '<div class="row" style="margin-top:18px;gap:16px"><span class="score n" style="color:var(--' + (qs.score >= 80 ? "ok" : "fail") + ')">' + qs.score + "%</span><span>" + (qs.score >= 80 ? "Passed." + (byId[id] && !(S.mods[id] || {}).done ? " You can mark the course complete." : "") : "Not yet. Read the explanations, revisit the lessons and try a new set.") + '</span><button class="btn line" data-act="retry" data-id="' + id + '">New set of questions</button>' + (qs.score >= 80 ? '<a class="btn" href="#course-' + id + '">Back to the course</a>' : "") + "</div>"
      : '<div class="row" style="margin-top:18px"><button class="btn lg" data-act="submit" data-id="' + id + '"' + (answered < qsList.length ? " disabled" : "") + '>Check my answers</button><span class="xs muted" id="qcount">' + answered + " of " + qsList.length + " answered</span></div>";
    return '<div class="narrow"><p class="crumb"><a href="#courses">Courses</a> / <a href="#course-' + id + '">' + esc(m.title) + "</a> / Quiz</p><h1>Quiz: " + esc(m.title) + '</h1><p class="lede">' + qsList.length + " questions, no notes, pass mark 80%. Passing earns " + PTS.quiz + " XP." + (info.attempts ? " Best so far " + info.best + "% over " + plural(info.attempts, "attempt") + "." : "") + "</p>" +
      '<div id="quiz" class="card sec">' + body + foot + "</div></div>";
  }

  /* ---------- practice ---------- */
  function vPractice() {
    const P = ui.prac, started = MOD.filter((m) => inPlan(m.id) && (S.mods[m.id] && (Object.keys(S.mods[m.id].checks || {}).length || S.mods[m.id].quiz || S.mods[m.id].done)));
    const missN = Object.keys(S.miss).length;
    if (!P) {
      const opts = MOD.filter((m) => inPlan(m.id)).map((m) => '<option value="' + m.id + '">' + esc(m.title) + "</option>").join("");
      return '<div class="narrow"><h1>Practice</h1><p class="lede">Ten questions at a time with instant feedback. Questions you miss come back until you get them right: that\'s spaced retrieval, the most reliable way to make things stick.</p>' +
        '<div class="stack sec">' +
        '<div class="card row between"><div><h3>Mixed review</h3><p class="small muted" style="margin:0">' + (started.length ? "From the " + plural(started.length, "course") + " you've started, missed questions first." : "Start a course first; until then this draws from your first course.") + '</p></div><button class="btn" data-act="pstartp" data-mode="mixed">Start</button></div>' +
        '<div class="card row between"><div><h3>Questions you missed</h3><p class="small muted" style="margin:0">' + (missN ? plural(missN, "question") + " waiting." : "Nothing missed yet.") + '</p></div><button class="btn line" data-act="pstartp" data-mode="miss"' + (missN ? "" : " disabled") + ">Start</button></div>" +
        '<div class="card"><h3>One course</h3><div class="row" style="align-items:flex-end"><div class="field" style="margin:0;flex:1;min-width:220px"><label class="xs" for="p-mod">Course</label><select id="p-mod">' + opts + '</select></div><button class="btn line" data-act="pstartp" data-mode="one">Start</button></div></div></div></div>';
    }
    if (P.loading) return loading(300);
    if (P.i >= P.qs.length) {
      const right = P.res.filter(Boolean).length;
      return '<div class="narrow"><h1>Practice done</h1><p class="lede"><b class="n" style="font-size:1.4em">' + right + " of " + P.qs.length + "</b> right. " + (right === P.qs.length ? "Clean sweep." : "The ones you missed will come back next time.") + "</p>" +
        '<div class="card sec">' + P.qs.map((k, i) => { const q = qByKey(k); return q ? mcq(q, "pr-" + i, { num: i + 1, done: true, chosen: P.ans[i] }) : ""; }).join("") + "</div>" +
        '<div class="row" style="margin-top:18px"><button class="btn" data-act="pstartp" data-mode="' + P.mode + '">Practise again</button><button class="btn line" data-act="pexit">Choose another set</button></div></div>';
    }
    const q = qByKey(P.qs[P.i]), a = P.ans[P.i];
    return '<div class="narrow"><div class="pbar" aria-hidden="true">' + P.qs.map((_, i) => '<i class="' + (i <= P.i ? "on" : "") + '"></i>').join("") + "</div>" +
      '<p class="xs muted">Question <span class="n">' + (P.i + 1) + " of " + P.qs.length + "</span> · " + esc(byId[q.mid].title) + '</p><p class="pq">' + rich(q.q) + "</p>" +
      q.o.map((o, j) => '<button class="popt' + (a != null ? (j === q.a ? " right" : j === a ? " wrong" : "") : "") + '" data-act="ppick" data-i="' + j + '"' + (a != null ? " disabled" : "") + ">" + rich(o) + "</button>").join("") +
      (a != null ? '<p class="notice" style="background:' + (a === q.a ? "var(--ok-soft)" : "var(--fail-soft)") + '">' + (a === q.a ? "<b>Right.</b> " : "<b>Not quite.</b> ") + rich(q.e || "") + '</p><button class="btn lg" data-act="pnext">' + (P.i === P.qs.length - 1 ? "See my score" : "Next question") + "</button>" : "") +
      '<p style="margin-top:22px"><button class="link" data-act="pexit">Stop practising</button></p></div>';
  }
