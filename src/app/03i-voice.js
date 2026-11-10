  /* ---------- Spoken interviews: pace, filler words and a delivery card ---------- */
  // Browser speech recognition drops some "um"s and "uh"s, so filler counts are a floor, not an exact figure.
  // "Like" is left out: it's too often a real word ("I'd like to") to count fairly.
  const FILLERS = [["um", /\b(?:um+|umm+)\b/g], ["uh", /\b(?:uh+|uhh+)\b/g], ["er", /\b(?:er|erm|err)\b/g], ["you know", /\byou know\b/g], ["sort of", /\bsort of\b/g], ["kind of", /\bkind of\b/g],
    ["I mean", /\bi mean\b/g], ["basically", /\bbasically\b/g], ["actually", /\bactually\b/g], ["literally", /\bliterally\b/g], ["to be honest", /\bto be honest\b/g]];
  function delivery(text, talkSecs) {
    const t = String(text || "").toLowerCase(), words = (t.match(/[a-z0-9']+/g) || []).length;
    const fl = {}; let f = 0;
    FILLERS.forEach(([k, re]) => { const n = (t.match(re) || []).length; if (n) { fl[k] = n; f += n; } });
    const secs = Math.max(1, Math.round(talkSecs || 0));
    return { w: words, s: secs, wpm: Math.round(words / (secs / 60)), f, fl, fpm: r1(f / (secs / 60)) };
  }
  const paceWord = (wpm) => (wpm < 110 ? "slow" : wpm <= 165 ? "steady" : wpm <= 190 ? "quick" : "rushed");
  function liveDelivery() {
    const el = document.getElementById("iv-live"), ta = document.getElementById("iv-ans"), V = ui.iv.voice; if (!el || !ta || !V) return;
    const d = delivery(ta.value, (V.talk + (V.t0 ? Date.now() - V.t0 : 0)) / 1000);
    el.textContent = d.w + " words · " + (d.s >= 10 ? d.wpm + " a minute (" + paceWord(d.wpm) + ")" : "warming up") + " · " + (d.f ? d.f + " filler" + (d.f === 1 ? "" : "s") : "no fillers yet");
  }
  function deliveryCard(x) {
    const A = x.transcript.filter((t) => t.role === "candidate" && t.dl && t.dl.w > 5); if (!A.length) return "";
    const W = A.reduce((a, t) => a + t.dl.w, 0), S2 = A.reduce((a, t) => a + t.dl.s, 0), F = A.reduce((a, t) => a + t.dl.f, 0);
    const wpm = Math.round(W / (S2 / 60)), fpm = r1(F / (S2 / 60)), tot = {};
    A.forEach((t) => Object.keys(t.dl.fl || {}).forEach((k) => { tot[k] = (tot[k] || 0) + t.dl.fl[k]; }));
    const top = Object.keys(tot).sort((a, b) => tot[b] - tot[a]).slice(0, 3);
    const longest = A.reduce((a, t) => (t.dl.s > a.dl.s ? t : a), A[0]);
    const tips = [];
    if (wpm > 170) tips.push("You're speaking quickly. Pause for a breath after the situation and again before the result; it reads as confidence.");
    else if (wpm < 110) tips.push("Your pace is slow. Know your first sentence before you start, so you're not building the answer out loud.");
    else tips.push("Your pace is in the comfortable range of 110 to 165 words a minute.");
    if (fpm >= 3) tips.push("About " + fpm + " fillers a minute. Swap them for a silent pause: it feels long to you and sounds normal to them.");
    else tips.push(F ? "Few fillers. Keep it there." : "No fillers picked up. Speech recognition misses some, so listen back to a recording now and then.");
    if (longest.dl.s > 150) tips.push("Your longest answer ran " + Math.floor(longest.dl.s / 60) + ":" + String(longest.dl.s % 60).padStart(2, "0") + ". Aim for about two minutes, then stop and let them ask.");
    return '<div class="card sec"><h2>Delivery</h2><div class="dl-stats"><div><b class="n">' + wpm + '</b><span class="xs muted">words a minute, ' + paceWord(wpm) + '</span></div><div><b class="n">' + fpm + '</b><span class="xs muted">fillers a minute</span></div><div><b class="n">' + A.length + '</b><span class="xs muted">spoken answers</span></div></div>' +
      (top.length ? '<p class="small"><b>Most used:</b> ' + top.map((k) => "“" + esc(k) + "” " + tot[k] + "×").join(", ") + "</p>" : "") +
      '<ul class="iv-ul small">' + tips.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul>" +
      '<details class="small"><summary>Answer by answer</summary><table class="dl-table"><thead><tr><th scope="col">Answer</th><th scope="col">Length</th><th scope="col">Pace</th><th scope="col">Fillers</th></tr></thead><tbody>' +
      A.map((t, i) => "<tr><td>" + (i + 1) + "</td><td>" + Math.floor(t.dl.s / 60) + ":" + String(t.dl.s % 60).padStart(2, "0") + "</td><td>" + t.dl.wpm + "</td><td>" + t.dl.f + "</td></tr>").join("") + '</tbody></table></details><p class="xs muted">Counted from your browser\'s transcript, which drops some ums, so treat filler counts as a minimum.</p></div>';
  }
