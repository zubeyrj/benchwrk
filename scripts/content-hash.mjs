// A short fingerprint of the course files. The app compares it with the copy in the database so the
// owner's browser can load new course content by itself after a deploy.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
export function contentHash(root) {
  const h = crypto.createHash("sha1");
  for (const dir of ["content/seed", "content/seedx"]) for (const f of fs.readdirSync(path.join(root, dir)).sort()) { h.update(dir + "/" + f); h.update(fs.readFileSync(path.join(root, dir, f))); }
  return h.digest("hex").slice(0, 12);
}
