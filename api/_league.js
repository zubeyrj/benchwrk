// Weekly leagues. Everyone who takes part is in one pool, split into tiers and groups of up to 20.
// A week runs Monday 00:00 to Sunday 23:59 UTC. At the rollover the top fifth of each group moves up,
// the bottom fifth (and anyone who earned nothing) moves down. The result lives in content/league,
// which every member can read; members publish their own weekly XP in their learners/<id> summary.
export const TIERS = ["Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond"];
export const GROUP_MAX = 20;
const DAY = 864e5;

export function mondayIso(d) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); }
// The XP a member earned in league week wk, from their published summary.
export function weekXp(s, wk) {
  if (!s) return 0;
  if (s.wk === wk) return Math.max(0, Math.round(Number(s.wxp) || 0));
  if (s.lw && s.lw.wk === wk) return Math.max(0, Math.round(Number(s.lw.xp) || 0));
  return 0;
}
// How many move up or down in a group of n.
export function zoneSize(n) { return n >= 5 ? Math.ceil(n * 0.2) : n >= 2 ? 1 : 0; }
export function ranked(league, summaries, gid) {
  return Object.keys(league.group || {}).filter((id) => league.group[id] === gid)
    .map((id) => ({ id, xp: weekXp(summaries[id], league.wk), name: (summaries[id] && summaries[id].name) || "" }))
    .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name) || (a.id < b.id ? -1 : 1));
}
const active = (s, today) => s && s.lg !== false && s.at && (Date.parse(today) - Date.parse(s.at)) / DAY <= 21;
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function groupUp(ids, tier, wk, into) {
  const n = Math.ceil(ids.length / GROUP_MAX);
  ids.slice().sort((a, b) => hash(a + wk) - hash(b + wk)).forEach((id, i) => { into[id] = tier + "-" + (i % n); });
}

// Monday: settle last week and build this week's groups.
export function rollLeagues(prev, summaries, wk, today) {
  const tier = {}, last = {};
  if (prev && prev.group) {
    const gids = [...new Set(Object.values(prev.group))];
    for (const g of gids) {
      const R = ranked(prev, summaries, g), n = R.length, k = zoneSize(n);
      R.forEach((r, i) => {
        const from = (prev.tier && prev.tier[r.id]) || 0;
        let to = from;
        if (i < k && r.xp > 0 && from < TIERS.length - 1) to = from + 1;
        else if (from > 0 && (r.xp === 0 || (n >= 5 && i >= n - k))) to = from - 1;
        tier[r.id] = to;
        last[r.id] = { wk: prev.wk, rank: i + 1, n, xp: r.xp, from, to };
      });
    }
  }
  const group = {}, byTier = {};
  for (const id of Object.keys(summaries)) {
    if (!active(summaries[id], today)) continue;
    const t = tier[id] !== undefined ? tier[id] : (prev && prev.tier && prev.tier[id] !== undefined ? prev.tier[id] : 0);
    tier[id] = t; (byTier[t] = byTier[t] || []).push(id);
  }
  Object.keys(byTier).forEach((t) => groupUp(byTier[t], t, wk, group));
  Object.keys(tier).forEach((id) => { if (!group[id]) delete tier[id]; });
  // Keep tiers of people who've gone quiet, so they come back where they were.
  const kept = Object.assign({}, (prev && prev.kept) || {});
  Object.keys(last).forEach((id) => { if (!group[id]) kept[id] = last[id].to; else delete kept[id]; });
  Object.keys(kept).forEach((id) => { if (group[id]) delete kept[id]; });
  return { wk, tier, group, last, kept, at: new Date().toISOString() };
}

// Midweek: newcomers (and people back from a break) join a group with room in their tier.
export function addNewcomers(league, summaries, today) {
  let changed = false;
  for (const id of Object.keys(summaries)) {
    if (league.group[id] || !active(summaries[id], today)) continue;
    const t = league.kept && league.kept[id] !== undefined ? league.kept[id] : 0;
    const sizes = {}; Object.keys(league.group).forEach((m) => { const g = league.group[m]; if (g.split("-")[0] === String(t)) sizes[g] = (sizes[g] || 0) + 1; });
    const open = Object.keys(sizes).filter((g) => sizes[g] < GROUP_MAX).sort((a, b) => sizes[a] - sizes[b])[0];
    league.group[id] = open || t + "-" + Object.keys(sizes).length;
    league.tier[id] = t; if (league.kept) delete league.kept[id];
    changed = true;
  }
  return changed;
}

// Where one member stands this week, for reminders.
export function leagueSpot(league, summaries, id) {
  const g = league.group && league.group[id]; if (!g) return null;
  const R = ranked(league, summaries, g), i = R.findIndex((r) => r.id === id), n = R.length, k = zoneSize(n), t = league.tier[id] || 0;
  const zone = i < k && t < TIERS.length - 1 ? "up" : t > 0 && n >= 5 && i >= n - k ? "down" : "safe";
  return { tier: TIERS[t], rank: i + 1, n, xp: R[i].xp, zone, k, gapUp: k && i >= k ? Math.max(1, R[k - 1].xp - R[i].xp + 1) : 0 };
}
