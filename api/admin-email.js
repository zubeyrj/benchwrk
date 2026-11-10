// POST /api/admin-email { to: uid, subject, body } -> the site owner emails one learner.
import { adminClient, esc, fail, isAdmin, layout, logEmail, p, readJson, requireUser, send, sendEmail } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  const user = await requireUser(req, res); if (!user) return;
  if (!(await isAdmin(user.id))) return fail(res, 403, "Only the site owner can do that.");
  const { to, subject, body } = await readJson(req);
  if (typeof to !== "string" || typeof subject !== "string" || typeof body !== "string" || !subject.trim() || !body.trim()) return fail(res, 400, "Add a subject and a message.");
  const { data: profile } = await adminClient().from("profiles").select("email, name").eq("id", to).maybeSingle();
  if (!profile || !profile.email) return fail(res, 404, "That member has no email on file.");
  const paras = body.slice(0, 5000).split(/\n{2,}/).map((t) => p(esc(t).replace(/\n/g, "<br>"))).join("");
  await sendEmail({
    to: profile.email, subject: subject.slice(0, 140), replyTo: user.email,
    html: layout({ preheader: body.slice(0, 90), heading: subject.slice(0, 140), body: paras, cta: "Open Benchwork", footer: "Sent by the Benchwork owner. Reply to this email to answer them directly." }),
    text: body.slice(0, 5000),
  });
  await logEmail(to, "admin", user.id);
  send(res, 200, { sent: true });
}
