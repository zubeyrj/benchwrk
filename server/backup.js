// Backups. GET with the cron secret (Sundays, from the weekly cron): emails the owner an encrypted backup.
// POST as the owner: downloads one straight away. Both need BACKUP_KEY, the passphrase that locks the file.
import { SITE, env, fail, isAdmin, layout, logEmail, ownerProfile, p, requireUser, send, sendEmail, withErrors } from "./_lib.js";
import { counts, dumpDatabase, encrypt } from "./_backup.js";

export async function emailBackup() {
  if (!env("BACKUP_KEY") || env("BACKUP_KEY").length < 16) return { skipped: "Add BACKUP_KEY (16 characters or more) in Vercel to switch backups on." };
  const owner = await ownerProfile(); if (!owner || !owner.email) return { skipped: "No owner account yet." };
  const dump = await dumpDatabase(), file = encrypt(dump, env("BACKUP_KEY")), day = dump.at.slice(0, 10), n = counts(dump);
  if (file.length > 20 * 1024 * 1024) return { skipped: "The backup is " + Math.round(file.length / 1048576) + " MB, too big to email. Download it from Admin instead.", size: file.length };
  const lines = Object.entries(n).map(([k, v]) => k + ": " + v + " rows").join(", ");
  await sendEmail({ to: owner.email, subject: "benchwrk backup " + day, attachments: [{ filename: "benchwrk-backup-" + day + ".bwbak", content: file }],
    html: layout({ heading: "Your weekly backup", body: p("Attached: everything in the benchwrk database on " + day + ", encrypted with your BACKUP_KEY passphrase. Keep a few of these somewhere safe, such as a Google Drive folder.") + p('<span style="font-size:14px;color:#6b7280">' + lines + "</span>") + p("To restore, see “Restoring a backup” in SETUP.md."), cta: "Open benchwrk", ctaHref: SITE() + "/#admin", footer: "Sent to you as the site owner." }),
    text: "benchwrk backup " + day + ", encrypted with your BACKUP_KEY. " + lines });
  await logEmail(owner.id, "backup", day);
  return { sent: true, size: file.length, rows: n };
}

export default withErrors(async function handler(req, res) {
  if (req.method === "GET") {
    if ((req.headers.authorization || "") !== "Bearer " + env("CRON_SECRET") || !env("CRON_SECRET")) return fail(res, 401, "Not allowed.");
    return send(res, 200, await emailBackup());
  }
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  const user = await requireUser(req, res); if (!user) return;
  if (!(await isAdmin(user.id))) return fail(res, 403, "Only the site owner can do that.");
  if (!env("BACKUP_KEY") || env("BACKUP_KEY").length < 16) return fail(res, 503, "Add BACKUP_KEY (16 characters or more) in Vercel first. It's the passphrase that locks the file.", "no_key");
  const dump = await dumpDatabase(), file = encrypt(dump, env("BACKUP_KEY"));
  res.statusCode = 200;
  res.setHeader("content-type", "application/octet-stream");
  res.setHeader("content-disposition", 'attachment; filename="benchwrk-backup-' + dump.at.slice(0, 10) + '.bwbak"');
  res.setHeader("cache-control", "no-store");
  res.end(file);
});
