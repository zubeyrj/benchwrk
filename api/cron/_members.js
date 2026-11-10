// Loads everything the scheduled emails need in three queries.
import { adminClient } from "../_lib.js";

export async function loadMembers() {
  const db = adminClient();
  const [profiles, learners, states, pairs] = await Promise.all([
    db.from("profiles").select("id, email, name, prefs, unsub_token").limit(5000),
    db.from("docs").select("path, data").eq("parent", "learners").limit(5000),
    db.from("docs").select("path, data").like("path", "data/users/%/state").limit(5000),
    db.from("docs").select("path, data").eq("parent", "pairs").limit(5000),
  ]);
  const by = (rows, at) => Object.fromEntries((rows.data || []).map((r) => [r.path.split("/")[at], r.data]));
  const L = by(learners, 1), S = by(states, 2), P = by(pairs, 1);
  return (profiles.data || []).filter((p) => p.email && L[p.id] && S[p.id] && S[p.id].account)
    .map((p) => ({ profile: p, prefs: Object.assign({ weekly: true, streak: true, partner: true }, p.prefs || {}), summary: L[p.id], state: S[p.id], pair: P[p.id] || null, partnerSummary: P[p.id] && P[p.id].partner ? L[P[p.id].partner] || null : null }));
}
