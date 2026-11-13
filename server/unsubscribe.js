// GET or POST /api/unsubscribe?t=<token>&k=weekly|streak|partner|all -> switches that email off. No sign-in needed.
import { SITE, adminClient, esc, withErrors } from "./_lib.js";

const LABEL = { weekly: "weekly progress emails", streak: "streak reminders", partner: "partner emails", all: "all Benchwrk emails" };

export default withErrors(async function handler(req, res) {
  const url = new URL(req.url, "http://x"), t = url.searchParams.get("t") || "", k = url.searchParams.get("k") || "all";
  let msg = "That link isn't valid any more. You can change emails in Settings.", form = "";
  const valid = /^[0-9a-f-]{36}$/.test(t) && LABEL[k];
  // Opening the link only asks; the change happens on POST (the button, or a mail app's one-click unsubscribe),
  // so link scanners in mail filters can't switch emails off by accident.
  if (valid && req.method !== "POST") {
    msg = "Stop " + LABEL[k] + "?";
    form = '<form method="post"><button style="background:#c93c1a;color:#fff;border:0;border-radius:10px;padding:12px 18px;font-weight:700;font-size:15px;cursor:pointer">Yes, stop them</button></form>';
  } else if (valid) {
    const db = adminClient();
    const { data } = await db.from("profiles").select("id, prefs").eq("unsub_token", t).maybeSingle();
    if (data) {
      const prefs = Object.assign({ weekly: true, streak: true, partner: true }, data.prefs || {});
      if (k === "all") { prefs.weekly = prefs.streak = prefs.partner = false; } else prefs[k] = false;
      await db.from("profiles").update({ prefs }).eq("id", data.id);
      msg = "Done. You won't get " + LABEL[k] + " any more.";
    }
  }
  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email settings · Benchwrk</title></head>' +
    '<body style="margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f1ec;color:#1b2333;display:grid;place-items:center;min-height:100vh;padding:16px">' +
    '<main style="background:#fff;border:1px solid #e6e0d6;border-radius:16px;padding:28px;max-width:440px"><h1 style="margin:0 0 10px;font-size:22px">Email settings</h1><p style="line-height:1.55">' + esc(msg) +
    "</p>" + form + '<p><a href="' + SITE() + '/#settings" style="color:#c93c1a;font-weight:700">Change emails in Settings</a></p></main></body></html>');
});
