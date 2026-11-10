/* Benchwork: in-browser code runners.
   Python runs in Pyodide inside a Web Worker (so a stuck loop can be stopped); SQL runs in sql.js.
   Both load from their official CDNs; a local copy (used only in testing) is the fallback. */
(function () {
  "use strict";
  const BASE = new URL(".", location.href).href;
  const PY_LOCAL = BASE + "vendor/pyodide/";
  const PY_CDN = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
  const TIMEOUT = 12000;

  let harness = null;
  async function getHarness() {
    if (harness) return harness;
    const r = await fetch(BASE + "harness.txt");
    if (!r.ok) throw new Error("harness");
    harness = await r.text();
    return harness;
  }

  const WORKER_SRC = `
    let ready = null;
    async function boot(bases, harness) {
      let lastErr;
      for (const b of bases) {
        try { if (typeof loadPyodide === "undefined") importScripts(b + "pyodide.js"); const py = await loadPyodide({ indexURL: b }); await py.runPythonAsync(harness); return py; }
        catch (e) { lastErr = e; }
      }
      throw lastErr || new Error("pyodide");
    }
    self.onmessage = async (e) => {
      const m = e.data;
      try {
        if (!ready) ready = boot(m.bases, m.harness).catch((err) => { ready = null; throw err; });
        const py = await ready;
        if (m.warm) { self.postMessage({ id: m.id, ok: true, warm: true }); return; }
        py.globals.set("__payload", m.payload);
        const out = await py.runPythonAsync("await run_exercise(__payload)");
        self.postMessage({ id: m.id, ok: true, result: out });
      } catch (err) {
        self.postMessage({ id: m.id, ok: false, error: String(err && err.message || err) });
      }
    };`;

  let worker = null, seq = 0, pending = {}, state = "cold", stateListeners = [];
  function setState(s) { state = s; stateListeners.forEach((f) => { try { f(s); } catch (e) {} }); }
  function makeWorker() {
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
    const w = new Worker(url);
    w.onmessage = (e) => { const p = pending[e.data.id]; if (!p) return; delete pending[e.data.id]; clearTimeout(p.t); p.resolve(e.data); };
    w.onerror = (e) => { Object.keys(pending).forEach((k) => { const p = pending[k]; delete pending[k]; clearTimeout(p.t); p.resolve({ ok: false, error: "The Python runner stopped: " + (e.message || "worker error") }); }); };
    return w;
  }
  function kill() { if (worker) { worker.terminate(); worker = null; } setState("cold"); }
  async function call(msg, ms) {
    if (!worker) worker = makeWorker();
    const id = ++seq;
    msg.id = id; msg.bases = [PY_CDN, PY_LOCAL]; msg.harness = await getHarness();
    return new Promise((resolve) => {
      const t = setTimeout(() => { delete pending[id]; kill(); resolve({ ok: false, timeout: true, error: "Stopped after " + Math.round(ms / 1000) + " seconds. Look for a loop that never ends." }); }, ms);
      pending[id] = { resolve, t };
      worker.postMessage(msg);
    });
  }
  async function warm() {
    if (state === "ready" || state === "loading") return;
    setState("loading");
    const r = await call({ warm: true }, 90000);
    setState(r.ok ? "ready" : "failed");
    return r;
  }
  async function runPython(payload) {
    if (state !== "ready") { const w = await warm(); if (w && !w.ok) return { error: "Python couldn't start in this browser: " + w.error, tests: [], stdout: "" }; }
    const r = await call({ payload: JSON.stringify(payload) }, TIMEOUT);
    if (!r.ok) return { error: r.error, tests: [], stdout: "" };
    try { return JSON.parse(r.result); } catch (e) { return { error: "Unreadable result", tests: [], stdout: "" }; }
  }

  /* ---------- SQL ---------- */
  let SQLp = null;
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function getSQL() {
    if (SQLp) return SQLp;
    SQLp = (async () => {
      const tries = [["https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/", "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/"], ["https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/", "https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/"], [BASE + "vendor/sqljs/", BASE + "vendor/sqljs/"]];
      let last;
      for (const [js, wasm] of tries) {
        try { if (!window.initSqlJs) await loadScript(js + "sql-wasm.js"); return await window.initSqlJs({ locateFile: (f) => wasm + f }); } catch (e) { last = e; try { delete window.initSqlJs; } catch (x) {} }
      }
      SQLp = null; throw last;
    })();
    return SQLp;
  }
  function norm(v) { return typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v; }
  async function runSQL(ex, code) {
    let SQL;
    try { SQL = await getSQL(); } catch (e) { return { error: "SQL couldn't start in this browser.", tests: [], stdout: "" }; }
    const exec = (q) => { const db = new SQL.Database(); try { db.run(ex.setup); const r = db.exec(q); return r.length ? r[r.length - 1] : { columns: [], values: [] }; } finally { db.close(); } };
    let got, want;
    try { want = exec(ex.sol); } catch (e) { return { error: "This exercise's reference query failed. Tell the portal owner.", tests: [], stdout: "" }; }
    try { got = exec(code); } catch (e) { return { error: String(e.message || e), tests: [], stdout: "", table: null }; }
    const g = got.values.map((r) => r.map(norm)), w = want.values.map((r) => r.map(norm));
    const key = (r) => JSON.stringify(r);
    const sameCols = got.columns.length === want.columns.length;
    const rowsMatch = ex.ordered ? key(g) === key(w) : key(g.map(key).sort()) === key(w.map(key).sort());
    const setMatch = key(g.map(key).sort()) === key(w.map(key).sort());
    const tests = [
      ["Returns " + want.columns.length + " column" + (want.columns.length === 1 ? "" : "s"), sameCols, sameCols ? "" : "Got " + got.columns.length + ": " + got.columns.join(", ")],
      ["Returns the right rows", setMatch, setMatch ? "" : "Expected " + w.length + " row" + (w.length === 1 ? "" : "s") + ", got " + g.length + (g.length === w.length ? " with different values" : "")],
    ];
    if (ex.ordered) tests.push(["Rows are in the right order", rowsMatch, rowsMatch || !setMatch ? "" : "Same rows, different order. Check ORDER BY."]);
    return { error: null, tests, stdout: "", table: { columns: got.columns, values: got.values.slice(0, 20) } };
  }

  window.AILRunner = {
    run: async (ex, code) => (ex.kind === "sql" ? runSQL(ex, code) : runPython(ex.mode === "write-tests" ? { mode: "write-tests", code, impls: ex.impls } : { code, tests: ex.tests })),
    warm: () => warm().catch(() => {}),
    state: () => state,
    onState: (f) => stateListeners.push(f),
    stop: kill,
  };
})();
