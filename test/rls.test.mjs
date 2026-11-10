// Runs supabase/schema.sql in an embedded Postgres with a stand-in for Supabase's auth schema,
// then checks every access rule as the admin, a member, another member and a signed-out visitor.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite();
let fails = 0, n = 0;
const ok = (name, cond) => { n++; if (!cond) { fails++; console.log("FAIL", name); } };

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  create publication supabase_realtime;
`);
await db.exec(fs.readFileSync(path.join(root, "supabase/schema.sql"), "utf8"));
await db.exec(fs.readFileSync(path.join(root, "supabase/schema.sql"), "utf8")); // re-runnable
await db.exec(`grant usage on schema public to anon, authenticated;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant execute on all functions in schema public to anon, authenticated;
  revoke update on public.profiles from authenticated; grant update (name, prefs, last_seen) on public.profiles to authenticated;
  revoke insert on public.errors from anon, authenticated;
  revoke execute on function public.bump_ai(uuid, text, int, int), public.set_owner(text) from anon, authenticated;`);

const OWNER = "11111111-1111-1111-1111-111111111111", A = "22222222-2222-2222-2222-222222222222", B = "33333333-3333-3333-3333-333333333333";
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${A}', 'amira@example.org', '{"full_name":"Amira K"}');`);
await db.exec(`select public.set_owner('Owner@Example.org');`);
await db.exec(`insert into auth.users (id, email) values ('${OWNER}', 'owner@example.org'), ('${B}', 'ben@example.org');`);

async function as(uid, sql, params) {
  await db.exec(uid ? `set role authenticated; select set_config('app.uid', '${uid}', false);` : `set role anon; select set_config('app.uid', '', false);`);
  try { const r = await db.query(sql, params); return { rows: r.rows, count: r.affectedRows }; }
  catch (e) { return { err: e.message }; }
  finally { await db.exec("reset role;"); }
}
const write = (uid, p, data = { x: 1 }) => as(uid, "insert into docs (path, data) values ($1, $2) on conflict (path) do update set data = excluded.data returning path", [p, data]);
const read = async (uid, p) => ((await as(uid, "select data from docs where path = $1", [p])).rows || [])[0];

ok("profile created with Google name", (await db.query(`select name from profiles where id = '${A}'`)).rows[0].name === "Amira K");
ok("owner becomes admin on sign-up after set_owner", (await db.query(`select count(*)::int c from admins where user_id = '${OWNER}'`)).rows[0].c === 1);
ok("only one admin", (await db.query(`select count(*)::int c from admins`)).rows[0].c === 1);

ok("admin writes course content", !(await write(OWNER, "content/m1")).err);
ok("admin writes lessons", !(await write(OWNER, "lessons/m1")).err);
ok("member cannot write content", !!(await write(A, "content/m1", { hacked: true })).err);
ok("member cannot write lessons", !!(await write(A, "lessons/m9")).err);
{ const r = await read(OWNER, "content/m1"); ok("content intact", r && r.data.x === 1); }
ok("member reads content", !!(await read(A, "content/m1")));
ok("signed-out visitor reads nothing", !(await read(null, "content/m1")));
ok("signed-out visitor cannot write", !!(await write(null, "learners/" + A)).err);

for (const c of ["learners", "subs", "reviews", "pairs"]) {
  ok(c + ": member writes own", !(await write(A, c + "/" + A)).err);
  ok(c + ": member cannot write another's", !!(await write(A, c + "/" + B)).err);
  ok(c + ": other member reads it", !!(await read(B, c + "/" + A)));
  ok(c + ": admin can tidy it", !(await write(OWNER, c + "/" + A, { tidied: true })).err);
  ok(c + ": no nested writes", !!(await write(A, c + "/" + A + "/x")).err);
}
ok("member writes own private state", !(await write(A, `data/users/${A}/state`, { secret: 1 })).err);
ok("other member cannot read private state", !(await read(B, `data/users/${A}/state`)));
ok("admin cannot read private state", !(await read(OWNER, `data/users/${A}/state`)));
ok("member cannot write another's private state", !!(await write(B, `data/users/${A}/state`)).err);
ok("member files own report", !(await write(A, "reports/" + A, { items: [{ kind: "review", target: B }] })).err);
ok("member can't file as someone else", !!(await write(A, "reports/" + B)).err);
ok("reported member can't read the report", !(await read(B, "reports/" + A)));
ok("admin reads reports", !!(await read(OWNER, "reports/" + A)));
ok("reporter reads own report", !!(await read(A, "reports/" + A)));
ok("members see only their own reports in a list", (await as(B, "select path from docs where parent = 'reports'")).rows.length === 0);
await db.query(`insert into errors (source, message, fingerprint) values ('client', 'x', 'f')`);
ok("members can't read errors", ((await as(A, "select * from errors")).rows || []).length === 0);
ok("admin reads errors", (await as(OWNER, "select * from errors")).rows.length === 1);
ok("members can't write errors", !!(await as(A, "insert into errors (source, message, fingerprint) values ('client','y','g')")).err || ((await db.query("select count(*)::int c from errors")).rows[0].c === 1));
ok("member saves own push subscription", !(await as(A, `insert into push_subs (user_id, endpoint, p256dh, auth) values ('${A}', 'https://push.example/a', 'k', 'a')`)).err);
ok("can't save one for someone else", !!(await as(A, `insert into push_subs (user_id, endpoint, p256dh, auth) values ('${B}', 'https://push.example/b', 'k', 'a')`)).err);
ok("others can't see your push subscriptions", ((await as(B, "select * from push_subs")).rows || []).length === 0);
ok("unknown collections refused", !!(await write(A, "misc/" + A)).err);
const del = await as(A, "delete from docs where path = $1", ["content/m1"]);
ok("member cannot delete content", (await read(OWNER, "content/m1")) && !del.err);

ok("member sees own profile only", (await as(A, "select id from profiles")).rows.length === 1);
ok("admin sees all profiles", (await as(OWNER, "select id from profiles")).rows.length === 3);
ok("member can change own prefs", !(await as(A, `update profiles set prefs = '{"weekly":false}' where id = '${A}'`)).err);
ok("member cannot change own email", !!(await as(A, `update profiles set email = 'x@y.z' where id = '${A}'`)).err);
const pb = await as(A, `update profiles set name = 'pwned' where id = '${B}'`);
ok("member cannot change another profile", (await db.query(`select name from profiles where id = '${B}'`)).rows[0].name !== "pwned");

ok("member issues own certificate", !(await as(A, `insert into certs (user_id, name, course, course_title) values ('${A}', 'Amira', 'm1', 'Python')`)).err);
ok("cannot issue for someone else", !!(await as(A, `insert into certs (user_id, name, course, course_title) values ('${B}', 'Ben', 'm1', 'Python')`)).err);
const pub = await as(null, "select id, name, course_title from certs");
ok("anyone can verify a certificate", pub.rows && pub.rows.length === 1 && pub.rows[0].id.length === 16);

ok("members cannot bump tutor usage", !!(await as(A, `select bump_ai('${A}', 'tutor', 1, 1)`)).err);
await db.query(`select bump_ai('${A}', 'tutor', 100, 50)`); await db.query(`select bump_ai('${A}', 'tutor', 10, 5)`); await db.query(`select bump_ai('${A}', 'interview', 7, 7)`);
ok("tutor usage accumulates", (await db.query(`select calls, in_tokens from ai_usage where user_id = '${A}' and kind = 'tutor'`)).rows[0].calls === 2);
ok("admin reads tutor usage", (await as(OWNER, "select * from ai_usage")).rows.length === 2);
ok("member cannot read others' usage", (await as(B, "select * from ai_usage")).rows.length === 0);
ok("members cannot read email log", ((await as(A, "select * from email_log")).rows || []).length === 0);
ok("members cannot read settings", ((await as(A, "select * from app_settings")).rows || []).length === 0);
ok("members cannot make themselves admin", !!(await as(A, `insert into admins values ('${A}')`)).err);
ok("set_owner not callable by members", !!(await as(A, `select set_owner('amira@example.org')`)).err);
ok("parent column", (await db.query(`select parent from docs where path = 'learners/${A}'`)).rows[0].parent === "learners");

console.log(fails ? fails + " failures of " + n : "RLS: all " + n + " checks passed");
process.exit(fails ? 1 : 0);
