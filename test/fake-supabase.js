// An in-memory stand-in for the parts of supabase-js Benchwork uses. Works in Node and in the browser.
// Access rules are not modelled here; test/rls.test.mjs checks those against real Postgres.
(function (root) {
  function makeFakeSupabase(opts) {
    opts = opts || {};
    const tables = { docs: [], profiles: [], admins: [], certs: [], ai_usage: [], email_log: [], errors: [], push_subs: [] };
    const users = {}; // id -> { id, email, password, confirmed, user_metadata, app_metadata, created_at }
    const tokens = {}; // access token -> user id
    const listeners = [];
    const calls = [];
    let session = null, seq = 0;
    const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
    const uuid = () => { seq++; return ("00000000-0000-4000-8000-" + String(seq).padStart(12, "0")); };
    const today = () => new Date().toISOString().slice(0, 10);
    const keyOf = { docs: ["path"], profiles: ["id"], admins: ["user_id"], certs: ["user_id", "course"], ai_usage: ["user_id", "day", "kind"] };

    function decorate(t, row) {
      if (t === "docs") { row.parent = row.path.replace(/\/[^/]+$/, ""); row.updated_at = new Date().toISOString(); }
      if (t === "certs" && !row.id) row.id = Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10);
      if (t === "certs" && !row.issued) row.issued = today();
      if (t === "push_subs") { row.id = row.id || ++seq; row.created_at = row.created_at || new Date().toISOString(); }
      if (t === "email_log" && !row.sent_at) row.sent_at = new Date().toISOString();
      if (t === "errors") { row.at = row.at || new Date().toISOString(); row.id = row.id || ++seq; if (row.resolved === undefined) row.resolved = false; }
      if (t === "profiles" && !row.prefs) row.prefs = { weekly: true, streak: true, partner: true };
      return row;
    }
    const likeRe = (pat) => new RegExp("^" + pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$");

    function builder(t) {
      const st = { t, filters: [], op: "select", cols: "*", payload: null, conflict: null, order: null, limit: null, head: false, count: false, returning: false };
      const b = {
        select(cols, o) { if (st.op === "select") st.cols = cols || "*"; else st.returning = true; if (o && o.head) st.head = true; if (o && o.count) st.count = true; return b; },
        eq(c, v) { st.filters.push((r) => r[c] === v); return b; },
        in(c, vs) { st.filters.push((r) => vs.indexOf(r[c]) >= 0); return b; },
        like(c, p) { const re = likeRe(p); st.filters.push((r) => re.test(String(r[c]))); return b; },
        gte(c, v) { st.filters.push((r) => r[c] >= v); return b; },
        lt(c, v) { st.filters.push((r) => r[c] < v); return b; },
        order(c) { st.order = c; return b; },
        limit(n) { st.limit = n; return b; },
        insert(rows) { st.op = "insert"; st.payload = [].concat(rows); return b; },
        upsert(rows, o) { st.op = "upsert"; st.payload = [].concat(rows); st.conflict = o && o.onConflict ? o.onConflict.split(",") : keyOf[t]; return b; },
        update(obj) { st.op = "update"; st.payload = obj; return b; },
        delete() { st.op = "delete"; return b; },
        maybeSingle() { return run().then((r) => (r.error ? r : { data: r.data && r.data.length ? r.data[0] : null, error: null })); },
        single() { return run().then((r) => (r.error ? r : r.data && r.data.length === 1 ? { data: r.data[0], error: null } : { data: null, error: { message: "not single" } })); },
        then(res, rej) { return run().then(res, rej); },
      };
      function pick(r) {
        if (!st.cols || st.cols === "*") return clone(r);
        const o = {}; st.cols.split(",").map((s) => s.trim()).forEach((c) => { o[c] = clone(r[c]); }); return o;
      }
      async function run() {
        calls.push({ t, op: st.op });
        if (opts.failTables && opts.failTables[t]) return { data: null, error: { message: "denied" } };
        const rows = tables[t];
        const match = (r) => st.filters.every((f) => f(r));
        if (st.op === "select") {
          let out = rows.filter(match);
          if (st.order) out = out.slice().sort((a, b) => (a[st.order] < b[st.order] ? -1 : 1));
          if (st.limit) out = out.slice(0, st.limit);
          return { data: st.head ? null : out.map(pick), count: out.length, error: null };
        }
        if (st.op === "insert") { const added = st.payload.map((r) => decorate(t, clone(r))); added.forEach((r) => rows.push(r)); return { data: st.returning ? added.map(clone) : null, error: null }; }
        if (st.op === "upsert") {
          const out = st.payload.map((p) => {
            const r = decorate(t, clone(p));
            const i = rows.findIndex((x) => st.conflict.every((k) => x[k] === r[k]));
            if (i >= 0) { rows[i] = Object.assign(rows[i], r); return rows[i]; }
            rows.push(r); return r;
          });
          return { data: st.returning ? out.map(clone) : null, error: null };
        }
        if (st.op === "update") { rows.filter(match).forEach((r) => Object.assign(r, clone(st.payload))); return { data: null, error: null }; }
        if (st.op === "delete") { tables[t] = rows.filter((r) => !match(r)); return { data: null, error: null }; }
      }
      return b;
    }

    function makeSession(u) {
      const token = "tok-" + u.id + "-" + Math.random().toString(36).slice(2);
      tokens[token] = u.id;
      return { access_token: token, user: publicUser(u) };
    }
    const publicUser = (u) => ({ id: u.id, email: u.email, user_metadata: clone(u.user_metadata || {}), app_metadata: clone(u.app_metadata || { provider: "email" }), created_at: u.created_at });
    const emit = (ev, s) => listeners.forEach((l) => l(ev, s));

    function addUser(email, password, meta, confirmed, provider) {
      const u = { id: opts.ids && opts.ids[email] ? opts.ids[email] : uuid(), email, password, confirmed: !!confirmed, user_metadata: meta || {}, app_metadata: { provider: provider || "email" }, created_at: new Date().toISOString() };
      users[u.id] = u;
      tables.profiles.push(decorate("profiles", { id: u.id, email, name: (meta && (meta.full_name || meta.name)) || "", unsub_token: uuid(), created_at: u.created_at }));
      if (opts.ownerEmail && email.toLowerCase() === opts.ownerEmail.toLowerCase()) tables.admins.push({ user_id: u.id });
      else if (opts.firstIsOwner && !tables.admins.length) tables.admins.push({ user_id: u.id });
      return u;
    }
    const byEmail = (e) => Object.values(users).find((u) => u.email.toLowerCase() === String(e).toLowerCase());

    const auth = {
      async getSession() { return { data: { session: clone(session) }, error: null }; },
      onAuthStateChange(fn) { listeners.push(fn); return { data: { subscription: { unsubscribe() {} } } }; },
      async signUp({ email, password, options }) {
        if (byEmail(email)) return { data: { user: { id: "x", identities: [] }, session: null }, error: null };
        const u = addUser(email, password, options && options.data, opts.autoConfirm);
        calls.push({ t: "auth", op: "signUp", email, redirect: options && options.emailRedirectTo });
        if (opts.autoConfirm) { session = makeSession(u); emit("SIGNED_IN", session); return { data: { user: publicUser(u), session }, error: null }; }
        return { data: { user: Object.assign(publicUser(u), { identities: [{}] }), session: null }, error: null };
      },
      async signInWithPassword({ email, password }) {
        const u = byEmail(email);
        if (!u || u.password !== password) return { data: {}, error: { message: "Invalid login credentials" } };
        if (!u.confirmed) return { data: {}, error: { message: "Email not confirmed" } };
        session = makeSession(u); emit("SIGNED_IN", session); return { data: { session }, error: null };
      },
      async signInWithOAuth(o) { calls.push({ t: "auth", op: "oauth", provider: o.provider, redirect: o.options && o.options.redirectTo }); return { data: {}, error: null }; },
      async resend(o) { calls.push({ t: "auth", op: "resend", email: o.email }); return { error: null }; },
      async resetPasswordForEmail(email, o) { calls.push({ t: "auth", op: "reset", email, redirect: o && o.redirectTo }); return { error: null }; },
      async updateUser(o) { if (!session) return { error: { message: "no session" } }; users[session.user.id].password = o.password; return { data: {}, error: null }; },
      async signOut() { session = null; emit("SIGNED_OUT", null); return { error: null }; },
      async getUser(token) { const id = tokens[token]; return id && users[id] ? { data: { user: publicUser(users[id]) }, error: null } : { data: { user: null }, error: { message: "bad token" } }; },
      admin: { async deleteUser(id) { delete users[id]; for (const t of ["profiles", "certs", "ai_usage", "email_log", "admins", "push_subs"]) tables[t] = tables[t].filter((r) => (r.id || r.user_id) !== id && r.user_id !== id); return { error: null }; } },
    };

    const client = {
      from: builder, auth, calls, tables, users,
      async rpc(name, a) {
        if (name === "bump_ai") {
          const k = tables.ai_usage.find((r) => r.user_id === a.uid && r.day === today() && r.kind === a.k);
          if (k) { k.calls++; k.in_tokens += a.inp; k.out_tokens += a.outp; } else tables.ai_usage.push({ user_id: a.uid, day: today(), kind: a.k, calls: 1, in_tokens: a.inp, out_tokens: a.outp });
        }
        return { data: null, error: null };
      },
      channel() { const ch = { on() { return ch; }, subscribe() { return ch; } }; return ch; },
      removeChannel() {},
      // Test helpers
      _addUser: addUser,
      _signInAs(email) { session = makeSession(byEmail(email)); return session; },
      _tokenFor(email) { return makeSession(byEmail(email)).access_token; },
      _confirm(email) { byEmail(email).confirmed = true; },
      _doc(path, data) { builder("docs").upsert({ path, data }).then(() => {}); },
    };
    return client;
  }
  root.makeFakeSupabase = makeFakeSupabase;
  if (typeof module !== "undefined") module.exports = makeFakeSupabase;
})(typeof globalThis !== "undefined" ? globalThis : this);
