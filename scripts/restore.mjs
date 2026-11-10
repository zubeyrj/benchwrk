// Restores a Benchwork backup into a Supabase project.
//   node scripts/restore.mjs benchwork-backup-2026-11-15.bwbak            (checks the file, changes nothing)
//   node scripts/restore.mjs benchwork-backup-2026-11-15.bwbak --write    (writes the rows)
// Needs BACKUP_KEY, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (never in the repo).
// Rows are upserted, so restoring over a live database puts back deleted or damaged rows without
// removing anything newer. Sign-in accounts live in Supabase Auth: rows for accounts that no longer
// exist are skipped and listed, because the database won't accept them.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "../api/_backup.js";

const [file, flag] = process.argv.slice(2);
if (!file) { console.log("Usage: node scripts/restore.mjs <file.bwbak> [--write]"); process.exit(1); }
if (!process.env.BACKUP_KEY) { console.log("Set BACKUP_KEY to the passphrase used for the backup."); process.exit(1); }
const dump = decrypt(fs.readFileSync(file), process.env.BACKUP_KEY);
console.log("Backup from " + dump.at);
for (const [t, rows] of Object.entries(dump.tables)) console.log("  " + t.padEnd(14) + rows.length + " rows");
if (flag !== "--write") { console.log("\nThe file is readable. Run again with --write to restore it."); process.exit(0); }

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ids = new Set();
for (let page = 1; page < 50; page++) { const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 }); const us = (data && data.users) || []; us.forEach((u) => ids.add(u.id)); if (us.length < 1000) break; }
const owner = (r) => r.user_id || (r.id && /^[0-9a-f-]{36}$/.test(r.id) ? r.id : null);
const KEYS = { docs: "path", profiles: "id", admins: "user_id", app_settings: "key", certs: "id", portfolios: "user_id", push_subs: "endpoint", ai_usage: "user_id,day,kind", email_log: "id" };
const missing = new Set();
for (const t of Object.keys(KEYS)) {
  let rows = dump.tables[t] || [];
  if (t !== "docs" && t !== "app_settings") rows = rows.filter((r) => { const o = owner(r); if (o && !ids.has(o)) { missing.add(o); return false; } return true; });
  if (t === "docs") rows = rows.map(({ parent, ...r }) => r); // generated column
  if (t === "email_log" || t === "push_subs") rows = rows.map(({ id, ...r }) => r);
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = t === "email_log" ? await db.from(t).insert(rows.slice(i, i + 500)) : await db.from(t).upsert(rows.slice(i, i + 500), { onConflict: t === "push_subs" ? "endpoint" : KEYS[t] });
    if (error) { console.log("  " + t + ": " + error.message); break; }
  }
  console.log("  restored " + t);
}
if (missing.size) {
  const who = (dump.users || []).filter((u) => missing.has(u.id)).map((u) => u.email);
  console.log("\nSkipped rows for " + missing.size + " account(s) that aren't in Supabase Auth any more" + (who.length ? ": " + who.join(", ") : "") + ". They'll need to sign up again.");
}
