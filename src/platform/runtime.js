// The runtime the app talks to: window.claude.use("db" | "user" | "sample" | "downloads").
// Backed by Supabase (documents table, auth, realtime) and Benchwork's own API routes.

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const idOf = (p) => p.split("/").pop();
const err = (code, message) => Object.assign(new Error(message || code), { code });

export function makeRuntime(sb, session, opts = {}) {
  const uid = session.user.id;
  const api = opts.api;

  const snapDoc = (p, data) => ({ id: idOf(p), exists: data !== undefined && data !== null, data: () => clone(data) });

  function doc(p) {
    return {
      path: p, id: idOf(p),
      async get() {
        const { data, error } = await sb.from("docs").select("data").eq("path", p).maybeSingle();
        if (error) throw err("unavailable", error.message);
        return snapDoc(p, data ? data.data : undefined);
      },
      async set(d) {
        const { error } = await sb.from("docs").upsert({ path: p, data: clone(d) }, { onConflict: "path" });
        if (error) throw err("permission_denied", error.message);
      },
      async update(d) {
        const cur = await this.get();
        await this.set(Object.assign(cur.exists ? cur.data() : {}, clone(d)));
      },
      async delete() {
        const { error } = await sb.from("docs").delete().eq("path", p);
        if (error) throw err("permission_denied", error.message);
      },
      collection: (s) => collection(p + "/" + s),
    };
  }

  function collection(c) {
    const coll = {
      path: c,
      async get() {
        const { data, error } = await sb.from("docs").select("path, data").eq("parent", c).order("path");
        if (error) throw err("unavailable", error.message);
        const docs = (data || []).map((r) => snapDoc(r.path, r.data));
        return { docs, size: docs.length, empty: !docs.length };
      },
      // Initial snapshot, then a fresh one whenever a row under this collection changes.
      onSnapshot(next, onError) {
        let live = true, timer = null;
        const fire = () => coll.get().then((s) => { if (live) next(s); }, (e) => { if (live && onError) onError(e); });
        fire();
        const ch = sb.channel("docs:" + c + ":" + Math.random().toString(36).slice(2))
          .on("postgres_changes", { event: "*", schema: "public", table: "docs", filter: "parent=eq." + c }, () => {
            clearTimeout(timer); timer = setTimeout(fire, 250);
          })
          .subscribe();
        return () => { live = false; clearTimeout(timer); sb.removeChannel(ch); };
      },
      doc: (id) => doc(c + "/" + id),
    };
    return coll;
  }

  let profile = null, admin = null;
  async function loadProfile() {
    if (profile) return profile;
    const { data } = await sb.from("profiles").select("name, email, prefs").eq("id", uid).maybeSingle();
    const meta = session.user.user_metadata || {};
    profile = { name: (data && data.name) || meta.full_name || meta.name || "", email: session.user.email || (data && data.email) || null, prefs: (data && data.prefs) || {} };
    return profile;
  }

  const user = {
    id: async () => uid,
    me: async () => { const p = await loadProfile(); return { name: p.name, email: p.email }; },
    isOwner: async () => {
      if (admin === null) { const { data } = await sb.from("admins").select("user_id").eq("user_id", uid).maybeSingle(); admin = !!data; }
      return admin;
    },
    can: async () => true,
    profiles: async (ids) => {
      const { data, error } = await sb.from("profiles").select("id, name, email").in("id", [].concat(ids));
      if (error) throw err("permission_denied", error.message);
      return Object.fromEntries((data || []).map((r) => [r.id, r]));
    },
  };

  // The tutor: our /api/tutor route calls Claude with the site's key and streams plain text back.
  async function sample(messages, o = {}) {
    const res = await api("/api/tutor", { messages }, { raw: true });
    if (!res.ok) {
      let body = {}; try { body = await res.json(); } catch (e) { /* not json */ }
      throw err(res.status === 429 ? (body.code || "rate_limited") : "unavailable", body.error);
    }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let text = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const delta = dec.decode(value, { stream: true });
      text += delta;
      if (o.onText) o.onText({ text, delta });
    }
    return { text, truncated: false };
  }

  const downloads = {
    async save({ filename, data, mimeType }) {
      const type = mimeType || (/\.svg$/.test(filename) ? "image/svg+xml" : /\.csv$/.test(filename) ? "text/csv" : /\.ics$/.test(filename) ? "text/calendar" : /\.json$/.test(filename) ? "application/json" : "text/plain");
      const url = URL.createObjectURL(new Blob([data], { type: type + ";charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return { status: "saved" };
    },
  };

  const db = { doc, collection };
  return { use: async (n) => (n === "db" ? db : n === "user" ? user : n === "sample" ? sample : n === "downloads" ? downloads : null), _profile: loadProfile };
}
