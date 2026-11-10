  /* ---------- Pick up where you left off ---------- */
  // The last lesson, exercise, quiz, library page, practice problem or unfinished interview you opened is
  // saved with your progress (so it follows you to another device); how far down the page you were is kept on this device.
  const RESUMABLE = ["lesson", "ex", "quiz", "library", "problems", "ivbank", "career"];
  function resumable(r) {
    if (r.name === "interview") return r.sub === "run";
    if (r.name === "library" || r.name === "problems" || r.name === "ivbank" || r.name === "career") return !!r.sub && r.sub !== "phase";
    return RESUMABLE.indexOf(r.name) >= 0;
  }
  function resumeContext(r) {
    const m = (r.id && MOD.find((x) => x.id === r.id)) || null;
    if (r.name === "lesson") return m ? m.title + ", lesson " + (r.i + 1) : "Lesson";
    if (r.name === "ex") return m ? m.title + ", exercise" : "Exercise";
    if (r.name === "quiz") return m ? m.title + ", quiz" : "Quiz";
    if (r.name === "library") return "Library";
    if (r.name === "problems") return "Practice problem";
    if (r.name === "ivbank") return "Interview questions";
    if (r.name === "career") return "CV and pitch";
    if (r.name === "interview") return "Mock interview in progress";
    return "";
  }
  function noteResume() {
    if (phase !== "ready" || !S.placement) return;
    const r = route(); if (!resumable(r)) return;
    const h = location.hash.slice(1), title = (($app.querySelector("h1") || {}).textContent || "").trim().slice(0, 90);
    if (!title) return;
    if (r.name === "interview") { const x = ivSess(r.key); if (!x || x.ended || x.report) return; }
    if (S.resume && S.resume.h === h && S.resume.t === title) { S.resume.at = Date.now(); return; }
    S.resume = { h, t: title, c: resumeContext(r), at: Date.now() };
    persist();
  }
  // Scroll position per page, on this device only.
  let scrollT = 0;
  window.addEventListener("scroll", () => {
    clearTimeout(scrollT);
    scrollT = setTimeout(() => { if (phase !== "ready" || !S.resume || location.hash.slice(1) !== S.resume.h) return; try { localStorage.setItem("bw-resume-y", JSON.stringify({ h: S.resume.h, y: Math.round(scrollY) })); } catch (e) { /* storage blocked */ } }, 250);
  }, { passive: true });
  function resumeCard() {
    const R = S.resume; if (!R || !R.h || Date.now() - (R.at || 0) > 21 * 864e5) return "";
    const ago = Date.now() - R.at, when = ago < 36e5 ? "earlier today" : ago < 864e5 ? (new Date(R.at).toDateString() === new Date().toDateString() ? "earlier today" : "yesterday") : Math.round(ago / 864e5) + " days ago";
    return '<a class="resume" href="#' + esc(R.h) + '" data-act="resume"><span class="resume-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span><span class="grow"><span class="small muted">Pick up where you left off, ' + esc(when) + '</span><b>' + esc(R.t) + "</b>" + (R.c && R.c !== R.t ? '<span class="small muted">' + esc(R.c) + "</span>" : "") + '</span><span class="btn sm">Continue</span></a>';
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest('[data-act="resume"]'); if (!a || phase !== "ready") return;
    let y = 0; try { const s = JSON.parse(localStorage.getItem("bw-resume-y") || "null"); if (s && S.resume && s.h === S.resume.h) y = s.y; } catch (x) { /* storage blocked */ }
    if (y > 200) setTimeout(() => window.scrollTo(0, y), 80);
  });
