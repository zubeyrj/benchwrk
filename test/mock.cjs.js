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
  // Benchwrk's own extras (normally from platform.js): API calls are recorded, not sent.
  if (opts.bw !== false) {
    window.__api = [];
    const prefs = { weekly: true, streak: true, partner: true };
    window.BW = {
      site: "https://benchwork.test", email: "z@example.org", provider: opts.google ? "google" : "email",
      api: async (path, body) => { window.__api.push({ path, body }); if (path === "/api/me-export") return { account: { email: "z@example.org" } }; if (path === "/api/admin-seed") return { loaded: 32 }; if (path === "/api/me-delete") return { deleted: true };
        if (path.indexOf("/api/jobs") === 0) return { jobs: [{ id: "remotive:7", source: "Remotive", title: "Junior AI Engineer", company: "Remote Co", location: "Remote (UK)", salary: "", posted: "2026-11-08", url: "https://remotive.com/j/7", snippet: "Build LLM apps.", text: "Build LLM apps with retrieval, evals and Python. ".repeat(10), full: true }, { id: "adzuna:1", source: "Adzuna", title: "AI Engineer", company: "Acme", location: "London", salary: "£55k to £70k", posted: "2026-11-09", url: "https://x", snippet: "RAG", full: false }], sources: [{ name: "remotive", ok: true, count: 1 }, { name: "adzuna", ok: true, count: 1 }] };
        if (path === "/api/job-fetch") { if (/fail/.test(body.url)) throw Object.assign(new Error("That page wouldn't open from here."), { code: "fetch_failed" }); return { title: "Applied AI Engineer", company: "Example Ltd", location: "Birmingham", text: "You will build RAG and agents in Python with evals. ".repeat(12) }; }
        if (path === "/api/health") { if (body && body.test) return { sent: true, to: "z@example.org" }; return { checks: [{ name: "Database", ok: true, note: "32 course documents" }, { name: "Email", ok: false, note: "No email service" }, { name: "Live job search", ok: true, warn: true, note: "Add Adzuna" }] }; }
        if (path === "/api/admin-moderate") return { ok: true };
        if (path === "/api/interviewer" && body.mode === "card") return { verdict: "Adequate", scores: { substance: 3, structure: 4, relevance: 4, credibility: 3, differentiation: 2 }, landed: ["Named the tool registry"], missing: ["The turn budget"], wrong_answer_hit: "", follow_up: "Why is a turn budget separate from the stop condition?" };
        if (path === "/api/interviewer" && body.mode === "cv") return { overall: "Needs work", ats: "Ready", recruiter_scan: "A data analyst moving into AI.", strengths: ["Strong SQL"], top_fixes: ["Add numbers to results"], summary_rewrite: "Data analyst building LLM tools.", bullets: [{ before: "Made dashboards", after: "Built 12 dashboards used weekly by [add a number] managers", why: "Specific and measurable" }], missing_keywords: ["RAG", "evals"], transition_note: "Lead with the data work." };
        if (path === "/api/interviewer" && body.mode === "pitch") return { hook: "I spent four years turning messy data into decisions.", short: "Short version.", medium: "Medium version.", long: "Long version.", differentiator: "Analytics plus shipping.", avoid: ["Apologising for the career change"], follow_ups: ["Why leave analytics?"] };
        if (path === "/api/interviewer" && body.mode === "debrief") return { summary: "Solid on motivation, thin on numbers.", confidence: "Medium", scores: { substance: 3, structure: 3, relevance: 4, credibility: 2, differentiation: 2 }, signals: ["They asked two follow-ups on evals"], questions: [{ question: "Tell me about your RAG project", competency: "Retrieval", landed: "Clear architecture", gap: "No accuracy number", stronger_answer: "Say 40% to 85%." }], patterns: ["Results without numbers"], next_round_prep: ["Bring eval numbers"], thank_you: "Thanks for the conversation about evals today.", stories_to_add: ["The eval that changed your design"] };
        if (path === "/api/interviewer" && body.mode === "compare") return { ranking: body.jobs.map((j, i) => ({ id: j.id, rank: i + 1, verdict: i ? "Long-Shot Stretch" : "Strong Fit", why: "Because.", prep_effort: i ? "High" : "Low", first_step: "Tailor your CV." })), recommendation: "Start with the first.", skip: [] };
        if (path === "/api/interviewer") {
          if (body.mode === "decode") return { is_job: true, title: "Applied AI Engineer", company: "Example Ltd", seniority: "early", summary: "Build RAG features for customers.", competencies: [{ name: "Retrieval pipelines", why: "core of the job", quote: "build RAG" }, { name: "Evaluation", why: "they ship weekly", quote: "evals" }], must_haves: ["Python"], nice_to_haves: ["Cloud"], fit: { verdict: "Investable Stretch", confidence: "Medium", signals: ["Your RAG project matches"], frameable_gaps: ["No paid AI role yet"], structural_gaps: [] }, likely_rounds: [{ format: "technical", why: "they mention a technical interview" }], prep: [{ action: "Finish the evals course", course: "Programming from zero" }], red_flags: [] };
          if (body.mode === "ask") { const t = body.transcript, n = t.filter((x) => x.role === "interviewer" && x.kind === "question").length, last = t.filter((x) => x.role === "interviewer").slice(-1)[0];
            if (n >= body.setup.count && last && last.kind !== "end") return { kind: "end", text: "Thanks, that's everything. Feedback follows." };
            if (n === 1 && last.kind === "question") return { kind: "followup", text: "What was the latency before and after?" };
            return { kind: "question", n: n + 1, text: "Question " + (n + 1) + ": tell me about **your** RAG project." }; }
          if (body.mode === "score") { const q = (n) => ({ n, question: "Q" + n, heard: "You described the project.", scores: { substance: 3, structure: 4, relevance: 4, credibility: 3, differentiation: 2 }, note: "Add the number.", stronger_answer: "I built X. Latency fell from [add your number]." });
            return { band: "Early career (0-3 years)", confidence: "Medium", confidence_reason: "Four answers.", hire_signal: "Mixed", scores: { substance: 3, structure: 4, relevance: 4, credibility: 3, differentiation: 2 }, self_delta: "over", self_note: "You rated 4; the average is 3.2.", what_i_heard: "A builder with one solid project.", what_is_working: ["Clear structure"], gaps_to_close: ["No numbers"], priority_move: "Put a number in every result.", next_step: "Redo this interview after adding two stories.", best_question: 2, weakest_question: 4, scope_note: "Verify technical specifics.", questions: [1, 2, 3, 4].map(q), story_ideas: ["The day your retrieval returned the wrong policy"] }; }
        }
        return { ok: true }; },
      prefs: async () => Object.assign({}, prefs), savePrefs: async (p) => { window.__prefs = p; }, saveName: async (n) => { window.__savedName = n; },
      issueCert: async (c) => { window.__cert = c; return "https://benchwork.test/c/0123456789abcdef"; },
      portfolio: (() => { let row = opts.portfolio || null; window.__pf = () => row; return { url: (s) => "https://benchwork.test/p/" + s, get: async () => row, save: async (p) => { if (p.slug === "taken-name") throw Object.assign(new Error("dup"), { code: "taken" }); row = Object.assign({}, row || {}, p); }, list: async () => (row && row.published ? [Object.assign({ user_id: "u1" }, row)] : []) }; })(),
      push: (() => { let on = false; window.__push = { calls: [] }; return { support: () => (opts.pushSupport || "ready"), on: async () => on, enable: async () => { window.__push.calls.push("enable"); if (opts.pushDeny) return { ok: false, reason: "blocked" }; on = true; return { ok: true }; }, disable: async () => { window.__push.calls.push("disable"); on = false; }, test: async () => { window.__push.calls.push("test"); return { sent: 1 }; } }; })(),
      calendar: { link: async (rot) => { window.__calRot = (window.__calRot || 0) + (rot ? 1 : 0); return "https://bw.test/cal/token" + window.__calRot + ".ics"; } },
      tutorUsage: async () => [{ user_id: "u1", day: "2026-11-09", calls: 12, in_tokens: 40000, out_tokens: 9000 }],
      signOut: async () => { window.__signedOut = true; },
      invite: opts.invite || "",
      clearInvite: () => { window.__inviteCleared = true; },
      client: { from: (t) => { const q = { _t: t, select: () => q, eq: () => q, order: () => q, limit: () => q, update: (v) => { window.__errUpdate = v; return q; }, then: (res) => res({ data: t === "errors" ? (window.__errUpdate ? [] : [{ id: 1, at: new Date().toISOString(), source: "client", message: "TypeError: x is undefined", url: "/#home", resolved: false }]) : [], error: null }) }; return q; }, auth: { resetPasswordForEmail: async (e, o) => { window.__reset = { e, o }; return { error: null }; }, signOut: async () => ({}) } },
    };
  }
};
