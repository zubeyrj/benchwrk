// GET /api/me-export -> every record benchwrk holds about the signed-in member (UK GDPR access request).
import { adminClient, fail, requireUser, send, withErrors } from "./_lib.js";

export default withErrors(async function handler(req, res) {
  if (req.method !== "GET") return fail(res, 405, "Use GET.");
  const user = await requireUser(req, res); if (!user) return;
  const db = adminClient(), id = user.id;
  const paths = ["learners/" + id, "subs/" + id, "reviews/" + id, "pairs/" + id];
  const [mine, shared, profile, certs, usage, emails, devices, portfolio] = await Promise.all([
    db.from("docs").select("path, data, updated_at").like("path", "data/users/" + id + "/%"),
    db.from("docs").select("path, data, updated_at").in("path", paths),
    db.from("profiles").select("email, name, created_at, last_seen, prefs").eq("id", id).maybeSingle(),
    db.from("certs").select("id, name, course, course_title, hours, issued").eq("user_id", id),
    db.from("ai_usage").select("day, kind, calls, in_tokens, out_tokens").eq("user_id", id),
    db.from("email_log").select("kind, sent_at").eq("user_id", id),
    db.from("push_subs").select("endpoint, created_at, last_ok").eq("user_id", id),
    db.from("portfolios").select("slug, published, headline, about, links, show, hidden, updated_at").eq("user_id", id).maybeSingle(),
  ]);
  send(res, 200, {
    exported_at: new Date().toISOString(),
    account: { id, email: user.email, created_at: user.created_at, sign_in: (user.app_metadata && user.app_metadata.provider) || "email" },
    profile: profile.data, private_records: mine.data || [], shared_with_cohort: shared.data || [],
    certificates: certs.data || [], ai_usage: usage.data || [], emails_sent: emails.data || [], notification_devices: devices.data || [], portfolio: portfolio.data || null,
    note: "Tutor conversations are not stored on benchwrk's servers; they are sent to Anthropic to generate each answer. Mock interviews you keep are in private_records.",
  });
});
