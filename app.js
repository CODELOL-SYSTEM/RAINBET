import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, runTransaction, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDecLiaNoWpJSqfIV7DCPNdD8Y0iPoPT6A",
  authDomain: "pexi-play.firebaseapp.com",
  databaseURL: "https://pexi-play-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "pexi-play",
  storageBucket: "pexi-play.firebasestorage.app",
  messagingSenderId: "175370623468",
  appId: "1:175370623468:web:82b66d44cac69b6502c8c9",
  measurementId: "G-JFNB7XSXPL"
};
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
const ADMIN_EMAIL = "pc2alex.les@gmail.com";
const PAYPAL_URL = "https://www.paypal.com/paypalme/SH0PNOVA/";
window.PEXI = { user: null, saveBalance: async value => {
  if (!auth.currentUser) return;
  await setDoc(doc(db,"users",auth.currentUser.uid), { credits:value, updatedAt:serverTimestamp() }, {merge:true});
}};

// Abréviations : 1K = mille, 1M = million, 1B = milliard, 1T = mille milliards...
const fmt = v => {
  const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
  let i = 0, x = Math.abs(v);
  while (x >= 999.995 && i < u.length - 1) { x /= 1000; i++; }
  const t = i ? (x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : x.toFixed(0)) : x.toFixed(2);
  return (v < 0 ? '-' : '') + (+t) + u[i];
};
const fx = m => m < 1000 ? m.toFixed(2) : fmt(m);
const $ = s => document.querySelector(s);
let bal = 1, stop = () => {};
try { const sv = localStorage.getItem('mj_bal'); if (sv !== null) bal = Math.max(1, Math.floor(+sv || 1)); } catch (e) {}

function setBal(v) {
  bal = Math.max(1, Math.floor(Number(v) || 1));
  $('#bal').textContent = fmt(bal);
  try { localStorage.setItem('mj_bal', bal); } catch (e) {}
  if (window.PEXI && window.PEXI.user) window.PEXI.saveBalance(bal).catch(err => console.error(err));
}
function show(id) {
  stop(); stop = () => {};
  document.querySelectorAll('.scr').forEach(s => s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}

// Panneau commun : crédits en jeu, multiplicateur, boutons Jouer / Encaisser
function setup(id, extra) {
  const el = $(id);
  el.innerHTML = `<div class="box"><div class="stage"></div><div class="ctl">
    <label>Crédits en jeu<span class="bet"><input class="stk" type="number" value="10" min="1"><span class="q"><button data-m=".5">½</button><button data-m="2">×2</button><button data-m="max">MAX</button></span></span></label>${extra}
    <div class="mult">x1.00</div>
    <button class="go">JOUER</button><button class="out" disabled>ENCAISSER</button></div>
    <div class="msg"></div></div>`;
  const q = s => el.querySelector(s);
  el.querySelectorAll('.q button').forEach(b => b.onclick = () => {
    const i = q('.stk');
    i.value = b.dataset.m == 'max' ? Math.max(1, Math.floor(bal)) : Math.max(1, Math.floor(i.value * b.dataset.m));
  });
  return {
    q,
    msg: t => q('.msg').textContent = t,
    mult: m => q('.mult').textContent = 'x' + fx(m),
    win: w => {
      q('.msg').textContent = 'Gagné : +' + fmt(w) + ' crédits';
      const d = document.createElement('div'); d.className = 'wb';
      d.innerHTML = `<b>+${fmt(w)}</b><small>GAGNÉ !</small>`;
      q('.stage').append(d); setTimeout(() => d.remove(), 2000);
    },
    run: v => {
      el.querySelectorAll('.ctl input,.ctl select,.q button').forEach(x => x.disabled = v);
      q('.go').disabled = v; q('.out').disabled = !v;
    },
    take: () => {
      if (!auth.currentUser) { alert('Connecte-toi pour jouer.'); setPage('wallet'); return 0; }
      const s = Math.floor(+q('.stk').value);
      if (!(s >= 1) || s > bal) { q('.msg').textContent = 'Crédits insuffisants'; return 0; }
      setBal(bal - s); q('.msg').textContent = ''; return s;
    }
  };
}

/* ---------- COIN MINER ---------- */
const COIN = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#facc15" stroke="#a16207" stroke-width="3"/><circle cx="20" cy="20" r="11" fill="none" stroke="#ca8a04" stroke-width="2"/><text x="20" y="26" text-anchor="middle" font-size="16" font-weight="800" fill="#a16207">$</text></svg>';
const GEM = '<svg viewBox="0 0 40 40"><path d="M8 15L14 7H26L32 15L20 34Z" fill="#38bdf8" stroke="#0369a1" stroke-width="2"/><path d="M8 15H32M14 7L20 15L26 7M20 15V34" stroke="#bae6fd" stroke-width="1.5" fill="none"/></svg>';
const BOMB = '<svg viewBox="0 0 40 40"><circle cx="19" cy="23" r="12" fill="#1f2937"/><path d="M26 13L31 8" stroke="#a16207" stroke-width="3"/><circle cx="32" cy="7" r="3" fill="#f97316"/><circle cx="15" cy="19" r="3" fill="#fff6"/></svg>';

function initMines() {
  const g = setup('#mines', '<label>Mines<select class="n">' + [3, 5, 10, 15, 20, 24].map(n => `<option>${n}</option>`).join('') + '</select></label>');
  g.q('.stage').innerHTML = '<div class="neon">COIN MINER</div><div class="felt"><div class="grid"></div></div>';
  let on = false, b, k, s, m;
  const T = [...Array(25)].map((_, i) => {
    const c = document.createElement('button');
    c.className = 'tile'; c.disabled = true; c.onclick = () => pick(i);
    g.q('.grid').append(c); return c;
  });
  const mu = n => { let r = .9; for (let i = 0; i < n; i++) r *= (25 - i) / (25 - m - i); return r; };
  const reveal = () => T.forEach((c, i) => {
    if (!c.classList.contains('ok') && !c.classList.contains('bad')) { c.innerHTML = b.has(i) ? BOMB : GEM; c.classList.add('dim'); }
    c.disabled = true;
  });
  const cash = () => {
    on = false; const w = s * mu(k); setBal(bal + w);
    g.win(w); reveal(); g.run(false);
  };
  function pick(i) {
    if (!on) return;
    const c = T[i];
    if (b.has(i)) { on = false; c.innerHTML = BOMB; c.classList.add('bad'); reveal(); g.msg('Boom ! Perdu'); g.run(false); return; }
    c.innerHTML = COIN; c.classList.add('ok'); c.disabled = true; k++; g.mult(mu(k));
    if (k == 25 - m) cash();
  }
  g.q('.go').onclick = () => {
    s = g.take(); if (!s) return;
    m = +g.q('.n').value; b = new Set(); while (b.size < m) b.add(Math.random() * 25 | 0);
    k = 0; on = true; g.mult(1); g.run(true);
    T.forEach(c => { c.innerHTML = ''; c.className = 'tile'; c.disabled = false; });
  };
  g.q('.out').onclick = () => { if (on && k > 0) cash(); };
  stop = () => { if (on) { setBal(bal + s); on = false; } };
}

/* ---------- TOWER BUILDER ---------- */
function initTower() {
  const g = setup('#tower', '<button class="drop">Poser le bloc</button>');
  g.q('.stage').innerHTML = '<div class="tw"><div class="mast"></div><div class="city"></div><div class="world"></div><div class="jib"><b class="trl"></b></div></div>';
  const W = 300, H = 26, wd = g.q('.world'), tw = g.q('.tw'), cy = g.q('.city'), trl = g.q('.trl');
  tw.style.zoom = Math.min(1.45, (innerWidth - 24) / 306);
  let x = 0, h = '';
  while (x < W) {
    const bw = 28 + Math.random() * 26 | 0, hs = Math.random() < .35;
    h += `<div class="${hs ? 'hs' : 'sk'}" style="left:${x}px;width:${bw}px;height:${hs ? 50 + Math.random() * 30 | 0 : 70 + Math.random() * 130 | 0}px"></div>`;
    x += bw + 2;
  }
  cy.innerHTML = h;
  let on = false, n, x0, w0, px, s, cur, raf, t0;
  const mu = k => Math.pow(1.12, k);
  const pal = ['#fde2c8', '#fbcfe8', '#bfdbfe', '#d9f99d', '#fef08a'];
  const wins = wi => '<i></i>'.repeat(Math.max(1, Math.floor(wi / 34)));
  const blk = (xx, wi, fl) => {
    const d = document.createElement('div'); d.className = 'bl';
    d.style.cssText = `left:${xx}px;width:${wi}px;bottom:${fl * H}px;background-color:${pal[fl % 5]}`;
    d.innerHTML = wins(wi); wd.append(d); return d;
  };
  const pop = (a, b, big) => {
    const d = document.createElement('div'); d.className = 'pop' + (big ? ' big' : '');
    d.innerHTML = `<b>${a}</b>${b ? `<small>${b}</small>` : ''}`; tw.append(d); setTimeout(() => d.remove(), 1100);
  };
  const sink = () => { const t = `translateY(${Math.max(0, n - 8) * H}px)`; wd.style.transform = t; cy.style.transform = t; };
  const loop = () => {
    px = (W - w0) * (.5 + .5 * Math.sin((performance.now() - t0) * (.0035 + n * .0006)));
    cur.style.left = px + 'px'; trl.style.left = (px + w0 / 2 - 9) + 'px'; raf = requestAnimationFrame(loop);
  };
  const spawn = () => { cur = blk(0, w0, n + 1); cur.insertAdjacentHTML('beforeend', '<b class="cb"></b>'); t0 = performance.now(); loop(); };
  const cash = rm => {
    on = false; cancelAnimationFrame(raf); if (rm) cur.remove();
    const w = s * mu(n); setBal(bal + w); g.win(w);
    g.run(false);
  };
  const drop = () => {
    if (!on) return;
    cancelAnimationFrame(raf);
    const perfect = Math.abs(px - x0) < 3;
    if (perfect) px = x0;
    const o = w0 - Math.abs(px - x0);
    if (o < 6) {
      on = false; const cb = cur.querySelector('.cb'); if (cb) cb.remove();
      cur.style.transition = 'transform .7s,opacity .7s';
      cur.style.transform = 'translateY(300px) rotate(25deg)'; cur.style.opacity = 0;
      g.msg('Raté ! La tour s\'effondre'); g.run(false); return;
    }
    const nl = Math.max(px, x0);
    cur.style.left = nl + 'px'; cur.style.width = o + 'px'; cur.innerHTML = wins(o);
    x0 = nl; w0 = o; n++; g.mult(mu(n));
    pop('+' + fmt(s * (mu(n) - mu(n - 1))), perfect ? 'PARFAIT !' : '', perfect);
    if (n >= 12) { cash(false); return; }
    sink(); spawn();
  };
  tw.onclick = drop; g.q('.drop').onclick = drop;
  g.q('.go').onclick = () => {
    s = g.take(); if (!s) return;
    wd.innerHTML = '<div class="gnd"></div>'; n = 0; sink();
    x0 = 85; w0 = 130; const bs = blk(x0, w0, 0); bs.classList.add('base'); bs.innerHTML = '<i></i><i class="dr"></i><i></i>';
    on = true; g.mult(1); g.run(true); spawn();
  };
  g.q('.out').onclick = () => { if (on && n > 0) cash(true); };
  stop = () => { if (on) { setBal(bal + s); on = false; } cancelAnimationFrame(raf); };
}

/* ---------- CHICKEN ROAD ---------- */
const MH = '<svg class="mh" viewBox="0 0 80 80"><defs><radialGradient id="mg" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#a7b0bf"/><stop offset="1" stop-color="#4b5563"/></radialGradient></defs><circle cx="40" cy="43" r="38" fill="#0007"/><circle cx="40" cy="40" r="38" fill="#1f2530"/><circle cx="40" cy="40" r="34" fill="url(#mg)"/><circle cx="40" cy="40" r="27" fill="none" stroke="#3b4350" stroke-width="3"/><path d="M40 13V67M13 40H67M21 21L59 59M59 21L21 59" stroke="#3b4350" stroke-width="2.5"/></svg>';
const EGG = '<svg class="mh" viewBox="0 0 80 80" style="filter:drop-shadow(0 0 10px #fde047)"><ellipse cx="40" cy="44" rx="22" ry="29" fill="#facc15" stroke="#ca8a04" stroke-width="3"/><ellipse cx="32" cy="34" rx="6" ry="10" fill="#fef9c3" opacity=".8"/></svg>';
const CH = '<svg viewBox="0 0 80 90" style="display:block"><ellipse cx="40" cy="87" rx="26" ry="4" fill="#0006"/><path d="M30 68v16M52 68v16M24 86h14M46 86h14" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M18 50Q2 44 6 26Q18 30 24 42z" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><ellipse cx="40" cy="52" rx="26" ry="22" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><ellipse cx="32" cy="56" rx="12" ry="13" fill="#e5e7eb" stroke="#cbd5e1" stroke-width="2"/><circle cx="52" cy="28" r="15" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><circle cx="46" cy="12" r="5" fill="#ef4444"/><circle cx="54" cy="10" r="5" fill="#ef4444"/><circle cx="61" cy="14" r="4" fill="#ef4444"/><path d="M65 25L78 30L65 35z" fill="#f59e0b"/><ellipse cx="63" cy="40" rx="3" ry="5" fill="#ef4444"/><circle cx="57" cy="25" r="3" fill="#111"/><circle cx="58" cy="24" r="1" fill="#fff"/><circle cx="48" cy="33" r="3" fill="#fca5a5" opacity=".7"/></svg>';
const FIRE = '<svg class="fire" viewBox="0 0 80 100"><path d="M40 98C10 90 8 60 28 40c0 14 8 16 10 6C44 30 38 16 46 2c14 20 34 36 26 62C68 86 56 96 40 98z" fill="#ef4444"/><path d="M40 98C16 92 16 70 32 52c2 10 6 10 8 4 2-14 0-24 8-34 10 16 22 30 16 50-4 14-14 24-24 26z" fill="#f97316"/><path d="M40 98C24 92 24 76 36 62c2 8 6 8 8 2 4 8 10 14 6 24-2 6-6 9-10 10z" fill="#fde047"/></svg>';
const BAR = '<svg class="bar" viewBox="0 0 90 30"><rect x="10" y="20" width="5" height="10" fill="#444"/><rect x="75" y="20" width="5" height="10" fill="#444"/><rect x="4" y="6" width="82" height="16" rx="3" fill="#fff" stroke="#999"/><path d="M10 6l10 16h12L22 6zM34 6l10 16h12L46 6zM58 6l10 16h12L70 6z" fill="#ef4444"/></svg>';
const CAR = (c, d) => `<svg class="car" viewBox="0 0 40 80" style="animation-duration:${d + 2}s;animation-delay:-${d}s"><rect x="3" y="6" width="34" height="72" rx="11" fill="#0005"/><rect x="4" y="4" width="32" height="72" rx="11" fill="${c}"/><rect x="9" y="16" width="22" height="13" rx="3" fill="#bfdbfe"/><rect x="9" y="46" width="22" height="10" rx="3" fill="#93c5fd"/><rect x="0" y="12" width="5" height="14" rx="2" fill="#111"/><rect x="35" y="12" width="5" height="14" rx="2" fill="#111"/><rect x="0" y="54" width="5" height="14" rx="2" fill="#111"/><rect x="35" y="54" width="5" height="14" rx="2" fill="#111"/><rect x="8" y="70" width="7" height="4" rx="2" fill="#fef08a"/><rect x="25" y="70" width="7" height="4" rx="2" fill="#fef08a"/></svg>`;

const TRK = (c, d) => `<svg class="car tk" viewBox="0 0 44 130" style="animation-duration:${d + 3}s;animation-delay:-${d}s"><rect x="4" y="6" width="36" height="120" rx="6" fill="#0005"/><rect x="5" y="4" width="34" height="84" rx="4" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2"/><rect x="6" y="90" width="32" height="34" rx="8" fill="${c}"/><rect x="10" y="98" width="24" height="10" rx="2" fill="#bfdbfe"/><rect x="9" y="118" width="7" height="4" rx="2" fill="#fef08a"/><rect x="28" y="118" width="7" height="4" rx="2" fill="#fef08a"/></svg>`;

function initChicken() {
  const g = setup('#chicken', '<label>Difficulté<select class="d"><option value=".12">Facile</option><option value=".2">Moyen</option><option value=".32">Difficile</option><option value=".5">Hardcore</option></select></label><button class="adv" disabled>Avancer</button>');
  g.q('.stage').innerHTML = '<div class="pg"><b></b></div><div class="road"></div>';
  const rd = g.q('.road'), adv = g.q('.adv'), N = 15, ch = document.createElement('div');
  const cols = ['#dc2626', '#2563eb', '#eab308', '#16a34a', '#f8fafc'];
  let on = false, k = 0, p = +g.q('.d').value, s, L = [];
  const mu = i => .9 / Math.pow(1 - p, i);
  const place = l => { l.append(ch); ch.classList.remove('hop'); void ch.offsetWidth; ch.classList.add('hop'); };
  const build = () => {
    rd.innerHTML = ''; L = []; ch.className = 'ch'; ch.innerHTML = CH; g.q('.pg b').style.width = '0%';
    for (let i = 0; i <= N; i++) {
      const d = document.createElement('div'); d.className = 'ln' + (i ? '' : ' st') + (i == N ? ' gl' : '');
      d.innerHTML = (i && i < N ? (i % 4 == 2 ? TRK : CAR)(cols[i % 5], Math.random() * 3 + 1) : '') + (i == N ? EGG : i ? MH : '') +
        `<span class="lm">${i ? 'x' + fx(mu(i)) : 'DÉPART'}</span>`;
      rd.append(d); L.push(d);
    }
    L[0].append(ch); rd.scrollLeft = 0;
  };
  const cash = () => {
    on = false; const w = s * mu(k); setBal(bal + w);
    g.win(w); adv.disabled = true; g.run(false);
  };
  g.q('.d').onchange = () => { p = +g.q('.d').value; build(); };
  adv.onclick = () => {
    if (!on) return;
    if (Math.random() < p) {
      on = false; L[k + 1].classList.add('boom'); L[k + 1].insertAdjacentHTML('beforeend', '<i class="hole"></i>' + FIRE);
      ch.classList.add('dead'); place(L[k + 1]);
      g.msg('Grillée par les flammes ! Perdu'); adv.disabled = true; g.run(false); return;
    }
    k++; L[k].classList.add('done'); place(L[k]); g.q('.pg b').style.width = (k / N * 100) + '%';
    // la barrière se pose : plus aucune voiture sur la voie franchie
    L[k].querySelectorAll('.car').forEach(c => c.remove());
    if (k < N) L[k].insertAdjacentHTML('beforeend', BAR);
    g.mult(mu(k)); rd.scrollTo({ left: L[k].offsetLeft - 170, behavior: 'smooth' });
    if (k == N) cash();
  };
  g.q('.go').onclick = () => {
    s = g.take(); if (!s) return;
    p = +g.q('.d').value; build(); k = 0; on = true; g.mult(1); g.run(true); adv.disabled = false;
  };
  g.q('.out').onclick = () => { if (on && k > 0) cash(); };
  build();
  stop = () => { if (on) { setBal(bal + s); on = false; } };
}

/* ---------- FRUIT MERGE / SQUISHIE MERGE ---------- */
const R = [14, 19, 25, 31, 38, 46, 55, 65, 76, 88];
const FC = ['#dc2626', '#fb7185', '#7e22ce', '#fb923c', '#65a30d', '#bef264', '#fda4af', '#facc15', '#86efac', '#16a34a'];
const SC = ['#fda4af', '#fdba74', '#fde047', '#86efac', '#67e8f9', '#93c5fd', '#c4b5fd', '#f0abfc', '#f9a8d4', '#fcd34d'];
function drawIt(c, x, y, r, l, sq, age) {
  const s = 1 + .22 * Math.sin(age * .5) * Math.exp(-age * .09);
  c.save(); c.translate(x, y); c.scale(2 - s, s);
  c.beginPath(); c.arc(0, 0, r, 0, 7); c.fillStyle = (sq ? SC : FC)[l]; c.fill();
  const g = c.createRadialGradient(-r * .35, -r * .35, r * .05, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
  c.fillStyle = g; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,.35)'; c.stroke();
  if (sq) {
    c.fillStyle = '#1f2937';
    for (const e of [-1, 1]) { c.beginPath(); c.arc(e * r * .3, -r * .05, r * .11, 0, 7); c.fill(); }
    c.fillStyle = '#fff';
    for (const e of [-1, 1]) { c.beginPath(); c.arc(e * r * .3 + r * .03, -r * .09, r * .04, 0, 7); c.fill(); }
    c.fillStyle = 'rgba(255,90,130,.45)';
    for (const e of [-1, 1]) { c.beginPath(); c.arc(e * r * .52, r * .2, r * .12, 0, 7); c.fill(); }
    c.beginPath(); c.arc(0, r * .1, r * .18, .15 * Math.PI, .85 * Math.PI); c.strokeStyle = '#1f2937'; c.lineWidth = 2; c.stroke();
  } else {
    c.strokeStyle = '#78350f'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -r); c.lineTo(r * .12, -r * 1.2); c.stroke();
    c.fillStyle = '#22c55e'; c.beginPath(); c.ellipse(r * .35, -r * .98, r * .25, r * .11, -.5, 0, 7); c.fill();
    if (l == 1 || l == 3) { c.fillStyle = l == 1 ? '#fde68a' : '#fff7'; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(Math.cos(i * 2.4) * r * .5, Math.sin(i * 2.4) * r * .5, r * .06, 0, 7); c.fill(); } }
    if (l == 9) { c.strokeStyle = '#14532d'; c.lineWidth = 3; for (const k of [-.5, 0, .5]) { c.beginPath(); c.ellipse(0, 0, r * (.4 + Math.abs(k) * .2), r, 0, 0, 7); c.stroke(); } }
  }
  c.restore();
}

function initMerge() {
  const el = $('#merge');
  el.innerHTML = '<div class="box"><div class="betbar"><label>Mise <input id="mergeBet" type="number" min="1" value="10"></label><button id="mergeStart">MISER ET JOUER</button><b id="mergeState">En attente de mise</b></div><div class="mtop"><b id="msc">0</b><span><button data-s="0" class="on">Fruit Merge</button><button data-s="1">Squishie Merge</button></span></div><canvas id="mc" width="360" height="540"></canvas><div class="msg">Touche l\'écran pour lâcher. Deux pareils fusionnent !</div></div>';
  const cv = $('#mc'), c = cv.getContext('2d'), W = 360, H = 540, LINE = 90;
  let it, score, next, aim = W / 2, cd, over, danger, skin = 0, raf, stake = 0, active = false;
  const rnd = () => Math.random() * 4 | 0;
  const reset = () => { it = []; score = 0; next = rnd(); cd = 0; over = 0; danger = 0; $('#msc').textContent = 0; };
  const add = (x, y, l) => it.push({ x, y, vx: 0, vy: 0, l, r: R[l], age: 0 });
  const bg = () => { el.style.background = skin ? 'linear-gradient(#fbcfe8,#c4b5fd)' : 'linear-gradient(#fde68a,#fb923c)'; };
  function step() {
    if (over) return;
    cd--;
    for (const a of it) {
      a.vy += .35; a.x += a.vx; a.y += a.vy; a.vx *= .995; a.age++;
      if (a.x < a.r) { a.x = a.r; a.vx *= -.3; } if (a.x > W - a.r) { a.x = W - a.r; a.vx *= -.3; }
      if (a.y > H - a.r) { a.y = H - a.r; a.vy *= -.25; a.vx *= .96; }
    }
    for (let k = 0; k < 3; k++) for (let i = 0; i < it.length; i++) for (let j = i + 1; j < it.length; j++) {
      const a = it[i], b = it[j]; if (a.dead || b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01, m = a.r + b.r;
      if (d >= m) continue;
      if (a.l == b.l) {
        a.dead = b.dead = 1; score += (a.l + 1) * 10;
        if (a.l < 9) add((a.x + b.x) / 2, (a.y + b.y) / 2, a.l + 1); else score += 500;
        $('#msc').textContent = score; continue;
      }
      const nx = dx / d, ny = dy / d, ma = a.r * a.r, mb = b.r * b.r, ov = m - d;
      a.x -= nx * ov * mb / (ma + mb); a.y -= ny * ov * mb / (ma + mb);
      b.x += nx * ov * ma / (ma + mb); b.y += ny * ov * ma / (ma + mb);
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) { const jv = -rv * 1.1 / (1 / ma + 1 / mb); a.vx -= jv * nx / ma; a.vy -= jv * ny / ma; b.vx += jv * nx / mb; b.vy += jv * ny / mb; }
    }
    it = it.filter(a => !a.dead);
    danger = it.some(a => a.age > 90 && a.y - a.r < LINE && Math.abs(a.vy) < 1) ? danger + 1 : 0;
    if (danger > 120) { over = 1; if(active){const gain=Math.floor(stake*(1+score/500));setBal(bal+gain);$('#mergeState').textContent='Gain : '+fmt(gain)+' pièces';active=false;} }
  }
  function draw() {
    c.clearRect(0, 0, W, H);
    c.fillStyle = skin ? '#fdf2f8' : '#fef3c7'; c.fillRect(0, 0, W, H);
    c.setLineDash([8, 6]); c.strokeStyle = '#ef4444aa'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, LINE); c.lineTo(W, LINE); c.stroke(); c.setLineDash([]);
    const rr = R[next], ax = Math.max(rr, Math.min(W - rr, aim));
    c.strokeStyle = '#0003'; c.beginPath(); c.moveTo(ax, 40); c.lineTo(ax, H); c.stroke();
    if (cd <= 0) drawIt(c, ax, 40, rr, next, skin, 99);
    it.forEach(a => drawIt(c, a.x, a.y, a.r, a.l, skin, a.age));
    if (over) { c.fillStyle = '#000a'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '800 36px system-ui'; c.fillText('PERDU', W / 2, H / 2 - 10); c.font = '700 20px system-ui'; c.fillText('Score : ' + score + ' — touche pour rejouer', W / 2, H / 2 + 28); }
  }
  const px = e => { const r = cv.getBoundingClientRect(); aim = (e.clientX - r.left) * W / r.width; };
  cv.onpointermove = px;
  cv.onpointerdown = px;
  cv.onpointerup = e => {
    px(e); if (!active) return; if (over) { reset(); active=false; return; }
    if (cd > 0) return;
    add(Math.max(R[next], Math.min(W - R[next], aim)), 40, next); next = rnd(); cd = 35;
  };
  el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
    skin = +b.dataset.s; el.querySelectorAll('[data-s]').forEach(x => x.classList.toggle('on', x == b)); bg();
  });
  const loop = () => { step(); draw(); raf = requestAnimationFrame(loop); };
  reset(); bg(); $('#mergeStart').onclick=()=>{if(!auth.currentUser){alert('Connecte-toi pour jouer.');setPage('wallet');return;}const v=Math.floor(+$('#mergeBet').value);if(v<1||v>bal){alert('Mise invalide ou pièces insuffisantes.');return;}stake=v;setBal(bal-v);active=true;$('#mergeState').textContent='Partie en cours';reset();}; loop();
  stop = () => cancelAnimationFrame(raf);
}

/* ---------- MOTS MÊLÉS ---------- */
const WL = 'CHAT CHIEN LAPIN POULE VACHE CHEVAL RENARD TIGRE PANDA ZEBRE LION SINGE OURS LOUP CERF PIZZA FRAISE CITRON BANANE POMME CERISE MELON TOMATE CAROTTE BOUGIE TABLE CHAISE LIVRE STYLO CLAVIER ECRAN SOURIS VOITURE AVION BATEAU TRAIN VELO MOTO SOLEIL NUAGE ETOILE LUNE PLAGE FORET RIVIERE MONTAGNE JARDIN FLEUR ARBRE FROMAGE CHOCOLAT GATEAU BONBON PAIN LAIT ROBOT PIRATE DRAGON FUSEE GUITARE PIANO TAMBOUR CINEMA MUSIQUE ECOLE MAISON CHATEAU PONT CLOWN'.split(' ');
function initWords() {
  const el = $('#words');
  el.innerHTML = '<div class="box"><h2 class="wtt">Mots Mêlés</h2><p class="wtt">Mise <input id="wordsBet" type="number" min="1" value="10"></p><p class="wtt">Choisis la difficulté</p><div class="ctl"><button data-d="0">Facile — 8×8, 6 mots</button><button data-d="1">Moyen — 11×11, 10 mots</button><button data-d="2">Difficile — 14×14, 16 mots</button></div></div>';
  let tm, wordStake=0;
  stop = () => clearInterval(tm);
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {if(!auth.currentUser){alert('Connecte-toi pour jouer.');setPage('wallet');return;}const v=Math.floor(+$('#wordsBet').value);if(v<1||v>bal){alert('Mise invalide ou pièces insuffisantes.');return;}wordStake=v;setBal(bal-v);play(+b.dataset.d);});
  function play(d) {
    clearInterval(tm);
    const N = [8, 11, 14][d], cnt = [6, 10, 16][d];
    const dirs = [[[0, 1], [1, 0]], [[0, 1], [1, 0], [1, 1], [-1, 1]], [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]]][d];
    const G = Array(N * N).fill(''), words = [];
    const pool = WL.filter(w => w.length <= N).sort(() => Math.random() - .5);
    for (const w of pool) {
      if (words.length >= cnt) break;
      for (let t = 0; t < 200; t++) {
        const [dy, dx] = dirs[Math.random() * dirs.length | 0], y = Math.random() * N | 0, x = Math.random() * N | 0;
        const ey = y + dy * (w.length - 1), ex = x + dx * (w.length - 1);
        if (ey < 0 || ey >= N || ex < 0 || ex >= N) continue;
        if ([...w].every((ch, i) => { const v = G[(y + dy * i) * N + x + dx * i]; return !v || v == ch; })) {
          [...w].forEach((ch, i) => G[(y + dy * i) * N + x + dx * i] = ch); words.push(w); break;
        }
      }
    }
    for (let i = 0; i < N * N; i++) if (!G[i]) G[i] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.random() * 26 | 0];
    el.innerHTML = `<div class="box"><div class="wh"><b id="wtm">0:00</b><button id="wback">Difficulté</button></div><div id="wg" class="wg" style="grid-template-columns:repeat(${N},1fr)">${G.map((l, i) => `<div class="wc" data-i="${i}">${l}</div>`).join('')}</div><div class="wl">${words.map(w => `<span data-w="${w}">${w}</span>`).join('')}</div><div class="msg" id="wm"></div></div>`;
    $('#wback').onclick = initWords;
    let sec = 0, found = 0, s = -1, sel = [];
    tm = setInterval(() => { sec++; $('#wtm').textContent = (sec / 60 | 0) + ':' + String(sec % 60).padStart(2, '0'); }, 1000);
    const cs = [...el.querySelectorAll('.wc')], hues = [200, 340, 120, 40, 280, 160, 20, 240];
    const line = e => {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (!t || !t.dataset || t.dataset.i === undefined) return;
      const a = s, b = +t.dataset.i, ay = a / N | 0, ax = a % N, by = b / N | 0, bx = b % N, dy = by - ay, dx = bx - ax;
      if (dy && dx && Math.abs(dy) != Math.abs(dx)) return;
      const n = Math.max(Math.abs(dy), Math.abs(dx)); sel = [];
      for (let i = 0; i <= n; i++) sel.push((ay + Math.sign(dy) * i) * N + ax + Math.sign(dx) * i);
      cs.forEach((c, i) => c.classList.toggle('sel', sel.includes(i)));
    };
    const g = $('#wg');
    g.onpointerdown = e => { const t = e.target; if (t.dataset.i === undefined) return; s = +t.dataset.i; sel = [s]; t.classList.add('sel'); };
    g.onpointermove = e => { if (s >= 0) line(e); };
    window.onpointerup = () => {
      if (s < 0) return;
      const w = sel.map(i => G[i]).join(''), r = [...w].reverse().join('');
      const hit = words.find(x => (x == w || x == r) && !$(`[data-w="${x}"]`).classList.contains('ok'));
      if (hit) {
        $(`[data-w="${hit}"]`).classList.add('ok');
        sel.forEach(i => { cs[i].classList.add('found'); cs[i].style.setProperty('--c', `hsl(${hues[found % 8]},70%,45%)`); });
        if (++found == words.length) { clearInterval(tm); const gain=wordStake*2;setBal(bal+gain);$('#wm').textContent = 'Bravo ! Gain : '+fmt(gain)+' pièces — '+$('#wtm').textContent; }
      }
      cs.forEach(c => c.classList.remove('sel')); s = -1; sel = [];
    };
  }
}

/* ---------- BLOCK BLAST (liquid glass) ---------- */
const SHP = ['1', '11', '111', '1111', '11111', '1/1', '1/1/1', '1/1/1/1', '1/1/1/1/1', '11/11', '111/111/111', '10/11', '01/11', '11/10', '11/01', '100/100/111', '001/001/111', '111/100/100', '111/001/001', '111/010', '010/111', '10/11/10', '01/11/01', '110/011', '011/110', '10/11/01', '01/11/10']
  .map(s => s.split('/').map(r => [...r].map(Number)));
const BCOL = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#818cf8', '#e879f9'];
function initBlast() {
  const el = $('#blast');
  el.innerHTML = '<div class="box"><div class="betbar"><label>Mise <input id="blastBet" type="number" min="1" value="10"></label><button id="blastStart">MISER ET JOUER</button><b id="blastState">En attente de mise</b></div><div class="bs"><div>Score <b id="bsc">0</b></div><div>Record <b id="bbest">0</b></div></div><div id="bb" class="bb"></div><div id="tr" class="tr"></div><div class="msg" id="bm"></div></div>';
  const N = 8, bb = $('#bb'), tr = $('#tr');
  let B, score, best = 0, P, ended, blastStake=0, blastActive=false;
  for (let i = 0; i < 64; i++) { const d = document.createElement('div'); d.className = 'bc'; bb.append(d); }
  const cells = [...bb.children];
  const paint = () => cells.forEach((d, i) => { d.className = 'bc' + (B[i] ? ' f' : ''); d.style.setProperty('--c', B[i] || 'transparent'); });
  const rndP = () => ({ s: SHP[Math.random() * SHP.length | 0], c: BCOL[Math.random() * BCOL.length | 0] });
  const cells_of = p => p.s.flatMap((r, y) => r.map((v, x) => v ? [y, x] : null).filter(Boolean));
  const fits = (p, r, c) => cells_of(p).every(([y, x]) => { const rr = r + y, cc = c + x; return rr >= 0 && cc >= 0 && rr < N && cc < N && !B[rr * N + cc]; });
  const can = p => { for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (fits(p, r, c)) return 1; return 0; };
  const html = p => p.s.map(r => r.map(v => v ? '<i></i>' : '<u></u>').join('')).join('');
  const mk = (p, cls) => { const d = document.createElement('div'); d.className = 'pc ' + (cls || ''); d.style.gridTemplateColumns = `repeat(${p.s[0].length},var(--cs))`; d.style.setProperty('--c', p.c); d.innerHTML = html(p); return d; };
  const tray = () => { tr.innerHTML = ''; P.forEach((p, i) => { const s = document.createElement('div'); s.className = 'slot'; if (p) { const d = mk(p); d.onpointerdown = e => drag(e, i); s.append(d); } tr.append(s); }); };
  const reset = () => { B = Array(64).fill(null); score = 0; ended = 0; P = [rndP(), rndP(), rndP()]; $('#bsc').textContent = 0; $('#bm').textContent = ''; paint(); tray(); };
  function drag(e, i) {
    if (ended || !blastActive) return; e.preventDefault();
    const p = P[i], pitch = bb.getBoundingClientRect().width / N, g = mk(p, 'gh');
    g.style.setProperty('--cs', (pitch - 6) + 'px'); document.body.append(g);
    const gw = p.s[0].length * pitch, gh = p.s.length * pitch; let tr0 = -9, tc0 = -9;
    const move = ev => {
      g.style.left = (ev.clientX - gw / 2) + 'px'; g.style.top = (ev.clientY - gh - 40) + 'px';
      const r = bb.getBoundingClientRect(), pad = 10;
      tc0 = Math.round((ev.clientX - gw / 2 - r.left - pad) / pitch); tr0 = Math.round((ev.clientY - gh - 40 - r.top - pad) / pitch);
      cells.forEach(c => c.classList.remove('pv'));
      if (fits(p, tr0, tc0)) cells_of(p).forEach(([y, x]) => cells[(tr0 + y) * N + tc0 + x].classList.add('pv'));
    };
    const up = () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); g.remove();
      cells.forEach(c => c.classList.remove('pv'));
      if (fits(p, tr0, tc0)) place(i, tr0, tc0);
    };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); move(e);
  }
  function place(i, r, c) {
    const p = P[i]; cells_of(p).forEach(([y, x]) => B[(r + y) * N + c + x] = p.c);
    let add = cells_of(p).length; paint();
    const rows = [], cols = [];
    for (let k = 0; k < N; k++) {
      if (B.slice(k * N, k * N + N).every(Boolean)) rows.push(k);
      if ([...Array(N)].every((_, y) => B[y * N + k])) cols.push(k);
    }
    const kill = new Set(); rows.forEach(k => { for (let x = 0; x < N; x++) kill.add(k * N + x); }); cols.forEach(k => { for (let y = 0; y < N; y++) kill.add(y * N + k); });
    const L = rows.length + cols.length; if (L) add += kill.size + L * L * 10;
    score += add; best = Math.max(best, score); $('#bsc').textContent = score; $('#bbest').textContent = best;
    P[i] = null; if (P.every(x => !x)) P = [rndP(), rndP(), rndP()]; tray();
    kill.forEach(k => cells[k].classList.add('clr'));
    setTimeout(() => {
      kill.forEach(k => B[k] = null); paint();
      if (!P.some(x => x && can(x))) { ended = 1; $('#bm').textContent = 'Plus de place !'; if(blastActive){const gain=Math.floor(blastStake*(1+score/250));setBal(bal+gain);$('#blastState').textContent='Gain : '+fmt(gain)+' pièces';blastActive=false;} }
    }, L ? 260 : 0);
  }
  $('#bm').onclick = () => { if (ended) reset(); };
  $('#blastStart').onclick=()=>{if(!auth.currentUser){alert('Connecte-toi pour jouer.');setPage('wallet');return;}const v=Math.floor(+$('#blastBet').value);if(v<1||v>bal){alert('Mise invalide ou pièces insuffisantes.');return;}blastStake=v;setBal(bal-v);blastActive=true;$('#blastState').textContent='Partie en cours';reset();};
  reset();
}

/* ---------- MENU ---------- */
const games = { mines: initMines, tower: initTower, chicken: initChicken, merge: initMerge, words: initWords, blast: initBlast };
document.querySelectorAll('.card').forEach(c => c.onclick = () => {
  if (!auth.currentUser) { alert('Connecte-toi pour jouer.'); setPage('wallet'); return; }
  show('#' + c.dataset.g); games[c.dataset.g]();
});
$('#home').onclick = () => show('#menu');
setBal(bal);
show('#menu');

/* ---------- COMPTE, DEPOTS ET RETRAITS MANUELS ---------- */
const accountHTML = `
<section id="wallet" class="scr hidden"><div class="box walletbox">
  <h2>Mon compte</h2><p id="authState">Connecte-toi pour sauvegarder tes crédits.</p>
  <button id="loginBtn" class="googleBtn"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.8 27.8a12 12 0 0 1 0-7.6V15H5.9a20 20 0 0 0 0 18Z"/><path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6.1 29.5 4 24 4A20 20 0 0 0 5.9 15l6.9 5.2c1.6-4.7 6-8.1 11.2-8.1Z"/></svg> Continuer avec Google</button><button id="logoutBtn" class="hidden">Déconnexion</button>
  <div class="walletgrid"><div><h3>Déposer</h3><label>Montant du dépôt<select id="depAmount"><option value="5">5 € — 1M pièces</option><option value="10">10 € — 2,67M pièces</option></select></label><button id="depositBtn" class="paypalBtn"><svg viewBox="0 0 40 40" aria-hidden="true"><path fill="#003087" d="M12 5h13c8 0 11 4 9 11-1.5 7-6 10-13 10h-5l-2 9H5L12 5Z"/><path fill="#009cde" d="M9 8h13c8 0 11 4 9 11-1 5-4 8-9 9l1-5c5-1 7-4 7-8 0-4-3-6-8-6H12l-5 24H2L9 8Z"/></svg> Déposer avec PayPal</button><p class="hint">Le paiement est vérifié manuellement par l’administrateur dans le dashboard. Aucun paiement n’est vérifié automatiquement.</p></div>
  <div><h3>Retirer</h3><label>Nombre de pièces<input id="withCoins" type="number" min="100000" step="10000" value="100000" max="0"></label><label>Prénom<input id="withFirst" maxlength="60"></label><label>Nom<input id="withLast" maxlength="60"></label><label>Email PayPal<input id="withPaypal" type="email" maxlength="160"></label><p id="withValue">Montant à recevoir : 0,30 €</p><button id="withdrawBtn">DEMANDER UN RETRAIT</button><p class="hint">Taux : 100 000 pièces = 0,30 €. Les pièces sont réservées dès la demande.</p></div></div>
  <h3>Mes notifications</h3><div id="myNotifs" class="noticeList">Aucune notification.</div><h3>Mes demandes</h3><div id="myRequests" class="noticeList"></div>

</div></section>
<section id="admin" class="scr hidden"><div class="box walletbox"><h2>Dashboard administrateur</h2><p>Les paiements sont contrôlés manuellement. Aucun contrôle PayPal automatique.</p><h3>Notifications — dépôts à traiter</h3><div id="adminDeposits" class="noticeList"></div><h3>Notifications — retraits à traiter</h3><div id="adminWithdrawals" class="noticeList"></div></div></section>`;
document.querySelector('main').insertAdjacentHTML('beforeend', accountHTML);
const style = document.createElement('style'); style.textContent = `
.betbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px;margin-bottom:12px;background:#172554;border:1px solid #475569;border-radius:14px;color:white}.betbar label{display:flex;align-items:center;gap:8px}.betbar input{width:100px;padding:9px;border-radius:8px;border:1px solid #64748b;background:#0f172a;color:white}.betbar button{background:linear-gradient(#34d399,#059669)}
#wallet,#admin{min-height:calc(100vh - 60px);background:radial-gradient(ellipse at 15% 0%,#283c68 0%,transparent 48%),linear-gradient(145deg,#080d19,#111b31 55%,#172b4d);padding:22px;color:#f8fafc}.walletbox{max-width:960px;margin:18px auto;padding:30px;background:rgba(255,255,255,.075);backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);border:1px solid rgba(255,255,255,.16);border-radius:28px;box-shadow:0 28px 80px #0008}.walletbox h2{font-size:28px;margin:12px 0}.walletbox h3{margin:18px 0 8px;color:#fde68a}.walletgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;margin:18px 0}.walletgrid>div{background:linear-gradient(150deg,rgba(255,255,255,.12),rgba(12,25,48,.66));backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.16);padding:24px;border-radius:22px;display:grid;gap:12px;box-shadow:inset 0 1px rgba(255,255,255,.12),0 16px 36px #0003}.walletbox label{display:grid;gap:5px;margin:8px 0}.walletbox input,.walletbox select{width:100%;min-height:42px}.walletbox button{margin:5px 5px 5px 0;min-height:48px;border-radius:13px;background:linear-gradient(135deg,#2563eb,#4f46e5);box-shadow:0 5px 0 #1e3a8a;color:white}.walletnav{background:linear-gradient(135deg,#2563eb,#4f46e5)!important}.walletbox input,.walletbox select{box-sizing:border-box;background:#0f172a;color:#fff;border:1px solid #475569;border-radius:10px;padding:10px}.walletbox h2{font-size:32px}.walletbox h3{font-size:19px}.hint{font-size:13px;opacity:.8;line-height:1.4}.noticeList{display:grid;gap:9px}.notice{background:rgba(255,255,255,.09);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:15px;display:grid;gap:7px;box-shadow:0 10px 30px #0002}.notice small{opacity:.75}.notice button{margin-right:6px}.okbtn{background:#15803d}.badbtn{background:#991b1b}.walletnav{background:linear-gradient(135deg,#4f46e5,#2563eb)!important}.googleBtn,.paypalBtn{display:flex;align-items:center;justify-content:center;gap:12px;font-weight:800;letter-spacing:.2px}.googleBtn{background:#fff!important;color:#202124!important;box-shadow:0 7px 22px #0003!important}.googleBtn svg{width:24px;height:24px;flex:none}.paypalBtn{background:linear-gradient(110deg,#003087,#0070e0)!important}.paypalBtn svg{width:28px;height:28px;flex:none}.walletbox button{transition:transform .18s,filter .18s}.walletbox button:hover{transform:translateY(-2px);filter:brightness(1.1)}#walletNav,#adminNav{border-radius:999px;padding:9px 16px;font-weight:800;letter-spacing:.4px}.glassToast{position:fixed;z-index:9999;top:18px;left:50%;transform:translateX(-50%);width:min(440px,calc(100% - 28px));display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:24px;background:rgba(245,249,255,.78);color:#101828;border:1px solid rgba(255,255,255,.9);box-shadow:0 18px 60px #0005;backdrop-filter:blur(28px) saturate(190%);-webkit-backdrop-filter:blur(28px) saturate(190%);font-weight:850;animation:toastIn .45s cubic-bezier(.2,.8,.2,1)}.glassToast svg{width:38px;height:38px;flex:none}.glassToast span{line-height:1.25}.glassToast small{display:block;font-size:10px;letter-spacing:1.4px;opacity:.6;margin-bottom:4px}@keyframes toastIn{from{opacity:0;top:-30px;transform:translate(-50%,-15px) scale(.96)}to{opacity:1;top:18px;transform:translate(-50%,0) scale(1)}}
`; document.head.append(style);
const nav = document.createElement('button'); nav.id='walletNav'; nav.textContent='COMPTE'; nav.className='walletnav'; document.querySelector('header').insertBefore(nav, document.querySelector('#cr'));
const adminNav = document.createElement('button'); adminNav.id='adminNav'; adminNav.textContent='DASHBOARD'; adminNav.className='hidden'; document.querySelector('header').insertBefore(adminNav, document.querySelector('#cr'));
const el=id=>document.getElementById(id); const euro=n=>Number(n).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
let unsubNotifs=null, unsubDeps=null, unsubWith=null, unsubMine=null, unsubWallet=null; let seenNotificationIds=new Set();
function note(text){const n=document.createElement('div');n.className='notice';n.textContent=text;el('myNotifs').prepend(n);}
function setPage(id){stop();stop=()=>{};document.querySelectorAll('.scr').forEach(s=>s.classList.add('hidden'));el(id).classList.remove('hidden');}
nav.onclick=()=>setPage('wallet'); adminNav.onclick=()=>setPage('admin');
el('loginBtn').onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){alert('Connexion impossible : '+e.message);}};
el('logoutBtn').onclick=()=>signOut(auth);
el('withCoins').oninput=()=>{el('withCoins').max=Math.max(0,bal-1);el('withValue').textContent='Montant à recevoir : '+euro((Math.max(0,Number(el('withCoins').value)||0)/100000)*0.30);};
el('depositBtn').onclick=async()=>{
 const u=auth.currentUser;if(!u)return alert('Connecte-toi d’abord.');
 const amount=Number(el('depAmount').value), credits=amount===5?1000000:amount===10?2670000:0;
 try{await addDoc(collection(db,'depositRequests'),{uid:u.uid,email:u.email||'',displayName:u.displayName||'',amountEuros:amount,credits,status:'pending',createdAt:serverTimestamp()});
 await notify(u.uid,`Demande de dépôt envoyée : ${amount} € pour ${fmt(credits)} pièces. En attente de vérification.`); window.open(PAYPAL_URL+amount,'_blank','noopener');alert('Demande enregistrée. Termine le paiement PayPal, puis attends la validation manuelle.');}catch(e){alert('Erreur : '+e.message);}
};
el('withdrawBtn').onclick=async()=>{
 const u=auth.currentUser;if(!u)return alert('Connecte-toi d’abord.');
 const coins=Math.floor(Number(el('withCoins').value)), first=el('withFirst').value.trim(), last=el('withLast').value.trim(), paypal=el('withPaypal').value.trim();
 if(coins<100000||!first||!last||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypal))return alert('Formulaire incomplet. Minimum : 100 000 pièces.');
 const amount=Number((coins/100000*0.30).toFixed(2)), requestRef=doc(collection(db,'withdrawalRequests'));
 try{await runTransaction(db,async tx=>{const ref=doc(db,'users',u.uid),snap=await tx.get(ref);const current=snap.exists()?Math.max(1,Math.floor(snap.data().credits||1)):1;if(coins>current-1)throw new Error('Tu dois garder au moins 1 pièce. Disponible pour retrait : '+fmt(Math.max(0,current-1)));tx.set(ref,{uid:u.uid,credits:current-coins,updatedAt:serverTimestamp()},{merge:true});tx.set(requestRef,{uid:u.uid,email:u.email||'',displayName:u.displayName||'',firstName:first,lastName:last,paypalEmail:paypal,credits:coins,amountEuros:amount,status:'pending',createdAt:serverTimestamp()});});
 await notify(u.uid,`Demande de retrait de ${fmt(coins)} pièces (${euro(amount)}) envoyée. Tes pièces ont été retirées du solde.`);alert('Demande envoyée. Les pièces ont été déduites une seule fois.');}catch(e){alert('Retrait impossible : '+e.message);}
};
function listenUser(u){
 if(unsubNotifs)unsubNotifs();
 if(unsubMine)unsubMine();
 unsubNotifs=onSnapshot(query(collection(db,'notifications'),where('uid','==',u.uid),orderBy('createdAt','desc')),(snap)=>{
   el('myNotifs').innerHTML='';
   if(snap.empty)el('myNotifs').textContent='Aucune notification.';
   snap.forEach(d=>{const v=d.data(),n=document.createElement('div');n.className='notice';n.textContent=v.message||'Notification';el('myNotifs').append(n);if(!seenNotificationIds.has(d.id)){seenNotificationIds.add(d.id);if(v.kind==='deposit'||v.kind==='withdrawal')showGlassToast(v.message,v.kind==='withdrawal');}});
 });
 const render=()=>{};
 const depQ=query(collection(db,'depositRequests'),where('uid','==',u.uid));
 const withQ=query(collection(db,'withdrawalRequests'),where('uid','==',u.uid));
 let dep=[],wit=[];
 const draw=()=>{const items=[...dep.map(data=>({kind:'Dépôt',data})),...wit.map(data=>({kind:'Retrait',data}))];items.sort((a,b)=>(b.data.createdAt?.seconds||0)-(a.data.createdAt?.seconds||0));el('myRequests').innerHTML='';items.forEach(v=>{const n=document.createElement('div');n.className='notice';n.textContent=v.kind+' — '+(v.data.status||'en attente')+' — '+fmt(v.data.credits||0)+' pièces';el('myRequests').append(n);});};
 const a=onSnapshot(depQ,s=>{dep=s.docs.map(d=>d.data());draw();});
 const b=onSnapshot(withQ,s=>{wit=s.docs.map(d=>d.data());draw();});
 unsubMine=()=>{a();b();};
}

function showGlassToast(message,isPaypal){const old=document.querySelector('.glassToast');if(old)old.remove();const t=document.createElement('div');t.className='glassToast';const logo=isPaypal?'<svg viewBox="0 0 40 40" aria-hidden="true"><path fill="#003087" d="M12 5h13c8 0 11 4 9 11-1.5 7-6 10-13 10h-5l-2 9H5L12 5Z"/><path fill="#009cde" d="M9 8h13c8 0 11 4 9 11-1 5-4 8-9 9l1-5c5-1 7-4 7-8 0-4-3-6-8-6H12l-5 24H2L9 8Z"/></svg>':'<span style="font-size:30px">🎉</span>';t.innerHTML=logo+'<span><small>PEXI PLAY · NOTIFICATION</small></span>';t.querySelector('span').append(document.createTextNode(message));document.body.append(t);setTimeout(()=>t.remove(),6500);}
async function notify(uid,message,extra={}){await addDoc(collection(db,'notifications'),{uid,message,...extra,createdAt:serverTimestamp(),read:false});}
function listenAdmin(){
 if(unsubDeps)unsubDeps();if(unsubWith)unsubWith();
 unsubDeps=onSnapshot(query(collection(db,'depositRequests'),where('status','==','pending')),(snap)=>{el('adminDeposits').innerHTML='';if(snap.empty)el('adminDeposits').textContent='Aucun dépôt en attente.';snap.forEach(d=>{const v=d.data(),n=document.createElement('div');n.className='notice';const p=document.createElement('p');p.textContent=`${v.displayName||'Joueur'} — ${v.email||''} — ${v.amountEuros} € — ${fmt(v.credits)} pièces`;n.append(p);const info=document.createElement('small');info.textContent='Dépôt à vérifier manuellement dans PayPal';n.append(info);const yes=document.createElement('button');yes.className='okbtn';yes.textContent='PAIEMENT REÇU : DONNER';yes.onclick=async()=>{yes.disabled=true;try{await runTransaction(db,async tx=>{const req=await tx.get(d.ref);if(!req.exists()||req.data().status!=='pending')throw new Error('Demande déjà traitée');const ur=doc(db,'users',v.uid),us=await tx.get(ur);if(!us.exists())tx.set(ur,{uid:v.uid,credits:1+v.credits,updatedAt:serverTimestamp()},{merge:true});else tx.update(ur,{credits:Math.max(1,Math.floor(us.data().credits||1))+v.credits,updatedAt:serverTimestamp()});tx.update(d.ref,{status:'approved',processedAt:serverTimestamp()});});await notify(v.uid,`Tu as déposé ${fmt(v.credits)} pièces !!!!!`,{kind:'deposit',amount:fmt(v.credits)});}catch(e){alert(e.message);yes.disabled=false;}};const no=document.createElement('button');no.className='badbtn';no.textContent='PAIEMENT PAS REÇU : SUPPRIMER';no.onclick=async()=>{if(confirm('Supprimer cette demande de dépôt ?'))await deleteDoc(d.ref);};n.append(yes,no);el('adminDeposits').append(n);});});
 unsubWith=onSnapshot(query(collection(db,'withdrawalRequests'),where('status','==','pending')),(snap)=>{el('adminWithdrawals').innerHTML='';if(snap.empty)el('adminWithdrawals').textContent='Aucun retrait en attente.';snap.forEach(d=>{const v=d.data(),n=document.createElement('div');n.className='notice';const p=document.createElement('p');p.textContent=`${v.firstName||''} ${v.lastName||''} — ${fmt(v.credits)} pièces — ${euro(v.amountEuros)}`;n.append(p);const mail=document.createElement('small');mail.textContent='Email PayPal : '+(v.paypalEmail||'');n.append(mail);const yes=document.createElement('button');yes.className='okbtn';yes.textContent="J'AI DONNÉ";yes.onclick=async()=>{yes.disabled=true;try{await updateDoc(d.ref,{status:'paid',processedAt:serverTimestamp()});await notify(v.uid,`Bien joué, tu as retiré ${euro(v.amountEuros)} !!!`,{kind:'withdrawal',amount:euro(v.amountEuros)});}catch(e){alert(e.message);yes.disabled=false;}};n.append(yes);el('adminWithdrawals').append(n);});});
}
onAuthStateChanged(auth,async u=>{
 window.PEXI.user=u||null;
 if(!u){if(unsubWallet)unsubWallet();bal=1;$('#bal').textContent='1';try{localStorage.setItem('mj_bal','1')}catch(e){}el('authState').textContent='Non connecté';el('loginBtn').classList.remove('hidden');el('logoutBtn').classList.add('hidden');adminNav.classList.add('hidden');if(unsubNotifs)unsubNotifs();if(unsubMine)unsubMine();return;}
 el('authState').textContent='Connecté : '+(u.displayName||u.email);el('loginBtn').classList.add('hidden');el('logoutBtn').classList.remove('hidden');
 const ref=doc(db,'users',u.uid);let snap=await getDoc(ref);if(!snap.exists())await setDoc(ref,{uid:u.uid,email:u.email||'',displayName:u.displayName||'',credits:1,createdAt:serverTimestamp()});else if(typeof snap.data().credits==='number'&&snap.data().credits<1)await updateDoc(ref,{credits:1});
 if(unsubWallet)unsubWallet();unsubWallet=onSnapshot(ref,ds=>{if(ds.exists()){bal=Math.max(1,Math.floor(ds.data().credits||1));$('#bal').textContent=fmt(bal);try{localStorage.setItem('mj_bal',bal)}catch(e){}el('withCoins').max=Math.max(0,bal-1);}});
 listenUser(u);if(u.email===ADMIN_EMAIL){adminNav.classList.remove('hidden');listenAdmin();}else adminNav.classList.add('hidden');
});
