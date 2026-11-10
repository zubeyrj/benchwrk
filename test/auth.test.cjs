// The front door in a real browser: sign-up, email confirmation, sign-in, Google, password reset,
// then the runtime (platform.js + runtime.js) carrying the app on an in-memory Supabase.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path"), http = require("http");
const PUB = path.join(__dirname, "..", "public"), OUT = path.join(__dirname, "shots"); fs.mkdirSync(OUT, { recursive: true });
const FAKE = fs.readFileSync(path.join(__dirname, "fake-supabase.js"), "utf8");
const content = {};
for (const f of fs.readdirSync(path.join(__dirname, "../content/seed"))) content["content/" + f.replace(".json", "")] = JSON.parse(fs.readFileSync(path.join(__dirname, "../content/seed", f), "utf8"));
for (const f of fs.readdirSync(path.join(__dirname, "../content/seedx"))) { const d = JSON.parse(fs.readFileSync(path.join(__dirname, "../content/seedx", f), "utf8")); content["lessons/" + d.id] = d; }
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".txt": "text/plain", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(PUB, u === "/" ? "index.html" : u); if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); } res.setHeader("content-type", TYPES[path.extname(f)] || "application/octet-stream"); fs.createReadStream(f).pipe(res); });
const results = [], errs = [];
const ok = (n, c, x) => results.push((c ? "PASS " : "FAIL ") + n + (x ? " :: " + x : ""));

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r)); const BASE = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  async function page(setup, url, vp, scheme) {
    const p = await browser.newPage({ viewport: vp || { width: 1366, height: 900 }, colorScheme: scheme || "light" });
    p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
    p.on("console", (m) => { if (m.type() === "error" && !/ERR_|Failed to load resource/.test(m.text())) errs.push("console: " + m.text()); });
    await p.addInitScript(({ FAKE, content, setup }) => {
      eval(FAKE);
      if (setup === "none") return;
      const sb = window.makeFakeSupabase({ ownerEmail: "owner@example.org" });
      Object.entries(content).forEach(([k, v]) => sb._doc(k, v));
      sb._doc("content/cohorts", { list: [{ code: "SPRING7", name: "Spring 2027", open: true }] });
      if (setup === "confirmed") sb._addUser("amira@example.org", "correct-horse", { full_name: "Amira Khan" }, true);
      if (setup === "session") { sb._addUser("amira@example.org", "correct-horse", { full_name: "Amira Khan" }, true); sb._signInAs("amira@example.org"); }
      window.__fakeSupabase = sb;
      window.BW_CONFIG = { siteUrl: "https://benchwork.test" };
    }, { FAKE, content, setup });
    await p.goto(BASE + (url || "/"));
    await p.waitForTimeout(400);
    return p;
  }
  const text = (p) => p.textContent("main");
  const shot = (p, n, full) => p.screenshot({ path: path.join(OUT, n + ".png"), fullPage: !!full });
  const calls = (p) => p.evaluate(() => window.__fakeSupabase.calls.filter((c) => c.t === "auth"));

  // 1. Sign-up, then the confirmation screen
  let p = await page("fresh", "/?invite=spring7");
  ok("sign-up is the default", /Create your free account/.test(await text(p)));
  ok("Google button", await p.isVisible('[data-auth="google"]'));
  ok("legal links", (await p.$$('a[href="privacy.html"]')).length === 1 && (await p.$$('a[href="terms.html"]')).length === 1);
  await shot(p, "a1-signup");
  await p.click('[data-form="signup"] button[type=submit]'); await p.waitForTimeout(150);
  ok("empty form shows three errors", (await p.$$('[aria-invalid="true"]')).length === 3);
  await p.fill("#au-name", "Amira"); await p.fill("#au-email", "amira@example"); await p.fill("#au-pass", "short"); await p.click('[data-form="signup"] button[type=submit]'); await p.waitForTimeout(150);
  ok("bad email and short password caught", /doesn't look like an email/.test(await text(p)) && /at least 8/.test(await text(p)));
  await p.fill("#au-email", "amira@example.org"); await p.fill("#au-pass", "correct-horse"); await p.click('[data-form="signup"] button[type=submit]'); await p.waitForTimeout(250);
  ok("confirmation screen", /Check your email/.test(await text(p)) && /amira@example\.org/.test(await text(p)));
  const su = (await calls(p)).find((c) => c.op === "signUp");
  ok("verification link returns to the site", su && su.redirect === "https://benchwork.test");
  await shot(p, "a2-check-email");
  await p.click('[data-auth="resend"]'); await p.waitForTimeout(150);
  ok("resend confirmation", /Sent again/.test(await text(p)) && (await calls(p)).some((c) => c.op === "resend"));

  // 2. Sign-in before confirming, wrong password, then in
  await p.click('[data-auth="to-signin"]'); await p.waitForTimeout(100);
  await p.fill("#au-email", "amira@example.org"); await p.fill("#au-pass", "correct-horse"); await p.click('[data-form="signin"] button[type=submit]'); await p.waitForTimeout(200);
  ok("unconfirmed email held back", /Confirm your email first/.test(await text(p)));
  await p.evaluate(() => window.__fakeSupabase._confirm("amira@example.org"));
  await p.click('[data-auth="to-signin"]'); await p.waitForTimeout(100);
  await p.fill("#au-email", "amira@example.org"); await p.fill("#au-pass", "wrong-password"); await p.click('[data-form="signin"] button[type=submit]'); await p.waitForTimeout(200);
  ok("wrong password message", /don't match/.test(await text(p)));
  await shot(p, "a3-signin-error");
  await p.fill("#au-pass", "correct-horse"); await p.click('[data-form="signin"] button[type=submit]'); await p.waitForTimeout(1200);
  ok("signed in lands on profile step", await p.isVisible("#signup") && (await p.inputValue("#a-email")) === "amira@example.org");
  ok("name carried from sign-up", (await p.inputValue("#a-name")) === "Amira");
  ok("invite code carried through sign-up", (await p.inputValue("#a-invite")) === "SPRING7");
  await p.check('input[name="a-fmt"][value="reading"]');
  await p.click("#signup button[type=submit]"); await p.waitForTimeout(900);
  ok("account set up, welcome shown", (await p.evaluate(() => location.hash)) === "#home" && await p.isVisible(".welcome-modal"));
  const uid = await p.evaluate(() => window.__fakeSupabase.users && Object.values(window.__fakeSupabase.users)[0].id);
  ok("state saved to the member's private path", await p.evaluate((uid) => window.__fakeSupabase.tables.docs.some((d) => d.path === "data/users/" + uid + "/state" && d.data.account.name === "Amira"), uid));
  ok("cohort summary saved", await p.evaluate((uid) => window.__fakeSupabase.tables.docs.some((d) => d.path === "learners/" + uid), uid));
  ok("profile name saved", await p.evaluate(() => window.__fakeSupabase.tables.profiles[0].name === "Amira"));
  ok("joined the invited cohort", await p.evaluate((uid) => { const st = window.__fakeSupabase.tables.docs.find((d) => d.path === "data/users/" + uid + "/state"); const l = window.__fakeSupabase.tables.docs.find((d) => d.path === "learners/" + uid); return st.data.cohort === "SPRING7" && l && l.data.co === "SPRING7"; }, uid));
  ok("not admin", !/Admin/.test(await p.textContent("#nav")) && !/Admin/.test(await p.textContent("#me")));
  await p.click('.welcome-modal [data-act="welcomedone"]').catch(() => {}); await p.waitForTimeout(200);
  await p.evaluate(() => location.hash = "course-m13"); await p.waitForTimeout(500);
  ok("course content loads through the runtime", /Programming from zero/.test(await text(p)));
  await p.evaluate(() => location.hash = "lesson-m13-0"); await p.waitForTimeout(800);
  ok("lesson loads lazily through the runtime", (await p.$$(".lesson, article")).length > 0 && /print/.test(await text(p)));
  await p.close();

  // 3. Google and forgotten password
  p = await page("fresh", "/?signin");
  ok("?signin opens sign-in", /Welcome back/.test(await text(p)));
  await p.click('[data-auth="google"]'); await p.waitForTimeout(150);
  ok("Google redirect", (await calls(p)).some((c) => c.op === "oauth" && c.provider === "google" && c.redirect === "https://benchwork.test"));
  await p.close();
  p = await page("confirmed", "/?signin");
  await p.click('[data-auth="to-forgot"]'); await p.fill("#au-email", "amira@example.org"); await p.click('[data-form="forgot"] button[type=submit]'); await p.waitForTimeout(200);
  ok("reset link sent", /Open it to choose a new password/.test(await text(p)) && (await calls(p)).some((c) => c.op === "reset" && c.redirect === "https://benchwork.test/?reset=1"));
  await p.close();

  // 4. Arriving from the reset email
  p = await page("session", "/?reset=1");
  ok("reset form shown even with a session", /Choose a new password/.test(await text(p)));
  await shot(p, "a4-reset");
  await p.fill("#au-pass", "brand-new-pass"); await p.click('[data-form="reset"] button[type=submit]'); await p.waitForTimeout(900);
  ok("password changed and app opens", await p.evaluate(() => Object.values(window.__fakeSupabase.users)[0].password === "brand-new-pass") && await p.isVisible("#signup"));
  ok("query string cleaned", (await p.evaluate(() => location.search)) === "");
  await p.close();

  // 5. Owner, mobile and dark
  p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  await p.addInitScript(({ FAKE }) => { eval(FAKE); window.__fakeSupabase = window.makeFakeSupabase({ ownerEmail: "owner@example.org" }); window.BW_CONFIG = {}; }, { FAKE });
  await p.goto(BASE + "/"); await p.waitForTimeout(300);
  ok("mobile: no overflow", (await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
  await shot(p, "a5-mobile", true);
  await p.close();
  p = await page("fresh", "/", null, "dark"); await shot(p, "a6-dark"); await p.close();
  p = await page("none");
  ok("no keys: setup screen", /isn't connected to its database/.test(await text(p)));
  await p.close();

  await browser.close(); server.close();
  console.log(results.join("\n"));
  console.log(errs.length ? "ERRORS:\n" + errs.join("\n") : "NO PAGE ERRORS");
  const nf = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(nf + " failures of " + results.length);
  process.exit(nf || errs.length ? 1 : 0);
})();
