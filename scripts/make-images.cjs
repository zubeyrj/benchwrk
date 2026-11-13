// Renders the app icons and the social preview image from SVG/HTML with the local Chromium.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const pub = path.join(__dirname, "..", "public");
const logo = fs.readFileSync(path.join(pub, "icon.svg"), "utf8");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 1 });
  for (const [name, size, pad, bg] of [["icon-192.png", 192, 0, "transparent"], ["icon-512.png", 512, 0, "transparent"], ["icon-180.png", 180, 0, "#c93c1a"], ["icon-maskable-512.png", 512, 0.18, "#c93c1a"]]) {
    await p.setViewportSize({ width: size, height: size });
    const inner = Math.round(size * (1 - pad * 2));
    await p.setContent(`<body style="margin:0;background:${bg};display:grid;place-items:center;width:${size}px;height:${size}px">${logo.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</body>`);
    await p.screenshot({ path: path.join(pub, name), omitBackground: bg === "transparent" });
  }
  await p.setViewportSize({ width: 1200, height: 630 });
  await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700..800&family=Figtree:wght@500;700&display=swap" rel="stylesheet"></head>
  <body style="margin:0;width:1200px;height:630px;background:#0e1726;color:#fff;font-family:Figtree,sans-serif;position:relative;overflow:hidden">
  <div style="position:absolute;right:-160px;top:-160px;width:560px;height:560px;border-radius:50%;border:90px solid rgb(201 60 26 / .3)"></div>
  <div style="position:absolute;left:80px;top:72px;display:flex;align-items:center;gap:18px;font-weight:800;font-size:40px;letter-spacing:-1px">${logo.replace("<svg ", '<svg width="64" height="64" ')}benchwrk</div>
  <div style="position:absolute;left:80px;top:230px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:84px;line-height:1;letter-spacing:-3px;max-width:900px">From zero to<br><span style="color:#ff7a52">AI engineer.</span></div>
  <div style="position:absolute;left:80px;bottom:72px;font-size:28px;color:#b8c2d3">A dated plan, coding exercises in your browser, real projects. Free.</div></body></html>`);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(pub, "og-cert.png") });
  await b.close();
  console.log("images done");
})();
