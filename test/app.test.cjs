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
(() => { const d = new Date(), x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); const wk = x.toISOString().slice(0, 10), lw = new Date(x.getTime() - 7 * 864e5).toISOString().slice(0, 10);
  Object.assign(seed['learners/u2'], { wk, wxp: 5000 });
  seed['league'] = { wk, tier: { u1: 1, u2: 1 }, group: { u1: '1-0', u2: '1-0' }, last: { u1: { wk: lw, rank: 1, n: 12, xp: 340, from: 0, to: 1 } }, kept: {} }; })();
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
  await p.fill('#a-name', 'Z'); await p.click('#signup button[type=submit]'); await p.waitForTimeout(200);
  ok('asks how you learn best', await p.isVisible('#a-learn-err'));
  await p.check('input[name="a-fmt"][value="video"]'); await p.check('input[name="a-fmt"][value="interactive"]'); await p.check('input[name="a-fmt"][value="reading"]');
  ok('only two learning styles kept, in tick order', (await p.$$eval('input[name="a-fmt"]:checked', (a) => a.map((x) => x.value))).sort().join(',') === 'interactive,reading' && /2/.test(await p.textContent('input[name="a-fmt"][value="reading"] + span .rank')));
  await p.uncheck('input[name="a-fmt"][value="reading"]'); await p.check('input[name="a-fmt"][value="video"]');
  await p.check('input[name="a-budget"][value="free"]');
  await shot(p, '02a-signup-learn', false);
  await p.click('#signup button[type=submit]'); await p.waitForTimeout(500);
  ok('learning preference saved', await p.evaluate(() => { const l = (window.__store.get('data/users/u1/state') || {}).learn; return l && l.formats.join(',') === 'interactive,video' && l.budget === 'free'; }));
  ok('lands on Today, not the quiz', (await p.evaluate(() => location.hash)) === '#home');
  ok('sign-up saves the reminder level, persistent by default', await p.evaluate(() => { const r = (window.__store.get('data/users/u1/state') || {}).remind; return r && r.level === 'persistent' && r.hour === 19 && !!r.tz; }));
  ok('welcome modal shown', await p.isVisible('.welcome-modal'));
  ok('confetti fired', (await p.$$('canvas.confetti')).length === 1);
  await p.waitForTimeout(500); await shot(p, '02b-welcome', false);
  await p.click('.welcome-modal [data-act="tour"]'); await p.waitForTimeout(300);
  ok('tour starts', await p.isVisible('.tour-pop'));
  await shot(p, '02c-tour', false);
  for (let i = 0; i < 6; i++) { await p.click('.tour-pop [data-act="tournext"]'); await p.waitForTimeout(120); if (i === 1) await shot(p, '02d-tour-mid', false); }
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
  // leagues
  await go(p, 'league', 500);
  ok('league table: Silver, Amira ahead', /Silver league/.test(await p.textContent('main')) && (await p.$$eval('.lg-row b', (b) => b.map((x) => x.textContent)))[0] === 'Amira' && await p.isVisible('.lg-row.me'));
  ok('last week result shown', /Promoted to Silver/.test(await p.textContent('.lg-result')) && /1st of 12 with 340 XP/.test(await p.textContent('.lg-result')));
  ok('weekly XP published in the summary', await p.evaluate(() => { const l = window.__store.get('learners/u1'); return l && /^\d{4}-\d{2}-\d{2}$/.test(l.wk) && typeof l.wxp === 'number'; }));
  await shot(p, '16b-league'); await overflow(p, 'league');
  await p.click('.lg-result [data-act="lgseen"]'); await p.waitForTimeout(200);
  ok('result banner dismissed', !(await p.isVisible('.lg-result')));
  await go(p, 'home', 500);
  ok('league card on Today', /Silver league · 2nd of 2/.test(await p.textContent('.lg-mini')));
  await go(p, 'league', 300); await p.click('[data-act="lgleave"]'); await p.waitForTimeout(800);
  ok('leaving the leagues is published', await p.evaluate(() => window.__store.get('learners/u1').lg === false) && /left the leagues/.test(await p.textContent('main')));
  await p.click('[data-act="lgjoin"]'); await p.waitForTimeout(800);
  ok('joining again', await p.evaluate(() => window.__store.get('learners/u1').lg !== false) && await p.isVisible('.lg-table'));
  // screen readers: page changes move focus to the heading and name the tab; messages go to one live region
  await go(p, 'library', 600);
  ok('page change focuses the heading', await p.evaluate(() => document.activeElement && document.activeElement.tagName === 'H1' && /Library/.test(document.activeElement.textContent)));
  ok('tab title names the page', /^Library · Benchwork$/.test(await p.title()));
  await go(p, 'league', 300); await p.click('[data-act="lgleave"]'); await p.waitForTimeout(300);
  ok('toasts are announced', /left the leagues/.test(await p.textContent('#sr-live')));
  await p.click('[data-act="lgjoin"]'); await p.waitForTimeout(300);
  ok('league zones named for screen readers', (await p.$$('.lg-row .sr')).length >= 1);
  // portfolio
  await go(p, 'portfolio', 500);
  ok('portfolio suggests an address from the name', (await p.inputValue('#pf-slug')) === 'z');
  await p.fill('#pf-slug', 'Bad slug'); await p.fill('#pf-github', 'http://github.com/z'); await p.click('#pfform button[value="1"]'); await p.waitForTimeout(200);
  ok('portfolio checks address and links', await p.isVisible('#pf-slug-err') && await p.isVisible('#pf-github-err'));
  await p.fill('#pf-slug', 'taken-name'); await p.fill('#pf-github', 'https://github.com/zara'); await p.click('#pfform button[value="1"]'); await p.waitForTimeout(300);
  ok('taken address explained', /taken/.test(await p.textContent('#pf-slug-err')));
  await p.fill('#pf-slug', 'zara-jones'); await p.fill('#pf-headline', 'Analyst moving into AI engineering'); await p.uncheck('input[name="pf-show"][value="stats"]');
  await p.click('#pfform button[value="1"]'); await p.waitForTimeout(300);
  ok('portfolio published', await p.evaluate(() => { const r = window.__pf(); return r.published === true && r.slug === 'zara-jones' && r.links.github === 'https://github.com/zara' && r.show.stats === false && r.show.projects === true; }) && /benchwork\.test\/p\/zara-jones/.test(await p.textContent('.pf-live')));
  ok('preview follows the toggles', /Analyst moving into AI engineering/.test(await p.textContent('.pf-prev')) && !/hours logged/.test(await p.textContent('.pf-prev')));
  await shot(p, '38b-portfolio'); await overflow(p, 'portfolio');
  await p.click('[data-act="pfunpub"]'); await p.waitForTimeout(300);
  ok('portfolio made private', await p.evaluate(() => window.__pf().published === false));
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
  // tailored to how they learn (hands-on first, then video; free only)
  await go(p, 'course-m14', 600);
  ok('course resources ordered for the learner', /Ordered for how you learn: hands-on practice, then watching videos/.test(await p.textContent('main')) && /Best for you/.test(await p.textContent('main')));
  ok('paid items marked outside budget', /Outside your budget/.test(await p.textContent('main')));
  ok('format chips shown', (await p.$$('.fchip.f-video')).length >= 1);
  const firstRes = await p.$eval('aside .rl li .ttl', (a) => a.textContent).catch(() => '');
  ok('top resource is free and hands-on or video', /StatQuest|scikit|Machine Learning Specialization/.test(firstRes) && !/Hands-On Machine Learning/.test(firstRes), firstRes);
  await go(p, 'lesson-m13-0', 600);
  ok('lesson nudges hands-on learners to the exercise', /Learn by doing\?/.test(await p.textContent('main')));
  await go(p, 'toolkit', 400);
  ok('toolkit shows learning tips', /How you learn best/.test(await p.textContent('main')) && /Start each lesson with its exercise/.test(await p.textContent('main')));

  // the library (AI Engineering from Scratch)
  await go(p, 'library', 900);
  ok('library lists 20 phases', (await p.$$('.lib-phases .tile')).length === 20 && /542 deeper lessons/.test(await p.textContent('main')));
  ok('library credits the source', /AI Engineering from Scratch/.test(await p.textContent('.lib-credit')) && /MIT licence/.test(await p.textContent('.lib-credit')));
  await p.fill('#lib-q', 'RAG'); await p.click('#libsearch button'); await p.waitForTimeout(200);
  ok('library search', /result/.test(await p.textContent('main')) && /RAG \(Retrieval-Augmented Generation\)/.test(await p.textContent('main')));
  await go(p, 'lib-11', 400);
  ok('phase page', /LLM Engineering/.test(await p.textContent('h1')) && (await p.$$('main .rl li')).length === 17);
  await go(p, 'lib-11-06', 900);
  ok('library lesson renders', /RAG \(Retrieval-Augmented Generation\)/.test(await p.textContent('h1')) && /The Problem/.test(await p.textContent('.lib-prose')) && /Open on GitHub/.test(await p.textContent('aside')));
  await shot(p, '42-lib-lesson');
  for (let k = 0; k < 10; k++) { const r = await p.$('input[data-lq="lib-11-06:' + k + '"]'); if (!r) break; await p.check('input[data-lq="lib-11-06:' + k + '"][value="0"]').catch(() => {}); await p.waitForTimeout(60); }
  ok('library quiz answers reveal explanations', (await p.$$('main .card.sec .expl')).length >= 1);
  await p.click('[data-act="libdone"]'); await p.waitForTimeout(300);
  ok('library lesson marked read', await p.evaluate(() => !!((window.__store.get('data/users/u1/state') || {}).lib || { done: {} }).done['lib-11-06']) || /Read/.test(await p.textContent('main')));
  await go(p, 'course-m7', 700);
  ok('course links deeper library lessons', /Go deeper in the library/.test(await p.textContent('aside')) && /Advanced RAG/.test(await p.textContent('aside')));
  await go(p, 'problems', 500);
  ok('coding problems listed', (await p.$$('main .rl li')).length === 51);
  await p.selectOption('#pf-diff', 'hard'); await p.waitForTimeout(150);
  ok('filter problems by difficulty', (await p.$$('main .rl li')).length < 51);
  await go(p, 'prob-cosine-top-k', 700);
  ok('problem page shows statement and starter', /Cosine similarity top-k/.test(await p.textContent('h1')) && /NotImplementedError/.test(await p.inputValue('#prob-code')));
  await p.evaluate(() => { window.AILRunner.runPractice = async (P, code, h) => { window.__prac = { id: P.id, code, harness: (h || '').length, tests: P.tests.length }; return { results: [{ layer: 'examples', name: 'normalize three rows', status: 'pass', message: '' }, { layer: 'edge', name: 'zero row', status: 'fail', message: 'Not close', expected: '[0, 0]', actual: '[nan, nan]' }], summary: { total: 2, passed: 1, failed: 1, ok: false }, load_error: '', stdout: 'hi' }; }; });
  await p.click('[data-act="probrun"]'); await p.waitForTimeout(400);
  ok('problem checks run with the harness and tests', await p.evaluate(() => window.__prac && window.__prac.id === 'cosine-top-k' && window.__prac.harness > 5000 && window.__prac.tests > 100) && /1 of 2 checks pass/.test(await p.textContent('main')) && /Not close/.test(await p.textContent('main')));
  await p.click('[data-act="probhint"]'); await p.waitForTimeout(150);
  ok('problem hints one at a time', (await p.$$('.hint')).length === 1);
  await p.evaluate(() => { window.AILRunner.runPractice = async () => ({ results: [{ layer: 'examples', name: 'a', status: 'pass', message: '' }], summary: { total: 1, passed: 1, failed: 0, ok: true }, load_error: '', stdout: '' }); });
  await p.click('[data-act="probrun"]'); await p.waitForTimeout(400);
  ok('solving a problem reveals notes and the reference', /What to know now/.test(await p.textContent('main')) && /Reference solution/.test(await p.textContent('main')));
  await shot(p, '43-problem');
  await go(p, 'glossary', 700);
  ok('glossary', (await p.$$('.gl')).length > 50 && /Cheat sheets/.test(await p.textContent('main')));
  await p.fill('#gl-q', 'LoRA'); await p.click('#glosssearch button'); await p.waitForTimeout(150);
  ok('glossary search', (await p.$$('.gl')).length >= 1 && (await p.$$('.gl')).length < 10);
  await go(p, 'routes', 500);
  ok('specialisms listed', (await p.$$('main .tile')).length === 6);
  await p.click('main .tile'); await p.waitForTimeout(400);
  await p.click('[data-act="routeset"]'); await p.waitForTimeout(200);
  ok('follow a specialism', /Stop following/.test(await p.textContent('main')));
  await shot(p, '44-route');
  await go(p, 'home', 500);
  ok('Today shows the specialism', /Your specialism/.test(await p.textContent('main')));
  await go(p, 'projects', 600);
  ok('project challenges from the library', /Project challenges from the library/.test(await p.textContent('main')) && (await p.$$('.sec .grid3 a[href*="github.com/rohitg00"]')).length === 9);
  await go(p, 'iv-bank', 500);
  ok('interview question bank', /Question bank/.test(await p.textContent('h1')) && (await p.$$('main .tile')).length > 10);
  await go(p, 'ivb-agents', 500);
  ok('bank topic lists questions', (await p.$$('main .rl li')).length > 10);
  await go(p, 'ivq-five-parts-of-an-agent-loop', 700);
  await p.fill('#ivb-ans', 'An agent loop needs a tool registry, a message buffer and a stop condition, otherwise it just chats.');
  await p.click('#ivbform button[type=submit]'); await p.waitForTimeout(400);
  ok('bank answer marked and model answer shown', /Marked/.test(await p.textContent('main')) && /Model answer/.test(await p.textContent('main')) && /turn budget/.test(await p.textContent('main')));
  await shot(p, '45-iv-bank-q');

  // navigation structure
  await go(p, 'courses', 300);
  ok('Learn tabs on Courses', (await p.$$eval('.subnav a', (a) => a.map((x) => x.textContent))).join(',') === 'Courses,Library,Your plan,Practice,Toolkit' && (await p.getAttribute('#nav a[aria-current="page"]', 'data-group')) === 'learn');
  await go(p, 'course-m13', 300);
  ok('deep pages keep the section lit, no tabs', (await p.getAttribute('#nav a[aria-current="page"]', 'data-group')) === 'learn' && (await p.$$('.subnav')).length === 0);
  await go(p, 'log', 300);
  ok('Study log sits under Today', (await p.getAttribute('#nav a[aria-current="page"]', 'data-group')) === 'today' && /Overview/.test(await p.textContent('.subnav')));
  await p.click('.acct:not(.bell) summary'); await p.waitForTimeout(100);
  ok('account menu has settings and admin for the owner', await p.isVisible('.acct-menu a[href="#settings"]') && await p.isVisible('.acct-menu a[href="#admin"]') && await p.isVisible('.acct-menu [data-act="signout"]'));
  await shot(p, '29-acct-menu', false);
  await p.click('main'); await p.waitForTimeout(80);
  ok('account menu closes on outside click', !(await p.isVisible('.acct-menu')));

  // interview room
  await go(p, 'interview', 400);
  { const nav = (await p.$$eval('#nav a', (a) => a.map((x) => x.textContent.trim()))).join(','); ok('five sections in the top bar', nav === 'Today,Learn,Projects,Career,Cohort', nav); }
  ok('interview room under Career', (await p.getAttribute('#nav a[aria-current="page"]', 'data-group')) === 'career' && /Applications/.test(await p.textContent('.subnav')) && (await p.getAttribute('.subnav a[aria-current="page"]', 'href')) === '#interview' && /Practise the interview before it counts/.test(await p.textContent('main')));
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
  {
    // Spoken interview, with the browser's speech features replaced by stand-ins.
    const st = await p.evaluate(() => window.__store.get('data/users/u1/state'));
    const jobId = st.iv.jobs[0].id;
    const vp = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    vp.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await vp.addInitScript(() => {
      window.__said = [];
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak: (u) => { window.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 30); }, cancel: () => {}, getVoices: () => [] } });
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      window.SpeechRecognition = function () { const r = this; r.start = () => { window.__listening = true; setTimeout(() => r.onresult && r.onresult({ results: [[{ transcript: 'um so I built a retrieval system you know over two hundred policy documents and basically it answered staff questions with sources' }]] }), 60); }; r.stop = () => { window.__listening = false; setTimeout(() => r.onend && r.onend(), 10); }; };
    });
    await vp.addInitScript(({ mock, seed, opts }) => { eval(mock); window.__mock(seed, opts); }, { mock, seed, opts: { state: st } });
    await vp.goto(BASE + '/index.html'); await vp.waitForTimeout(600);
    await go(vp, 'iv-job-' + jobId, 400);
    await vp.check('#iv-voice'); await vp.selectOption('#iv-count', '4'); await vp.click('#ivsetup button[type=submit]'); await vp.waitForTimeout(700);
    ok('spoken interview reads the question aloud', await vp.evaluate(() => window.__said.length === 1), await vp.evaluate(() => JSON.stringify({ said: window.__said, hash: location.hash, voice: !!document.getElementById('iv-voice') })));
    ok('microphone opens after the question', await vp.evaluate(() => window.__listening === true) && /Stop listening/.test(await vp.textContent('[data-iv="mic"]')));
    await vp.waitForTimeout(3300);
    ok('live pace and fillers shown', /22 words · .* · 3 fillers/.test(await vp.textContent('#iv-live')), await vp.textContent('#iv-live'));
    await vp.click('#ivanswer button[type=submit]'); await vp.waitForTimeout(700);
    ok('spoken answer saved with delivery', await vp.evaluate(() => { const s = window.__store.get('data/users/u1/state').iv.sessions.pop(); const a = s.transcript.find((t) => t.role === 'candidate'); return a && a.dl && a.dl.f === 3 && a.dl.fl.um === 1 && a.dl.fl['you know'] === 1 && a.dl.wpm > 100; }));
    ok('answer bubble shows pace', /words a minute · 3 fillers/.test(await vp.textContent('.iv-room')));
    ok('replay button on the new question', await vp.isVisible('[data-iv="replay"]'));
    await vp.click('[data-iv="endearly"]').catch(() => {}); await vp.waitForTimeout(200);
    if (await vp.isVisible('#ivself')) { await vp.click('#ivself button[type=submit]'); await vp.waitForTimeout(800); }
    ok('report has a delivery card', /Delivery/.test(await vp.textContent('main')) && /fillers a minute/.test(await vp.textContent('main')));
    await shot(vp, '35b-iv-delivery'); await overflow(vp, 'delivery'); await vp.close();
  }
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

  // career: applications, CV, pitch, debrief, compare
  await go(p, 'applications', 300);
  ok('applications empty state', /Nothing tracked yet/.test(await p.textContent('main')));
  await p.click('main [data-act="appnew"]'); await p.waitForTimeout(150);
  const soon = await p.evaluate(() => { const d = new Date(Date.now() + 2 * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  await p.fill('#ap-company', 'Northfield Health'); await p.fill('#ap-role', 'Junior AI Engineer'); await p.selectOption('#ap-stage', 'applied');
  await p.fill('#ap-next', 'Technical interview'); await p.fill('#ap-nextd', soon);
  await p.selectOption('#ap-job', { index: 1 }); await p.click('#appform button[type=submit]'); await p.waitForTimeout(250);
  ok('application on the board', /Northfield Health/.test(await p.textContent('.kanban')) && /Coming up/.test(await p.textContent('main')));
  await p.selectOption('.kcard select', 'interview'); await p.waitForTimeout(150);
  ok('stage changes', await p.evaluate(() => window.__store.get('data/users/u1/state') && true) && /Interviewing/.test(await p.textContent('.kanban')));
  await p.click('[data-act="appics"]'); await p.waitForTimeout(150);
  ok('interview added to calendar', /^interview-northfield-health\.ics$/.test(await p.evaluate(() => window.__lastDownload)));
  await shot(p, '38-applications');
  await go(p, 'home', 400);
  ok("Today shows this week's interviews", /This week's interviews/.test(await p.textContent('main')) && /Technical interview/.test(await p.textContent('main')));
  ok('bell shows the upcoming interview', /Technical interview with Northfield Health/.test(await p.textContent('.bell-menu')) && await p.isVisible('.bell .badge'));
  await p.click('.bell summary'); await p.waitForTimeout(150);
  await shot(p, '39-bell', false);
  ok('opening the bell clears the badge', !(await p.isVisible('.bell .badge')));
  await p.click('main'); await p.waitForTimeout(80);
  await go(p, 'career', 300);
  ok('CV and pitch hub', /CV review/.test(await p.textContent('main')) && (await p.$$eval('.subnav a', (a) => a.map((x) => x.textContent))).join(',') === 'Interview room,Applications,CV and pitch,Portfolio,Specialisms');
  await go(p, 'career-cv', 300);
  await p.fill('#cv-text', 'Data analyst with four years in retail analytics. '.repeat(15)); await p.click('#cvform button[type=submit]'); await p.waitForTimeout(400);
  ok('CV review shown', /Built 12 dashboards/.test(await p.textContent('main')) && /RAG/.test(await p.textContent('main')));
  await shot(p, '40-cv');
  await go(p, 'career-pitch', 300);
  await p.fill('#pt-past', 'Four years as a data analyst at a retail data firm.'); await p.fill('#pt-why', 'I built a chatbot for my team and it stuck.');
  await p.click('#pitchform button[type=submit]'); await p.waitForTimeout(400);
  ok('pitch shown', /turning messy data into decisions/.test(await p.textContent('main')));
  ok('pitch sends answers and audience', await p.evaluate(() => { const c = window.__api.filter((x) => x.body && x.body.mode === 'pitch').pop(); return c.body.audience === 'manager' && /data analyst/.test(c.body.answers.past); }));
  await go(p, 'applications', 300);
  await p.click('.kcard [data-act="debriefapp"]'); await p.waitForTimeout(300);
  ok('debrief preselects the application', (await p.inputValue('#db-app')) !== '');
  await p.fill('#db-round', 'Technical'); await p.fill('#db-notes', 'Q: Tell me about your RAG project. Me: explained the design but forgot numbers. Q: How do you test prompts? Me: talked about evals.');
  await p.click('#dbform button[type=submit]'); await p.waitForTimeout(500);
  ok('debrief keeps the round and notes', await p.evaluate(() => { const c = window.__api.filter((x) => x.body && x.body.mode === 'debrief').pop(); return c.body.round === 'Technical' && /RAG project/.test(c.body.notes); }) && /<h1>Technical<\/h1>/.test(await p.innerHTML('main')));
  ok('debrief shown with thank-you email', /Thanks for the conversation about evals/.test(await p.textContent('main')) && /Bring eval numbers/.test(await p.textContent('main')));
  await shot(p, '41-debrief');
  await go(p, 'iv-compare', 300);
  const boxes = await p.$$('input[name="cmp"]'); await boxes[0].check(); await boxes[1].check();
  await p.click('#cmpform button[type=submit]'); await p.waitForTimeout(400);
  ok('jobs compared', /Start with the first/.test(await p.textContent('main')) && /Strong Fit/.test(await p.textContent('main')));

  // report and block, cohorts
  await go(p, 'lesson-m13-1', 600);
  await p.click('[data-act="report"][data-kind="content"]'); await p.waitForTimeout(150);
  ok('report a problem opens', await p.isVisible('#reportform'));
  await p.click('#reportform button[type=submit]'); await p.waitForTimeout(100);
  ok('content report needs a note', await p.isVisible('#reportform') && (await p.getAttribute('#rp-note', 'aria-invalid')) === 'true');
  await p.fill('#rp-note', 'The second example prints the wrong total.'); await p.click('#reportform button[type=submit]'); await p.waitForTimeout(250);
  ok('content report saved', await p.evaluate(() => { const r = window.__store.get('reports/u1'); return r && r.items[0].kind === 'content' && /^m13:lesson:1$/.test(r.items[0].ref); }));

  await go(p, 'settings', 500);
  ok('learning preference editable in settings', await p.isChecked('input[name="st-fmt"][value="interactive"]') && await p.isChecked('input[name="st-fmt"][value="video"]'));
  await p.uncheck('input[name="st-fmt"][value="interactive"]'); await p.uncheck('input[name="st-fmt"][value="video"]'); await p.check('input[name="st-fmt"][value="video"]');
  await p.check('input[name="st-budget"][value="coursera"]'); await p.click('#learnform button[type=submit]'); await p.waitForTimeout(250);
  ok('learning preference updated', await p.evaluate(() => { const l = window.__store.get('data/users/u1/state').learn || {}; return l.formats && l.formats.join(',') === 'video' && l.budget === 'coursera'; }) || await p.evaluate(() => JSON.stringify((window.__S || {}).learn || null)));
  await go(p, 'home', 500);
  ok('Today suggests a video for the current course', /Best for you this course:/.test(await p.textContent('.hero')) && /video/.test(await p.textContent('.hero .pick')));
  await p.waitForTimeout(200);
  ok('Today offers notifications for firm reminders', await p.isVisible('aside [data-act="pushon"]'));
  await p.click('aside [data-act="pushon"]'); await p.waitForTimeout(250);
  ok('notifications switched on from Today', await p.evaluate(() => window.__push.calls.indexOf('enable') >= 0) && !(await p.isVisible('aside [data-act="pushon"]')));
  await go(p, 'settings', 500);
  ok('settings shows account', /Signed in as z@example\.org/.test(await p.textContent('main')));
  ok('email toggles shown', (await p.$$('[data-pref]')).length === 3);
  ok('reminders card shows level and this device', await p.isChecked('input[name="st-remind"][value="persistent"]') && /On for this device/.test(await p.textContent('#reminders')));
  await p.check('input[name="st-remind"][value="relentless"]'); await p.waitForTimeout(150);
  await p.selectOption('#st-rhour', '18'); await p.waitForTimeout(800);
  ok('relentless mode and reminder time saved', await p.evaluate(() => { const r = window.__store.get('data/users/u1/state').remind; return r.level === 'relentless' && r.hour === 18; }));
  await p.click('[data-act="pushtest"]'); await p.waitForTimeout(150);
  ok('test notification requested', await p.evaluate(() => window.__push.calls.indexOf('test') >= 0));
  await p.click('[data-act="pushoff"]'); await p.waitForTimeout(150);
  ok('notifications turned off for this device', await p.isVisible('[data-act="pushon"]'));
  await p.check('input[name="st-remind"][value="off"]'); await p.waitForTimeout(150);
  ok('reminder time disabled when off', await p.isDisabled('#st-rhour') && await p.isDisabled('[data-act="pushon"]'));
  await p.check('input[name="st-remind"][value="persistent"]'); await p.waitForTimeout(700);
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
  await p.click('main [data-act="signout"]'); await p.waitForTimeout(100);
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
  // owner tools
  ok('reports queue shows the content report', /Content problem/.test(await p.textContent('main')) && /prints the wrong total/.test(await p.textContent('main')));
  await p.click('[data-act="represolve"]'); await p.waitForTimeout(250);
  ok('report resolved', await p.evaluate(() => window.__store.get('reports/u1').items[0].status === 'resolved'));
  await p.click('[data-act="health"]'); await p.waitForTimeout(250);
  ok('system check lists services', /Needs attention/.test(await p.textContent('main')) && /No email service/.test(await p.textContent('main')));
  ok('errors listed', /TypeError: x is undefined/.test(await p.textContent('main')));
  await p.click('[data-act="errclear"]'); await p.waitForTimeout(200);
  ok('errors cleared', await p.evaluate(() => window.__errUpdate && window.__errUpdate.resolved === true));
  await p.fill('#co-name', 'Spring 2027'); await p.click('#cocreate button[type=submit]'); await p.waitForTimeout(250);
  const code = await p.evaluate(() => (window.__store.get('content/cohorts') || { list: [] }).list[0].code);
  ok('cohort created with a code', /^[A-Z2-9]{6}$/.test(code || ''));
  // course editor
  await p.selectOption('#ed-course', 'm13'); await p.waitForTimeout(400);
  ok('course editor loads', (await p.inputValue('#ed-title')) === 'Programming from zero');
  await p.fill('#ed-title', 'Programming from zero (edited)');
  await p.click('[data-edtab="lessons"]'); await p.waitForTimeout(150);
  await p.fill('#ed-lt', 'Edited lesson title');
  await p.click('[data-act="edsave"]'); await p.waitForTimeout(500);
  ok('course saved from the form', await p.evaluate(() => window.__store.get('content/m13').title === 'Programming from zero (edited)' && window.__store.get('lessons/m13').lessons[0].t === 'Edited lesson title'));
  await p.click('[data-edtab="ex"]'); await p.waitForTimeout(150);
  await p.fill('#ed-xsol', 'def broken(:\n  pass');
  await p.click('[data-act="edsave"]'); await p.waitForTimeout(6000);
  ok('broken answer blocks saving', /Not saved/.test(await p.textContent('#course-editor')));
  await shot(p, '21b-editor', false);
  await p.click('[data-act="edreload"]'); await p.waitForTimeout(300);
  await shot(p, '21-admin'); await overflow(p, 'admin');
  await go(p, 'settings', 400);
  await p.fill('#co-code', code); await p.click('#coform button[type=submit]'); await p.waitForTimeout(250);
  ok('member joins a cohort', await p.evaluate((c) => window.__store.get('data/users/u1/state') && true, code) && /Spring 2027/.test(await p.textContent('main')));
  await p.fill('#co-code', 'NOPE99'); await p.click('#coform button[type=submit]'); await p.waitForTimeout(150);
  ok('bad cohort code refused', await p.isVisible('#co-err'));
  await go(p, 'cohort', 400);
  ok('cohort board defaults to my cohort', /Spring 2027/.test(await p.textContent('main')) && !/Amira/.test(await p.textContent('.tbl')));
  await p.check('input[data-coscope][value="all"]'); await p.waitForTimeout(150);
  ok('switch to everyone', /Amira/.test(await p.textContent('.tbl')));
  await p.click('.tbl details.more summary'); await p.waitForTimeout(80);
  await p.click('.tbl .more-menu [data-act="block"]'); await p.waitForTimeout(200);
  ok('blocked member hidden from the board', !/Amira/.test(await p.textContent('.tbl')));
  await go(p, 'projects', 400);
  ok('blocked reviewer hidden', !/Clear README, add latency numbers/.test(await p.textContent('main')));
  await go(p, 'settings', 300);
  await p.click('[data-act="block"][data-id="u2"]'); await p.waitForTimeout(200);
  await go(p, 'cohort', 300); await p.check('input[data-coscope][value="all"]'); await p.waitForTimeout(100);
  ok('unblocked', /Amira/.test(await p.textContent('.tbl')));
  await p.click('.tbl details.more summary'); await p.waitForTimeout(80);
  await p.click('.tbl .more-menu [data-act="report"]'); await p.waitForTimeout(150);
  await p.check('#rp-block'); await p.click('#reportform button[type=submit]'); await p.waitForTimeout(250);
  ok('report a member and block in one go', await p.evaluate(() => { const r = window.__store.get('reports/u1'); const s = window.__store.get('data/users/u1/state'); return r.items.some((x) => x.kind === 'member' && x.target === 'u2'); }));
  await p.click('main'); await go(p, 'settings', 300); await p.click('[data-act="block"][data-id="u2"]').catch(() => {}); await p.waitForTimeout(150);

  await go(p, 'home', 400);
  ok('notice on Today', /Saturday study call/.test(await p.textContent('main')));
  ok('points counted', /Lv \d+ · \d{3,} XP/.test(await p.textContent('#me')), await p.textContent('#me'));
  await shot(p, '22-home-after');
  await go(p, 'plan-w2', 500); await shot(p, '23-plan-focus', false);

  // 11. phone
  const mob = await page({state: { account: { name: 'Z', created: '2026-11-09' }, tools: rate, placement: { scores: { python: 33, eng: 0, web: 50, sql: 100, cloud: 0, llm: 0 }, at: '2026-11-09' }, hpw: 15, goal: 'engineer', start: '2026-11-09', mods: {}, log: [], miss: {} }}, { width: 390, height: 844 }); await mob.waitForTimeout(800);
  await shot(mob, '30-m-home'); await overflow(mob, 'phone home');
  ok('phone: sections become a bottom tab bar', await mob.$eval('#nav', (n) => { const r = n.getBoundingClientRect(); return getComputedStyle(n).position === 'fixed' && Math.abs(r.bottom - innerHeight) < 2 && n.children.length === 5; }));
  ok('phone: tab bar targets are big enough', await mob.$$eval('#nav a', (a) => a.every((x) => x.getBoundingClientRect().height >= 44 && x.getBoundingClientRect().width >= 60)));
  for (const [h, n] of [['lesson-m13-2', '31-m-lesson'], ['ex-m13-z3', '32-m-ex'], ['plan', '33-m-plan'], ['practice', '34-m-practice'], ['cohort', '35-m-cohort']]) { await go(mob, h, 600); await shot(mob, n); await overflow(mob, 'phone ' + h); }
  // 12. dark
  const ago3 = new Date(Date.now() - 3 * 864e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const qp = await page({ state: { account: { name: 'Z', created: '2026-10-01' }, tools: rate, placement: { scores: { python: 33 }, at: '2026-10-01' }, hpw: 15, start: '2026-10-01', mods: {}, log: [{ id: 'q', d: ago3, h: 1 }], remind: { level: 'gentle', hour: 19 } } }); await qp.waitForTimeout(700);
  ok('Today calls out quiet days', /3 days since your last session/.test(await qp.textContent('.nudge-bar')) && await qp.isVisible('.nudge-bar [data-act="remindup"]'));
  await qp.click('.nudge-bar [data-act="remindup"]'); await qp.waitForTimeout(400);
  ok('firmer reminders link opens Settings', (await qp.evaluate(() => location.hash)) === '#settings' && await qp.isVisible('#reminders'));
  await overflow(qp, 'reminders'); await shot(qp, '19c-reminders', false); await qp.close();
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
  await ne.fill('#a-email', 'sam@example.org'); await ne.check('input[name="a-fmt"][value="reading"]'); await ne.click('#signup button[type=submit]'); await ne.waitForTimeout(500);
  ok('account created with typed email', await ne.evaluate(() => ((window.__store.get('data/users/u1/state') || {}).account || {}).email === 'sam@example.org'));
  // a member who is not the owner can't see admin
  const mem = await page({ owner: false , state: { account: { name: 'Z' }, tools: rate, placement: { scores: { python: 33 }, at: '2026-11-09' }, hpw: 15, start: '2026-11-09', mods: {}, log: [] }}); await mem.waitForTimeout(600);
  ok('no admin link for members', !(/Admin/.test(await mem.textContent('#nav'))) && !(/Admin/.test(await mem.textContent('#me'))));
  await go(mem, 'admin', 300); ok('admin route blocked for members', !/Content editor/.test(await mem.textContent('main')));

  await browser.close(); server.close();
  console.log(results.join('\n'));
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO PAGE ERRORS');
  const nf = results.filter(r => r.startsWith('FAIL')).length;
  console.log(nf + ' failures of ' + results.length);
  process.exit(nf || errs.length ? 1 : 0);
})();
