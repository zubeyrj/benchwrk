// Turns job-page HTML into clean text. Prefers the schema.org JobPosting most job sites embed.
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", pound: "£", euro: "€", ndash: "-", mdash: "-", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', hellip: "...", bull: "•" };
export function decodeEntities(s) {
  return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ""; }
    return ENT[e.toLowerCase()] !== undefined ? ENT[e.toLowerCase()] : m;
  });
}
export function htmlToText(html) {
  let s = String(html || "");
  s = s.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|noscript|svg|template|iframe|head)[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<li[^>]*>/gi, "\n• ").replace(/<(br|hr)\s*\/?>/gi, "\n").replace(/<\/(p|div|section|article|h[1-6]|ul|ol|li|tr|table|header|footer)>/gi, "\n").replace(/<h[1-6][^>]*>/gi, "\n\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s).replace(/[ \t\f\v ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[–—]/g, "-");
  return s.trim();
}
function findPosting(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) { for (const n of node) { const f = findPosting(n); if (f) return f; } return null; }
  const t = node["@type"]; if (t === "JobPosting" || (Array.isArray(t) && t.indexOf("JobPosting") >= 0)) return node;
  if (node["@graph"]) return findPosting(node["@graph"]);
  return null;
}
export function extractJob(html, url) {
  const out = { title: "", company: "", location: "", text: "", url, structured: false };
  const blocks = String(html).match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const b of blocks) {
    let j; try { j = JSON.parse(b.replace(/^<script[^>]*>|<\/script>$/gi, "").trim()); } catch (e) { continue; }
    const p = findPosting(j);
    if (p && p.description) {
      out.title = htmlToText(p.title || "");
      const org = p.hiringOrganization; out.company = htmlToText((org && (org.name || org)) || "");
      const loc = [].concat(p.jobLocation || [])[0]; const addr = loc && loc.address;
      out.location = addr ? [addr.addressLocality, addr.addressRegion, addr.addressCountry && (addr.addressCountry.name || addr.addressCountry)].filter((x) => typeof x === "string").join(", ") : (p.jobLocationType === "TELECOMMUTE" ? "Remote" : "");
      out.text = htmlToText(p.description); out.structured = true;
      return out;
    }
  }
  const og = String(html).match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || String(html).match(/<title[^>]*>([^<]+)/i);
  out.title = og ? htmlToText(og[1]) : "";
  const main = String(html).match(/<main[\s\S]*?<\/main>/i) || String(html).match(/<article[\s\S]*?<\/article>/i);
  out.text = htmlToText((main ? main[0] : String(html)).replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, " "));
  return out;
}
