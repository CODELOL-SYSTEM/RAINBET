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
let bal = 1000, stop = () => {};
try { const sv = localStorage.getItem('mj_bal'); if (sv !== null) bal = Math.max(1, +sv || 1); } catch (e) {}

function setBal(v) {
  bal = Math.max(1, Math.round(v * 100) / 100); // jamais en dessous de 1 crédit
  $('#bal').textContent = fmt(bal);
  try { localStorage.setItem('mj_bal', bal); } catch (e) {}
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
      q('.stage').append(d); setTimeout(() => d.remove(), 2000); winXP();
    },
    run: v => {
      el.querySelectorAll('.ctl input,.ctl select,.q button').forEach(x => x.disabled = v);
      q('.go').disabled = v; q('.out').disabled = !v;
    },
    take: () => {
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
  el.innerHTML = '<div class="box"><div class="mtop"><b id="msc">0</b><span><button data-s="0" class="on">Fruit Merge</button><button data-s="1">Squishie Merge</button></span></div><canvas id="mc" width="360" height="540"></canvas><div class="msg">Touche l\'écran pour lâcher. Deux pareils fusionnent !</div></div>';
  const cv = $('#mc'), c = cv.getContext('2d'), W = 360, H = 540, LINE = 90;
  let it, score, next, aim = W / 2, cd, over, danger, skin = 0, raf;
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
    if (danger > 120) over = 1;
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
    px(e); if (over) { reset(); return; }
    if (cd > 0) return;
    add(Math.max(R[next], Math.min(W - R[next], aim)), 40, next); next = rnd(); cd = 35;
  };
  el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
    skin = +b.dataset.s; el.querySelectorAll('[data-s]').forEach(x => x.classList.toggle('on', x == b)); bg();
  });
  const loop = () => { step(); draw(); raf = requestAnimationFrame(loop); };
  reset(); bg(); loop();
  stop = () => cancelAnimationFrame(raf);
}

/* ---------- MOTS MÊLÉS ---------- */
const WL = 'CHAT CHIEN LAPIN POULE VACHE CHEVAL RENARD TIGRE PANDA ZEBRE LION SINGE OURS LOUP CERF PIZZA FRAISE CITRON BANANE POMME CERISE MELON TOMATE CAROTTE BOUGIE TABLE CHAISE LIVRE STYLO CLAVIER ECRAN SOURIS VOITURE AVION BATEAU TRAIN VELO MOTO SOLEIL NUAGE ETOILE LUNE PLAGE FORET RIVIERE MONTAGNE JARDIN FLEUR ARBRE FROMAGE CHOCOLAT GATEAU BONBON PAIN LAIT ROBOT PIRATE DRAGON FUSEE GUITARE PIANO TAMBOUR CINEMA MUSIQUE ECOLE MAISON CHATEAU PONT CLOWN'.split(' ');
function initWords() {
  const el = $('#words');
  el.innerHTML = '<div class="box"><h2 class="wtt">Mots Mêlés</h2><p class="wtt">Choisis la difficulté</p><div class="ctl"><button data-d="0">Facile — 8×8, 6 mots</button><button data-d="1">Moyen — 11×11, 10 mots</button><button data-d="2">Difficile — 14×14, 16 mots</button></div></div>';
  let tm;
  stop = () => clearInterval(tm);
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => play(+b.dataset.d));
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
        if (++found == words.length) { clearInterval(tm); $('#wm').textContent = 'Bravo ! Trouvé en ' + $('#wtm').textContent; }
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
  el.innerHTML = '<div class="box"><div class="bs"><div>Score <b id="bsc">0</b></div><div>Record <b id="bbest">0</b></div></div><div id="bb" class="bb"></div><div id="tr" class="tr"></div><div class="msg" id="bm"></div></div>';
  const N = 8, bb = $('#bb'), tr = $('#tr');
  let B, score, best = 0, P, ended;
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
    if (ended) return; e.preventDefault();
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
      if (!P.some(x => x && can(x))) { ended = 1; $('#bm').textContent = 'Plus de place ! Touche ici pour rejouer'; }
    }, L ? 260 : 0);
  }
  $('#bm').onclick = () => { if (ended) reset(); };
  reset();
}

/* ---------- XP (barre de progression) & difficulté ---------- */
let xp = 0, cyc = 0;
try { xp = +localStorage.getItem('mj_xp') || 0; cyc = +localStorage.getItem('mj_cyc') || 0; } catch (e) {}
const xpShow = () => { $('#xpb').style.width = (xp * 2) + '%'; $('#xpt').textContent = 'XP ' + xp + '/50'; };
function toast(t, big) {
  const d = document.createElement('div'); d.className = 'toast' + (big ? ' big' : ''); d.textContent = t;
  document.body.append(d); setTimeout(() => d.remove(), big ? 3500 : 2200);
}
// L'XP est rare et de plus en plus difficile à gagner ; barre pleine = 50K pièces
function winXP() {
  if (Math.random() >= Math.max(.03, .5 * Math.pow(.94, xp) * Math.pow(.8, cyc))) return;
  xp++; let t = '+1 XP';
  if (xp >= 50) { xp = 0; cyc++; setBal(bal + 50000); t = 'BARRE PLEINE ! +50K pièces'; }
  try { localStorage.setItem('mj_xp', xp); localStorage.setItem('mj_cyc', cyc); } catch (e) {}
  xpShow(); toast(t, xp == 0);
}
const LV = {};
const lvGet = k => { if (LV[k] === undefined) { try { LV[k] = +localStorage.getItem('mj_l_' + k) || 0; } catch (e) { LV[k] = 0; } } return LV[k]; };
const lvUp = k => { LV[k] = lvGet(k) + 1; try { localStorage.setItem('mj_l_' + k, LV[k]); } catch (e) {} };
const dif = L => L < 3 ? 'Facile' : L < 8 ? 'Moyen' : L < 15 ? 'Difficile' : L < 25 ? 'Expert' : 'Extrême';

/* ---------- WATER SORT ---------- */
const WCOL = ['#ef4444', '#f97316', '#facc15', '#84cc16', '#16a34a', '#06b6d4', '#2563eb', '#8b5cf6', '#ec4899', '#92400e', '#cbd5e1', '#0f172a'];
const WSYM = ['●', '▲', '■', '★', '♦', '♥', '♣', '♠', '✚', '☀', '☾', '✿'];
function initWater() {
  const el = $('#water');
  el.innerHTML = '<div class="box"><div class="gtop"><span>Points <b id="wsc">0</b></span><b id="wdf"></b><span class="skin"><button data-k="tube" class="on">Tube</button><button data-k="bottle">Bouteille</button><button data-k="vase">Vase</button></span></div><div id="wt" class="wt tube"></div><div class="ctl"><button id="wun">Annuler</button><button id="wrs">Recommencer</button><button id="wsy" class="on">Symboles</button></div><div class="msg" id="wmsg"></div></div>';
  const wt = $('#wt'); let T, sel = -1, hist = [], init0, score = 0, busy = 0;
  const render = () => {
    wt.innerHTML = T.map((t, i) => `<div class="tb${i == sel ? ' up' : ''}" data-i="${i}"><div class="lqs">${t.map(c => `<div class="lq" style="--c:${WCOL[c]}"><s>${WSYM[c]}</s></div>`).join('')}</div></div>`).join('');
  };
  const gen = () => {
    const L = lvGet('water'), n = Math.min(3 + (L / 2 | 0), 12), pool = [];
    for (let c = 0; c < n; c++) for (let k = 0; k < 4; k++) pool.push(c);
    pool.sort(() => Math.random() - .5);
    T = []; for (let i = 0; i < n; i++) T.push(pool.slice(i * 4, i * 4 + 4));
    T.push([], []); init0 = JSON.stringify(T); hist = []; sel = -1; busy = 0;
    $('#wdf').textContent = dif(L); $('#wmsg').textContent = ''; render();
  };
  const check = () => {
    if (!T.every(t => !t.length || (t.length == 4 && t.every(x => x == t[0])))) return;
    busy = 1; score += 200; $('#wsc').textContent = score; $('#wmsg').textContent = 'Gagné !';
    winXP(); lvUp('water'); setTimeout(gen, 1400);
  };
  wt.onclick = e => {
    const tb = e.target.closest('.tb'); if (!tb || busy) return; const i = +tb.dataset.i;
    if (sel < 0) { if (T[i].length) { sel = i; render(); } return; }
    if (sel == i) { sel = -1; render(); return; }
    const a = T[sel], b = T[i], c = a[a.length - 1];
    if (b.length < 4 && (!b.length || b[b.length - 1] == c)) {
      hist.push(JSON.stringify(T));
      while (a.length && a[a.length - 1] == c && b.length < 4) b.push(a.pop());
      sel = -1; score += 10; $('#wsc').textContent = score; render(); check();
    } else { sel = T[i].length ? i : -1; render(); }
  };
  $('#wun').onclick = () => { if (hist.length && !busy) { T = JSON.parse(hist.pop()); sel = -1; render(); } };
  $('#wrs').onclick = () => { if (!busy) { T = JSON.parse(init0); hist = []; sel = -1; render(); } };
  $('#wsy').onclick = e => { wt.classList.toggle('nosym'); e.target.classList.toggle('on'); };
  el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    wt.className = 'wt ' + b.dataset.k + (wt.classList.contains('nosym') ? ' nosym' : '');
    el.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', x == b));
  });
  gen();
}

/* ---------- KNIFE HIT ---------- */
function dk(c) {
  const g = c.createLinearGradient(-7, 0, 7, 0); g.addColorStop(0, '#e5e7eb'); g.addColorStop(.5, '#fff'); g.addColorStop(1, '#9ca3af');
  c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(7, 16); c.lineTo(7, 50); c.lineTo(-7, 50); c.lineTo(-7, 16); c.closePath(); c.fill();
  c.fillStyle = '#fbbf24'; c.fillRect(-10, 48, 20, 6); c.fillStyle = '#7c2d12'; c.fillRect(-5, 54, 10, 34);
}
function initKnife() {
  const el = $('#knife');
  el.innerHTML = '<div class="box"><div class="gtop"><span>Points <b id="ksc">0</b></span><b id="kdf"></b><span id="kkn"></span></div><canvas id="kc" width="360" height="560"></canvas><div class="msg" id="kmsg"></div></div>';
  const cv = $('#kc'), c = cv.getContext('2d'), CX = 180, CY = 190, RR = 72;
  let th, st, ap, kl, fl, over, won, score = 0, raf, t0, spd, pat, parts;
  const AD = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  function lvl() {
    const L = lvGet('knife'); kl = Math.min(5 + (L / 2 | 0), 12); st = []; ap = []; th = 0; fl = null; over = 0; won = 0; parts = []; t0 = performance.now();
    const pre = Math.min(L / 2 | 0, 7), na = L % 3 == 0 ? 0 : 1 + L % 2;
    for (let i = 0; i < pre; i++) st.push(i * 6.283 / pre + Math.random() * .2);
    for (let i = 0; i < na; i++) { let a, g = 0; do { a = Math.random() * 6.283; g++; } while (g < 50 && (st.some(s => AD(s, a) < .5) || ap.some(s => AD(s, a) < .5))); ap.push(a); }
    spd = (1.3 + L * .1) * (Math.random() < .5 ? 1 : -1); pat = L > 3 ? 1 + L % 3 : 0;
    $('#kdf').textContent = dif(L); $('#kmsg').textContent = 'Touche pour lancer un couteau';
  }
  const burst = (x, y, n, col, v) => { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * v, vy: (Math.random() - .5) * v - 2, col }); };
  function tick(now) {
    if (!over && !won) th += spd * (1 + (pat ? .8 * Math.sin((now - t0) * .0015 * pat) : 0)) * .016;
    if (fl && !fl.fall) {
      fl.y -= 26;
      if (fl.y <= CY + RR + 2) {
        const rel = Math.PI / 2 - th;
        if (st.some(s => AD(s, rel) < .27)) { fl.fall = 1; fl.r = 0; over = 1; $('#kmsg').textContent = 'Raté ! Touche pour rejouer'; }
        else {
          st.push(rel); score++;
          ap = ap.filter(a => { if (AD(a, rel) < .32) { score += 3; burst(CX + Math.cos(th + a) * (RR + 8), CY + Math.sin(th + a) * (RR + 8), 12, '#ef4444', 8); return false; } return true; });
          fl = null; $('#ksc').textContent = score;
          if (!kl) { won = 1; burst(CX, CY, 50, '#b45309', 16); score += 10; $('#ksc').textContent = score; $('#kmsg').textContent = 'Gagné !'; winXP(); lvUp('knife'); setTimeout(lvl, 1500); }
        }
      }
    } else if (fl && fl.fall) { fl.y += 18; fl.r += .4; }
    c.clearRect(0, 0, 360, 560);
    if (!won) {
      st.forEach(a => { const A = th + a; c.save(); c.translate(CX + Math.cos(A) * (RR - 14), CY + Math.sin(A) * (RR - 14)); c.rotate(A - Math.PI / 2); dk(c); c.restore(); });
      const g = c.createRadialGradient(CX - 20, CY - 20, 10, CX, CY, RR); g.addColorStop(0, '#e0a96d'); g.addColorStop(1, '#8a5a2b');
      c.fillStyle = g; c.beginPath(); c.arc(CX, CY, RR, 0, 7); c.fill(); c.strokeStyle = '#5b3a1a'; c.lineWidth = 4; c.stroke();
      c.strokeStyle = '#a9743a'; c.lineWidth = 2; for (const r of [18, 36, 54]) { c.beginPath(); c.arc(CX, CY, r, 0, 7); c.stroke(); }
      ap.forEach(a => { const A = th + a, x = CX + Math.cos(A) * (RR + 8), y = CY + Math.sin(A) * (RR + 8); c.fillStyle = '#dc2626'; c.beginPath(); c.arc(x, y, 12, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(x - 4, y - 4, 3, 0, 7); c.fill(); c.fillStyle = '#16a34a'; c.beginPath(); c.ellipse(x + 3, y - 12, 6, 3, -.5, 0, 7); c.fill(); });
    }
    parts = parts.filter(p => (p.x += p.vx, p.y += p.vy, p.vy += .5, p.y < 700));
    parts.forEach(p => { c.fillStyle = p.col; c.fillRect(p.x, p.y, 6, 6); });
    if (!won && (kl > 0 || fl)) { c.save(); c.translate(CX, fl ? fl.y : 470); if (fl && fl.fall) c.rotate(fl.r); dk(c); c.restore(); }
    $('#kkn').textContent = 'Couteaux : ' + kl;
  }
  const loop = now => { tick(now); raf = requestAnimationFrame(loop); };
  cv.onpointerdown = () => { if (over) return lvl(); if (won) return; if (!fl && kl > 0) { fl = { y: 470 }; kl--; } };
  lvl(); loop(); stop = () => cancelAnimationFrame(raf);
}

/* ---------- MAHJONG ---------- */
const FACES = [];
for (const k of 'cdb') for (let n = 1; n <= 9; n++) FACES.push({ k, n });
'東南西北'.split('').forEach(t => FACES.push({ k: 'w', t }));
[['中', '#dc2626'], ['發', '#16a34a'], ['白', '#2563eb']].forEach(([t, col]) => FACES.push({ k: 'g', t, col }));
FACES.push({ k: 'f', t: '✿', col: '#db2777' }, { k: 'f', t: '❁', col: '#ea580c' });
const faceHTML = f => f.k == 'c' ? `<span style="color:#111">${'一二三四五六七八九'[f.n - 1]}</span><span style="color:#dc2626">萬</span>`
  : f.k == 'd' ? `<div class="md">${'<i></i>'.repeat(f.n)}</div>`
  : f.k == 'b' ? `<div class="mb">${'<i></i>'.repeat(f.n)}</div>`
  : f.k == 'w' ? `<span style="color:#111">${f.t}</span>`
  : f.k == 'g' && f.t == '白' ? '<span class="mw"></span>'
  : `<span style="color:${f.col}">${f.t}</span>`;
function mjLayout(d) {
  const P = [], add = (x, y, z) => P.push({ x, y, z });
  const row = (y, x0, x1, z) => { for (let x = x0; x <= x1; x += 2) add(x, y, z); };
  if (d >= 1) { row(4, 4, 22, 0); row(6, 2, 24, 0); row(8, 2, 24, 0); row(10, 4, 22, 0); }
  if (d >= 2) { row(0, 2, 24, 0); row(2, 6, 20, 0); row(12, 6, 20, 0); row(14, 2, 24, 0); add(0, 7, 0); add(26, 7, 0); add(28, 7, 0); }
  for (let y = 2; y <= 12; y += 2) row(y, 8, 18, 1);
  for (let y = 4; y <= 10; y += 2) row(y, 10, 16, 2);
  for (const y of [6, 8]) row(y, 12, 14, 3);
  if (d >= 2) add(13, 7, 4);
  return P;
}
function mjFreeIn(P, alive, i) {
  const p = P[i]; let l = 0, r = 0;
  for (const j of alive) {
    if (j == i) continue; const q = P[j];
    if (q.z == p.z + 1 && Math.abs(q.x - p.x) < 2 && Math.abs(q.y - p.y) < 2) return 0;
    if (q.z == p.z && Math.abs(q.y - p.y) < 2) { if (q.x - p.x == -2) l = 1; if (q.x - p.x == 2) r = 1; }
  }
  return !(l && r);
}
// Distribution garantie résolvable : on "retire" des paires libres au hasard
function mjDeal(P) {
  for (let t = 0; t < 80; t++) {
    const slots = []; FACES.forEach((f, i) => slots.push(i, i)); slots.sort(() => Math.random() - .5);
    const alive = new Set(P.map((_, i) => i)), res = [];
    while (alive.size) {
      const fr = [...alive].filter(i => mjFreeIn(P, alive, i));
      if (fr.length < 2) break;
      const a = fr.splice(Math.random() * fr.length | 0, 1)[0], b = fr[Math.random() * fr.length | 0];
      res[a] = res[b] = slots.pop(); alive.delete(a); alive.delete(b);
    }
    if (!alive.size) return res;
  }
  return P.map((_, i) => (i >> 1) % 36);
}
function initMj() {
  const el = $('#mj');
  el.innerHTML = '<div class="box wide"><div class="gtop"><span>Points <b id="msc2">0</b></span><b id="mdf"></b><span class="skin"><button id="mhi">Indice</button><button id="msh">Mélanger</button></span></div><div id="mjb"></div><div class="msg" id="mmsg"></div></div>';
  const bd = $('#mjb'); let P, fc, alive, els, sel = -1, score = 0, busy = 0;
  const free = i => mjFreeIn(P, alive, i);
  const pairs = () => { const m = {}; for (const i of alive) if (free(i)) (m[fc[i]] = m[fc[i]] || []).push(i); for (const k in m) if (m[k].length > 1) return m[k]; return null; };
  const mark = () => els.forEach((e, i) => e.classList.toggle('lk', alive.has(i) && !free(i)));
  function lvl() {
    const L = lvGet('mj'), d = L < 3 ? 0 : L < 8 ? 1 : 2;
    P = mjLayout(d); fc = mjDeal(P); alive = new Set(P.map((_, i) => i)); sel = -1; busy = 0;
    const u = Math.max(8, Math.min(20, Math.floor((innerWidth - 28) / 31)));
    bd.style.cssText = `width:${31 * u}px;height:${22 * u}px`;
    bd.innerHTML = P.map((p, i) => `<div class="mt" data-i="${i}" style="left:${p.x * u - p.z * .4 * u + 4}px;top:${p.y * 1.3 * u - p.z * .4 * u + 4}px;width:${2 * u}px;height:${2.6 * u}px;z-index:${p.z};font-size:${u * 1.05}px">${faceHTML(FACES[fc[i]])}</div>`).join('');
    els = [...bd.children]; mark(); $('#mdf').textContent = dif(L); $('#mmsg').textContent = '';
  }
  function shuffle() {
    const idx = [...alive], nf = mjDeal(idx.map(i => P[i]));
    idx.forEach((i, k) => fc[i] = nf[k]);
    els.forEach((e, i) => { if (alive.has(i)) e.innerHTML = faceHTML(FACES[fc[i]]); e.classList.remove('sl'); }); sel = -1; mark();
  }
  bd.onclick = e => {
    const t = e.target.closest('.mt'); if (!t || busy) return; const i = +t.dataset.i;
    if (!alive.has(i) || !free(i)) return;
    if (sel == i) { els[i].classList.remove('sl'); sel = -1; return; }
    if (sel >= 0 && fc[sel] == fc[i]) {
      [sel, i].forEach(k => { alive.delete(k); els[k].style.display = 'none'; }); sel = -1;
      score += 10; $('#msc2').textContent = score; mark();
      if (!alive.size) { busy = 1; score += 100; $('#msc2').textContent = score; $('#mmsg').textContent = 'Gagné !'; winXP(); lvUp('mj'); setTimeout(lvl, 1600); }
      else if (!pairs()) { toast('Plus de coups : on mélange !'); shuffle(); }
      return;
    }
    if (sel >= 0) els[sel].classList.remove('sl');
    sel = i; els[i].classList.add('sl');
  };
  $('#mhi').onclick = () => { const m = pairs(); if (!m) return; [m[0], m[1]].forEach(k => { els[k].classList.add('hn'); setTimeout(() => els[k].classList.remove('hn'), 1300); }); };
  $('#msh').onclick = () => { if (!busy) shuffle(); };
  lvl();
}

/* ---------- SOLITAIRE ---------- */
function initSolo() {
  const el = $('#solo');
  el.innerHTML = '<div class="box wide"><div class="gtop"><span>Points <b id="osc">0</b></span><span class="skin"><button id="onew">Nouvelle partie</button></span></div><div id="ob" class="ob"></div><div class="msg" id="omsg"></div></div>';
  const ob = $('#ob'), SU = ['♠', '♥', '♦', '♣'], RK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  let S, W, F, T, sel, score, won;
  const red = s => s == 1 || s == 2;
  const pile = p => p == 's' ? S : p == 'w' ? W : p[0] == 'f' ? F[+p[1]] : T[+p[1]];
  const deal = () => {
    const d = []; for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) d.push({ s, r, up: 0 });
    d.sort(() => Math.random() - .5); T = [];
    for (let j = 0; j < 7; j++) { T.push(d.splice(0, j + 1)); T[j][j].up = 1; }
    S = d; W = []; F = [[], [], [], []]; sel = null; score = 0; won = 0; $('#omsg').textContent = '';
  };
  const move = (s, p) => {
    const from = pile(s.p), c = from[s.i], to = pile(p), t = to[to.length - 1];
    if (p[0] == 'f') { if (from.length - 1 != s.i || !(t ? t.s == c.s && c.r == t.r + 1 : c.r == 0)) return 0; to.push(from.pop()); score += 10; }
    else if (p[0] == 't') { if (!(t ? t.up && red(t.s) != red(c.s) && c.r == t.r - 1 : c.r == 12)) return 0; to.push(...from.splice(s.i)); if (s.p == 'w') score += 5; }
    else return 0;
    if (s.p[0] == 't' && from.length && !from[from.length - 1].up) { from[from.length - 1].up = 1; score += 5; }
    return 1;
  };
  const render = () => {
    const cw = (ob.clientWidth - 20 - 36) / 7, ch = cw * 1.4;
    const card = (c, p, i, top) => `<div class="cd${c.up ? (red(c.s) ? ' rd' : '') : ' dn'}${sel && sel.p == p && i >= sel.i ? ' sl' : ''}" data-p="${p}" data-i="${i}" style="top:${top}px;width:${cw}px;height:${ch}px">${c.up ? `<b>${RK[c.r]}${SU[c.s]}</b><u>${SU[c.s]}</u>` : ''}</div>`;
    const pl = (p, h, inner) => `<div class="pl" data-p="${p}" style="height:${h}px">${inner}</div>`;
    let h = pl('s', ch, S.length ? card({ up: 0 }, 's', S.length - 1, 0) : '');
    h += pl('w', ch, W.length ? card(W[W.length - 1], 'w', W.length - 1, 0) : '') + '<div></div>';
    for (let k = 0; k < 4; k++) h += pl('f' + k, ch, F[k].length ? card(F[k][F[k].length - 1], 'f' + k, F[k].length - 1, 0) : '');
    for (let j = 0; j < 7; j++) {
      let top = 0; const inner = T[j].map((c, i) => { const s = card(c, 't' + j, i, top); top += c.up ? ch * .3 : ch * .13; return s; }).join('');
      h += pl('t' + j, Math.max(ch, top + ch * .7), inner);
    }
    ob.innerHTML = h; $('#osc').textContent = score;
    if (!won && F.every(f => f.length == 13)) { won = 1; score += 200; $('#osc').textContent = score; $('#omsg').textContent = 'Gagné !'; winXP(); }
  };
  ob.onclick = e => {
    const t = e.target.closest('[data-p]'); if (!t) return; const p = t.dataset.p, i = t.dataset.i === undefined ? -1 : +t.dataset.i;
    if (p == 's') { if (S.length) { const c = S.pop(); c.up = 1; W.push(c); } else { S = W.reverse(); S.forEach(c => c.up = 0); W = []; } sel = null; return render(); }
    if (sel && p != sel.p && move(sel, p)) { sel = null; return render(); }
    const pl = pile(p), c = pl[i];
    if (c && !c.up && p[0] == 't' && i == pl.length - 1) { c.up = 1; score += 5; sel = null; }
    else if (c && c.up && (p[0] == 't' || i == pl.length - 1)) sel = (sel && sel.p == p && sel.i == i) ? null : { p, i };
    else sel = null;
    render();
  };
  ob.ondblclick = e => {
    const t = e.target.closest('.cd'); if (!t) return; const p = t.dataset.p; if (p == 's' || p[0] == 'f') return;
    const pl = pile(p); if (+t.dataset.i != pl.length - 1) return;
    for (let k = 0; k < 4; k++) if (move({ p, i: pl.length - 1 }, 'f' + k)) { sel = null; render(); return; }
  };
  $('#onew').onclick = () => { deal(); render(); };
  deal(); render();
}

/* ---------- MENU ---------- */
const games = { mines: initMines, tower: initTower, chicken: initChicken, merge: initMerge, words: initWords, blast: initBlast, mj: initMj, water: initWater, knife: initKnife, solo: initSolo };
document.querySelectorAll('.card').forEach(c => c.onclick = () => {
  show('#' + c.dataset.g); games[c.dataset.g]();
});
$('#home').onclick = () => show('#menu');
setBal(bal); xpShow();
show('#menu');
