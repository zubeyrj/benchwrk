  /* ---------- Weekly leagues (settled on the server each Monday; see server/_league.js) ---------- */
  const TIERS = ["Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond"];
  const TIER_COL = ["#b0703a", "#8a94a6", "#c99a1a", "#4f8fa8", "#1f9d6b", "#5b7cfa"];
  // Weekly XP: the XP earned since the first visit of the week. The previous week's total is kept as lw.
  function xwTick() {
    const wk = utcMonday(), pts = points();
    if (!S.xw || S.xw.wk !== wk) { const old = S.xw; S.xw = { wk, base: pts, lw: old ? { wk: old.wk, xp: Math.max(0, pts - old.base) } : null }; }
  }
  function utcMonday() { const d = new Date(); const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); }
  const myWeekXp = () => (S.xw ? Math.max(0, points() - S.xw.base) : 0);
  function leagueSummary(out) {
    xwTick(); out.wk = S.xw.wk; out.wxp = myWeekXp(); if (S.xw.lw) out.lw = S.xw.lw; if (S.leagueOff) out.lg = false;
    return out;
  }
  function wkXp(c, wk) { if (!c) return 0; if (c.id === uid) return S.xw && S.xw.wk === wk ? myWeekXp() : S.xw && S.xw.lw && S.xw.lw.wk === wk ? S.xw.lw.xp : 0; if (c.wk === wk) return Math.max(0, Math.round(Number(c.wxp) || 0)); if (c.lw && c.lw.wk === wk) return Math.max(0, Math.round(Number(c.lw.xp) || 0)); return 0; }
  const zoneSize = (n) => (n >= 5 ? Math.ceil(n * 0.2) : n >= 2 ? 1 : 0);
  function myLeague() {
    const L = CT && CT.LEAGUE; if (!L || !L.group || S.leagueOff) return null;
    const g = L.group[uid]; if (!g) return { L, none: true };
    const t = Number(L.tier[uid]) || 0, by = Object.fromEntries((cohort || []).map((c) => [c.id, c]));
    const R = Object.keys(L.group).filter((id) => L.group[id] === g && !(isBlocked(id) && id !== uid))
      .map((id) => ({ id, name: id === uid ? (S.account && S.account.name) || "You" : (by[id] && by[id].name) || "A member", xp: wkXp(id === uid ? { id } : by[id], L.wk), lvl: by[id] ? by[id].lvl : 1 }))
      .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
    const i = R.findIndex((r) => r.id === uid), n = R.length, k = zoneSize(n);
    return { L, t, R, i, n, k, up: t < TIERS.length - 1 ? k : 0, down: t > 0 && n >= 5 ? k : 0, stale: L.wk !== utcMonday() };
  }
  function endsIn() {
    const end = Date.parse(utcMonday() + "T00:00:00Z") + 7 * DAY, h = Math.max(0, Math.floor((end - Date.now()) / 36e5));
    return h >= 48 ? Math.floor(h / 24) + " days left" : h >= 1 ? h + " hours left" : "Ends within the hour";
  }
  function badge(t, size) { return '<span class="lg-badge" style="--c:' + TIER_COL[t] + ";width:" + size + "px;height:" + size + 'px" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/></svg></span>'; }
  function lastResult() {
    const L = CT && CT.LEAGUE, r = L && L.last && L.last[uid]; if (!r || S.lgSeen === L.wk) return null;
    return r;
  }
  function resultBanner(inline) {
    const r = lastResult(); if (!r) return "";
    const up = r.to > r.from, down = r.to < r.from;
    const h = up ? "Promoted to " + TIERS[r.to] + "!" : down ? "Down to " + TIERS[r.to] : "You stayed in " + TIERS[r.to];
    const b = "Last week you finished " + ordinal(r.rank) + " of " + r.n + " with " + r.xp + " XP." + (up ? " New league, tougher table." : down ? " The top of this table moves up next Monday." : "");
    return '<div class="lg-result' + (up ? " up" : down ? " down" : "") + '" role="status">' + badge(r.to, inline ? 36 : 44) + "<div><b>" + esc(h) + '</b><br><span class="small">' + esc(b) + '</span></div><button class="link small" data-act="lgseen">Got it</button></div>';
  }
  function ordinal(n) { return n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"); }
  function vLeague() {
    const head = "<h1>League</h1>";
    if (S.leagueOff) return head + '<div class="empty"><h3>You\'ve left the leagues</h3><p>Your XP still counts everywhere else.</p><button class="btn" data-act="lgjoin">Join again</button></div>';
    if (cohort === null) return head + loading(160);
    const M = myLeague();
    if (!M || M.none) return head + '<p class="lede">Every week you\'re put in a group of up to 20 members at your level. Earn XP from lessons, exercises and quizzes. On Monday the top of the table moves up a league and the bottom moves down.</p><div class="card"><h2>You join on the next update</h2><p class="muted">New members are added to a Bronze group within the hour. Do a lesson in the meantime: the XP you earn this week counts.</p></div>';
    const rows = M.R.map((r, i) => {
      const zone = i < M.up && r.xp > 0 ? "up" : M.down && i >= M.n - M.down ? "down" : "";
      return '<li class="lg-row' + (r.id === uid ? " me" : "") + (zone ? " " + zone : "") + '"><span class="lg-rank n">' + (i + 1) + '</span><span class="avatar" style="width:32px;height:32px;font-size:13px;background:var(--p1)">' + esc((r.name || "?").slice(0, 1).toUpperCase()) + '</span><span class="grow"><b>' + esc(r.name) + (r.id === uid ? " (you)" : "") + "</b>" + (zone === "up" ? '<span class="sr"> (promotion zone)</span>' : zone === "down" ? '<span class="sr"> (relegation zone)</span>' : "") + '</span><span class="n"><b>' + r.xp + '</b> <span class="xs muted">XP</span></span></li>' +
        (M.up && i === M.up - 1 && M.n > M.up ? '<li class="lg-line up" aria-hidden="true"><span>Promotion zone</span></li>' : "") + (M.down && i === M.n - M.down - 1 ? '<li class="lg-line down" aria-hidden="true"><span>Relegation zone</span></li>' : "");
    }).join("");
    const me = M.R[M.i] || { xp: 0 }, gap = M.up && M.i >= M.up ? Math.max(1, (M.R[M.up - 1] || { xp: 0 }).xp - me.xp + 1) : 0;
    const status = M.i < M.up && me.xp > 0 ? "You're in the promotion zone. Hold on to it." : gap ? gap + " XP to reach the promotion zone." : M.down && M.i >= M.n - M.down ? "You're in the relegation zone. Any XP helps." : "You're safe for now.";
    return head + resultBanner() + '<div class="lg-head card"><div class="row" style="gap:14px">' + badge(M.t, 56) + '<div><h2 style="margin:0">' + TIERS[M.t] + ' league</h2><p class="muted small" style="margin:2px 0 0">' + endsIn() + " · " + ordinal(M.i + 1) + " of " + M.n + " · " + esc(status) + "</p></div></div>" +
      '<div class="lg-tiers" aria-label="Leagues, lowest to highest">' + TIERS.map((t, i) => '<span class="' + (i === M.t ? "on" : i < M.t ? "past" : "") + '" title="' + t + '">' + badge(i, 22) + "</span>").join("") + "</div></div>" +
      '<ol class="lg-table card" aria-label="' + TIERS[M.t] + ' league table">' + rows + "</ol>" +
      '<p class="xs muted">' + (M.up ? "On Monday the top " + (M.up === 1 ? "member moves" : M.up + " move") + " up a league" : "This is the top league") + (M.down ? " and the bottom " + (M.down === 1 ? "member moves" : M.down + " move") + " down" : "") + "." + (M.t > 0 ? " Anyone who earns no XP all week drops a league." : "") + " XP comes from lessons, exercises, quizzes, reviews and interviews. " + '<button class="link xs" data-act="lgleave">Leave the leagues</button></p>';
  }
  function homeLeagueCard() {
    const M = myLeague(); if (!M || M.none) return "";
    const me = M.R[M.i] || { xp: 0 }, gap = M.up && M.i >= M.up ? Math.max(1, (M.R[M.up - 1] || { xp: 0 }).xp - me.xp + 1) : 0;
    return resultBanner(true) + '<a class="card lg-mini" href="#league">' + badge(M.t, 40) + '<div class="grow"><b>' + TIERS[M.t] + " league · " + ordinal(M.i + 1) + " of " + M.n + '</b><div class="xs muted">' + me.xp + " XP this week · " + (gap ? gap + " XP to the promotion zone" : M.i < M.up && me.xp > 0 ? "in the promotion zone" : M.down && M.i >= M.n - M.down ? "in the relegation zone" : endsIn()) + "</div></div></a>";
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b || phase !== "ready") return;
    const a = b.dataset.act;
    if (a === "lgseen") { const L = CT && CT.LEAGUE; if (L) { S.lgSeen = L.wk; persist(); render(); } return; }
    if (a === "lgleave") { S.leagueOff = true; persist(); toast("You've left the leagues."); render(); return; }
    if (a === "lgjoin") { S.leagueOff = false; persist(); toast("You're back in. You'll be placed within the hour."); render(); }
  });
