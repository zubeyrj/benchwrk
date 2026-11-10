// POST /api/tutor  { messages: [{ role, content }] }  ->  streamed plain text
// Calls Claude with the site's API key. Each member gets a daily allowance, and the whole
// site has a daily ceiling, so spend can't run away.
import { bumpAi, env, fail, readJson, requireUser, siteUsageToday, usageToday, withErrors } from "./_lib.js";

const MAX_TURNS = 40, MAX_CHARS = 60000;

export default withErrors(async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  const user = await requireUser(req, res); if (!user) return;
  const key = env("ANTHROPIC_API_KEY");
  if (!key) return fail(res, 503, "The tutor isn't switched on yet.", "unavailable");

  const { messages } = await readJson(req);
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_TURNS) return fail(res, 400, "Bad request.");
  let chars = 0;
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return fail(res, 400, "Bad request.");
    chars += m.content.length;
  }
  if (chars > MAX_CHARS || messages[0].role !== "user") return fail(res, 400, "That conversation is too long. Start a fresh one.");

  const perUser = Number(env("TUTOR_DAILY_LIMIT", 40)), perSite = Number(env("TUTOR_SITE_DAILY_LIMIT", 1500));
  if ((await usageToday(user.id, "tutor")) >= perUser) return fail(res, 429, "You've used today's " + perUser + " tutor questions. They reset at midnight.", "daily_cap");
  if ((await siteUsageToday("tutor")) >= perSite) return fail(res, 429, "The tutor has hit today's limit for the whole site. Try again tomorrow.", "site_cap");

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: env("TUTOR_MODEL", "claude-haiku-5-5"), max_tokens: Number(env("TUTOR_MAX_TOKENS", 900)), stream: true, messages }),
  });
  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 429 || upstream.status === 529 ? 429 : 502;
    return fail(res, status, status === 429 ? "The tutor is busy. Wait a minute and try again." : "The tutor couldn't answer just now.", status === 429 ? "rate_limited" : "unavailable");
  }

  res.statusCode = 200;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-accel-buffering", "no");

  let inTok = 0, outTok = 0, buf = "";
  const dec = new TextDecoder();
  const reader = upstream.body.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        let ev; try { ev = JSON.parse(line.slice(5)); } catch (e) { continue; }
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") res.write(ev.delta.text);
        else if (ev.type === "message_start" && ev.message && ev.message.usage) inTok = ev.message.usage.input_tokens || 0;
        else if (ev.type === "message_delta" && ev.usage) outTok = ev.usage.output_tokens || outTok;
      }
    }
  } finally {
    res.end();
    await bumpAi(user.id, "tutor", inTok, outTok);
  }
});
