  /* ---------- Portfolio: a public page at /p/<slug> with projects, reviews and certificates ---------- */
  const slugify = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const okSlug = (s) => /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(s);
  const okLink = (u) => !u || /^https:\/\/[^\s"'<>]+$/i.test(u);
  function loadPortfolio() {
    const P = window.BW && window.BW.portfolio; if (!P || ui.pf) return;
    ui.pf = { loading: true };
    P.get().then((d) => { ui.pf = { row: d || null, draft: null }; if (route().name === "portfolio") render(); }).catch(() => { ui.pf = { row: null, err: "Couldn't load your portfolio. Reload to try again." }; render(); });
  }
  function myProjects() {
    const mine = (subs || []).find((s) => s.id === uid), items = (mine && mine.items) || {};
    return PROJECTS.filter((m) => items[m] && (items[m].repo || items[m].demo)).map((m) => {
      const rs = (reviews || []).map((r) => r.given && r.given[uid + ":" + m]).filter((g) => g && Array.isArray(g.s) && g.s.length);
      const avg = rs.length ? r1(rs.reduce((a, g) => a + g.s.reduce((x, y) => x + y, 0) / g.s.length, 0) / rs.length) : null;
      return { id: m, title: (byId[m] ? byId[m].title : "Project").replace(/: project \d/i, ""), it: items[m], n: rs.length, avg };
    });
  }
  function vPortfolio() {
    const head = '<h1>Portfolio</h1><p class="lede">One public page to put on your CV and LinkedIn: your projects with their links, what other learners scored them, your certificates and your study record. Nothing is public until you publish it.</p>';
    if (!window.BW || !window.BW.portfolio) return head + '<div class="empty"><p>Portfolios are part of the full site.</p></div>';
    loadPortfolio();
    if (!ui.pf || ui.pf.loading) return head + loading(200);
    if (ui.pf.err) return head + '<p class="err">' + esc(ui.pf.err) + "</p>";
    const row = ui.pf.row, d = ui.pf.draft || row || { slug: slugify(S.account && S.account.name) || "", headline: "", about: "", links: {}, show: { projects: true, certs: true, stats: true, reviews: true, index: false }, published: false };
    const sh = Object.assign({ projects: true, certs: true, stats: true, reviews: true, index: false }, d.show || {}), L = d.links || {}, E = ui.pf.errs || {};
    const url = window.BW.portfolio.url(d.slug || "your-name"), P = myProjects();
    const fld = (id, label, val, hint, attrs) => '<div class="field"><label for="pf-' + id + '">' + label + '</label><input id="pf-' + id + '" value="' + esc(val || "") + '"' + (attrs || "") + (E[id] ? ' aria-invalid="true" aria-describedby="pf-' + id + '-err"' : "") + ">" + (hint ? '<p class="hint">' + hint + "</p>" : "") + (E[id] ? '<p class="err" id="pf-' + id + '-err">' + esc(E[id]) + "</p>" : "") + "</div>";
    const tog = (k, label) => '<label class="toggle"><span>' + label + '</span><input type="checkbox" name="pf-show" value="' + k + '"' + (sh[k] ? " checked" : "") + "></label>";
    const status = row && row.hidden ? '<p class="notice bad">The site owner has hidden this page. Reply to their email or report a problem if you think that\'s a mistake.</p>'
      : row && row.published ? '<div class="pf-live"><span class="tag done">Public</span> <a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url.replace(/^https?:\/\//, "")) + '</a><button class="btn line sm" data-act="pfcopy">Copy link</button></div>' : '<p class="small muted">Not public yet.</p>';
    const preview = '<div class="card pf-prev" aria-label="Preview"><p class="up xs">Preview</p><h2 style="margin:0">' + esc((S.account && S.account.name) || "") + "</h2>" + (d.headline ? '<p class="muted" style="margin:4px 0 8px">' + esc(d.headline) + "</p>" : "") +
      (sh.stats ? '<p class="small">' + Math.round(totalHours()) + " hours logged · Level " + levelInfo(points()).level + "</p>" : "") +
      (sh.projects ? (P.length ? P.map((x) => '<div class="pf-proj"><b>' + esc(x.title) + "</b>" + (sh.reviews && x.n ? ' <span class="xs muted">' + x.avg + " / 3 from " + plural(x.n, "review") + "</span>" : "") + "</div>").join("") : '<p class="small muted">Share a project on the Projects page and it appears here.</p>') : "") + "</div>";
    return head + '<div class="cols"><form id="pfform" class="card stack" novalidate>' + status +
      fld("slug", "Page address", d.slug, "Lower-case letters, numbers and hyphens. Your page will be at <b>" + esc(url.replace(/^https?:\/\//, "")) + "</b>", ' maxlength="40" autocomplete="off"') +
      fld("headline", "Headline", d.headline, "One line, for example: Data analyst moving into AI engineering. Built a RAG assistant for 2,000 policy documents.", ' maxlength="120"') +
      '<div class="field"><label for="pf-about">About you <span class="muted">(optional)</span></label><textarea id="pf-about" rows="4" maxlength="700">' + esc(d.about || "") + '</textarea><p class="hint">What you did before, what you build now and the kind of role you want.</p></div>' +
      '<div class="two">' + fld("github", "GitHub", L.github, "", ' type="url" placeholder="https://github.com/…"') + fld("linkedin", "LinkedIn", L.linkedin, "", ' type="url" placeholder="https://www.linkedin.com/in/…"') + "</div>" +
      fld("web", "Website <span class=\"muted\">(optional)</span>", L.web, "", ' type="url" placeholder="https://…"') +
      '<fieldset><legend>Show on the page</legend>' + tog("projects", "Projects with their links") + tog("reviews", "Peer review scores and comments") + tog("certs", "Certificates") + tog("stats", "Hours, level and route progress") + tog("index", "Let search engines list it") + "</fieldset>" +
      '<div class="row"><button class="btn" type="submit" name="pub" value="1"' + (ui.pf.busy ? " disabled" : "") + ">" + (row && row.published ? "Save changes" : "Publish my page") + "</button>" +
      (row && row.published ? '<button class="btn line" type="button" data-act="pfunpub"' + (ui.pf.busy ? " disabled" : "") + ">Make it private</button>" : '<button class="btn line" type="submit" name="pub" value="0"' + (ui.pf.busy ? " disabled" : "") + ">Save without publishing</button>") + "</div></form>" +
      "<aside>" + preview + '<div class="card"><h2>Where to use it</h2><ul class="iv-ul small"><li>Under your name on your CV, next to your GitHub.</li><li>In the Featured section on LinkedIn.</li><li>In applications that ask for a portfolio or code samples.</li></ul></div></aside></div>';
  }
  function readPf(form) {
    const g = (k) => (document.getElementById("pf-" + k).value || "").trim();
    const show = {}; ["projects", "certs", "stats", "reviews", "index"].forEach((k) => { show[k] = !!form.querySelector('input[name="pf-show"][value="' + k + '"]:checked'); });
    return { slug: g("slug").toLowerCase(), headline: g("headline").slice(0, 120), about: (document.getElementById("pf-about").value || "").trim().slice(0, 700), links: { github: g("github"), linkedin: g("linkedin"), web: g("web") }, show };
  }
  async function savePf(d, published) {
    const E = {};
    if (!okSlug(d.slug)) E.slug = "Use 3 to 40 lower-case letters, numbers or hyphens, starting and ending with a letter or number.";
    ["github", "linkedin", "web"].forEach((k) => { if (!okLink(d.links[k])) E[k] = "Use a full link starting with https://"; });
    ui.pf.draft = d; ui.pf.errs = E;
    if (Object.keys(E).length) { render(); const f = document.querySelector('[aria-invalid="true"]'); if (f) f.focus(); return; }
    ui.pf.busy = true; render();
    try {
      const next = Object.assign({}, d, { published });
      await window.BW.portfolio.save(next);
      ui.pf.row = Object.assign({}, ui.pf.row || {}, next); ui.pf.draft = null;
      toast(published ? "Published. Your page is live." : "Saved. It isn't public yet.");
    } catch (e) { if (e && e.code === "taken") ui.pf.errs = { slug: "That address is taken. Try adding your surname or a number." }; else toast("Couldn't save that. Try again."); }
    ui.pf.busy = false; render();
  }
  document.addEventListener("submit", (e) => {
    const f = e.target; if (f.id !== "pfform" || phase !== "ready") return;
    e.preventDefault();
    const pub = e.submitter ? e.submitter.value !== "0" : true;
    savePf(readPf(f), pub);
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b || phase !== "ready") return;
    if (b.dataset.act === "pfunpub") { const f = document.getElementById("pfform"); savePf(readPf(f), false); return; }
    if (b.dataset.act === "pfcopy") { const u = window.BW.portfolio.url(ui.pf.row.slug); try { await navigator.clipboard.writeText(u); toast("Link copied."); } catch (x) { toast(u); } }
  });
