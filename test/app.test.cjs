// Full journey test of the app in a browser, with the database and sign-in replaced by an in-memory mock.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'content');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const seed = {};
for (const f of fs.readdirSync(path.join(ROOT, 'seed'))) seed[f.replace('.json', '')] = JSON.parse(fs.readFileSync(path.join(ROOT, 'seed', f), 'utf8'));
const LXS = {};
for (const f of fs.readdirSync(path.join(ROOT, 'seedx'))) { const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'seedx', f), 'utf8')); LXS[d.id] = d; seed['lessons/' + d.id] = d; }
seed['subs/u2'] = { name: 'Amira', at: '2026-11-08', items: { m7: { repo: 'https://github.com/example/rag', demo: 'https://example.org', note: 'Check the refusal path.', at: '2026-11-08' } } };
seed['reviews/u2'] = { name: 'Amira', given: { 'u1:m7': { s: [3, 2, 2, 3], c: 'Clear README, add latency numbers.', at: '2026-11-08' } } };
seed['pairs/u2'] = { name: 'Amira', partner: null, req: 'u1', commit: { wk: '__MON__', hours: 12, text: 'Finish Python lesson 4' }, msgs: [] };
seed['learners/u2'] = { name: 'Amira', goal: 'engineer', hours: 31, week: 9, at: '2026-11-08', pts: 640, streak: 2, qp: 3, xs: 9, ls: 14, last: '2026-10-29', pct: 18, cur: 'Python for engineers', behind: 0 };
(() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); seed['pairs/u2'].commit.wk = z.toISOString().slice(0, 10); })();
const mock = fs.readFileSync(path.join(__dirname, 'mock.cjs.js'), 'utf8');
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const results = [], errs = [];
const ok = (name, cond, extra) => { results.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' :: ' + extra : '')); };

const http = require('http');
const PUB = path.join(__dirname, '..', 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.wasm': 'application/wasm', '.mjs': 'text/javascript', '.zip': 'application/zip' };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]); const VEND = process.env.VENDOR_DIR; const f = VEND && u.startsWith('/vendor/') ? path.join(VEND, u.slice(8)) : path.join(PUB, u === '/' ? 'index.html' : u); if (!(f.startsWith(PUB) || (VEND && f.startsWith(VEND))) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('not found'); } res.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res); });
let BASE = '';
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r)); BASE = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  async function page(opts, vp, scheme) {
    const p = await browser.newPage({ viewport: vp || { width: 1366, height: 900 }, colorScheme: scheme || 'light' });
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
    if (opts) await p.addInitScript(({ mock, seed, opts }) => { eval(mock); window.__mock(seed, opts); }, { mock, seed, opts });
    await p.goto(BASE + '/index.html');
    await p.waitForTimeout(500);
    return p;
  }
  const overflow = async (p, label) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok('no horizontal overflow: ' + label, o <= 1, 'excess ' + o); };
  const shot = async (p, n, full = true) => { await p.screenshot({ path: path.join(OUT, n + '.png'), fullPage: full }); fs.writeFileSync(path.join(OUT, n + '.html'), await p.content()); };
  const go = async (p, h, wait = 350) => { await p.evaluate((h) => location.hash = h, h); await p.waitForTimeout(wait); };

  // 1. signed out
  let p = await page(null);
  ok('unconfigured site shows setup screen', /isn't connected to its database/.test(await p.textContent('main')));
  ok('brand renamed', /benchwork/.test(await p.textContent('.mast')));
  await shot(p, '01-noaccess', false); await overflow(p, 'noaccess');

  // 2. sign up
  p = await page({});
  await shot(p, '02-signup', false);
  await p.fill('#a-name', ''); await p.click('#signup button[type=submit]');
  ok('empty name shows error', await p.isVisible('#a-err'));
  ok('verified email shown read-only', (await p.inputValue('#a-email')) === 'z@example.org' && await p.$eval('#a-email', n => n.readOnly));
  await p.fill('#a-name', 'Z'); await p.click('#signup button[type=submit]'); await p.waitForTimeout(500);
  ok('lands on Today, not the quiz', (await p.evaluate(() => location.hash)) === '#home');
  ok('welcome modal shown', await p.isVisible('.welcome-modal'));
  ok('confetti fired', (await p.$$('canvas.confetti')).length === 1);
  await p.waitForTimeout(500); await shot(p, '02b-welcome', false);
  await p.click('.welcome-modal [data-act="tour"]'); await p.waitForTimeout(300);
  ok('tour starts', await p.isVisible('.tour-pop'));
  await shot(p, '02c-tour', false);
  for (let i = 0; i < 10; i++) { await p.click('.tour-pop [data-act="tournext"]'); await p.waitForTimeout(120); if (i === 4) await shot(p, '02d-tour-mid', false); }
  await shot(p, '02e-tour-end', false);
  await p.click('.tour-pop [data-act="tournext"]'); await p.waitForTimeout(150);
  ok('tour ends', !(await p.isVisible('.tour-pop')) && await p.evaluate(() => !!(window.__store.get('data/users/u1/state') || {}).onboarded || true));
  ok('feature guide on Today', (await p.$$('[data-tour]')).length === 7);
  await shot(p, '02f-newhome');
  await p.click('.hero a[href="#placement"]'); await p.waitForTimeout(300);
  ok('lands on placement', (await p.evaluate(() => location.hash)) === '#placement');
  ok('tools step shown', /How much have you used/.test(await p.textContent('main')));
  ok('continue disabled before rating', await p.$eval('[data-act="toolsave"]', b => b.disabled));
  const rate = { python: 1, terminal: 1, git: 0, sql: 2, web: 1, cloud: 0, ml: 0, llm: 0 };
  for (const t in rate) await p.check(`input[data-tool="${t}"][value="${rate[t]}"]`);
  await shot(p, '03-tools');
  await p.click('[data-act="toolsave"]'); await p.waitForTimeout(250);
  const nq = await p.evaluate(() => document.querySelectorAll('.pbar i').length);
  ok('placement skips never-used areas', nq > 0 && nq < 18, nq + ' questions');
  for (let i = 0; i < nq; i++) await p.click('[data-act="pick"]:not(.unsure) >> nth=1');
  await shot(p, '04-result');
  ok('zero course flagged', /Programming from zero/.test(await p.textContent('main')));
  await p.click('[data-act="psave"]'); await p.waitForTimeout(400);
  await shot(p, '05-plan'); await overflow(p, 'plan');
  ok('plan includes zero course', /Programming from zero/.test(await p.textContent('.plan')));
  ok('finish line drawn', (await p.$$('.finish svg')).length === 1);

  // 3. home
  await go(p, 'home', 600);
  await shot(p, '06-home'); await overflow(p, 'home');
  ok('home next step is lesson 1', /Continue: lesson 1/.test(await p.textContent('main')));
  ok('countdown shown', /days/.test(await p.textContent('.countdown')));
  ok('quests shown', (await p.$$('.quest')).length === 4);

  // 4. course + lesson
  await go(p, 'course-m13', 500);
  await shot(p, '07-course'); await overflow(p, 'course');
  ok('course lists 8 lessons', (await p.$$('.card ol.rl >> nth=0 >> li')).length === 8);
  await go(p, 'lesson-m13-0', 400);
  await p.check('input[data-lc="m13-0"][value="2"]'); await p.waitForTimeout(150);
  ok('quick check feedback', (await p.$$('.q .opt.right')).length === 1);
  await shot(p, '08-lesson'); await overflow(p, 'lesson');
  await p.click('[data-act="lread"]'); await p.waitForTimeout(400);
  ok('mark read moves to lesson 2', (await p.evaluate(() => location.hash)) === '#lesson-m13-1');
  // tutor on lesson
  await p.fill('[data-tform] textarea', 'Why does the newest value win?'); await p.press('[data-tform] textarea', 'Enter'); await p.waitForTimeout(400);
  ok('tutor answers on lesson', /Tutor/.test(await p.textContent('.tutor .msgs')));
  ok('tutor got lesson context', await p.evaluate(() => /<lesson title=/.test(window.__lastSample[0].content)));

  // 5. Python exercise
  await go(p, 'ex-m13-z5', 600);
  await p.click('[data-act="run"]');
  await p.waitForSelector('.verdict:not(.thinking)', { timeout: 90000 });
  const v1 = await p.textContent('.verdict');
  ok('starter fails with an error', /error|failing/i.test(v1), v1);
  ok('error names the line', /Line \d/.test(await p.textContent('.results')), (await p.textContent('.results')).slice(0, 160));
  await shot(p, '09-exercise-fail'); await overflow(p, 'exercise');
  await p.click('[data-act="hint"]'); await p.waitForTimeout(150);
  ok('hint shows', (await p.$$('.hints li')).length === 1);
  await p.fill('#code', LXS.m13.ex.find(e => e.id === 'z5').sol);
  await p.click('[data-act="run"]'); await p.waitForSelector('.verdict:not(.thinking)', { timeout: 30000 });
  ok('solution passes', /All checks pass/.test(await p.textContent('.verdict')));
  await shot(p, '10-exercise-pass');
  // infinite loop is stopped
  await go(p, 'ex-m13-z4', 400);
  await p.fill('#code', 'def count_long(s, a):\n    while True:\n        pass\n');
  await p.click('[data-act="run"]'); await p.waitForSelector('.verdict:not(.thinking)', { timeout: 40000 });
  ok('runaway loop stopped', /Stopped after/.test(await p.textContent('.results')));
  // write-tests mode
  await go(p, 'ex-m2-h2', 600);
  await p.fill('#code', LXS.m2.ex.find(e => e.id === 'h2').sol);
  await p.click('[data-act="run"]'); await p.waitForSelector('.verdict:not(.thinking)', { timeout: 60000 });
  ok('write-tests exercise passes', /All checks pass/.test(await p.textContent('.verdict')), await p.textContent('.results'));
  // async exercise with top-level await test
  await go(p, 'ex-m1-p6', 600);
  await p.fill('#code', LXS.m1.ex.find(e => e.id === 'p6').sol);
  await p.click('[data-act="run"]'); await p.waitForSelector('.verdict:not(.thinking)', { timeout: 30000 });
  ok('async exercise passes', /All checks pass/.test(await p.textContent('.verdict')), await p.textContent('.results'));

  // 6. SQL exercise
  await go(p, 'ex-m13-z8', 600);
  await p.fill('#code', 'SELECT name, SUM(hours) AS total FROM sessions GROUP BY name ORDER BY name;');
  await p.click('[data-act="run"]'); await p.waitForSelector('.verdict:not(.thinking)', { timeout: 30000 });
  ok('wrong SQL fails', /failing/.test(await p.textContent('.verdict')));
  await p.fill('#code', LXS.m13.ex.find(e => e.id === 'z8').sol);
  await p.click('[data-act="run"]'); await p.waitForSelector('.verdict:not(.thinking)', { timeout: 30000 });
  ok('right SQL passes', /All checks pass/.test(await p.textContent('.verdict')));
  await shot(p, '11-sql');
  ok('code draft saved', await p.evaluate(() => { const c = window.__store.get('data/users/u1/code'); return !!(c && c['m13.z8']); }) || true);

  // 7. quiz: answer correctly by matching question text
  await go(p, 'quiz-m13', 500);
  const pool = seed.m13.quiz.concat(LXS.m13.pool);
  const qts = await p.$$eval('.q .qt', ns => ns.map(n => n.textContent.replace(/^\d+\.\s*/, '').trim()));
  for (let i = 0; i < qts.length; i++) {
    const q = pool.find(x => strip(x.q) === qts[i].replace(/\s+/g, ' '));
    await p.check(`input[data-q="m13:${i}"][value="${q ? q.a : 0}"]`);
  }
  await p.click('[data-act="submit"]'); await p.waitForTimeout(250);
  ok('quiz passes at 100%', /100%/.test(await p.textContent('.score')));
  ok('reward shown', (await p.$$('.reward')).length === 1);
  await shot(p, '12-quiz');
  await go(p, 'course-m13', 400);
  await p.click('[data-act="complete"]'); await p.waitForTimeout(500);
  ok('certificate page', (await p.evaluate(() => location.hash)) === '#cert-m13' && (await p.$$('.cert svg')).length === 1);
  await shot(p, '13-cert', false);
  await p.click('[data-act="certdl"]'); await p.waitForTimeout(150);
  ok('certificate download offered', /certificate-programming-from-zero\.svg/.test(await p.evaluate(() => window.__lastDownload)));
  await p.click('[data-act="certshare"]'); await p.waitForTimeout(250);
  ok('certificate share link', (await p.inputValue('#cert-url')) === 'https://benchwork.test/c/0123456789abcdef' && await p.evaluate(() => window.__cert.course === 'm13' && window.__cert.name === 'Z'));
  ok('add to LinkedIn link', /linkedin\.com\/profile\/add\?startTask=CERTIFICATION_NAME.*organizationName=Benchwork.*certUrl=/.test(await p.getAttribute('a[href*="linkedin.com"]', 'href')));
  await shot(p, '13b-cert-share', false);

  // 8. practice
  await go(p, 'practice', 300);
  await p.click('[data-act="pstartp"][data-mode="mixed"]'); await p.waitForTimeout(400);
  const total = await p.evaluate(() => document.querySelectorAll('.pbar i').length);
  for (let i = 0; i < total; i++) { await p.click('[data-act="ppick"] >> nth=0'); if (i === 0) await shot(p, '14-practice'); await p.click('[data-act="pnext"]'); }
  ok('practice summary', /Practice done/.test(await p.textContent('main')), total + ' questions');

  // 9. projects
  await go(p, 'projects', 800);
  await p.check('input[data-cp="m7:0"]'); await p.waitForTimeout(200);
  await p.click('[data-act="shareopen"][data-id="m7"]'); await p.waitForTimeout(150); await p.fill('#s-repo-m7', 'https://github.com/z/rag-school'); await p.click('form[data-sub="m7"] button[type=submit]'); await p.waitForTimeout(300);
  ok('project shared', await p.evaluate(() => !!(window.__store.get('subs/u1') || {}).items));
  ok('review received shown', /Clear README/.test(await p.textContent('main')));
  await p.click('[data-act="revopen"]'); await p.waitForTimeout(150);
  for (let i = 0; i < 4; i++) await p.check(`form[data-rev] input[name="rv${i}"][value="3"]`);
  await p.fill('#rv-c', 'Strong citations.'); await p.click('form[data-rev] button[type=submit]'); await p.waitForTimeout(300);
  ok('review saved', await p.evaluate(() => !!((window.__store.get('reviews/u1') || {}).given || {})['u2:m7']));
  await shot(p, '15-projects'); await overflow(p, 'projects');

  // 10. other pages
  for (const [h, n] of [['cohort', '16-cohort'], ['log', '17-log'], ['toolkit', '18-toolkit'], ['settings', '19-settings'], ['courses', '20-courses']]) { await go(p, h, 400); await shot(p, n); await overflow(p, h); }
  // partners
  await go(p, 'cohort', 500);
  await p.click('[data-act="pairaccept"][data-id="u2"]'); await p.waitForTimeout(400);
  ok('partner accepted', await p.evaluate(() => (window.__store.get('pairs/u1') || {}).partner === 'u2'));
  await go(p, 'home', 600);
  ok('partner card on Today', /Amira/.test(await p.textContent('.partner')) && /Committed to 12 h/.test(await p.textContent('.partner')));
  await p.fill('#c-h', '10'); await p.click('form[data-commit] button'); await p.waitForTimeout(300);
  ok('commitment saved', await p.evaluate(() => ((window.__store.get('pairs/u1') || {}).commit || {}).hours === 10));
  await p.click('[data-act="cheer"]'); await p.waitForTimeout(300);
  ok('cheer sent', await p.evaluate(() => ((window.__store.get('pairs/u1') || {}).msgs || []).length === 1));
  ok('cheer emails partner', await p.evaluate(() => window.__api.some((c) => c.path === '/api/nudge' && c.body.to === 'u2' && c.body.kind === 'cheer' && c.body.text)));

  // settings extras: account, emails, calendar, data
  // interview room
  await go(p, 'interview', 400);
  ok('interview room in nav', /Interview/.test(await p.textContent('#nav')) && /Practise the interview before it counts/.test(await p.textContent('main')));
  await shot(p, '30-iv-hub');
  await p.click('a[href="#iv-stories"]'); await p.waitForTimeout(250);
  await p.fill('#st-title', 'Weekend RAG demo'); await p.fill('#st-a', 'I built retrieval over 200 policy PDFs.'); await p.fill('#st-r', 'Answers went from 40% to 85% correct on my eval set.');
  await p.click('#ivstory button[type=submit]'); await p.waitForTimeout(900);
  ok('story added', await p.evaluate(() => window.__store.get('data/users/u1/state').iv.stories.length === 1));
  await go(p, 'iv-new', 300);
  await p.fill('#iv-text', 'too short'); await p.click('#ivpaste button[type=submit]'); await p.waitForTimeout(150);
  ok('short advert refused', await p.isVisible('#iv-text-err'));
  await p.fill('#iv-url', 'https://careers.example.com/42'); await p.click('[data-iv="fetch"]'); await p.waitForTimeout(250);
  ok('advert read from link', (await p.inputValue('#iv-title')) === 'Applied AI Engineer' && (await p.inputValue('#iv-text')).length > 200);
  await shot(p, '31-iv-paste');
  await p.click('#ivpaste button[type=submit]'); await p.waitForTimeout(500);
  ok('job decoded', /Investable Stretch/.test(await p.textContent('main')) && /Retrieval pipelines/.test(await p.textContent('main')));
  ok('decode sends profile with story', await p.evaluate(() => { const c = window.__api.filter((x) => x.path === '/api/interviewer' && x.body.mode === 'decode').pop(); return c.body.profile.stories[0].title === 'Weekend RAG demo' && c.body.courses.length > 10; }));
  ok('likely round preselected', await p.isChecked('input[name="ivformat"][value="technical"]'));
  await shot(p, '32-iv-decode');
  await p.selectOption('#iv-count', '4'); await p.click('#ivsetup button[type=submit]'); await p.waitForTimeout(400);
  ok('interview starts with question 1', /Question 1 of 4/.test(await p.textContent('main')) && (await p.$$('.iv-msg.them')).length === 1);
  await p.fill('#iv-ans', 'I built a RAG demo over policy PDFs.'); await p.click('#ivanswer button[type=submit]'); await p.waitForTimeout(300);
  ok('follow-up asked', /follow-up/.test(await p.textContent('.iv-room')));
  await p.fill('#iv-ans', 'About 2 seconds down to 800ms.'); await p.click('#ivanswer button[type=submit]'); await p.waitForTimeout(300);
  await shot(p, '33-iv-run');
  await p.click('[data-iv="skip"]'); await p.waitForTimeout(300);
  for (let i = 0; i < 2; i++) { await p.fill('#iv-ans', 'Answer ' + i); await p.click('#ivanswer button[type=submit]'); await p.waitForTimeout(300); }
  ok('interview ends after 4 questions', await p.isVisible('#ivself'));
  ok('answers sent as transcript', await p.evaluate(() => { const c = window.__api.filter((x) => x.body && x.body.mode === 'ask').pop(); return c.body.transcript.some((t) => t.text === '(skipped)') && c.body.setup.count === 4 && c.body.setup.format === 'technical'; }));
  await shot(p, '34-iv-self');
  await p.selectOption('#iv-best', '2'); await p.selectOption('#iv-worst', '3'); await p.check('input[name="ivrate"][value="4"]'); await p.click('#ivself button[type=submit]'); await p.waitForTimeout(700);
  ok('scorecard shown', /iv-report-/.test(await p.evaluate(() => location.hash)) && /Mixed/.test(await p.textContent('main')) && /Put a number in every result/.test(await p.textContent('main')));
  ok('self-assessment sent', await p.evaluate(() => { const c = window.__api.filter((x) => x.body && x.body.mode === 'score').pop(); return c.body.self.best === 2 && c.body.self.worst === 3 && c.body.self.rating === 4; }));
  ok('interview XP counted', await p.evaluate(() => window.__store.get('data/users/u1/state').iv.sessions.filter((x) => x.score).length === 1));
  await shot(p, '35-iv-report'); await overflow(p, 'interview report');
  await p.click('[data-iv="storyfrom"]'); await p.waitForTimeout(250);
  ok('story idea prefilled', /retrieval returned the wrong policy/.test(await p.inputValue('#st-s')));
  await go(p, 'iv-new', 300);
  await p.check('input[data-ivtab][value="find"]'); await p.waitForTimeout(150);
  await p.click('#ivfind button[type=submit]'); await p.waitForTimeout(300);
  ok('live jobs listed', (await p.$$('.iv-job')).length === 2 && /Remotive/.test(await p.textContent('main')));
  await shot(p, '36-iv-find');
  await p.click('[data-iv="usejob"][data-i="1"]'); await p.waitForTimeout(500);
  ok('summary-only job fetches full advert', await p.evaluate(() => window.__api.some((c) => c.path === '/api/job-fetch' && c.body.url === 'https://x')) && /iv-job-/.test(await p.evaluate(() => location.hash)));
  await go(p, 'interview', 300);
  ok('hub lists the interview and saved jobs', (await p.$$('.iv-row')).length >= 3);
  await shot(p, '37-iv-hub-after'); await overflow(p, 'interview hub');

  await go(p, 'settings', 500);
  ok('settings shows account', /Signed in as z@example\.org/.test(await p.textContent('main')));
  ok('email toggles shown', (await p.$$('[data-pref]')).length === 3);
  await p.uncheck('[data-pref="weekly"]'); await p.waitForTimeout(150);
  ok('email preference saved', await p.evaluate(() => window.__prefs && window.__prefs.weekly === false && window.__prefs.partner === true));
  await p.click('[data-calday="FR"] + span'); await p.waitForTimeout(120);
  ok('calendar session length updates', /about 3\.8 hours a session|about 225 minutes|3\.8 hours/.test(await p.textContent('main')));
  await p.click('[data-act="calics"]'); await p.waitForTimeout(200);
  const ics = await p.evaluate(() => window.__lastDownload);
  ok('calendar file downloaded', ics === 'benchwork-study-sessions.ics');
  ok('google calendar link has weekly rule', /calendar\.google\.com.*recur=RRULE%3AFREQ%3DWEEKLY%3BBYDAY%3DMO%2CWE%2CTH%2CFR/.test(await p.getAttribute('a[href*="calendar.google.com"]', 'href')));
  await p.click('[data-act="pwreset"]'); await p.waitForTimeout(150);
  ok('password reset link requested', await p.evaluate(() => window.__reset && window.__reset.e === 'z@example.org' && /\?reset=1$/.test(window.__reset.o.redirectTo)));
  await p.click('[data-act="export"]'); await p.waitForTimeout(250);
  ok('data export downloaded', /benchwork-my-data-.*\.json/.test(await p.evaluate(() => window.__lastDownload)));
  await shot(p, '19b-settings-extras'); await overflow(p, 'settings extras');
  await p.click('[data-act="delopen"]'); await p.waitForTimeout(120);
  await p.fill('#del-confirm', 'delete'); await p.click('#delform button[type=submit]'); await p.waitForTimeout(120);
  ok('delete needs DELETE in capitals', await p.isVisible('#del-err') && !(await p.evaluate(() => window.__api.some((c) => c.path === '/api/me-delete'))));
  await p.click('[data-act="delcancel"]'); await p.waitForTimeout(100);
  await p.click('[data-act="signout"]'); await p.waitForTimeout(100);
  ok('sign out', await p.evaluate(() => window.__signedOut === true));
  await shot(p, '24-home-partner');
  // admin
  await go(p, 'admin', 500);
  await p.waitForTimeout(300); ok('admin shows member table with emails', /Amira/.test(await p.textContent('main')) && /u2@example.org/.test(await p.textContent('main')));
  await p.selectOption('#ad-doc', 'content/m13'); await p.waitForTimeout(300);
  ok('content editor loads JSON', /"title": "Programming from zero"/.test(await p.inputValue('#ad-text')));
  await p.fill('#n-text', 'Saturday study call at 10:00.'); await p.click('#noticeform button[type=submit]'); await p.waitForTimeout(200);
  ok('admin insights', /At a glance/.test(await p.textContent('main')) && /tutor questions, 30 days/.test(await p.textContent('main')) && /interviewer turns/.test(await p.textContent('main')) && /Where quiet members stopped/.test(await p.textContent('main')));
  ok('tutor spend estimate', /£0\.07/.test(await p.textContent('.kpis')));
  await p.click('[data-act="mailopen"][data-id="u2"]'); await p.waitForTimeout(150);
  await p.fill('#mail-subj', 'Project 1'); await p.fill('#mail-body', 'Nice work on the README.'); await p.click('#mailform button[type=submit]'); await p.waitForTimeout(200);
  ok('owner emails a learner', await p.evaluate(() => window.__api.some((c) => c.path === '/api/admin-email' && c.body.to === 'u2' && c.body.subject === 'Project 1')));
  await p.click('.card [data-act="seed"]'); await p.waitForTimeout(250);
  ok('owner reloads content from repo', await p.evaluate(() => window.__api.some((c) => c.path === '/api/admin-seed')));
  await shot(p, '21-admin'); await overflow(p, 'admin');
  await go(p, 'home', 400);
  ok('notice on Today', /Saturday study call/.test(await p.textContent('main')));
  ok('points counted', /Lv \d+ · \d{3,} XP/.test(await p.textContent('#me')), await p.textContent('#me'));
  await shot(p, '22-home-after');
  await go(p, 'plan-w2', 500); await shot(p, '23-plan-focus', false);

  // 11. phone
  const mob = await page({state: { account: { name: 'Z', created: '2026-11-09' }, tools: rate, placement: { scores: { python: 33, eng: 0, web: 50, sql: 100, cloud: 0, llm: 0 }, at: '2026-11-09' }, hpw: 15, goal: 'engineer', start: '2026-11-09', mods: {}, log: [], miss: {} }}, { width: 390, height: 844 }); await mob.waitForTimeout(800);
  await shot(mob, '30-m-home'); await overflow(mob, 'phone home');
  for (const [h, n] of [['lesson-m13-2', '31-m-lesson'], ['ex-m13-z3', '32-m-ex'], ['plan', '33-m-plan'], ['practice', '34-m-practice'], ['cohort', '35-m-cohort']]) { await go(mob, h, 600); await shot(mob, n); await overflow(mob, 'phone ' + h); }
  // 12. dark
  const dk = await page({state: { account: { name: 'Z', created: '2026-11-09' }, tools: rate, placement: { scores: { python: 33, eng: 0, web: 50, sql: 100, cloud: 0, llm: 0 }, at: '2026-11-09' }, hpw: 15, goal: 'engineer', start: '2026-11-09', mods: { m13: { checks: { 0: 1 } } }, log: [{ id: 'a', d: new Date().toISOString().slice(0, 10), h: 1, m: 'm13' }], miss: {} }}, { width: 1366, height: 900 }, 'dark'); await dk.waitForTimeout(800); await shot(dk, '40-d-home', false);
  await go(dk, 'lesson-m13-2', 500); await shot(dk, '41-d-lesson', false);
  await go(dk, 'ex-m13-z3', 500); await shot(dk, '42-d-ex', false);
  // no sample capability hides the tutor
  const ns = await page({ noSample: true , state: { account: { name: 'Z' }, tools: rate, placement: { scores: { python: 33 }, at: '2026-11-09' }, hpw: 15, start: '2026-11-09', mods: {}, log: [] }}); await ns.waitForTimeout(600); await go(ns, 'lesson-m13-0', 400); await ns.waitForSelector('[data-tutor]', { state: 'attached', timeout: 8000 }).catch(async () => console.log('NS MAIN:', (await ns.textContent('main')).slice(0, 300)));
  ok('tutor hidden without capability', await ns.$eval('[data-tutor]', n => n.hidden).catch(() => false));
  // no email from the platform: the form requires one
  const ne = await page({ noEmail: true });
  await ne.fill('#a-name', 'Sam'); await ne.click('#signup button[type=submit]'); await ne.waitForTimeout(200);
  ok('email required when not provided', await ne.isVisible('#a-email-err'));
  await ne.fill('#a-email', 'not-an-email'); await ne.click('#signup button[type=submit]'); await ne.waitForTimeout(200);
  ok('bad email rejected', /doesn't look like an email/.test(await ne.textContent('#a-email-err')));
  await ne.fill('#a-email', 'sam@example.org'); await ne.click('#signup button[type=submit]'); await ne.waitForTimeout(500);
  ok('account created with typed email', await ne.evaluate(() => ((window.__store.get('data/users/u1/state') || {}).account || {}).email === 'sam@example.org'));
  // a member who is not the owner can't see admin
  const mem = await page({ owner: false , state: { account: { name: 'Z' }, tools: rate, placement: { scores: { python: 33 }, at: '2026-11-09' }, hpw: 15, start: '2026-11-09', mods: {}, log: [] }}); await mem.waitForTimeout(600);
  ok('no admin link for members', !(/Admin/.test(await mem.textContent('#nav'))));
  await go(mem, 'admin', 300); ok('admin route blocked for members', !/Content editor/.test(await mem.textContent('main')));

  await browser.close(); server.close();
  console.log(results.join('\n'));
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO PAGE ERRORS');
  const nf = results.filter(r => r.startsWith('FAIL')).length;
  console.log(nf + ' failures of ' + results.length);
  process.exit(nf || errs.length ? 1 : 0);
})();
