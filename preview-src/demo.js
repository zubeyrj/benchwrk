// Benchwork preview: the real site running on an in-memory database, with the server routes answered
// by sample data. Nothing is saved; reloading starts again.
(function () {
  const SITE = location.href.split("#")[0].split("?")[0];
  const sb = window.makeFakeSupabase({ autoConfirm: true, firstIsOwner: true });
  Object.entries(window.__PREVIEW_CONTENT).forEach(([k, v]) => sb._doc(k, v));
  // In the preview whoever signs up first is the owner, so the Admin page can be seen.
  sb.auth.signInWithOAuth = async () => {
    const u = sb._addUser("you@gmail.com", "x", { full_name: "Preview User" }, true, "google");
    const s = sb._signInAs("you@gmail.com"); setTimeout(() => window.__previewEmit && window.__previewEmit("SIGNED_IN", s), 300); return { error: null };
  };
  // Sample members for the league table. Whoever signs in joins their Bronze group.
  const wk = (() => { const d = new Date(), x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); })();
  const RIVALS = [["Amira", 410, 4, "Python for engineers"], ["Tom", 265, 3, "SQL and data"], ["Priya", 190, 3, "Calling LLM APIs"], ["Kwame", 120, 2, "Programming from zero"], ["Sofia", 75, 2, "Python for engineers"], ["Dan", 30, 1, "Programming from zero"], ["Lena", 0, 1, "Rating their tools"]];
  const league = { wk, tier: {}, group: {}, last: {}, kept: {} };
  RIVALS.forEach((r, i) => { const id = "sample-" + i; sb._doc("learners/" + id, { name: r[0], wk, wxp: r[1], lvl: r[2], cur: r[3], at: new Date().toISOString().slice(0, 10), pts: r[1] * 3, hours: r[2] * 6, week: Math.round(r[1] / 40), streak: r[2] - 1, pct: r[2] * 7, goal: "engineer", behind: 0 }); league.tier[id] = 0; league.group[id] = "0-0"; });
  sb._doc("content/league", league);
  const on = sb.auth.onAuthStateChange;
  sb.auth.onAuthStateChange = (fn) => {
    const wrap = (ev, s) => { if (s && s.user && !league.group[s.user.id]) { league.tier[s.user.id] = 0; league.group[s.user.id] = "0-0"; sb._doc("content/league", league); } fn(ev, s); };
    window.__previewEmit = wrap; return on(wrap);
  };
  sb.auth.resetPasswordForEmail = async () => ({ error: null });
  window.__fakeSupabase = sb;
  window.BW_CONFIG = { siteUrl: SITE };

  const json = (o, status) => new Response(JSON.stringify(o), { status: status || 200, headers: { "content-type": "application/json" } });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const QS = {
    screen: ["Walk me through your background and what's drawing you to AI engineering now.", "Why this role in particular, and what do you know about how we use AI?", "What would you want to have shipped six months in?", "What questions do you have for me?"],
    behavioural: ["Tell me about a time you had to learn a new technical skill quickly to deliver something.", "Describe a project where the requirements kept changing. What did you do?", "Tell me about a time something you built didn't work. How did you find out, and what did you change?", "Give me an example of explaining something technical to someone who wasn't.", "When have you pushed back on a decision? What happened?", "Tell me about the piece of work you're proudest of."],
    technical: ["Walk me through a project where you called an LLM API. What did you build and why that design?", "How would you decide between RAG and fine-tuning for a support assistant?", "How do you evaluate whether a change to a prompt made things better?", "Your retrieval returns the wrong documents for some queries. How do you debug it?", "How would you keep latency and cost down for an LLM feature with heavy traffic?", "How do you test and deploy an LLM feature safely?"],
    design: ["Design an assistant that answers staff questions from 5,000 internal policy documents. Start with requirements.", "How would you chunk, embed and store the documents?", "Which model would you use and how would you prompt it?", "How would you evaluate it before launch?", "What fails first at ten times the traffic, and what do you do about it?", "How do you stop it inventing policy that doesn't exist?"],
    loop: ["Why AI engineering, and why now?", "Tell me about a time you shipped something under a tight deadline.", "Pick one project and take me deep into a technical decision you made.", "Sketch how you'd build a document Q&A tool for a small team.", "What would your first month here look like?", "What questions do you have for us?"],
  };
  const ask = (b) => {
    const t = b.transcript, N = b.setup.count, mains = t.filter((x) => x.role === "interviewer" && x.kind === "question").length;
    const last = t.filter((x) => x.role === "interviewer").slice(-1)[0], lastAns = t.filter((x) => x.role === "candidate").slice(-1)[0];
    if (!t.length) return { kind: "question", n: 1, text: "Hello, I'm the hiring manager for this role. Thanks for making the time. " + QS[b.setup.format][0] };
    if (last.kind !== "followup" && lastAns && lastAns.text !== "(skipped)" && lastAns.text.split(/\s+/).length < 25 && !/\d/.test(lastAns.text)) return { kind: "followup", text: "Can you be more specific? What did you personally do, and what was the result, ideally with a number?" };
    if (mains >= N) return { kind: "end", text: "That's everything from me. Thanks for your time today; your feedback follows." };
    return { kind: "question", n: mains + 1, text: "Thanks. " + QS[b.setup.format][mains % QS[b.setup.format].length] };
  };
  const score = (b) => {
    const qs = [], ans = {}; let cur = 0;
    b.transcript.forEach((x) => { if (x.role === "interviewer" && x.kind === "question") { cur = x.n; qs.push(x); ans[cur] = ""; } else if (x.role === "candidate" && cur) ans[cur] += " " + x.text; });
    const per = qs.map((q) => {
      const a = ans[q.n].trim(), w = a === "(skipped)" ? 0 : a.split(/\s+/).filter(Boolean).length, num = /\d/.test(a), me = /\bI\b/.test(a);
      const s = (v) => Math.max(1, Math.min(5, Math.round(v * 2) / 2));
      const sc = { substance: s(1 + w / 40 + (num ? 1 : 0)), structure: s(1.5 + w / 50), relevance: s(w ? 3 : 1), credibility: s(1 + (num ? 1.5 : 0) + (me ? 1 : 0)), differentiation: s(1 + w / 80) };
      return { n: q.n, question: q.text.replace(/^(Hello[^.]*\. Thanks[^.]*\. |Thanks\. )/, ""), heard: w ? "You answered in " + w + " words" + (num ? " and gave a number." : ", without a number.") : "You skipped this one.", scores: sc,
        note: !w ? "Skipping is fine in practice; in the real thing, say what you'd do first." : !num ? "Add a measurable result: time saved, accuracy, users, cost." : "Good use of a number. Now add what you learned that others wouldn't know.",
        stronger_answer: w ? "In [situation], I needed to [task]. I [two or three specific actions, using I]. As a result [outcome with a number: add your number]. What I'd do differently: [one insight]." : "" };
    });
    const avg = (k) => Math.round((per.reduce((a, p) => a + p.scores[k], 0) / Math.max(1, per.length)) * 10) / 10;
    const scores = { substance: avg("substance"), structure: avg("structure"), relevance: avg("relevance"), credibility: avg("credibility"), differentiation: avg("differentiation") };
    const all = Object.values(scores).reduce((a, v) => a + v, 0) / 5, sorted = per.slice().sort((x, y) => (x.scores.substance + x.scores.credibility) - (y.scores.substance + y.scores.credibility));
    const self = Number((b.self || {}).rating || 3);
    return { band: { early: "Early career (0-3 years)", mid: "Mid-career (4-8 years)", senior: "Senior (8+ years)" }[b.setup.band], confidence: "Low", confidence_reason: "This is the preview: scores here come from simple rules (length, numbers, using I). On the live site Claude reads every answer.",
      hire_signal: all >= 4 ? "Hire" : all >= 3 ? "Mixed" : "No Hire", scores, self_delta: Math.abs(self - all) <= 0.5 ? "accurate" : self > all ? "over" : "under", self_note: "You rated yourself " + self + "; the average here is " + (Math.round(all * 10) / 10) + ".",
      what_i_heard: "Preview summary: the live interviewer writes a paragraph here on how you came across.", what_is_working: ["You answered every question you didn't skip", "Answers stayed on topic"],
      gaps_to_close: ["Results without numbers are hard to believe", "Say I, not we, so the interviewer knows what you did"], priority_move: "Put a number in every result, even a rough one.", next_step: "Add two STAR stories under Your stories, then practise again with the same job.",
      best_question: sorted.length ? sorted[sorted.length - 1].n : 1, weakest_question: sorted.length ? sorted[0].n : 1, scope_note: "", questions: per, story_ideas: ["The first time a project of yours broke, and how you found the cause"] };
  };
  const decode = (b) => {
    const t = b.job.text, has = (re) => re.test(t);
    const comps = [[/RAG|retriev/i, "Retrieval and RAG"], [/eval/i, "Evaluating LLM output"], [/python/i, "Python"], [/deploy|production|cloud|AWS|Azure|GCP/i, "Shipping to production"], [/SQL|data/i, "Working with data"], [/stakeholder|communicat/i, "Communication"]].filter((c) => has(c[0])).slice(0, 5);
    return { is_job: true, title: b.job.title || t.split("\n")[0].slice(0, 80), company: b.job.company || "", seniority: has(/senior|lead/i) ? "senior" : "early",
      summary: "Preview decode. On the live site Claude reads the whole advert and compares it with your progress, projects and stories.",
      competencies: (comps.length ? comps : [[0, "Building with LLMs"], [0, "Python"], [0, "Learning fast"]]).map((c) => ({ name: c[1], why: "Mentioned in the advert", quote: "" })),
      must_haves: has(/python/i) ? ["Python"] : [], nice_to_haves: has(/cloud|AWS|Azure|GCP/i) ? ["Cloud experience"] : [],
      fit: { verdict: "Investable Stretch", confidence: "Limited", signals: ["Preview: verdict not calculated"], frameable_gaps: ["No commercial AI role yet: frame your projects as real work"], structural_gaps: [] },
      likely_rounds: [{ format: "behavioural", why: "most employers start here" }, { format: "technical", why: "the advert is technical" }], prep: [{ action: "Finish the RAG course and ship the build", course: "" }], red_flags: [] };
  };
  const JOBS = [
    { id: "sample:1", source: "Sample", title: "Junior AI Engineer", company: "Northfield Health (sample)", location: "Birmingham (hybrid)", salary: "£38k to £45k", posted: "2026-11-08", url: "https://remotive.com", snippet: "Build RAG features over clinical guidance documents in Python, with evals and monitoring.", full: true, text: "Junior AI Engineer\n\nYou'll build retrieval-augmented features over our clinical guidance library in Python. You'll write evals, monitor quality in production and work closely with clinicians.\n\nYou have:\n• Python and SQL\n• A project using an LLM API\n• Curiosity about evaluation\n\nNice to have: AWS, vector databases." },
    { id: "sample:2", source: "Sample", title: "AI Engineer, Customer Support", company: "Ledgerline (sample)", location: "Remote (UK)", salary: "£50k to £62k", posted: "2026-11-06", url: "https://remotive.com", snippet: "Own our support assistant end to end: retrieval, prompts, evals and deployment.", full: true, text: "AI Engineer, Customer Support\n\nOwn our support assistant end to end: retrieval over 3,000 help articles, prompt design, offline evals, A/B tests and deployment on AWS. You'll talk to support leads every week.\n\nRequirements:\n• Strong Python\n• Shipped an LLM feature\n• Clear communication with non-technical stakeholders" },
  ];
  const realFetch = window.fetch.bind(window);
  window.fetch = async function (url, init) {
    const u = typeof url === "string" ? url : url.url;
    if (!/^\/api\//.test(u)) return realFetch(url, init);
    const b = init && init.body ? JSON.parse(init.body) : {};
    await wait(450);
    if (u === "/api/tutor") {
      const text = "This is the preview, so I can't run here. On the live site I'm Claude: I read the lesson, your code and your question, then answer with a hint before giving anything away.";
      const enc = new TextEncoder();
      return new Response(new ReadableStream({ async start(c) { for (const w of text.split(/(?<= )/)) { c.enqueue(enc.encode(w)); await wait(25); } c.close(); } }), { status: 200 });
    }
    if (u === "/api/interviewer" && b.mode === "cv") { await wait(900); const words = b.cv.split(/\s+/).length, nums = (b.cv.match(/\d+%?/g) || []).length;
      return json({ overall: nums > 5 ? "Strong" : "Needs work", ats: "Ready", ats_note: "Preview: on the live site Claude checks layout and wording for applicant tracking systems.", recruiter_scan: "A " + words + "-word CV with " + nums + " numbers in it. Recruiters look for numbers first.", strengths: ["You pasted the whole CV, so the review can be specific"], top_fixes: ["Put a number in every result", "Lead each bullet with what you did"], summary_rewrite: "Preview: the live site writes a two-line profile for the top of your CV here.", bullets: b.cv.split(/\n/).filter((l) => l.trim().length > 30).slice(0, 2).map((l) => ({ before: l.trim().slice(0, 140), after: "Built [what] for [who], cutting [metric] by [add a number]", why: "Action first, then a measurable result." })), missing_keywords: ["RAG", "evals", "vector search"], transition_note: "Frame your past work as working with data, users and messy problems: that's most of AI engineering." }); }
    if (u === "/api/interviewer" && b.mode === "pitch") { await wait(700); const a = b.answers || {}; return json({ hook: (a.past || "I've spent the last few years solving problems with data").split(".")[0] + ".", short: [a.past, a.why].filter(Boolean).join(" "), medium: [a.past, a.why, a.proof].filter(Boolean).join(" "), long: [a.past, a.why, a.proof, a.edge].filter(Boolean).join(" ") + " That's why I'm going for roles like this one.", differentiator: a.edge || "Add what you know that most candidates don't.", avoid: ["Apologising for the career change", "Listing every tool you've touched"], follow_ups: ["Why leave your current field?", "Tell me more about that project."] }); }
    if (u === "/api/interviewer" && b.mode === "debrief") { await wait(900); const qs = (b.notes.match(/Q:[^\n]+/g) || ["Q: (the questions you noted)"]).slice(0, 5);
      return json({ summary: "Preview debrief: on the live site Claude reads your notes and gives an honest read of how it went.", confidence: "Low", scores: { substance: 3, structure: 3, relevance: 3, credibility: 3, differentiation: 2 }, signals: ["Follow-up questions usually mean interest"], questions: qs.map((q) => ({ question: q.replace(/^Q:\s*/, ""), competency: "From your notes", landed: "You answered it", gap: "Add a number and what you personally did", stronger_answer: "Situation, your action, the result with a number." })), patterns: ["Results without numbers"], next_round_prep: ["Write down two numbers you can quote", "Prepare one question about their team"], thank_you: "Thank you for your time today. I enjoyed hearing about the team's work, and our conversation made me even keener on the role.", stories_to_add: [] }); }
    if (u === "/api/interviewer" && b.mode === "compare") { await wait(800); return json({ ranking: b.jobs.map((j, i) => ({ id: j.id, rank: i + 1, verdict: i === 0 ? "Investable Stretch" : "Long-Shot Stretch", why: "Preview: the live site compares each advert with your progress.", prep_effort: i === 0 ? "Medium" : "High", first_step: "Decode the advert, then do one mock interview." })), recommendation: "Preview ranking keeps your order. On the live site Claude ranks them by fit, stretch and effort.", skip: [] }); }
    if (u === "/api/interviewer") { await wait(b.mode === "score" ? 1200 : 400); return json(b.mode === "decode" ? decode(b) : b.mode === "ask" ? ask(b) : score(b)); }
    if (u === "/api/health") { if (b.test) return json({ error: "The preview can't send email." }, 400); return json({ checks: [{ name: "Database", ok: true, note: "Preview: in-memory" }, { name: "Tutor and interviewer (Claude)", ok: false, note: "The preview uses sample answers" }, { name: "Email", ok: false, note: "Not connected in the preview" }, { name: "Live job search", ok: true, warn: true, note: "Sample jobs only" }, { name: "Sign-up protection", ok: true, warn: true, note: "Off in the preview" }] }); }
    if (u === "/api/admin-moderate") return json({ ok: true });
    if (u === "/api/backup") return json({ error: "The preview has no database to back up. On the live site this downloads an encrypted copy." }, 503);
    if (u === "/api/push") return json({ error: "Notifications work on the live site." }, 503);
    if (u === "/api/report-error") return json({ ok: true });
    if (u.indexOf("/api/jobs") === 0) return json({ jobs: JOBS, sources: [{ name: "remotive", ok: true, count: 2 }] });
    if (u === "/api/job-fetch") return json({ error: "The preview can't open other websites. Paste the advert text instead." }, 422);
    if (u === "/api/admin-seed") return json({ loaded: 32 });
    if (u === "/api/me-export") return json({ note: "Preview export", records: sb.tables.docs.filter((d) => d.path.indexOf("data/users/") === 0) });
    if (u === "/api/me-delete") return json({ error: "Deleting is switched off in the preview." }, 400);
    return json({ ok: true, preview: true });
  };
  document.addEventListener("DOMContentLoaded", () => {
    const bar = document.createElement("div");
    bar.className = "preview-bar"; bar.setAttribute("role", "note");
    bar.innerHTML = "<b>Preview</b> Everything works, but nothing is saved and the AI parts use sample answers. Reload to start again.";
    document.body.prepend(bar);
  });
})();
