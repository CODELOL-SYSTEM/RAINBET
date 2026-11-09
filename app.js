import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  signInWithRedirect, getRedirectResult
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc,
  serverTimestamp, getDocs, query, where, writeBatch, onSnapshot
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDecLiaNoWpJSqfIV7DCPNdD8Y0iPoPTA6",
  authDomain: "pexi-play.firebaseapp.com",
  projectId: "pexi-play",
  storageBucket: "pexi-play.firebasestorage.app",
  messagingSenderId: "175370623468",
  appId: "1:175370623468:web:82b66d44cac69b6502c8c9",
  measurementId: "G-JFNB7XSXPL"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
auth.languageCode = "fr";

const ADMIN_EMAIL = "pc2alex.les@gmail.com";
const PAYPAL_ME_URL = "https://www.paypal.com/paypalme/SH0PNOVA/";
const $ = s => document.querySelector(s);

const fmt = v => {
  const u = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx"];
  let i = 0, x = Math.abs(v);
  while (x >= 999.995 && i < u.length - 1) { x /= 1000; i++; }
  const t = i ? (x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : x.toFixed(0)) : x.toFixed(2);
  return (v < 0 ? "-" : "") + (+t) + u[i];
};
const fx = m => m < 1000 ? m.toFixed(2) : fmt(m);

let bal = 1000;
let stop = () => {};
let gameRunning = false;
let currentUser = null;
let stopNotifications = null;
let stopUserBalance = null;
let seenNotifications = new Set();

function setBal(v) {
  bal = Math.max(0, Math.round(Number(v) * 100) / 100);
  const node = $("#bal");
  if (node) node.textContent = fmt(bal);
  try { localStorage.setItem("mj_bal", String(bal)); } catch (e) {}
}

function show(id) {
  if (gameRunning) return false;
  stop();
  stop = () => {};
  document.querySelectorAll(".scr").forEach(s => s.classList.add("hidden"));
  const target = $(id);
  if (!target) return false;
  target.classList.remove("hidden");
  return true;
}

function setup(id, extra) {
  const el = $(id);
  el.innerHTML = `<div class="box">
    <div class="stage"></div>
    <div class="ctl">
      <label>Crédits en jeu
        <span class="bet">
          <input class="stk" type="number" value="10" min="1" step="1">
          <span class="q">
            <button type="button" data-m=".5">½</button>
            <button type="button" data-m="2">×2</button>
            <button type="button" data-m="max">MAX</button>
          </span>
        </span>
      </label>
      ${extra}
      <div class="mult">x1.00</div>
      <button type="button" class="go">JOUER</button>
      <button type="button" class="out" disabled>ENCAISSER</button>
    </div>
    <div class="msg"></div>
  </div>`;

  const q = s => el.querySelector(s);
  el.querySelectorAll(".q button").forEach(b => {
    b.onclick = () => {
      const input = q(".stk");
      input.value = b.dataset.m === "max"
        ? Math.max(1, Math.floor(bal))
        : Math.max(1, Math.floor(Number(input.value) * Number(b.dataset.m)));
    };
  });

  return {
    q,
    msg: t => q(".msg").textContent = t,
    mult: m => q(".mult").textContent = "x" + fx(m),
    win: w => {
      q(".msg").textContent = "Gagné : +" + fmt(w) + " crédits";
      const d = document.createElement("div");
      d.className = "wb";
      d.innerHTML = `<b>+${fmt(w)}</b><small>GAGNÉ !</small>`;
      q(".stage").append(d);
      setTimeout(() => d.remove(), 2000);
    },
    run: v => {
      gameRunning = v;
      const home = $("#home");
      if (home) home.disabled = v;
      el.querySelectorAll(".ctl input,.ctl select,.q button").forEach(x => x.disabled = v);
      q(".go").disabled = v;
      q(".out").disabled = !v;
    },
    take: () => {
      if (!currentUser) {
        q(".msg").textContent = "Connecte-toi pour jouer.";
        return 0;
      }
      const s = Math.floor(Number(q(".stk").value));
      if (!(s >= 1) || s > bal) {
        q(".msg").textContent = "Crédits insuffisants";
        return 0;
      }
      setBal(bal - s);
      q(".msg").textContent = "";
      return s;
    }
  };
}

/* =========================
   COIN MINER
========================= */

const COIN = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#facc15" stroke="#a16207" stroke-width="3"/><circle cx="20" cy="20" r="11" fill="none" stroke="#ca8a04" stroke-width="2"/><text x="20" y="26" text-anchor="middle" font-size="16" font-weight="800" fill="#a16207">$</text></svg>';
const GEM = '<svg viewBox="0 0 40 40"><path d="M8 15L14 7H26L32 15L20 34Z" fill="#38bdf8" stroke="#0369a1" stroke-width="2"/><path d="M8 15H32M14 7L20 15L26 7M20 15V34" stroke="#bae6fd" stroke-width="1.5" fill="none"/></svg>';
const BOMB = '<svg viewBox="0 0 40 40"><circle cx="19" cy="23" r="12" fill="#1f2937"/><path d="M26 13L31 8" stroke="#a16207" stroke-width="3"/><circle cx="32" cy="7" r="3" fill="#f97316"/><circle cx="15" cy="19" r="3" fill="#fff6"/></svg>';

function initMines() {
  const g = setup("#mines", '<label>Mines<select class="n">' + [3, 5, 10, 15, 20, 24].map(n => `<option>${n}</option>`).join("") + "</select></label>");
  g.q(".stage").innerHTML = '<div class="neon">COIN MINER</div><div class="felt"><div class="grid"></div></div>';
  let on = false, b, k, s, m;
  const T = [...Array(25)].map((_, i) => {
    const c = document.createElement("button");
    c.type = "button"; c.className = "tile"; c.disabled = true;
    c.onclick = () => pick(i); g.q(".grid").append(c); return c;
  });
  const mu = n => {
    let r = .9;
    for (let i = 0; i < n; i++) r *= (25 - i) / (25 - m - i);
    return r;
  };
  const reveal = () => T.forEach((c, i) => {
    if (!c.classList.contains("ok") && !c.classList.contains("bad")) {
      c.innerHTML = b.has(i) ? BOMB : GEM; c.classList.add("dim");
    }
    c.disabled = true;
  });
  const cash = () => {
    on = false; const w = s * mu(k); setBal(bal + w); g.win(w); reveal(); g.run(false);
  };
  function pick(i) {
    if (!on) return;
    const c = T[i];
    if (b.has(i)) {
      on = false; c.innerHTML = BOMB; c.classList.add("bad"); reveal();
      g.msg("Boom ! Perdu"); g.run(false); return;
    }
    c.innerHTML = COIN; c.classList.add("ok"); c.disabled = true; k++; g.mult(mu(k));
    if (k === 25 - m) cash();
  }
  g.q(".go").onclick = () => {
    s = g.take(); if (!s) return;
    m = Number(g.q(".n").value); b = new Set();
    while (b.size < m) b.add(Math.random() * 25 | 0);
    k = 0; on = true; g.mult(1); g.run(true);
    T.forEach(c => { c.innerHTML = ""; c.className = "tile"; c.disabled = false; });
  };
  g.q(".out").onclick = () => { if (on && k > 0) cash(); };
  stop = () => { if (on) { setBal(bal + s); on = false; } };
}

/* =========================
   TOWER BUILDER
========================= */

function initTower() {
  const g = setup("#tower", '<button type="button" class="drop">Poser le bloc</button>');
  g.q(".stage").innerHTML = '<div class="tw"><div class="mast"></div><div class="city"></div><div class="world"></div><div class="jib"><b class="trl"></b></div></div>';
  const W = 300, H = 26, wd = g.q(".world"), tw = g.q(".tw"), cy = g.q(".city"), trl = g.q(".trl");
  tw.style.zoom = Math.min(1.45, (innerWidth - 24) / 306);
  let x = 0, h = "";
  while (x < W) {
    const bw = 28 + Math.random() * 26 | 0, hs = Math.random() < .35;
    h += `<div class="${hs ? "hs" : "sk"}" style="left:${x}px;width:${bw}px;height:${hs ? 50 + Math.random() * 30 | 0 : 70 + Math.random() * 130 | 0}px"></div>`;
    x += bw + 2;
  }
  cy.innerHTML = h;
  let on = false, n, x0, w0, px, s, cur, raf = 0, t0;
  const mu = k => Math.pow(1.12, k);
  const pal = ["#e9a15b", "#d9776a", "#e8c07d", "#c98b6b", "#cf6f77"];
  const wins = wi => "<i></i>".repeat(Math.max(1, Math.floor(wi / 34)));
  const blk = (xx, wi, fl) => {
    const d = document.createElement("div");
    d.className = "bl"; d.style.cssText = `left:${xx}px;width:${wi}px;bottom:${fl * H}px;background-color:${pal[fl % 5]}`;
    d.innerHTML = wins(wi); wd.append(d); return d;
  };
  const pop = (a, b, big) => {
    const d = document.createElement("div"); d.className = "pop" + (big ? " big" : "");
    d.innerHTML = `<b>${a}</b>${b ? `<small>${b}</small>` : ""}`; tw.append(d); setTimeout(() => d.remove(), 1100);
  };
  const sink = () => { const t = `translateY(${Math.max(0, n - 8) * H}px)`; wd.style.transform = t; cy.style.transform = t; };
  const loop = () => {
    if (!on || !cur) return;
    px = (W - w0) * (.5 + .5 * Math.sin((performance.now() - t0) * (.0035 + n * .0006)));
    cur.style.left = px + "px"; trl.style.left = (px + w0 / 2 - 9) + "px";
    raf = requestAnimationFrame(loop);
  };
  const spawn = () => { cur = blk(0, w0, n + 1); cur.insertAdjacentHTML("beforeend", '<b class="cb"></b>'); t0 = performance.now(); loop(); };
  const cash = rm => {
    on = false; cancelAnimationFrame(raf); if (rm && cur) cur.remove();
    const w = s * mu(n); setBal(bal + w); g.win(w); g.run(false);
  };
  const drop = () => {
    if (!on) return; cancelAnimationFrame(raf);
    const perfect = Math.abs(px - x0) < 3; if (perfect) px = x0;
    const o = w0 - Math.abs(px - x0);
    if (o < 6) {
      on = false; const cb = cur?.querySelector(".cb"); if (cb) cb.remove();
      cur.style.transition = "transform .7s,opacity .7s"; cur.style.transform = "translateY(300px) rotate(25deg)"; cur.style.opacity = 0;
      g.msg("Raté ! La tour s'effondre"); g.run(false); return;
    }
    const nl = Math.max(px, x0); cur.style.left = nl + "px"; cur.style.width = o + "px"; cur.innerHTML = wins(o);
    x0 = nl; w0 = o; n++; g.mult(mu(n));
    pop("+" + fmt(s * (mu(n) - mu(n - 1))), perfect ? "PARFAIT !" : "", perfect);
    if (n >= 12) { cash(false); return; }
    sink(); spawn();
  };
  tw.onclick = drop; g.q(".drop").onclick = drop;
  g.q(".go").onclick = () => {
    s = g.take(); if (!s) return;
    wd.innerHTML = '<div class="gnd"></div>'; n = 0; sink(); x0 = 85; w0 = 130;
    const bs = blk(x0, w0, 0); bs.classList.add("base"); bs.innerHTML = '<i></i><i class="dr"></i><i></i>';
    on = true; g.mult(1); g.run(true); spawn();
  };
  g.q(".out").onclick = () => { if (on && n > 0) cash(true); };
  stop = () => { if (on) { setBal(bal + s); on = false; } cancelAnimationFrame(raf); };
}

/* =========================
   CHICKEN ROAD
========================= */

const MH = '<svg class="mh" viewBox="0 0 80 80"><defs><radialGradient id="mg" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#a7b0bf"/><stop offset="1" stop-color="#4b5563"/></radialGradient></defs><circle cx="40" cy="43" r="38" fill="#0007"/><circle cx="40" cy="40" r="38" fill="#1f2530"/><circle cx="40" cy="40" r="34" fill="url(#mg)"/><circle cx="40" cy="40" r="27" fill="none" stroke="#3b4350" stroke-width="3"/><path d="M40 13V67M13 40H67M21 21L59 59M59 21L21 59" stroke="#3b4350" stroke-width="2.5"/></svg>';
const EGG = '<svg class="mh" viewBox="0 0 80 80" style="filter:drop-shadow(0 0 10px #fde047)"><ellipse cx="40" cy="44" rx="22" ry="29" fill="#facc15" stroke="#ca8a04" stroke-width="3"/><ellipse cx="32" cy="34" rx="6" ry="10" fill="#fef9c3" opacity=".8"/></svg>';
const CH = '<svg viewBox="0 0 80 90" style="display:block"><ellipse cx="40" cy="87" rx="26" ry="4" fill="#0006"/><path d="M30 68v16M52 68v16M24 86h14M46 86h14" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M18 50Q2 44 6 26Q18 30 24 42z" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><ellipse cx="40" cy="52" rx="26" ry="22" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><ellipse cx="32" cy="56" rx="12" ry="13" fill="#e5e7eb" stroke="#cbd5e1" stroke-width="2"/><circle cx="52" cy="28" r="15" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><circle cx="46" cy="12" r="5" fill="#ef4444"/><circle cx="54" cy="10" r="5" fill="#ef4444"/><circle cx="61" cy="14" r="4" fill="#ef4444"/><path d="M65 25L78 30L65 35z" fill="#f59e0b"/><ellipse cx="63" cy="40" rx="3" ry="5" fill="#ef4444"/><circle cx="57" cy="25" r="3" fill="#111"/><circle cx="58" cy="24" r="1" fill="#fff"/><circle cx="48" cy="33" r="3" fill="#fca5a5" opacity=".7"/></svg>';
const FIRE = '<svg class="fire" viewBox="0 0 80 100"><path d="M40 98C10 90 8 60 28 40c0 14 8 16 10 6C44 30 38 16 46 2c14 20 34 36 26 62C68 86 56 96 40 98z" fill="#ef4444"/><path d="M40 98C16 92 16 70 32 52c2 10 6 10 8 4 2-14 0-24 8-34 10 16 22 30 16 50-4 14-14 24-24 26z" fill="#f97316"/><path d="M40 98C24 92 24 76 36 62c2 8 6 8 8 2 4 8 10 14 6 24-2 6-6 9-10 10z" fill="#fde047"/></svg>';
const BAR = '<svg class="bar" viewBox="0 0 90 30"><rect x="10" y="20" width="5" height="10" fill="#444"/><rect x="75" y="20" width="5" height="10" fill="#444"/><rect x="4" y="6" width="82" height="16" rx="3" fill="#fff" stroke="#999"/><path d="M10 6l10 16h12L22 6zM34 6l10 16h12L46 6zM58 6l10 16h12L70 6z" fill="#ef4444"/></svg>';
const CAR = (c, d) => `<svg class="car" viewBox="0 0 40 80" style="animation-duration:${d + 2}s;animation-delay:-${d}s"><rect x="3" y="6" width="34" height="72" rx="11" fill="#0005"/><rect x="4" y="4" width="32" height="72" rx="11" fill="${c}"/><rect x="9" y="16" width="22" height="13" rx="3" fill="#bfdbfe"/><rect x="9" y="46" width="22" height="10" rx="3" fill="#93c5fd"/><rect x="0" y="12" width="5" height="14" rx="2" fill="#111"/><rect x="35" y="12" width="5" height="14" rx="2" fill="#111"/><rect x="0" y="54" width="5" height="14" rx="2" fill="#111"/><rect x="35" y="54" width="5" height="14" rx="2" fill="#111"/><rect x="8" y="70" width="7" height="4" rx="2" fill="#fef08a"/><rect x="25" y="70" width="7" height="4" rx="2" fill="#fef08a"/></svg>`;
const TRK = (c, d) => `<svg class="car tk" viewBox="0 0 44 130" style="animation-duration:${d + 3}s;animation-delay:-${d}s"><rect x="4" y="6" width="36" height="120" rx="6" fill="#0005"/><rect x="5" y="4" width="34" height="84" rx="4" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2"/><rect x="6" y="90" width="32" height="34" rx="8" fill="${c}"/><rect x="10" y="98" width="24" height="10" rx="2" fill="#bfdbfe"/><rect x="9" y="118" width="7" height="4" rx="2" fill="#fef08a"/><rect x="28" y="118" width="7" height="4" rx="2" fill="#fef08a"/></svg>`;

function initChicken() {
  const g = setup("#chicken", '<label>Difficulté<select class="d"><option value=".12">Facile</option><option value=".2">Moyen</option><option value=".32">Difficile</option><option value=".5">Hardcore</option></select></label><button type="button" class="adv" disabled>Avancer</button>');
  g.q(".stage").innerHTML = '<div class="pg"><b></b></div><div class="road"></div>';
  const rd = g.q(".road"), adv = g.q(".adv"), N = 15, ch = document.createElement("div");
  const cols = ["#dc2626", "#2563eb", "#eab308", "#16a34a", "#f8fafc"];
  let on = false, k = 0, p = Number(g.q(".d").value), s, L = [];
  const mu = i => .9 / Math.pow(1 - p, i);
  const place = l => { l.append(ch); ch.classList.remove("hop"); void ch.offsetWidth; ch.classList.add("hop"); };
  const build = () => {
    rd.innerHTML = ""; L = []; ch.className = "ch"; ch.innerHTML = CH; g.q(".pg b").style.width = "0%";
    for (let i = 0; i <= N; i++) {
      const d = document.createElement("div");
      d.className = "ln" + (i ? "" : " st") + (i === N ? " gl" : "");
      d.innerHTML = (i && i < N ? (i % 4 === 2 ? TRK : CAR)(cols[i % 5], Math.random() * 3 + 1) : "") +
        (i === N ? EGG : i ? MH : "") + `<span class="lm">${i ? "x" + fx(mu(i)) : "DÉPART"}</span>`;
      rd.append(d); L.push(d);
    }
    L[0].append(ch); rd.scrollLeft = 0;
  };
  const cash = () => {
    on = false; const w = s * mu(k); setBal(bal + w); g.win(w); adv.disabled = true; g.run(false);
  };
  g.q(".d").onchange = () => { p = Number(g.q(".d").value); build(); };
  adv.onclick = () => {
    if (!on) return;
    if (Math.random() < p) {
      on = false; L[k + 1].classList.add("boom"); L[k + 1].insertAdjacentHTML("beforeend", '<i class="hole"></i>' + FIRE);
      ch.classList.add("dead"); place(L[k + 1]); g.msg("Grillée par les flammes ! Perdu"); adv.disabled = true; g.run(false); return;
    }
    k++; L[k].classList.add("done"); place(L[k]); g.q(".pg b").style.width = (k / N * 100) + "%";
    L[k].querySelectorAll(".car").forEach(c => c.remove());
    if (k < N) L[k].insertAdjacentHTML("beforeend", BAR);
    g.mult(mu(k)); rd.scrollTo({ left: L[k].offsetLeft - 170, behavior: "smooth" });
    if (k === N) cash();
  };
  g.q(".go").onclick = () => {
    s = g.take(); if (!s) return; p = Number(g.q(".d").value); build(); k = 0; on = true; g.mult(1); g.run(true); adv.disabled = false;
  };
  g.q(".out").onclick = () => { if (on && k > 0) cash(); };
  build();
  stop = () => { if (on) { setBal(bal + s); on = false; } };
}

/* =========================
   MENU
========================= */

const games = { mines: initMines, tower: initTower, chicken: initChicken };
document.querySelectorAll(".card").forEach(c => {
  c.onclick = () => {
    if (!currentUser || gameRunning) return;
    const game = games[c.dataset.g];
    if (!game) return;
    show("#" + c.dataset.g); game();
  };
});
$("#home").onclick = () => { if (!gameRunning) show("#menu"); };

/* =========================
   AUTHENTIFICATION
========================= */

const gate = document.createElement("div");
gate.id = "loginGate";
gate.innerHTML = `
  <div class="gate-card">
    <div class="gate-brand">PEXI <span>PLAY</span></div>
    <p>Connecte-toi pour accéder aux jeux et à ton compte.</p>
    <button id="gateGoogle" class="google-btn" type="button">
      <svg class="google-logo" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.72 5.99c4.51-4.17 7.06-10.31 7.06-17.64z"/>
        <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.81l-7.72-5.99c-2.14 1.44-4.89 2.3-8.19 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      Se connecter avec Google
    </button>
    <p id="gateError" role="status"></p>
  </div>`;
document.body.append(gate);

const gateStyle = document.createElement("style");
gateStyle.textContent = `
.google-logo{width:22px;height:22px;flex:none}
.google-btn{display:flex;align-items:center;justify-content:center;gap:10px;background:#fff!important;color:#303134!important}
#loginGate{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:radial-gradient(ellipse at top,#263b79,#0b1022 70%)}
#loginGate.gone{display:none}
.gate-card{width:min(100%,410px);padding:32px 22px;border:1px solid #53639b;border-radius:24px;background:#182044;box-shadow:0 20px 80px #0009;text-align:center}
.gate-brand{font-size:34px;font-weight:1000;letter-spacing:2px;margin-bottom:16px}
.gate-brand span{color:#facc15}
.gate-card p{opacity:.82;margin:0 0 18px}
.gate-card button{width:100%;padding:14px;font-size:16px}
.gate-card #gateError{color:#fca5a5;font-size:13px;margin:12px 0 0;overflow-wrap:anywhere}
.admin-btn{background:linear-gradient(#a78bfa,#6d28d9)!important;width:100%}
#adminModal .wallet-panel{width:min(100%,760px);max-height:88vh;overflow:auto}
.admin-list{display:grid;gap:10px;margin-top:12px}
.admin-item{padding:12px;border-radius:12px;background:#111a37;border:1px solid #394878;display:grid;gap:7px}
.admin-item strong{color:#facc15}
.admin-item .details{font-size:13px;line-height:1.5;overflow-wrap:anywhere}
.admin-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.admin-actions button{padding:9px 14px}
.admin-actions .cancel{background:#475569!important}
.admin-section{margin-top:22px}
.admin-note{font-size:12px;opacity:.75}
`;
document.head.append(gateStyle);

const profileModal = $("#profileModal");
const walletModal = $("#walletModal");
const profilePanel = profileModal.querySelector(".wallet-panel");

const adminModal = document.createElement("div");
adminModal.id = "adminModal";
adminModal.className = "wallet-modal hidden";
adminModal.innerHTML = `
  <div class="wallet-panel">
    <button id="adminClose" class="wallet-close" type="button">✕</button>
    <h2>Dashboard PEXI PLAY</h2>
    <p class="wallet-rate">Vérification manuelle des paiements PayPal</p>
    <section class="admin-section">
      <h3>Dépôts en attente</h3>
      <div id="adminDeposits" class="admin-list">Chargement…</div>
    </section>
    <section class="admin-section">
      <h3>Demandes de retrait en attente</h3>
      <div id="adminRequests" class="admin-list">Chargement…</div>
    </section>
    <p id="adminMessage" class="wallet-message" role="status"></p>
    <p class="admin-note">Clique sur PAYÉ uniquement après avoir vérifié le paiement ou effectué le virement dans PayPal.</p>
  </div>`;
document.body.append(adminModal);

const authArea = document.createElement("section");
authArea.id = "authArea";
authArea.className = "auth-area";
authArea.innerHTML = `
  <div id="authSignedOut">
    <p class="wallet-note">Connecte-toi pour ajouter des crédits ou envoyer une demande de retrait. Utilise ton compte Google.</p>
    <button id="googleLogin" class="google-btn" type="button">
      <svg class="google-logo" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.72 5.99c4.51-4.17 7.06-10.31 7.06-17.64z"/>
        <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.81l-7.72-5.99c-2.14 1.44-4.89 2.3-8.19 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      Continuer avec Google
    </button>
  </div>
  <div id="authSignedIn" class="hidden">
    <p id="authIdentity" class="auth-identity"></p>
    <button id="logout" type="button">Se déconnecter</button>
  </div>
  <p id="authMessage" class="wallet-message" role="status"></p>`;
profilePanel.querySelector(".wallet-form").before(authArea);

const adminOpen = document.createElement("button");
adminOpen.className = "admin-btn hidden";
adminOpen.type = "button";
adminOpen.textContent = "Ouvrir le dashboard administrateur";
profilePanel.querySelector(".wallet-form").append(adminOpen);

const isAdmin = () => !!currentUser &&
  (currentUser.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
  currentUser.emailVerified === true;

function authMessage(message, isError = false) {
  const node = $("#authMessage");
  if (node) { node.textContent = message; node.style.color = isError ? "#fca5a5" : "#86efac"; }
}
function firebaseError(error) {
  const messages = {
    "auth/unauthorized-domain": "Domaine non autorisé. Dans Firebase > Authentication > Paramètres > Domaines autorisés, ajoute le domaine de ton site.",
    "auth/operation-not-allowed": "Active Google dans Firebase > Authentication > Sign-in method.",
    "auth/popup-closed-by-user": "La fenêtre Google a été fermée avant la fin de la connexion.",
    "auth/cancelled-popup-request": "Une autre fenêtre de connexion est déjà ouverte.",
    "auth/popup-blocked": "La fenêtre Google a été bloquée. Autorise les pop-ups.",
    "auth/invalid-credential": "Identifiants incorrects.",
    "auth/network-request-failed": "Connexion Internet indisponible."
  };
  return messages[error.code] || `Erreur Firebase : ${error.message || error.code || "inconnue"}`;
}
function requireLogin() {
  if (!currentUser) {
    profileModal.classList.remove("hidden");
    authMessage("Connecte-toi d'abord avec Google.", true);
    return false;
  }
  return true;
}

$("#profileOpen").onclick = () => { if (!gameRunning) profileModal.classList.remove("hidden"); };
$("#profileClose").onclick = () => profileModal.classList.add("hidden");
profileModal.addEventListener("click", e => { if (e.target === profileModal) profileModal.classList.add("hidden"); });

async function googleLogin() {
  try { await signInWithPopup(auth, googleProvider); }
  catch (e) {
    console.error("Connexion Google:", e);
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(e.code)) {
      try { await signInWithRedirect(auth, googleProvider); return; } catch (redirectError) { e = redirectError; }
    }
    const msg = firebaseError(e); authMessage(msg, true); $("#gateError").textContent = msg;
  }
}
$("#googleLogin").onclick = googleLogin;
$("#gateGoogle").onclick = googleLogin;
getRedirectResult(auth).catch(e => { $("#gateError").textContent = firebaseError(e); });
$("#logout").onclick = async () => {
  try { await signOut(auth); profileModal.classList.add("hidden"); }
  catch (e) { authMessage(firebaseError(e), true); }
};

/* =========================
   NOTIFICATIONS
========================= */

const toastCss = document.createElement("style");
toastCss.textContent = `
#pexiToast{position:fixed;z-index:2000;top:12px;left:50%;transform:translate(-50%,-140%);width:min(92vw,390px);display:flex;gap:12px;align-items:center;padding:14px;border-radius:18px;background:#f8fafc;color:#111827;box-shadow:0 12px 40px #0008;transition:transform .35s}
#pexiToast.show{transform:translate(-50%,0)}
.toast-logo{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#182044;color:#facc15;font-size:22px;flex:none}
#pexiToast p{font-size:13px;margin:3px 0 0}
`;
document.head.append(toastCss);

function watchNotifications(user) {
  if (stopNotifications) { stopNotifications(); stopNotifications = null; }
  seenNotifications = new Set();
  if (!user) return;
  const qn = query(collection(db, "notifications"), where("uid", "==", user.uid));
  stopNotifications = onSnapshot(qn, snap => {
    const fresh = snap.docChanges().filter(change =>
      change.type === "added" && !change.doc.data().read
    );
    fresh.forEach(change => {
      const n = { id: change.doc.id, ...change.doc.data() };
      if (seenNotifications.has(n.id)) return;
      seenNotifications.add(n.id);
      if (!n.createdAt) return;
      let toast = document.getElementById("pexiToast");
      if (!toast) { toast = document.createElement("div"); toast.id = "pexiToast"; document.body.append(toast); }
      toast.innerHTML = "";
      const logo = document.createElement("b"); logo.textContent = "P"; logo.className = "toast-logo";
      const body = document.createElement("div");
      const title = document.createElement("strong"); title.textContent = n.title || "PEXI PLAY";
      const msg = document.createElement("p"); msg.textContent = n.body || "Une mise à jour est disponible.";
      body.append(title, msg); toast.append(logo, body); toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 6500);
    });
  }, err => console.warn("Notifications:", err));
}

/* =========================
   PROFIL ET SOLDE FIRESTORE
========================= */

onAuthStateChanged(auth, async user => {
  currentUser = user;
  gate.classList.toggle("gone", !!user);
  const header = document.querySelector("header"), main = document.querySelector("main");
  if (header) header.classList.toggle("hidden", !user);
  if (main) main.classList.toggle("hidden", !user);
  $("#authSignedOut").classList.toggle("hidden", !!user);
  $("#authSignedIn").classList.toggle("hidden", !user);
  adminOpen.classList.toggle("hidden", !isAdmin());
  watchNotifications(user);

  if (stopUserBalance) { stopUserBalance(); stopUserBalance = null; }
  if (!user) { bal = 1000; $("#bal").textContent = fmt(bal); return; }

  const label = user.displayName || user.email || "Compte connecté";
  $("#authIdentity").textContent = `${label} — ${user.email || "sans adresse e-mail"}`;

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid, email: user.email || null, displayName: user.displayName || null,
        balance: 1000, createdAt: serverTimestamp()
      });
    }
    stopUserBalance = onSnapshot(userRef, userSnap => {
      if (!userSnap.exists()) return;
      const serverBalance = Number(userSnap.data().balance);
      if (Number.isFinite(serverBalance) && !gameRunning) setBal(serverBalance);
    }, err => console.error("Solde Firestore:", err));
  } catch (e) {
    authMessage("Connexion OK, mais profil Firestore non initialisé : vérifie les règles Firestore.", true);
    console.error(e);
  }
});

/* =========================
   DEPOTS PAYPAL - VALIDATION MANUELLE
========================= */

$("#deposit").innerHTML = `
<svg viewBox="0 0 48 32" width="34" height="23" aria-hidden="true" style="vertical-align:middle;margin-right:7px">
<path fill="#003087" d="M12 3h17c8 0 12 4 10 11-2 8-7 11-15 11h-5l-2 7H7z"/>
<path fill="#009CDE" d="M18 1h17c8 0 11 4 9 11-2 7-7 10-15 10h-6l-2 8h-9z"/>
</svg>
Ajouter des crédits avec PayPal`;

const depositModal = document.createElement("div");
depositModal.id = "depositModal";
depositModal.className = "wallet-modal hidden";
depositModal.innerHTML = `
  <div class="wallet-panel">
    <button id="depositClose" class="wallet-close" type="button">✕</button>
    <h2>Ajouter des crédits</h2>
    <p class="wallet-rate">1 € = 1 000 crédits · Vérification manuelle</p>
    <form id="depositForm" class="wallet-form">
      <label>Montant à payer (€)
        <input name="amountEuros" type="number" min="1" max="500" step="0.01" placeholder="Ex. 5" required>
      </label>
      <p id="depositCredits" class="wallet-note">Tu recevras 5 000 crédits pour 5 €.</p>
      <p class="wallet-note">Après l'envoi de la demande, ouvre PayPal et règle exactement le montant indiqué. Les crédits seront ajoutés après vérification manuelle dans le dashboard.</p>
      <button type="submit">Créer la demande PayPal</button>
    </form>
    <p id="depositMessage" class="wallet-message" role="status"></p>
  </div>`;
document.body.append(depositModal);

const depositCss = document.createElement("style");
depositCss.textContent = `
#depositModal .wallet-panel{width:min(100%,480px);max-height:90vh;overflow:auto}
#depositModal .wallet-form{display:grid;gap:12px}
#depositModal .wallet-form input{width:100%}
`;
document.head.append(depositCss);

$("#deposit").onclick = () => {
  if (!requireLogin() || gameRunning) return;
  $("#depositMessage").textContent = "";
  depositModal.classList.remove("hidden");
};
$("#depositClose").onclick = () => depositModal.classList.add("hidden");
depositModal.addEventListener("click", e => { if (e.target === depositModal) depositModal.classList.add("hidden"); });
$("#depositForm").addEventListener("input", e => {
  if (e.target.name !== "amountEuros") return;
  const euros = Number(e.target.value);
  const credits = Math.round(euros * 1000);
  $("#depositCredits").textContent = Number.isFinite(euros) && euros > 0
    ? `Tu recevras ${fmt(credits)} crédits pour ${euros.toFixed(2).replace(".", ",")} €.`
    : "Entre un montant pour calculer les crédits.";
});
$("#depositForm").onsubmit = async e => {
  e.preventDefault();
  if (!requireLogin()) return;
  const form = e.currentTarget;
  const amountEuros = Math.round(Number(new FormData(form).get("amountEuros")) * 100) / 100;
  if (!(amountEuros >= 1 && amountEuros <= 500)) {
    $("#depositMessage").textContent = "Le montant doit être compris entre 1 € et 500 €.";
    return;
  }
  const credits = Math.round(amountEuros * 1000);
  try {
    const requestRef = await addDoc(collection(db, "depositRequests"), {
      uid: currentUser.uid,
      emailCompte: currentUser.email || null,
      amountEuros,
      credits,
      status: "pending",
      createdAt: serverTimestamp()
    });
    $("#depositMessage").textContent = `Demande créée (${amountEuros.toFixed(2).replace(".", ",")} €). Ouverture de PayPal…`;
    form.reset();
    $("#depositCredits").textContent = "Entre un montant pour calculer les crédits.";
    const paypalWindow = window.open(PAYPAL_ME_URL, "_blank", "noopener,noreferrer");
    if (!paypalWindow) $("#depositMessage").textContent += " Autorise les pop-ups puis ouvre PayPal.Me : " + PAYPAL_ME_URL;
    else $("#depositMessage").textContent += " Paie exactement le montant de ta demande. Référence de demande : " + requestRef.id;
  } catch (err) {
    $("#depositMessage").textContent = "Impossible de créer la demande : " + firebaseError(err);
  }
};

/* =========================
   RETRAITS
========================= */

const closeWallet = () => { walletModal.classList.add("hidden"); $("#walletMessage").textContent = ""; };
$("#withdraw").onclick = () => {
  if (!gameRunning && requireLogin()) {
    profileModal.classList.add("hidden");
    walletModal.classList.remove("hidden");
  }
};
$("#walletClose").onclick = closeWallet;
walletModal.addEventListener("click", e => { if (e.target === walletModal) closeWallet(); });
$("#withdrawForm").addEventListener("input", e => {
  if (e.target.name === "credits") {
    const n = Math.max(0, Number(e.target.value) || 0);
    $("#withdrawValue").textContent = "Montant estimé : " + (n / 10000 * 3).toFixed(2).replace(".", ",") + " €";
  }
});
$("#withdrawForm").onsubmit = async e => {
  e.preventDefault();
  if (!requireLogin()) return;
  const form = e.currentTarget;
  const f = new FormData(form);
  const credits = Math.floor(Number(f.get("credits")));
  const email = String(f.get("email")).trim();
  if (credits < 10000 || credits % 10000 !== 0) {
    $("#walletMessage").textContent = "Le retrait doit être un multiple de 10 000 crédits."; return;
  }
  if (credits > bal) { $("#walletMessage").textContent = "Tu ne possèdes pas assez de crédits affichés."; return; }
  const request = {
    uid: currentUser.uid, emailCompte: currentUser.email || null,
    nom: String(f.get("surname")).trim(), prenom: String(f.get("firstname")).trim(),
    emailPayPal: email, credits, montantEuros: credits / 10000 * 3,
    status: "pending", createdAt: serverTimestamp()
  };
  try {
    await addDoc(collection(db, "withdrawalRequests"), request);
    $("#walletMessage").textContent = "Demande envoyée. Elle sera vérifiée manuellement avant tout paiement. Les crédits ne sont pas réservés tant que le retrait n'est pas payé.";
    form.reset();
    $("#withdrawValue").textContent = "Montant estimé : 3 €";
  } catch (err) {
    $("#walletMessage").textContent = "Impossible d'envoyer la demande : " + firebaseError(err);
  }
};

/* =========================
   DASHBOARD ADMIN : DEPOTS + RETRAITS
========================= */

function adminItem(titleText, detailsText, uidText, actions) {
  const item = document.createElement("article");
  item.className = "admin-item";
  const heading = document.createElement("strong"); heading.textContent = titleText;
  const details = document.createElement("div"); details.className = "details"; details.textContent = detailsText;
  const idLine = document.createElement("small"); idLine.textContent = "UID : " + uidText;
  const actionRow = document.createElement("div"); actionRow.className = "admin-actions";
  actions.forEach(button => actionRow.append(button));
  item.append(heading, details, idLine, actionRow);
  return item;
}

async function markDepositPaid(req) {
  if (!isAdmin()) throw new Error("Accès administrateur refusé.");
  const userRef = doc(db, "users", req.uid);
  const requestRef = doc(db, "depositRequests", req.id);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("Profil du joueur introuvable.");
  const oldBalance = Number(userSnap.data().balance || 0);
  const credits = Number(req.credits);
  if (!Number.isSafeInteger(credits) || credits <= 0) throw new Error("Nombre de crédits invalide.");
  const batch = writeBatch(db);
  batch.update(userRef, { balance: oldBalance + credits, updatedAt: serverTimestamp() });
  batch.update(requestRef, { status: "paid", paidAt: serverTimestamp(), paidBy: currentUser.uid });
  const notice = doc(collection(db, "notifications"));
  batch.set(notice, {
    uid: req.uid, title: "Dépôt confirmé",
    body: `Bien joué, félicitations ! Ton paiement de ${Number(req.amountEuros).toFixed(2).replace(".", ",")} € a été vérifié : ${fmt(credits)} crédits ajoutés.`,
    createdAt: serverTimestamp(), read: false
  });
  await batch.commit();
}

async function cancelDeposit(req) {
  if (!isAdmin()) throw new Error("Accès administrateur refusé.");
  const batch = writeBatch(db);
  batch.update(doc(db, "depositRequests", req.id), {
    status: "cancelled", cancelledAt: serverTimestamp(), cancelledBy: currentUser.uid
  });
  const notice = doc(collection(db, "notifications"));
  batch.set(notice, {
    uid: req.uid, title: "Demande de dépôt annulée",
    body: "Ton dépôt n'a pas été validé. Aucun crédit n'a été ajouté.",
    createdAt: serverTimestamp(), read: false
  });
  await batch.commit();
}

async function markWithdrawalPaid(req) {
  if (!isAdmin()) throw new Error("Accès administrateur refusé.");
  const userRef = doc(db, "users", req.uid);
  const requestRef = doc(db, "withdrawalRequests", req.id);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("Profil du joueur introuvable.");
  const oldBalance = Number(userSnap.data().balance || 0);
  const credits = Number(req.credits);
  if (!Number.isSafeInteger(credits) || credits <= 0) throw new Error("Nombre de crédits invalide.");
  if (oldBalance < credits) throw new Error("Le joueur n'a plus assez de crédits pour valider ce retrait.");
  const batch = writeBatch(db);
  batch.update(userRef, { balance: oldBalance - credits, updatedAt: serverTimestamp() });
  batch.update(requestRef, { status: "paid", paidAt: serverTimestamp(), paidBy: currentUser.uid });
  const notice = doc(collection(db, "notifications"));
  batch.set(notice, {
    uid: req.uid, title: "Retrait payé",
    body: `Ton retrait de ${Number(req.montantEuros).toFixed(2).replace(".", ",")} € a été payé.`,
    createdAt: serverTimestamp(), read: false
  });
  await batch.commit();
}

async function renderAdminCollection(collectionName, targetId, title, renderer) {
  const target = $(targetId);
  target.textContent = "Chargement…";
  try {
    const snap = await getDocs(collection(db, collectionName));
    const pending = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(r => r.status === "pending")
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    target.innerHTML = "";
    if (!pending.length) { target.textContent = "Aucune demande en attente."; return; }
    for (const req of pending) target.append(renderer(req));
  } catch (err) {
    target.textContent = "Erreur de lecture : " + firebaseError(err);
  }
}

async function loadAdminRequests() {
  if (!isAdmin()) return;
  $("#adminMessage").textContent = "";
  await renderAdminCollection("depositRequests", "#adminDeposits", "Dépôt", req => {
    const amount = Number(req.amountEuros || 0).toFixed(2).replace(".", ",");
    const details = `${req.emailCompte || "Compte sans e-mail"} · ${fmt(req.credits || 0)} crédits · ${amount} €`;
    const paid = document.createElement("button"); paid.type = "button"; paid.textContent = "PAYÉ";
    const cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = "ANNULER"; cancel.className = "cancel";
    paid.onclick = async () => {
      if (!confirm(`As-tu vérifié dans PayPal que ${amount} € ont bien été reçus pour ce dépôt ?`)) return;
      paid.disabled = cancel.disabled = true;
      try { await markDepositPaid(req); await loadAdminRequests(); $("#adminMessage").textContent = "Dépôt validé : crédits ajoutés et notification envoyée."; }
      catch (err) { paid.disabled = cancel.disabled = false; $("#adminMessage").textContent = firebaseError(err); }
    };
    cancel.onclick = async () => {
      if (!confirm("Annuler cette demande ? Aucun crédit ne sera ajouté.")) return;
      paid.disabled = cancel.disabled = true;
      try { await cancelDeposit(req); await loadAdminRequests(); $("#adminMessage").textContent = "Demande annulée. Aucun crédit ajouté."; }
      catch (err) { paid.disabled = cancel.disabled = false; $("#adminMessage").textContent = firebaseError(err); }
    };
    return adminItem("DÉPÔT EN ATTENTE", details, req.uid || "", [paid, cancel]);
  });
  await renderAdminCollection("withdrawalRequests", "#adminRequests", "Retrait", req => {
    const amount = Number(req.montantEuros || 0).toFixed(2).replace(".", ",");
    const details = `${req.prenom || ""} ${req.nom || ""} · ${req.emailCompte || "Compte sans e-mail"} · PayPal : ${req.emailPayPal || ""} · ${fmt(req.credits || 0)} crédits · ${amount} €`;
    const paid = document.createElement("button"); paid.type = "button"; paid.textContent = "PAYÉ";
    paid.onclick = async () => {
      if (!confirm(`Confirmer que tu as réellement envoyé ${amount} € à ${req.emailPayPal} ?`)) return;
      paid.disabled = true;
      try { await markWithdrawalPaid(req); await loadAdminRequests(); $("#adminMessage").textContent = "Retrait payé : solde débité et notification envoyée."; }
      catch (err) { paid.disabled = false; $("#adminMessage").textContent = firebaseError(err); }
    };
    return adminItem("RETRAIT EN ATTENTE", details, req.uid || "", [paid]);
  });
}

adminOpen.onclick = async () => {
  if (!isAdmin()) return;
  profileModal.classList.add("hidden"); adminModal.classList.remove("hidden");
  await loadAdminRequests();
};
$("#adminClose").onclick = () => adminModal.classList.add("hidden");
adminModal.addEventListener("click", e => { if (e.target === adminModal) adminModal.classList.add("hidden"); });

setBal(bal);
