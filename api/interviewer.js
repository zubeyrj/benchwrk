// POST /api/interviewer { mode: "decode" | "ask" | "score", job, profile, ... }
// decode -> JSON job analysis; ask -> the interviewer's next turn; score -> the scorecard.
import { FORMATS, askPrompt, comparePrompt, cvPrompt, debriefPrompt, decodePrompt, parseTurn, pitchPrompt, scorePrompt, cardPrompt } from "./_interview.js";
import { bumpAi, claude, env, fail, parseJsonReply, readJson, requireUser, send, siteUsageToday, usageToday, withErrors } from "./_lib.js";

const isStr = (s, max) => typeof s === "string" && s.length <= max;

function validJob(j) {
  return j && typeof j === "object" && isStr(j.text, 20000) && j.text.trim().length >= 40 && (j.title == null || isStr(j.title, 300)) && (j.company == null || isStr(j.company, 300));
}
function validTranscript(t) {
  if (!Array.isArray(t) || t.length > 40) return false;
  return t.every((x) => x && (x.role === "interviewer" || x.role === "candidate") && isStr(x.text, 6000));
}
function validSetup(s) {
  return s && FORMATS[s.format] && Number.isInteger(s.count) && s.count >= 3 && s.count <= 8 && ["early", "mid", "senior"].indexOf(s.band) >= 0 && [1, 2, 3, 4, 5].indexOf(Number(s.directness)) >= 0;
}

export default withErrors(async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  const user = await requireUser(req, res); if (!user) return;
  if (!env("ANTHROPIC_API_KEY")) return fail(res, 503, "The interviewer isn't switched on yet.", "unavailable");
  const body = await readJson(req);
  const { mode, job, profile } = body;
  const CAREER = ["cv", "pitch", "debrief", "compare", "card"];
  if (["decode", "ask", "score"].concat(CAREER).indexOf(mode) < 0) return fail(res, 400, "Bad request.");
  const needsJob = ["decode", "ask", "score"].indexOf(mode) >= 0;
  if ((needsJob && !validJob(job)) || (!needsJob && job != null && !validJob(job))) return fail(res, 400, "Add a job description of at least a few lines.");
  if (profile && JSON.stringify(profile).length > 20000) return fail(res, 400, "Bad request.");

  const perUser = Number(env("INTERVIEW_DAILY_CALLS", 30)), perSite = Number(env("INTERVIEW_SITE_DAILY_CALLS", 300));
  if ((await usageToday(user.id, "interview")) >= perUser) return fail(res, 429, "That's today's interview allowance used. It resets at midnight.", "daily_cap");
  if ((await siteUsageToday("interview")) >= perSite) return fail(res, 429, "The interviewer has hit today's limit for the whole site. Try again tomorrow.", "site_cap");

  let prompt, maxTokens, allowed;
  if (mode === "card") {
    const q = body.question;
    if (!q || typeof q !== "object" || !isStr(q.title, 300) || !isStr(q.prompt, 6000) || !isStr(q.short || "", 3000) || !isStr(q.full || "", 20000) || !isStr(q.followups || "", 6000) || !isStr(q.wrong || "", 6000)) return fail(res, 400, "Bad request.");
    if (!isStr(body.answer, 6000) || body.answer.trim().split(/\s+/).length < 8) return fail(res, 400, "Write a fuller answer first: a few sentences.");
    prompt = cardPrompt({ question: q, answer: body.answer, profile }); maxTokens = 1200;
  } else if (mode === "cv") {
    if (!isStr(body.cv, 20000) || body.cv.trim().split(/\s+/).length < 60) return fail(res, 400, "Paste your whole CV: at least the profile and your recent roles.");
    prompt = cvPrompt({ cv: body.cv, job, profile }); maxTokens = 2500;
  } else if (mode === "pitch") {
    const a = body.answers;
    if (!a || typeof a !== "object" || JSON.stringify(a).length > 6000 || !Object.values(a).some((v) => typeof v === "string" && v.trim().length > 20)) return fail(res, 400, "Answer at least one of the questions in a sentence or two.");
    prompt = pitchPrompt({ answers: a, audience: body.audience, profile }); maxTokens = 1800;
  } else if (mode === "debrief") {
    if (!isStr(body.notes, 20000) || body.notes.trim().split(/\s+/).length < 25) return fail(res, 400, "Add the questions you were asked and roughly what you said.");
    if (body.round != null && !isStr(body.round, 80)) return fail(res, 400, "Bad request.");
    prompt = debriefPrompt({ notes: body.notes, round: body.round || "", feeling: isStr(body.feeling, 600) ? body.feeling : "", job, profile, directness: Number(body.directness) || 3 }); maxTokens = 3000;
  } else if (mode === "compare") {
    const js = body.jobs;
    if (!Array.isArray(js) || js.length < 2 || js.length > 5 || !js.every((j) => validJob(j) && isStr(j.id, 40))) return fail(res, 400, "Pick between two and five saved jobs.");
    prompt = comparePrompt({ jobs: js, profile }); maxTokens = 1800;
  } else if (mode === "decode") {
    if (body.courses && (!Array.isArray(body.courses) || body.courses.length > 40)) return fail(res, 400, "Bad request.");
    prompt = decodePrompt({ job, profile, courses: (body.courses || []).map(String) }); maxTokens = 1800;
  } else {
    if (!validSetup(body.setup) || !validTranscript(body.transcript || [])) return fail(res, 400, "Bad request.");
    const setup = Object.assign({}, body.setup, { directness: Number(body.setup.directness) });
    if (mode === "ask") {
      const bank = Array.isArray(body.bank) ? body.bank.slice(0, 6).filter((b) => b && isStr(b.title, 300) && isStr(b.prompt, 1000) && isStr(b.short || "", 800)) : [];
      prompt = askPrompt({ job, decoded: body.decoded, profile, setup, transcript: body.transcript || [], bank }); allowed = prompt.allowed; maxTokens = 400;
    }
    else {
      if (!(body.transcript || []).some((t) => t.role === "candidate")) return fail(res, 400, "Answer at least one question before scoring.");
      const self = body.self && typeof body.self === "object" ? body.self : {};
      prompt = scorePrompt({ job, decoded: body.decoded, profile, setup, transcript: body.transcript, self }); maxTokens = 3500;
    }
  }

  let out;
  try { out = await claude({ model: env("INTERVIEW_MODEL", "claude-sonnet-5-5"), system: prompt.system, messages: prompt.messages, max_tokens: maxTokens }); }
  catch (e) {
    const busy = e.status === 429 || e.status === 529;
    return fail(res, busy ? 429 : 502, busy ? "The interviewer is busy. Wait a minute and try again." : "The interviewer couldn't respond just now. Try again.", busy ? "rate_limited" : "unavailable");
  }
  await bumpAi(user.id, "interview", out.usage.input_tokens || 0, out.usage.output_tokens || 0);

  if (mode === "ask") return send(res, 200, parseTurn(out.text, allowed));
  // Career tools return JSON like decode and score.
  const json = parseJsonReply(out.text);
  if (!json) return fail(res, 502, "The reply came back garbled. Try again.", "bad_reply");
  if (mode === "decode" && json.is_job === false) return fail(res, 422, "That doesn't look like a job description. Paste the full advert, including the responsibilities and requirements.", "not_job");
  send(res, 200, json);
});
