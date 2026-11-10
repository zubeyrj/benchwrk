// Benchwork's front door: sign-in, sign-up, Google, email verification and password reset.
// Once there's a session it installs the runtime (window.claude) and extras (window.BW), then loads the app.
import { createClient } from "@supabase/supabase-js";
import { makeRuntime } from "./runtime.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ICON = {
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  google: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>',
};

const side = '<aside class="auth-side"><div><h1>Become an AI engineer, <em>from zero</em>, one evening at a time.</h1>' +
  '<p class="lede">Benchwork is a free training ground. You get a dated plan at your hours, lessons with coding exercises that run in your browser, and three real projects to ship.</p></div>' +
  '<div class="props">' +
  '<div class="prop"><span class="ico">' + ICON.target + '</span><div><b>A plan built around you</b><span>Rate the tools you\'ve used, take a short placement and skip what you already know.</span></div></div>' +
  '<div class="prop"><span class="ico">' + ICON.code + '</span><div><b>59 exercises, checked as you go</b><span>Python and SQL run in the browser. Hints and a tutor when you\'re stuck.</span></div></div>' +
  '<div class="prop"><span class="ico">' + ICON.users + '</span><div><b>Never study alone</b><span>An accountability partner, peer reviews and a cohort board.</span></div></div></div>' +
  '<div class="preview" aria-hidden="true"><div class="pv d"><i>' + ICON.check + '</i><div>Programming from zero<br><span>8 lessons, 9 exercises</span></div><span>Done</span></div>' +
  '<div class="pv cur"><i>2</i><div>Python for engineers<br><span>Lesson 3 of 6</span></div><span>12 days left</span></div>' +
  '<div class="pv"><i>3</i><div>Engineering habits<br><span>Starts after</span></div><span></span></div></div></aside>';

const ui = { mode: "signup", email: "", name: "", err: "", info: "", busy: false, fieldErr: {} };

function field(id, label, type, attrs, hint) {
  const e = ui.fieldErr[id];
  return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + type + '" ' + attrs + (e ? ' aria-invalid="true" aria-describedby="' + id + '-err"' : "") + ">" +
    (hint ? '<p class="hint">' + hint + "</p>" : "") + (e ? '<p class="err" id="' + id + '-err">' + esc(e) + "</p>" : "") + "</div>";
}

function view() {
  const m = ui.mode, busy = ui.busy ? ' aria-busy="true" disabled' : "";
  const google = '<button type="button" class="btn line wide google" data-auth="google"' + busy + ">" + ICON.google + "<span>Continue with Google</span></button>" +
    '<div class="or"><span>or with email</span></div>';
  const banner = (ui.err ? '<p class="notice bad" role="alert">' + esc(ui.err) + "</p>" : "") + (ui.info ? '<p class="notice" role="status">' + esc(ui.info) + "</p>" : "");
  let card;
  if (m === "signup") {
    card = '<form class="auth-card" data-form="signup" novalidate><div class="steps" aria-label="Sign-up steps"><span class="on"><i>1</i>Account</span><span><i>2</i>Your tools</span><span><i>3</i>Placement</span></div>' +
      '<h2 style="font-size:28px;margin-bottom:6px">Create your free account</h2><p class="muted" style="margin:0 0 22px">Already a member? <a href="#" data-auth="to-signin">Sign in</a></p>' + banner + google +
      field("au-name", "Your name", "text", 'maxlength="60" autocomplete="name" value="' + esc(ui.name) + '"') +
      field("au-email", "Email", "email", 'maxlength="120" autocomplete="email" value="' + esc(ui.email) + '"', "We'll send a link to confirm it.") +
      field("au-pass", "Password", "password", 'minlength="8" autocomplete="new-password"', "At least 8 characters.") +
      '<button class="btn lg wide" type="submit"' + busy + ">" + (ui.busy ? "Creating your account…" : "Create my account") + "</button>" +
      '<p class="small muted" style="margin-top:14px">By joining you agree to the <a href="/privacy.html">privacy notice</a> and <a href="/terms.html">terms</a>.</p></form>';
  } else if (m === "signin") {
    card = '<form class="auth-card" data-form="signin" novalidate><h2 style="font-size:28px;margin-bottom:6px">Welcome back</h2><p class="muted" style="margin:0 0 22px">New here? <a href="#" data-auth="to-signup">Create a free account</a></p>' + banner + google +
      field("au-email", "Email", "email", 'maxlength="120" autocomplete="email" value="' + esc(ui.email) + '"') +
      field("au-pass", "Password", "password", 'autocomplete="current-password"') +
      '<p class="small" style="margin:-6px 0 18px"><a href="#" data-auth="to-forgot">Forgotten your password?</a></p>' +
      '<button class="btn lg wide" type="submit"' + busy + ">" + (ui.busy ? "Signing in…" : "Sign in") + "</button></form>";
  } else if (m === "forgot") {
    card = '<form class="auth-card" data-form="forgot" novalidate><h2 style="font-size:28px;margin-bottom:6px">Reset your password</h2><p class="muted" style="margin:0 0 22px">We\'ll email you a link to choose a new one.</p>' + banner +
      field("au-email", "Email", "email", 'maxlength="120" autocomplete="email" value="' + esc(ui.email) + '"') +
      '<button class="btn lg wide" type="submit"' + busy + ">Send the link</button>" +
      '<p class="small" style="margin-top:14px"><a href="#" data-auth="to-signin">Back to sign in</a></p></form>';
  } else if (m === "reset") {
    card = '<form class="auth-card" data-form="reset" novalidate><h2 style="font-size:28px;margin-bottom:6px">Choose a new password</h2><p class="muted" style="margin:0 0 22px">You\'ll go straight to your plan afterwards.</p>' + banner +
      field("au-pass", "New password", "password", 'minlength="8" autocomplete="new-password"', "At least 8 characters.") +
      '<button class="btn lg wide" type="submit"' + busy + ">Save and continue</button></form>";
  } else if (m === "sent" || m === "sent-reset") {
    card = '<div class="auth-card sent"><div class="wm-badge" aria-hidden="true">' + ICON.check + '</div><h2 style="font-size:28px;margin-bottom:6px">Check your email</h2>' +
      '<p class="muted">We sent a link to <b>' + esc(ui.email) + "</b>. " + (m === "sent" ? "Open it to confirm your address and you'll land straight in Benchwork." : "Open it to choose a new password.") + "</p>" + banner +
      '<p class="small muted">Nothing after a couple of minutes? Check spam, or ' + (m === "sent" ? '<a href="#" data-auth="resend">send it again</a>' : '<a href="#" data-auth="to-forgot">try again</a>') + '.</p>' +
      '<p class="small"><a href="#" data-auth="to-signin">Back to sign in</a></p></div>';
  } else if (m === "setup") {
    card = '<div class="auth-card"><h2 style="font-size:26px">Almost there</h2><p class="muted">This copy of Benchwork isn\'t connected to its database yet. Add the Supabase keys in Vercel (see SETUP.md), redeploy, and reload this page.</p></div>';
  } else {
    card = '<div class="auth-card"><p class="muted">Loading…</p></div>';
  }
  return '<section class="auth">' + side + '<div class="auth-main">' + card + "</div></section>";
}

function render() {
  const app = $("#app");
  const focusId = document.activeElement && document.activeElement.id;
  app.innerHTML = view();
  const target = (focusId && document.getElementById(focusId)) || app.querySelector('[aria-invalid="true"]') || null;
  if (target) target.focus();
}

function friendly(e) {
  const msg = (e && e.message) || String(e || "");
  if (/invalid login/i.test(msg)) return "That email and password don't match. Try again or reset your password.";
  if (/already registered|already exists/i.test(msg)) return "There's already an account with that email. Sign in instead.";
  if (/rate limit|too many/i.test(msg)) return "Too many attempts. Wait a minute and try again.";
  if (/weak|password should/i.test(msg)) return "Choose a stronger password: at least 8 characters, not a common word.";
  if (/network|fetch/i.test(msg)) return "Couldn't reach Benchwork. Check your connection and try again.";
  return msg || "Something went wrong. Try again.";
}

async function bootstrap() {
  const cfg = window.BW_CONFIG || {};
  // Tests (and any host that already provides the runtime) skip straight to the app.
  if (window.claude && typeof window.claude.use === "function") { loadApp(); return; }
  const sb = window.__fakeSupabase || (cfg.supabaseUrl && cfg.supabaseAnonKey ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" } }) : null);
  if (!sb) { ui.mode = "setup"; render(); return; }
  const site = cfg.siteUrl || location.origin;
  let started = false;

  const params = new URLSearchParams(location.search);
  if (params.get("signin") !== null) ui.mode = "signin";
  if (params.get("reset") !== null) ui.mode = "reset";
  const errDesc = params.get("error_description") || new URLSearchParams(location.hash.slice(1)).get("error_description");
  if (errDesc) { ui.err = /expired|invalid/i.test(errDesc) ? "That link has expired or was already used. Sign in, or ask for a new one." : errDesc; ui.mode = "signin"; }

  sb.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") { ui.mode = "reset"; ui.err = ""; render(); return; }
    if (session && !started && ui.mode !== "reset") start(session);
  });

  async function start(session) {
    if (started) return; started = true;
    if (location.search && ui.mode !== "reset") history.replaceState(null, "", location.pathname + location.hash);
    const api = async (path, body, o = {}) => {
      const { data } = await sb.auth.getSession();
      const token = data && data.session ? data.session.access_token : session.access_token;
      const res = await fetch(path, { method: body === undefined ? "GET" : "POST", headers: Object.assign({ authorization: "Bearer " + token }, body === undefined ? {} : { "content-type": "application/json" }), body: body === undefined ? undefined : JSON.stringify(body) });
      if (o.raw) return res;
      let out = {}; try { out = await res.json(); } catch (e) { /* empty */ }
      if (!res.ok) throw Object.assign(new Error(out.error || "Request failed"), { code: out.code || res.status });
      return out;
    };
    const rt = makeRuntime(sb, session, { api });
    window.claude = { use: rt.use };
    window.BW = {
      client: sb, api, site, email: session.user.email,
      provider: (session.user.app_metadata && session.user.app_metadata.provider) || "email",
      signOut: async () => { try { await sb.auth.signOut(); } finally { location.href = "/?signin"; } },
      prefs: async () => (await rt._profile()).prefs,
      savePrefs: async (prefs) => { const { error } = await sb.from("profiles").update({ prefs }).eq("id", session.user.id); if (error) throw error; },
      saveName: async (name) => { await sb.from("profiles").update({ name }).eq("id", session.user.id); },
      issueCert: async (c) => {
        const { data, error } = await sb.from("certs").upsert(Object.assign({ user_id: session.user.id }, c), { onConflict: "user_id,course" }).select("id").single();
        if (error) throw error; return site.replace(/\/$/, "") + "/c/" + data.id;
      },
      tutorUsage: async () => { const { data } = await sb.from("ai_usage").select("user_id, day, kind, calls, in_tokens, out_tokens").gte("day", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)); return data || []; },
    };
    sb.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", session.user.id).then(() => {}, () => {});
    loadApp();
  }

  const { data } = await sb.auth.getSession();
  if (data && data.session && ui.mode !== "reset") { start(data.session); return; }
  render();

  document.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-auth]"); if (!a || started) return;
    e.preventDefault();
    const k = a.dataset.auth; ui.err = ""; ui.info = ""; ui.fieldErr = {};
    const em = $("#au-email"); if (em) ui.email = em.value.trim();
    if (k.indexOf("to-") === 0) { ui.mode = k.slice(3); render(); return; }
    if (k === "google") {
      ui.busy = true; render();
      const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: site } });
      if (error) { ui.busy = false; ui.err = friendly(error); render(); }
      return;
    }
    if (k === "resend") {
      const { error } = await sb.auth.resend({ type: "signup", email: ui.email, options: { emailRedirectTo: site } });
      ui.info = error ? "" : "Sent again. It can take a minute to arrive."; ui.err = error ? friendly(error) : ""; render();
    }
  });

  document.addEventListener("submit", async (e) => {
    const f = e.target.closest("[data-form]"); if (!f || started && f.dataset.form !== "reset") return;
    e.preventDefault();
    const kind = f.dataset.form, val = (id) => (($("#" + id) || {}).value || "").trim();
    ui.err = ""; ui.info = ""; ui.fieldErr = {};
    ui.email = val("au-email") || ui.email; ui.name = val("au-name") || ui.name;
    const pass = ($("#au-pass") || {}).value || "";
    if (kind !== "reset" && !EMAIL_RE.test(ui.email)) ui.fieldErr["au-email"] = ui.email ? "That doesn't look like an email address." : "Enter your email.";
    if (kind === "signup" && !ui.name) ui.fieldErr["au-name"] = "Enter your name.";
    if ((kind === "signup" || kind === "reset") && pass.length < 8) ui.fieldErr["au-pass"] = "Use at least 8 characters.";
    if (kind === "signin" && !pass) ui.fieldErr["au-pass"] = "Enter your password.";
    if (Object.keys(ui.fieldErr).length) { render(); return; }
    ui.busy = true; render();
    try {
      if (kind === "signup") {
        const { data: d, error } = await sb.auth.signUp({ email: ui.email, password: pass, options: { emailRedirectTo: site, data: { full_name: ui.name } } });
        if (error) throw error;
        if (d && d.user && Array.isArray(d.user.identities) && d.user.identities.length === 0) throw new Error("already registered");
        if (!d.session) ui.mode = "sent";
      } else if (kind === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email: ui.email, password: pass });
        if (error) {
          if (/not confirmed/i.test(error.message)) { ui.mode = "sent"; ui.info = "Confirm your email first. We can send the link again."; }
          else throw error;
        }
      } else if (kind === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(ui.email, { redirectTo: site.replace(/\/$/, "") + "/?reset=1" });
        if (error) throw error;
        ui.mode = "sent-reset";
      } else if (kind === "reset") {
        const { data: d, error } = await sb.auth.updateUser({ password: pass });
        if (error) throw error;
        ui.mode = "done";
        const s = await sb.auth.getSession(); ui.busy = false;
        if (s.data.session) { started = false; start(s.data.session); return; }
        ui.mode = "signin"; ui.info = "Password changed. Sign in with it now.";
      }
    } catch (x) { ui.err = friendly(x); }
    ui.busy = false;
    if (!started) render();
  });
}

function loadApp() {
  if (document.querySelector("script[data-app]")) return;
  const s = document.createElement("script");
  s.src = "app.js"; s.dataset.app = "1";
  document.body.appendChild(s);
}

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

bootstrap();
