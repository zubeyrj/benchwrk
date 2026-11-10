// In-memory stand-in for the portal runtime: user + db (+ sample), seeded from seed/*.json and seedx/lx-*.json
window.__mock = function (seed, opts) {
  opts = opts || {};
  const store = new Map();
  for (const k in seed) store.set(k.indexOf("/") > 0 ? k : "content/" + k, JSON.parse(JSON.stringify(seed[k])));
  if (opts.state) store.set("data/users/" + (opts.uid || "u1") + "/state", JSON.parse(JSON.stringify(opts.state)));
  const listeners = [];
  const snapDoc = (p) => { const d = store.get(p); return { id: p.split("/").pop(), exists: !!d, data: () => d && JSON.parse(JSON.stringify(d)) }; };
  const coll = (c) => ({ path: c,
    get: async () => { const docs = [...store.keys()].filter(k => k.startsWith(c + "/") && k.split("/").length === c.split("/").length + 1).map(snapDoc); return { docs, size: docs.length, empty: !docs.length }; },
    onSnapshot(next) { const fire = async () => next(await this.get()); listeners.push({ c, fire }); fire(); return () => {}; },
    doc: (id) => doc(c + "/" + id) });
  const doc = (p) => ({ path: p, id: p.split("/").pop(), get: async () => snapDoc(p),
    set: async (d) => { if (opts.readOnly) throw { code: "invalid_argument", message: "denied" }; store.set(p, JSON.parse(JSON.stringify(d))); listeners.forEach(l => { if (p.startsWith(l.c + "/")) l.fire(); }); },
    update: async (d) => store.set(p, Object.assign(store.get(p) || {}, d)), delete: async () => store.delete(p), collection: (s) => coll(p + "/" + s) });
  const db = { doc, collection: coll };
  const user = { id: async () => opts.uid || "u1", me: async () => ({ name: "Zara Jones", email: opts.noEmail ? null : "z@example.org" }), isOwner: async () => opts.owner !== false, can: () => !opts.readOnly, profiles: async (ids) => Object.fromEntries([].concat(ids).map((i) => [i, { id: i, name: "", email: i + "@example.org" }])) };
  const sample = async (input, o) => { const t = "Look at the line that divides by **len(num)**: that name doesn't exist. Which variable holds the list?"; if (o && o.onText) { o.onText({ text: t.slice(0, 20), delta: "" }); await new Promise(r => setTimeout(r, 50)); o.onText({ text: t, delta: "" }); } window.__lastSample = input; return { text: t, truncated: false }; };
  const downloads = { save: async (r) => { window.__lastDownload = r.filename; return { status: "saved" }; } };
  window.claude = { use: async (n) => (n === "db" ? db : n === "user" ? user : n === "sample" ? (opts.noSample ? null : sample) : n === "downloads" ? downloads : null) };
  window.__store = store;
  // Benchwork's own extras (normally from platform.js): API calls are recorded, not sent.
  if (opts.bw !== false) {
    window.__api = [];
    const prefs = { weekly: true, streak: true, partner: true };
    window.BW = {
      site: "https://benchwork.test", email: "z@example.org", provider: opts.google ? "google" : "email",
      api: async (path, body) => { window.__api.push({ path, body }); if (path === "/api/me-export") return { account: { email: "z@example.org" } }; if (path === "/api/admin-seed") return { loaded: 32 }; if (path === "/api/me-delete") return { deleted: true }; return { ok: true }; },
      prefs: async () => Object.assign({}, prefs), savePrefs: async (p) => { window.__prefs = p; }, saveName: async (n) => { window.__savedName = n; },
      issueCert: async (c) => { window.__cert = c; return "https://benchwork.test/c/0123456789abcdef"; },
      tutorUsage: async () => [{ user_id: "u1", day: "2026-11-09", calls: 12, in_tokens: 40000, out_tokens: 9000 }],
      signOut: async () => { window.__signedOut = true; },
      client: { auth: { resetPasswordForEmail: async (e, o) => { window.__reset = { e, o }; return { error: null }; }, signOut: async () => ({}) } },
    };
  }
};
