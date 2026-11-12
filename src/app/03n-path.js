  /* ---------- Lean or full path, and optional extras ---------- */
  function extraBtn(m) {
    const on = (S.extras || {})[m.id], started = extraOn(m) && !on;
    if (started) return '<p class="xs muted" style="margin:6px 0 0">In your plan because you\'ve started it.</p>';
    return '<button class="btn ' + (on ? "line " : "") + 'sm" data-act="extra" data-id="' + m.id + '">' + (on ? "Remove from my plan" : "Add to my plan") + "</button>";
  }
  function pathHours(path) {
    const st = Object.assign({}, S, { path, extras: path === "full" ? S.extras : {} }), P = plan(st);
    const ap = P.rows.findIndex((r) => r.m.id === P.applyAfter);
    return { total: P.total, apply: ap >= 0 ? P.rows[ap].e : P.total, end: P.end, applyAt: P.applyAt };
  }
  function pathCard() {
    if (!MOD.length) return "";
    const L = pathHours("lean"), F = pathHours("full"), extras = MOD.filter((m) => m.extra);
    const opt = (v, title, H, note) => '<label><input type="radio" name="st-path" value="' + v + '"' + ((S.path || "lean") === v ? " checked" : "") + "><span><b>" + title + "</b> " + '<span class="muted">' + H.total + " hours, finish " + fmtY(H.end) + "</span><br><span class=\"small muted\">" + note + "</span></span></label>";
    return '<div class="card sec" id="path"><h2>Your path</h2><fieldset><legend class="sr">Which path</legend><div class="choice">' +
      opt("lean", "Lean (recommended)", L, "Everything you need for three projects and the job search. Start applying from " + fmtY(L.applyAt) + ", after project 2.") +
      opt("full", "Full", F, "Adds " + extras.map((m) => m.title).join(", ") + " and a few deeper lessons. Start applying from " + fmtY(F.applyAt) + ", after project 3.") +
      '</div></fieldset><p class="small muted" style="margin:12px 0 0">On the lean path you can still add any extra on its course page.</p></div>';
  }
  document.addEventListener("change", (e) => {
    const t = e.target; if (phase !== "ready" || t.name !== "st-path") return;
    S.path = t.value === "full" ? "full" : "lean"; persist();
    toast(S.path === "full" ? "Full path: every course and lesson is in your plan." : "Lean path: optional extras are out of your plan.");
    render();
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest('[data-act="extra"]'); if (!b || phase !== "ready") return;
    const id = b.dataset.id, m = byId[id]; if (!m) return;
    S.extras = Object.assign({}, S.extras);
    if (S.extras[id]) { delete S.extras[id]; toast(m.title + " is out of your plan."); }
    else { S.extras[id] = true; toast(m.title + " added. Your dates have moved by " + Math.round(plan().rows.find((r) => r.m.id === id).hours / clampH(S.hpw)) + " weeks."); }
    persist(); render();
  });
  document.addEventListener("click", (e) => {
    const a = e.target.closest('[data-act="topath"]'); if (!a || phase !== "ready") return;
    setTimeout(() => { const el = document.getElementById("path"); if (el) el.scrollIntoView({ block: "start" }); }, 60);
  });
