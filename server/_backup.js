// Database backups: every table the site uses, as gzipped JSON, encrypted with BACKUP_KEY.
// File layout: "BWBK1" | salt (16) | iv (12) | auth tag (16) | AES-256-GCM ciphertext. The key comes from
// the passphrase with scrypt. scripts/restore.mjs reverses it. Without the passphrase the file is useless.
import crypto from "node:crypto";
import zlib from "node:zlib";
import { adminClient } from "./_lib.js";

export const TABLES = ["docs", "profiles", "admins", "app_settings", "certs", "portfolios", "push_subs", "ai_usage", "email_log"];
const MAGIC = Buffer.from("BWBK1");

async function all(db, t) {
  const out = [];
  for (let from = 0; from < 1e6; from += 1000) {
    const { data, error } = await db.from(t).select("*").range(from, from + 999);
    if (error) throw new Error(t + ": " + error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function dumpDatabase() {
  const db = adminClient(), tables = {};
  for (const t of TABLES) tables[t] = await all(db, t);
  // Sign-in accounts live in Supabase Auth; keep the list so accounts can be matched up after a restore.
  let users = [];
  try {
    for (let page = 1; page < 50; page++) {
      const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      const us = (data && data.users) || [];
      users.push(...us.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, provider: u.app_metadata && u.app_metadata.provider, meta: u.user_metadata || {} })));
      if (us.length < 1000) break;
    }
  } catch (e) { users = null; }
  return { format: 1, at: new Date().toISOString(), tables, users };
}

export function encrypt(obj, pass) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), key = crypto.scryptSync(pass, salt, 32);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv), body = Buffer.concat([c.update(zlib.gzipSync(JSON.stringify(obj))), c.final()]);
  return Buffer.concat([MAGIC, salt, iv, c.getAuthTag(), body]);
}
export function decrypt(buf, pass) {
  if (!buf.subarray(0, 5).equals(MAGIC)) throw new Error("Not a Benchwork backup file.");
  const salt = buf.subarray(5, 21), iv = buf.subarray(21, 33), tag = buf.subarray(33, 49), key = crypto.scryptSync(pass, salt, 32);
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv); d.setAuthTag(tag);
  let plain;
  try { plain = Buffer.concat([d.update(buf.subarray(49)), d.final()]); } catch (e) { throw new Error("Wrong passphrase, or the file is damaged."); }
  return JSON.parse(zlib.gunzipSync(plain).toString("utf8"));
}
export const counts = (dump) => Object.fromEntries(Object.entries(dump.tables).map(([k, v]) => [k, v.length]));
