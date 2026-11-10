-- Benchwork database. Run once in the Supabase SQL editor (Project > SQL > New query > paste > Run).
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Documents: one row per document path, e.g. "learners/<uid>" or "content/m3".
-- The app talks to this table through a small document API (public/platform.js).
-- ---------------------------------------------------------------------------
create table if not exists public.docs (
  path        text primary key check (path ~ '^[A-Za-z0-9_.-]+(/[A-Za-z0-9_.-]+)+$'),
  parent      text generated always as (regexp_replace(path, '/[^/]+$', '')) stored,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
create index if not exists docs_parent_idx on public.docs (parent);

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Who may read a path. Shared cohort data needs a signed-in member; a member's
-- private folder (data/users/<uid>/...) is readable by that member only, not even the admin.
create or replace function public.doc_read_ok(p text) returns boolean
language sql stable as $$
  select case
    when auth.uid() is null then false
    when split_part(p, '/', 1) = 'data' then split_part(p, '/', 2) = 'users' and split_part(p, '/', 3) = auth.uid()::text
    when split_part(p, '/', 1) in ('content', 'lessons', 'learners', 'subs', 'reviews', 'pairs') then true
    else false
  end;
$$;

-- Who may write a path. Course content: the admin only. Cohort records: each member
-- writes their own document (collection/<uid>), the admin may tidy any of them.
create or replace function public.doc_write_ok(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then false
    when split_part(p, '/', 1) = 'data' then split_part(p, '/', 2) = 'users' and split_part(p, '/', 3) = auth.uid()::text
    when split_part(p, '/', 1) in ('content', 'lessons') then public.is_admin()
    when split_part(p, '/', 1) in ('learners', 'subs', 'reviews', 'pairs') and p !~ '^[^/]+/[^/]+/' then
      split_part(p, '/', 2) = auth.uid()::text or public.is_admin()
    else false
  end;
$$;

alter table public.docs enable row level security;
drop policy if exists docs_select on public.docs;
drop policy if exists docs_insert on public.docs;
drop policy if exists docs_update on public.docs;
drop policy if exists docs_delete on public.docs;
create policy docs_select on public.docs for select using (public.doc_read_ok(path));
create policy docs_insert on public.docs for insert with check (public.doc_write_ok(path));
create policy docs_update on public.docs for update using (public.doc_write_ok(path)) with check (public.doc_write_ok(path));
create policy docs_delete on public.docs for delete using (public.doc_write_ok(path));

alter table public.admins enable row level security;
drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins for select using (user_id = auth.uid());

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before update on public.docs for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Profiles: email and preferences per member. Members see their own row;
-- the admin sees everyone's (for the admin page and emailing learners).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  name        text,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz,
  prefs       jsonb not null default '{"weekly": true, "streak": true, "partner": true}'::jsonb,
  unsub_token uuid not null default gen_random_uuid()
);
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Members may change their name and email preferences, nothing else.
revoke update on public.profiles from authenticated;
grant update (name, prefs, last_seen) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do update set email = excluded.email;
  -- The owner's email (set below with app_settings) becomes the one admin.
  if lower(new.email) = lower((select value from public.app_settings where key = 'owner_email')) then
    insert into public.admins (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;

create table if not exists public.app_settings (key text primary key, value text);
alter table public.app_settings enable row level security; -- no policies: server-side only

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Certificates: public, so anyone with the link can verify one.
-- ---------------------------------------------------------------------------
create table if not exists public.certs (
  id          text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  course      text not null,
  course_title text not null,
  hours       numeric,
  issued      date not null default current_date,
  unique (user_id, course)
);
alter table public.certs enable row level security;
drop policy if exists certs_select on public.certs;
drop policy if exists certs_insert on public.certs;
drop policy if exists certs_update on public.certs;
create policy certs_select on public.certs for select using (true);
create policy certs_insert on public.certs for insert with check (user_id = auth.uid());
create policy certs_update on public.certs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select on public.certs to anon;

-- ---------------------------------------------------------------------------
-- Server-side bookkeeping: AI spend (tutor, interviewer, job-page fetches) and sent emails. Written by the API with
-- the service key; the admin can read tutor usage for the analytics panel.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null default current_date,
  kind       text not null default 'tutor', -- tutor | interview | fetch
  calls      int not null default 0,
  in_tokens  int not null default 0,
  out_tokens int not null default 0,
  primary key (user_id, day, kind)
);
alter table public.ai_usage enable row level security;
drop policy if exists ai_usage_select on public.ai_usage;
create policy ai_usage_select on public.ai_usage for select using (user_id = auth.uid() or public.is_admin());

create table if not exists public.email_log (
  id      bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  kind    text not null,
  ref     text,
  sent_at timestamptz not null default now()
);
create index if not exists email_log_user_kind on public.email_log (user_id, kind, sent_at desc);
alter table public.email_log enable row level security; -- server-side only

create or replace function public.bump_ai(uid uuid, k text, inp int, outp int) returns void
language sql security definer set search_path = public as $$
  insert into public.ai_usage (user_id, day, kind, calls, in_tokens, out_tokens) values (uid, current_date, k, 1, inp, outp)
  on conflict (user_id, day, kind) do update set calls = ai_usage.calls + 1,
    in_tokens = ai_usage.in_tokens + excluded.in_tokens, out_tokens = ai_usage.out_tokens + excluded.out_tokens;
$$;
revoke execute on function public.bump_ai(uuid, text, int, int) from public, anon, authenticated;

-- Live updates for the cohort board, partners and reviews.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'docs') then
    alter publication supabase_realtime add table public.docs;
  end if;
exception when undefined_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Owner setup: makes the account with this email the one admin, whether it
-- signs up before or after this runs. Called once from setup.sql.
-- ---------------------------------------------------------------------------
create or replace function public.set_owner(owner_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_settings (key, value) values ('owner_email', lower(owner_email))
  on conflict (key) do update set value = excluded.value;
  delete from public.admins;
  insert into public.admins (user_id) select id from auth.users where lower(email) = lower(owner_email);
end $$;
revoke execute on function public.set_owner(text) from public, anon, authenticated;
