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
    lose: () => {
      q('.msg').textContent = 'PERDU !';
      const d = document.createElement('div'); d.className = 'wb l'; d.innerHTML = '<b>PERDU</b><small>La poule s\'est fait renverser</small>';
      q('.stage').append(d); setTimeout(() => d.remove(), 2200);
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
    const bw = 26 + Math.random() * 28 | 0, bh = 80 + Math.random() * 130 | 0;
    h += `<div class="sk" style="left:${x}px;width:${bw}px;height:${bh}px">${Math.random() < .4 ? '<b class="an"></b>' : ''}</div>`;
    x += bw + 2;
  }
  cy.innerHTML = h;
  let on = false, n, x0, w0, px, s, cur, raf, t0;
  const mu = k => Math.pow(1.12, k);
  const pal = ['#334155', '#3b4a63', '#1e3a5f', '#2f4858', '#3f3f5a'];
  const wins = wi => Array.from({ length: Math.max(1, Math.floor(wi / 16)) }, () => `<i${Math.random() < .35 ? ' class="lit"' : ''}></i>`).join('');
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
const CH = '<svg viewBox="0 0 90 100" style="display:block"><defs><radialGradient id="cb" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#f1f5f9"/><stop offset="1" stop-color="#cbd5e1"/></radialGradient><radialGradient id="cm" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#f87171"/><stop offset="1" stop-color="#b91c1c"/></radialGradient></defs><ellipse cx="45" cy="96" rx="28" ry="4" fill="#0006"/><path d="M36 74V90M54 74V90M28 92H44M46 92H62" stroke="#ea580c" stroke-width="4.5" stroke-linecap="round" fill="none"/><path d="M18 52C4 50 0 34 6 22 14 30 22 38 26 48Z" fill="url(#cb)" stroke="#94a3b8" stroke-width="2"/><path d="M14 60C2 58-2 48 2 38 12 42 20 48 24 58Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/><ellipse cx="42" cy="58" rx="30" ry="26" fill="url(#cb)" stroke="#94a3b8" stroke-width="2.5"/><path d="M22 56C22 72 40 80 52 68 46 70 32 66 30 52Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/><path d="M30 62q4 4 8 0M36 68q4 4 8 0" stroke="#94a3b8" stroke-width="1.5" fill="none"/><circle cx="60" cy="30" r="17" fill="url(#cb)" stroke="#94a3b8" stroke-width="2.5"/><g fill="url(#cm)" stroke="#991b1b" stroke-width="1.5"><circle cx="53" cy="13" r="6"/><circle cx="61" cy="10" r="7"/><circle cx="69" cy="14" r="6"/></g><path d="M74 26L88 31L74 37Z" fill="#fb923c" stroke="#c2410c" stroke-width="1.5"/><ellipse cx="72" cy="42" rx="4" ry="6" fill="url(#cm)" stroke="#991b1b" stroke-width="1.5"/><circle cx="65" cy="27" r="4.5" fill="#fff" stroke="#64748b"/><circle cx="66" cy="27" r="2.6" fill="#111"/><circle cx="67" cy="26" r="1" fill="#fff"/><circle cx="56" cy="36" r="3.5" fill="#fca5a5" opacity=".6"/></svg>';
const BAR = '<svg class="bar" viewBox="0 0 110 44"><rect x="14" y="20" width="6" height="22" fill="#6b7280"/><rect x="90" y="20" width="6" height="22" fill="#6b7280"/><rect x="4" y="8" width="102" height="18" rx="3" fill="#fff" stroke="#9ca3af" stroke-width="1.5"/><path d="M10 8l14 18h12L22 8zM38 8l14 18h12L50 8zM66 8l14 18h12L78 8z" fill="#f97316"/><circle class="lamp" cx="55" cy="5" r="5" fill="#f59e0b"/></svg>';
// Vraies voitures vues du dessus (type : s berline, t taxi, p sportive, k camion)
function carSVG(t, c, d, kill) {
  const wh = [[0, 14], [39, 14], [0, 58], [39, 58]].map(([x, y]) => `<rect x="${x}" y="${y}" width="5" height="15" rx="2" fill="#111"/>`).join('');
  const defs = '<defs><linearGradient id="cg"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>';
  const st = kill ? '' : ` style="animation-duration:${d + 2}s;animation-delay:-${d}s"`;
  if (t == 'k') return `<svg class="car k${kill ? ' kill' : ''}" viewBox="0 0 44 130"${st}>${defs}<rect x="6" y="6" width="36" height="122" rx="6" fill="#0006"/><rect x="4" y="3" width="36" height="86" rx="4" fill="#e5e7eb" stroke="#94a3b8" stroke-width="1.5"/><path d="M8 12H36M8 26H36M8 40H36M8 54H36M8 68H36M8 80H36" stroke="#cbd5e1" stroke-width="2"/><rect x="5" y="90" width="34" height="36" rx="9" fill="${c}"/><rect x="5" y="90" width="34" height="36" rx="9" fill="url(#cg)"/><path d="M10 106Q22 100 34 106L33 116Q22 119 11 116Z" fill="#0f172a"/><rect x="8" y="122" width="9" height="4" rx="2" fill="#fef9c3"/><rect x="27" y="122" width="9" height="4" rx="2" fill="#fef9c3"/><rect x="0" y="96" width="5" height="14" rx="2" fill="#111"/><rect x="39" y="96" width="5" height="14" rx="2" fill="#111"/><rect x="0" y="20" width="5" height="16" rx="2" fill="#111"/><rect x="39" y="20" width="5" height="16" rx="2" fill="#111"/><rect x="0" y="52" width="5" height="16" rx="2" fill="#111"/><rect x="39" y="52" width="5" height="16" rx="2" fill="#111"/></svg>`;
  const body = t == 't' ? '#facc15' : c;
  const extra = t == 't' ? '<rect x="15" y="38" width="14" height="7" rx="2" fill="#fff" stroke="#111"/><path d="M3 44H41" stroke="#111" stroke-width="2" stroke-dasharray="3 3"/>' : t == 'p' ? '<rect x="18" y="3" width="8" height="84" fill="#fff" opacity=".85"/>' : '';
  return `<svg class="car${kill ? ' kill' : ''}" viewBox="0 0 44 90"${st}>${defs}<rect x="6" y="6" width="36" height="84" rx="14" fill="#0006"/><rect x="3" y="3" width="38" height="84" rx="${t == 'p' ? 18 : 14}" fill="${body}" stroke="#0005" stroke-width="1.5"/><rect x="3" y="3" width="38" height="84" rx="14" fill="url(#cg)"/>${extra}<path d="M10 56Q22 50 34 56L32 68Q22 72 12 68Z" fill="#0f172a"/><path d="M11 18Q22 14 33 18L31 28Q22 31 13 28Z" fill="#0f172a"/><rect x="11" y="28" width="22" height="28" rx="5" fill="${body}" stroke="#0004"/><rect x="11" y="28" width="22" height="28" rx="5" fill="#fff" opacity=".22"/>${t == 't' ? '<rect x="15" y="38" width="14" height="7" rx="2" fill="#fff" stroke="#111"/>' : ''}<rect x="7" y="80" width="9" height="5" rx="2" fill="#fef9c3"/><rect x="28" y="80" width="9" height="5" rx="2" fill="#fef9c3"/><rect x="7" y="4" width="9" height="4" rx="2" fill="#ef4444"/><rect x="28" y="4" width="9" height="4" rx="2" fill="#ef4444"/>${wh}<rect x="0" y="52" width="5" height="6" rx="2" fill="${body}"/><rect x="39" y="52" width="5" height="6" rx="2" fill="${body}"/></svg>`;
}

function initChicken() {
  const g = setup('#chicken', '<label>Difficulté<select class="d"><option value=".12">Facile</option><option value=".2">Moyen</option><option value=".32">Difficile</option><option value=".5">Hardcore</option></select></label><button class="adv" disabled>Avancer</button>');
  g.q('.stage').innerHTML = '<div class="pg"><b></b></div><div class="road"></div>';
  const rd = g.q('.road'), adv = g.q('.adv'), N = 15, ch = document.createElement('div');
  const cols = ['#dc2626', '#2563eb', '#16a34a', '#7c3aed', '#f8fafc', '#ea580c'], ty = ['s', 't', 'p', 'k', 's', 'p'];
  let on = false, k = 0, p = +g.q('.d').value, s, L = [];
  const mu = i => .9 / Math.pow(1 - p, i);
  const place = l => { l.append(ch); ch.classList.remove('hop'); void ch.offsetWidth; ch.classList.add('hop'); };
  const build = () => {
    rd.innerHTML = ''; L = []; ch.className = 'ch'; ch.innerHTML = CH; g.q('.pg b').style.width = '0%';
    for (let i = 0; i <= N; i++) {
      const d = document.createElement('div'); d.className = 'ln' + (i ? '' : ' st') + (i == N ? ' gl' : '');
      d.innerHTML = (i && i < N ? carSVG(ty[i % 6], cols[i % 6], Math.random() * 3 + 1) : '') + (i == N ? EGG : i ? MH : '') +
        `<span class="lm">${i ? 'x' + fx(mu(i)) : 'DÉPART'}</span>`;
      rd.append(d); L.push(d);
    }
    L[0].append(ch); rd.scrollLeft = 0;
  };
  const cash = () => { on = false; g.win(s * mu(k)); setBal(bal + s * mu(k)); adv.disabled = true; g.run(false); };
  g.q('.d').onchange = () => { p = +g.q('.d').value; build(); };
  adv.onclick = () => {
    if (!on) return; adv.disabled = true;
    const lane = L[k + 1], fail = Math.random() < p;
    lane.querySelectorAll('.car').forEach(x => x.remove());
    place(lane); rd.scrollTo({ left: lane.offsetLeft - 170, behavior: 'smooth' });
    if (fail) {
      on = false; lane.insertAdjacentHTML('beforeend', carSVG(Math.random() < .5 ? 'k' : 's', cols[k % 6], 0, 1));
      setTimeout(() => {
        ch.classList.add('dead');
        for (let i = 0; i < 9; i++) lane.insertAdjacentHTML('beforeend', `<i class="fth" style="--x:${(Math.random() - .5) * 150}px;--y:${-Math.random() * 120}px"></i>`);
        g.lose(); g.run(false);
      }, 340);
      return;
    }
    k++; lane.classList.add('done'); g.q('.pg b').style.width = (k / N * 100) + '%';
    if (k < N) lane.insertAdjacentHTML('beforeend', BAR);
    g.mult(mu(k)); adv.disabled = false; if (k == N) cash();
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
const DC = [['#fff1c9', '#f6c453'], ['#ffd3e2', '#f472b6'], ['#c8f5d9', '#34d399'], ['#cfe8ff', '#60a5fa'], ['#e4dcff', '#a78bfa'], ['#ffd0cc', '#f87171'], ['#ffe0c2', '#fb923c'], ['#b8f2e6', '#2dd4bf'], ['#f8d6ff', '#d946ef'], ['#fff7b0', '#eab308']];
// Squishie = mini dumpling mou avec visage kawaii
function dumpling(c, x, y, r, l, age) {
  const s = 1 + .2 * Math.sin(age * .5) * Math.exp(-age * .09), [a, b] = DC[l];
  c.save(); c.translate(x, y + r * .08); c.scale(2 - s, s);
  c.beginPath(); c.moveTo(-r, r * .4);
  c.bezierCurveTo(-r * 1.05, -r * .55, -r * .55, -r * .98, 0, -r * .9);
  c.bezierCurveTo(r * .55, -r * .98, r * 1.05, -r * .55, r, r * .4);
  c.bezierCurveTo(r * .9, r * .95, -r * .9, r * .95, -r, r * .4); c.closePath();
  const g = c.createRadialGradient(-r * .3, -r * .4, r * .1, 0, 0, r * 1.1); g.addColorStop(0, '#fff'); g.addColorStop(.35, a); g.addColorStop(1, b);
  c.fillStyle = g; c.fill(); c.lineWidth = 2.5; c.strokeStyle = 'rgba(80,40,30,.45)'; c.stroke();
  c.strokeStyle = 'rgba(120,70,50,.45)'; c.lineWidth = 2; c.lineCap = 'round';
  for (let i = 0; i < 7; i++) { const t = Math.PI * (1.12 + i * .12), px = Math.cos(t) * r * .9, py = Math.sin(t) * r * .8 - r * .02; c.beginPath(); c.moveTo(px, py); c.lineTo(px * .82, py * .82 + r * .12); c.stroke(); }
  c.fillStyle = '#3b2a2a'; for (const e of [-1, 1]) { c.beginPath(); c.ellipse(e * r * .3, r * .08, r * .075, r * .1, 0, 0, 7); c.fill(); }
  c.fillStyle = '#fff'; for (const e of [-1, 1]) { c.beginPath(); c.arc(e * r * .3 + r * .025, r * .04, r * .03, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(255,100,130,.5)'; for (const e of [-1, 1]) { c.beginPath(); c.ellipse(e * r * .55, r * .25, r * .12, r * .08, 0, 0, 7); c.fill(); }
  c.beginPath(); c.arc(0, r * .2, r * .1, .1 * Math.PI, .9 * Math.PI); c.strokeStyle = '#3b2a2a'; c.lineWidth = 2; c.stroke();
  c.restore();
}
function drawIt(c, x, y, r, l, sq, age) {
  if (sq) return dumpling(c, x, y, r, l, age);
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
const WCOL = ['#ef4444', '#f97316', '#facc15', '#84cc16', '#16a34a', '#06b6d4', '#2563eb', '#8b5cf6', '#ec4899', '#92400e', '#e5e7eb', '#0f172a'];
const RIM = 'fill="rgba(255,255,255,.35)" stroke="rgba(255,255,255,.85)" stroke-width="2"';
const WSH = {
  tube: { o: 'M10 12V136A25 25 0 0 0 60 136V12Z', yb: 162, lh: 37, g: [17, 22, 120], x: `<rect x="6" y="6" width="58" height="9" rx="4.5" ${RIM}/>` },
  bottle: { o: 'M27 6H43V34C43 48 62 50 62 72V150Q62 164 48 164H22Q8 164 8 150V72C8 50 27 48 27 34Z', yb: 163, lh: 25, g: [16, 76, 140], x: `<rect x="24" y="2" width="22" height="8" rx="3" ${RIM}/>` },
  vase: { o: 'M26 6H44C44 18 40 26 52 38C66 54 66 92 58 120C56 130 56 142 60 152Q60 164 48 164H22Q10 164 10 152C14 142 14 130 12 120C4 92 4 54 18 38C30 26 26 18 26 6Z', yb: 164, lh: 27, g: [15, 60, 120], x: `<rect x="22" y="2" width="26" height="8" rx="4" ${RIM}/>` }
};
function initWater() {
  const el = $('#water');
  el.innerHTML = '<div class="box"><div class="gtop"><span>Points <b id="wsc">0</b></span><b id="wdf"></b><span class="skin"><button data-k="tube" class="on">Tube</button><button data-k="bottle">Bouteille</button><button data-k="vase">Vase</button></span></div><div id="wt" class="wt"></div><div class="ctl"><button id="wun">Annuler</button><button id="wrs">Recommencer</button></div><div class="msg" id="wmsg"></div></div>';
  const wt = $('#wt'); let T, sel = -1, hist = [], init0, score = 0, busy = 0, skin = 'tube';
  const svg = (t, i) => {
    const S = WSH[skin], top = S.yb - t.length * S.lh, wv = 'M-40 0q10-4 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0V9H-40Z';
    const layers = t.map((c, j) => `<rect x="0" y="${S.yb - (j + 1) * S.lh}" width="70" height="${S.lh + .6}" fill="${WCOL[c]}"/>`).join('');
    const col = t.length ? WCOL[t[t.length - 1]] : '#fff';
    const wave = t.length ? `<g transform="translate(0,${top})"><path class="wv" d="${wv}" fill="${col}"/><path class="wv" d="${wv}" fill="#fff" opacity=".25"/></g><rect x="0" y="${top}" width="70" height="${S.yb - top}" fill="url(#sh${i})"/>` : '';
    return `<svg class="tb${i == sel ? ' up' : ''}" data-i="${i}" viewBox="0 0 70 170"><defs><clipPath id="cp${i}"><path d="${S.o}"/></clipPath><linearGradient id="sh${i}"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs><path d="${S.o}" fill="rgba(255,255,255,.1)"/><g clip-path="url(#cp${i})">${layers}${wave}</g><path d="${S.o}" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="2.5"/><path d="M17 ${S.g[1]}V${S.g[2]}" stroke="rgba(255,255,255,.6)" stroke-width="4" stroke-linecap="round"/>${S.x}</svg>`;
  };
  const render = () => { wt.innerHTML = T.map(svg).join(''); };
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
  el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    skin = b.dataset.k; el.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', x == b)); render();
  });
  gen();
}

/* ---------- KNIFE HIT ---------- */
function dk(c) {
  c.save();
  const g = c.createLinearGradient(-8, 0, 8, 0); g.addColorStop(0, '#9ca3af'); g.addColorStop(.4, '#f8fafc'); g.addColorStop(.55, '#d1d5db'); g.addColorStop(1, '#6b7280');
  c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(9, 14, 8, 30); c.lineTo(8, 52); c.lineTo(-8, 52); c.lineTo(-8, 30); c.quadraticCurveTo(-9, 14, 0, 0); c.closePath(); c.fill();
  c.strokeStyle = '#4b5563'; c.lineWidth = 1; c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.moveTo(2, 8); c.lineTo(2, 48); c.stroke();
  c.fillStyle = '#d97706'; c.fillRect(-11, 50, 22, 6);
  c.fillStyle = '#7c2d12'; c.fillRect(-6, 56, 12, 34); c.fillStyle = '#9a3412'; c.fillRect(-6, 56, 4, 34);
  c.fillStyle = '#fbbf24'; for (const y of [64, 76]) { c.beginPath(); c.arc(0, y, 2, 0, 7); c.fill(); }
  c.fillStyle = '#d97706'; c.beginPath(); c.arc(0, 91, 7, 0, 7); c.fill();
  c.restore();
}
const LG = [
  { a: '#e0a96d', b: '#8a5a2b', ring: '#a9743a', bark: '#4a2c14' },
  { a: '#f5f0e6', b: '#cfc6b0', ring: '#d9cfb8', bark: '#f1f5f9', dots: 1 },
  { a: '#8b5e3c', b: '#3b2412', ring: '#5c3a21', bark: '#26160a' },
  { a: '#f3cf8c', b: '#c2924a', ring: '#dcae66', bark: '#7c4a1e' },
  { a: '#d97757', b: '#7c2d12', ring: '#a8452a', bark: '#3f1d0e' },
  { a: '#c9b48a', b: '#6b5a3a', ring: '#8d7a52', bark: '#5b4b30', moss: 1 }
];
function drawLog(c, k, th, CX, CY, RR) {
  const o = LG[k % 6]; c.save(); c.translate(CX, CY); c.rotate(th);
  c.beginPath(); c.arc(0, 0, RR, 0, 7); c.fillStyle = o.bark; c.fill();
  if (o.dots) { c.fillStyle = '#374151'; for (let i = 0; i < 18; i++) { const a = i * .35; c.fillRect(Math.cos(a) * (RR - 3) - 4, Math.sin(a) * (RR - 3) - 1, 8, 2.5); } }
  const g = c.createRadialGradient(-12, -12, 4, 0, 0, RR - 7); g.addColorStop(0, o.a); g.addColorStop(1, o.b);
  c.beginPath(); c.arc(0, 0, RR - 7, 0, 7); c.fillStyle = g; c.fill();
  c.strokeStyle = o.ring; c.lineWidth = 1.6;
  for (let r = 8; r < RR - 8; r += 7 + (k % 3)) { c.beginPath(); c.ellipse(Math.sin(r) * 1.5, Math.cos(r) * 1.5, r, r * .97, 0, 0, 7); c.stroke(); }
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + k; c.beginPath(); c.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); c.lineTo(Math.cos(a + .05) * (RR - 10), Math.sin(a + .05) * (RR - 10)); c.stroke(); }
  c.fillStyle = 'rgba(60,30,10,.55)'; c.beginPath(); c.ellipse(18, -14, 6, 4, .6, 0, 7); c.fill();
  if (o.moss) { c.fillStyle = 'rgba(74,222,128,.55)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(Math.cos(i * 1.7 + 1) * (RR - 4), Math.sin(i * 1.7 + 1) * (RR - 4), 5, 0, 7); c.fill(); } }
  c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.ellipse(-18, -22, 26, 14, -.6, 0, 7); c.fill();
  c.restore();
}
function initKnife() {
  const el = $('#knife');
  el.innerHTML = '<div class="box"><div class="gtop"><span>Points <b id="ksc">0</b></span><b id="kdf"></b><span id="kkn"></span></div><canvas id="kc" width="360" height="560"></canvas><div class="msg" id="kmsg"></div></div>';
  const cv = $('#kc'), c = cv.getContext('2d'), CX = 180, CY = 190, RR = 72;
  let th, st, ap, kl, fl, over, won, score = 0, raf, t0, spd, pat, parts, kind;
  const AD = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  function lvl() {
    const L = lvGet('knife'); kind = L; kl = Math.min(5 + (L / 2 | 0), 12); st = []; ap = []; th = 0; fl = null; over = 0; won = 0; parts = []; t0 = performance.now();
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
      drawLog(c, kind, th, CX, CY, RR);
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

/* ---------- MAHJONG (triple : barre de 9 places) ---------- */
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
function initMj() {
  const el = $('#mj');
  el.innerHTML = '<div class="box wide"><div class="gtop"><span>Points <b id="msc2">0</b></span><b id="mdf"></b><span class="skin"><button id="mun">Retour</button><button id="msh">Mélanger</button></span></div><div id="mjb"></div><div id="mtr" class="mtr"></div><div class="msg" id="mmsg"></div></div>';
  const bd = $('#mjb'), tr = $('#mtr'); let T, alive, els, tray, hist, score = 0, busy, over, ts, undo, shf;
  const blocked = i => { const t = T[i]; return T.some((u, j) => alive.has(j) && u.z > t.z && Math.abs(u.x - t.x) < 1 && Math.abs(u.y - t.y) < 1); };
  const mark = () => els.forEach((e, i) => e.classList.toggle('lk', alive.has(i) && blocked(i)));
  const rTray = () => {
    tr.style.width = 7.6 * ts + 'px';
    tr.innerHTML = Array.from({ length: 9 }, (_, i) => `<div class="ms" style="height:${ts * 1.1}px">${tray[i] !== undefined ? `<div class="mt tt" style="width:${ts * .8}px;height:${ts * 1.0}px;font-size:${ts * .4}px">${faceHTML(FACES[tray[i]])}</div>` : ''}</div>`).join('');
    $('#mun').textContent = 'Retour (' + undo + ')'; $('#msh').textContent = 'Mélanger (' + shf + ')';
  };
  function lvl() {
    const L = lvGet('mj'), n = Math.min(24 + 3 * L, 120), ty = Math.min(6 + (L / 2 | 0), 20), Z = Math.min(2 + (L / 3 | 0), 5);
    ts = Math.max(30, Math.min(48, Math.floor((innerWidth - 40) / 7.6)));
    const W = [.45, .3, .15, .07, .03].slice(0, Z), sw = W.reduce((a, b) => a + b);
    T = [];
    for (let z = 0; z < Z; z++) {
      const off = z % 2 ? .5 : 0, cells = [];
      for (let i = 0; i < 7 - (z % 2); i++) for (let j = 0; j < 8 - (z % 2); j++) cells.push([i + off, j + off]);
      cells.sort(() => Math.random() - .5);
      cells.slice(0, Math.min(cells.length, Math.round(n * W[z] / sw))).forEach(([x, y]) => T.push({ x, y, z }));
    }
    T.length -= T.length % 3;
    const fs = FACES.map((f, i) => i).sort(() => Math.random() - .5).slice(0, ty), list = [];
    for (let i = 0; i < T.length / 3; i++) { const f = fs[i % fs.length]; list.push(f, f, f); }
    list.sort(() => Math.random() - .5); T.forEach((t, i) => t.f = list[i]);
    alive = new Set(T.map((_, i) => i)); tray = []; hist = []; busy = over = 0; undo = 2; shf = 1;
    bd.style.cssText = `position:relative;margin:auto;width:${7.6 * ts}px;height:${8.7 * ts * 1.2}px`;
    bd.innerHTML = T.map((t, i) => `<div class="mt" data-i="${i}" style="left:${t.x * ts * 1.03 + 3}px;top:${t.y * ts * 1.2 + 3}px;width:${ts}px;height:${ts * 1.25}px;z-index:${t.z};font-size:${ts * .5}px">${faceHTML(FACES[t.f])}</div>`).join('');
    els = [...bd.children]; mark(); rTray(); $('#mdf').textContent = dif(L); $('#mmsg').textContent = '';
  }
  const win = () => { busy = 1; score += 100; $('#msc2').textContent = score; $('#mmsg').textContent = 'Gagné !'; winXP(); lvUp('mj'); setTimeout(lvl, 1600); };
  bd.onclick = e => {
    const t = e.target.closest('.mt'); if (!t || busy || over) return; const i = +t.dataset.i;
    if (!alive.has(i) || blocked(i)) return;
    alive.delete(i); els[i].style.display = 'none'; hist.push(i);
    const f = T[i].f; let pos = tray.lastIndexOf(f); pos = pos < 0 ? tray.length : pos + 1; tray.splice(pos, 0, f); rTray(); mark();
    if (tray.filter(x => x == f).length == 3) {
      busy = 1;
      setTimeout(() => { tray = tray.filter(x => x != f); hist = hist.filter(h => T[h].f != f); score += 30; $('#msc2').textContent = score; rTray(); busy = 0; if (!alive.size) win(); }, 350);
    } else if (tray.length >= 9) { over = 1; $('#mmsg').textContent = 'Barre pleine ! Touche ici pour rejouer'; }
  };
  $('#mmsg').onclick = () => { if (over) lvl(); };
  $('#mun').onclick = () => {
    if (busy || over || !undo || !hist.length) return;
    const h = hist.pop(); tray.splice(tray.lastIndexOf(T[h].f), 1); alive.add(h); els[h].style.display = ''; undo--; rTray(); mark();
  };
  $('#msh').onclick = () => {
    if (busy || over || !shf) return; shf--;
    const idx = [...alive], fs = idx.map(i => T[i].f).sort(() => Math.random() - .5);
    idx.forEach((i, k) => { T[i].f = fs[k]; els[i].innerHTML = faceHTML(FACES[fs[k]]); }); rTray();
  };
  lvl();
}

/* ---------- SOLITAIRE (glisser-déposer) ---------- */
function initSolo() {
  const el = $('#solo');
  el.innerHTML = '<div class="box wide"><div class="gtop"><span>Points <b id="osc">0</b></span><span class="skin"><button id="onew">Nouvelle partie</button></span></div><div id="ob" class="ob"></div><div class="msg" id="omsg"></div></div>';
  const ob = $('#ob'), SU = ['♠', '♥', '♦', '♣'], RK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  let S, W, F, T, sel, score, won, cw = 50, ch = 70, drag = null, sup = 0;
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
  const card = (c, p, i, top, ex) => `<div class="cd${c.up ? (red(c.s) ? ' rd' : '') : ' dn'}${ex || ''}" data-p="${p}" data-i="${i}" style="top:${top}px;width:${cw}px;height:${ch}px">${c.up ? `<b>${RK[c.r]}${SU[c.s]}</b><u>${SU[c.s]}</u>` : ''}</div>`;
  const render = () => {
    cw = (ob.clientWidth - 20 - 36) / 7; ch = cw * 1.4;
    const sc = (p, i) => sel && sel.p == p && i >= sel.i ? ' sl' : '';
    const pl = (p, h, inner) => `<div class="pl" data-p="${p}" style="height:${h}px">${inner}</div>`;
    let h = pl('s', ch, S.length ? card({ up: 0 }, 's', S.length - 1, 0) : '');
    h += pl('w', ch, W.length ? card(W[W.length - 1], 'w', W.length - 1, 0, sc('w', W.length - 1)) : '') + '<div></div>';
    for (let k = 0; k < 4; k++) h += pl('f' + k, ch, F[k].length ? card(F[k][F[k].length - 1], 'f' + k, F[k].length - 1, 0, sc('f' + k, F[k].length - 1)) : '');
    for (let j = 0; j < 7; j++) {
      let top = 0; const inner = T[j].map((c, i) => { const s = card(c, 't' + j, i, top, sc('t' + j, i)); top += c.up ? ch * .3 : ch * .13; return s; }).join('');
      h += pl('t' + j, Math.max(ch, top + ch * .7), inner);
    }
    ob.innerHTML = h; $('#osc').textContent = score;
    if (!won && F.every(f => f.length == 13)) { won = 1; score += 200; $('#osc').textContent = score; $('#omsg').textContent = 'Gagné !'; winXP(); }
  };
  const flash = (p, s) => {
    render(); const q = ob.querySelector(`.pl[data-p="${p}"]`); if (q) q.classList.add('bad');
    ob.querySelectorAll(`.cd[data-p="${s.p}"]`).forEach(c => { if (+c.dataset.i >= s.i) c.classList.add('bd'); });
  };
  ob.onclick = e => {
    if (sup) return;
    const t = e.target.closest('[data-p]'); if (!t) return; const p = t.dataset.p, i = t.dataset.i === undefined ? -1 : +t.dataset.i;
    if (p == 's') { if (S.length) { const c = S.pop(); c.up = 1; W.push(c); } else { S = W.reverse(); S.forEach(c => c.up = 0); W = []; } sel = null; return render(); }
    if (sel && p != sel.p) {
      if (move(sel, p)) { sel = null; return render(); }
      if (p[0] == 't' || p[0] == 'f') { const s0 = sel; sel = null; return flash(p, s0); }
    }
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
  ob.onpointerdown = e => {
    const t = e.target.closest('.cd'); if (!t || t.classList.contains('dn')) return;
    const p = t.dataset.p, i = +t.dataset.i; if (p == 's') return;
    const pl = pile(p); if (p[0] != 't' && i != pl.length - 1) return;
    const r = t.getBoundingClientRect(); drag = { p, i, x: e.clientX, y: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, on: 0 };
  };
  const mv = e => {
    if (!drag) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      drag.on = 1; sel = null;
      const g = document.createElement('div'); g.className = 'dgh'; g.style.width = cw + 'px';
      g.innerHTML = pile(drag.p).slice(drag.i).map((c, k) => card(c, 'x', k, k * ch * .3, '')).join(''); document.body.append(g); drag.g = g;
      ob.querySelectorAll(`.cd[data-p="${drag.p}"]`).forEach(c => { if (+c.dataset.i >= drag.i) c.classList.add('hid'); });
    }
    drag.g.style.left = (e.clientX - drag.ox) + 'px'; drag.g.style.top = (e.clientY - drag.oy) + 'px';
  };
  const up = e => {
    if (!drag) return; const d = drag; drag = null; if (!d.on) return;
    d.g.style.display = 'none'; const tp = document.elementFromPoint(e.clientX, e.clientY), tg = tp && tp.closest('#ob [data-p]'); d.g.remove();
    sup = 1; setTimeout(() => sup = 0, 60);
    const p2 = tg && tg.dataset.p;
    if (p2 && p2 != d.p && p2 != 's' && p2 != 'w') { if (move({ p: d.p, i: d.i }, p2)) render(); else flash(p2, { p: d.p, i: d.i }); } else render();
  };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  stop = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
  $('#onew').onclick = () => { deal(); render(); };
  deal(); render();
}

/* ---------- HEXA SORT ---------- */
function initHexa() {
  const el = $('#hexa');
  el.innerHTML = '<div class="box"><div class="gtop"><span>Points <b id="hxs">0</b></span><b id="hxd"></b><span id="hxg"></span></div><svg id="hxv" viewBox="-170 -175 340 395" style="width:100%;border-radius:16px;background:#0003;touch-action:manipulation"></svg><div class="msg" id="hxm">Choisis une pile en bas, puis une case. 10 pareilles = gagné !</div></div>';
  const v = $('#hxv'), S = 34, C = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7', '#f97316'];
  const P = [0, 1, 2, 3, 4, 5].map(i => { const a = Math.PI / 180 * (60 * i - 30); return (S * .94 * Math.cos(a)).toFixed(1) + ',' + (S * .94 * Math.sin(a)).toFixed(1); }).join(' ');
  let cells, tray, sel, score = 0, goal, nc, over, L;
  const run = c => { let n = 0; const s = c.s, t = s[s.length - 1]; for (let i = s.length - 1; i >= 0 && s[i] == t; i--) n++; return n; };
  const nb = a => cells.filter(b => b != a && Math.abs(b.q - a.q) + Math.abs(b.r - a.r) + Math.abs(b.q + b.r - a.q - a.r) == 2);
  const piece = () => { const s = []; for (let k = 1 + Math.random() * 2 | 0; k > 0; k--) { const c = Math.random() * nc | 0; for (let n = 2 + Math.random() * 2 | 0; n > 0; n--) s.push(c); } return s; };
  const tiles = (s, x, y) => s.map((c, k) => `<polygon points="${P}" transform="translate(${x},${y - k * 6})" fill="${C[c]}" stroke="#0007" stroke-width="1.5"/>`).join('');
  const draw = () => {
    v.innerHTML = cells.map((c, i) => { const x = S * 1.732 * (c.q + c.r / 2), y = S * 1.5 * c.r; return `<g data-c="${i}"><polygon points="${P}" transform="translate(${x},${y})" fill="rgba(255,255,255,.12)" stroke="#fff4"/>${tiles(c.s, x, y)}</g>`; }).join('') +
      tray.map((s, i) => s ? `<g data-t="${i}"><polygon points="${P}" transform="translate(${(i - 1) * 100},175)" fill="${i == sel ? '#fff5' : '#0000'}" stroke="${i == sel ? '#fde047' : 'none'}" stroke-width="3"/>${tiles(s, (i - 1) * 100, 175)}</g>` : '').join('');
    $('#hxs').textContent = score; $('#hxg').textContent = 'Objectif : ' + goal;
  };
  const resolve = () => {
    let ch = 1;
    while (ch) {
      ch = 0;
      loop: for (const a of cells) {
        if (!a.s.length) continue; const k = a.s[a.s.length - 1];
        for (const b of nb(a)) {
          if (b.s[b.s.length - 1] !== k) continue;
          const [f, t] = run(a) <= run(b) ? [a, b] : [b, a];
          for (let n = run(f); n > 0; n--) t.s.push(f.s.pop());
          ch = 1; break loop;
        }
      }
      if (ch) continue;
      for (const a of cells) if (a.s.length && run(a) >= 10) { for (let n = 0; n < 10; n++) a.s.pop(); score += 100; goal--; ch = 1; }
    }
  };
  const start = () => {
    L = lvGet('hexa'); nc = Math.min(3 + (L / 3 | 0), 6); goal = 2 + (L / 2 | 0); cells = [];
    for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) cells.push({ q, r, s: [] });
    tray = [piece(), piece(), piece()]; sel = -1; over = 0; $('#hxd').textContent = dif(L); draw();
  };
  v.onclick = e => {
    if (over == 1) { score = 0; return start(); } if (over) return;
    const t = e.target.closest('[data-t],[data-c]'); if (!t) return;
    if (t.dataset.t !== undefined) { sel = +t.dataset.t; return draw(); }
    const c = cells[+t.dataset.c]; if (sel < 0 || c.s.length) return;
    c.s = tray[sel].slice(); tray[sel] = null; sel = -1; if (tray.every(x => !x)) tray = [piece(), piece(), piece()];
    resolve(); draw();
    if (goal <= 0) { over = 2; $('#hxm').textContent = 'Gagné !'; winXP(); lvUp('hexa'); setTimeout(start, 1500); }
    else if (cells.every(x => x.s.length)) { over = 1; $('#hxm').textContent = 'Plateau plein ! Touche pour rejouer'; }
  };
  start();
}

/* ---------- SCREW JAM ---------- */
function initScrew() {
  const el = $('#screw');
  el.innerHTML = '<div class="box"><div class="gtop"><span>Points <b id="swp">0</b></span><b id="swd"></b></div><div id="swb"></div><div id="swt" class="mtr" style="width:300px"></div><div class="msg" id="swm"></div></div>';
  const b = $('#swb'), t = $('#swt'), SC = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7', '#f97316', '#ec4899'];
  let P, buf, score = 0, over, L;
  const blk = (s, p) => P.some(q => q.z > p.z && q.sc.some(x => x.on) && s.x > q.x && s.x < q.x + 120 && s.y > q.y && s.y < q.y + 26);
  const draw = () => {
    b.style.cssText = 'position:relative;width:300px;height:340px;margin:auto;background:#0003;border-radius:14px';
    b.innerHTML = P.filter(p => p.sc.some(x => x.on)).map(p => `<div class="pt" style="left:${p.x}px;top:${p.y}px;z-index:${p.z + 1}">${p.sc.map((s, j) => s.on ? `<i class="sw${blk(s, p) ? ' lk' : ''}" data-p="${p.z}" data-s="${j}" style="left:${s.x - p.x - 10}px;--c:${SC[s.c]}"></i>` : '').join('')}</div>`).join('');
    t.innerHTML = Array.from({ length: 5 }, (_, i) => `<div class="ms" style="height:44px">${buf[i] !== undefined ? `<i class="sw2" style="--c:${SC[buf[i]]}"></i>` : ''}</div>`).join('');
  };
  const lvl = () => {
    L = lvGet('screw'); const np = 3 * (1 + Math.min(L / 2 | 0, 3)), nc = Math.min(3 + (L / 3 | 0), 7), cols = [];
    for (let i = 0; i < np * 2 / 3; i++) cols.push(i % nc, i % nc, i % nc);
    cols.sort(() => Math.random() - .5);
    P = Array.from({ length: np }, (_, z) => { const x = Math.random() * 180 | 0, y = Math.random() * 314 | 0; return { z, x, y, sc: [{ c: cols[z * 2], x: x + 14, y: y + 13, on: 1 }, { c: cols[z * 2 + 1], x: x + 106, y: y + 13, on: 1 }] }; });
    buf = []; over = 0; $('#swd').textContent = dif(L); $('#swm').textContent = ''; draw();
  };
  b.onclick = e => {
    const s = e.target.closest('.sw'); if (!s || over) return;
    const p = P[+s.dataset.p], x = p.sc[+s.dataset.s]; if (!x.on || blk(x, p)) return;
    x.on = 0; const i = buf.lastIndexOf(x.c); buf.splice(i < 0 ? buf.length : i + 1, 0, x.c);
    if (buf.filter(c => c == x.c).length == 3) { buf = buf.filter(c => c != x.c); score += 30; $('#swp').textContent = score; }
    draw();
    if (P.every(p => p.sc.every(s => !s.on)) && !buf.length) { over = 1; $('#swm').textContent = 'Gagné !'; winXP(); lvUp('screw'); setTimeout(lvl, 1500); }
    else if (buf.length >= 5) { over = 2; $('#swm').textContent = 'Barre pleine ! Touche ici pour rejouer'; }
  };
  $('#swm').onclick = () => { if (over == 2) lvl(); };
  lvl();
}

/* ---------- CANDY CRUSH ---------- */
function initCandy() {
  const el = $('#candy');
  el.innerHTML = '<div class="box"><div class="gtop"><span>Score <b id="cys">0</b>/<span id="cyt"></span></span><b id="cyd"></b><span>Coups <b id="cym">0</b></span></div><div id="cyg" class="cg"></div><div class="msg" id="cyx"></div></div>';
  const N = 8, E = ['🍬', '🍭', '🍩', '🍒', '🍋', '🍇'], g = $('#cyg'), msg = t => $('#cyx').textContent = t;
  let B, sel = -1, sc, mv, tg, busy, over, L, nc;
  const draw = (k = new Set()) => { g.innerHTML = B.map((v, i) => `<div class="cn${i == sel ? ' sl' : ''}${k.has(i) ? ' x' : ''}" data-i="${i}">${v < 0 ? '' : E[v]}</div>`).join(''); $('#cys').textContent = sc; $('#cym').textContent = mv; };
  const find = () => {
    const k = new Set();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, v = B[i]; if (v < 0) continue;
      if (x < N - 2 && B[i + 1] == v && B[i + 2] == v) k.add(i).add(i + 1).add(i + 2);
      if (y < N - 2 && B[i + N] == v && B[i + 2 * N] == v) k.add(i).add(i + N).add(i + 2 * N);
    }
    return k;
  };
  const fall = () => { for (let x = 0; x < N; x++) { const col = []; for (let y = N - 1; y >= 0; y--) if (B[y * N + x] >= 0) col.push(B[y * N + x]); for (let y = N - 1; y >= 0; y--) B[y * N + x] = col.length ? col.shift() : Math.random() * nc | 0; } };
  const cas = (m = 1) => {
    const k = find();
    if (!k.size) {
      busy = 0;
      if (sc >= tg) { over = 1; msg('Gagné !'); winXP(); lvUp('candy'); setTimeout(lvl, 1500); }
      else if (mv <= 0) { over = 2; msg('Plus de coups ! Touche pour rejouer'); }
      return;
    }
    sc += k.size * 10 * m; draw(k);
    setTimeout(() => { k.forEach(i => B[i] = -1); fall(); draw(); setTimeout(() => cas(m + 1), 280); }, 260);
  };
  function lvl() {
    L = lvGet('candy'); nc = Math.min(5 + (L / 5 | 0), 6); tg = 600 + L * 300; mv = Math.max(12, 22 - (L / 2 | 0)); sc = 0; sel = -1; busy = 0; over = 0;
    B = Array.from({ length: 64 }, () => Math.random() * nc | 0);
    for (let t = 0; t < 99 && find().size; t++) find().forEach(i => B[i] = Math.random() * nc | 0);
    $('#cyt').textContent = tg; $('#cyd').textContent = dif(L); msg(''); draw();
  }
  g.onclick = e => {
    if (over == 2) return lvl();
    const c = e.target.closest('.cn'); if (!c || busy || over) return; const i = +c.dataset.i;
    if (sel < 0 || sel == i) { sel = sel == i ? -1 : i; return draw(); }
    const d = Math.abs(i % N - sel % N) + Math.abs((i / N | 0) - (sel / N | 0));
    if (d != 1) { sel = i; return draw(); }
    const a = sel; sel = -1; [B[a], B[i]] = [B[i], B[a]];
    if (find().size) { mv--; busy = 1; draw(); setTimeout(cas, 150); } else { [B[a], B[i]] = [B[i], B[a]]; draw(); }
  };
  lvl();
}

/* ---------- SUBWAY SURFERS ---------- */
function initSubway() {
  const el = $('#subway');
  el.innerHTML = '<div class="box"><div class="gtop"><span>Distance <b id="sbd">0</b> m</span><span>🪙 <b id="sbc">0</b></span></div><canvas id="sbv" width="360" height="560"></canvas><div class="msg" id="sbm">Glisse ← → pour changer de voie, ↑ saute, ↓ glisse</div></div>';
  const cv = $('#sbv'), c = cv.getContext('2d'), H0 = 130, H1 = 530;
  let lane, px, jy, vy, roll, obs, v, cnt, dist, coins, over, raf, sx;
  const sc = d => .2 + .8 * d * d, Y = d => H0 + (H1 - H0) * d * d, X = (l, d) => 180 + (l - 1) * 110 * sc(d);
  const reset = () => { lane = 1; px = 1; jy = 0; vy = 0; roll = 0; obs = []; v = .012; cnt = 99; dist = 0; coins = 0; over = 0; sx = null; $('#sbm').textContent = ''; };
  const act = a => {
    if (over) return;
    if (a == 'l') lane = Math.max(0, lane - 1); if (a == 'r') lane = Math.min(2, lane + 1);
    if (a == 'u' && jy == 0) vy = 11; if (a == 'd') { roll = 30; if (jy > 0) vy = -14; }
  };
  const spawn = () => {
    const free = Math.random() * 3 | 0;
    for (let l = 0; l < 3; l++) {
      if (l == free) { if (Math.random() < .7) obs.push({ l, d: 0, t: 'c' }); continue; }
      if (Math.random() < .75) { const q = Math.random(); obs.push({ l, d: 0, t: q < .4 ? 'b' : q < .7 ? 'h' : 't' }); }
    }
  };
  const die = () => { over = 1; $('#sbm').textContent = `Perdu ! +${coins} crédits — touche pour rejouer`; setBal(bal + coins); if (dist >= 300) winXP(); };
  const upd = () => {
    dist += v * 60; cnt++; if (cnt >= .5 / v) { cnt = 0; spawn(); }
    v = Math.min(.03, v + .000004); px += (lane - px) * .25;
    if (jy > 0 || vy > 0) { jy += vy; vy -= .7; if (jy <= 0) { jy = 0; vy = 0; } }
    if (roll > 0) roll--;
    for (const o of obs) o.d += v;
    for (const o of obs) {
      if (o.d < .88 || o.d > .97 || Math.abs(px - o.l) > .6 || o.g) continue;
      if (o.t == 'c') { o.g = 1; coins++; } else if (o.t == 'b' && jy < 30 || o.t == 'h' && !roll || o.t == 't') die();
    }
    obs = obs.filter(o => o.d < 1.05 && !o.g);
  };
  const draw = () => {
    const g = c.createLinearGradient(0, 0, 0, H0); g.addColorStop(0, '#38bdf8'); g.addColorStop(1, '#bae6fd'); c.fillStyle = g; c.fillRect(0, 0, 360, H0);
    c.fillStyle = '#365314'; c.fillRect(0, H0, 360, 430);
    c.fillStyle = '#334155'; c.beginPath(); c.moveTo(180 - 33, H0); c.lineTo(180 + 33, H0); c.lineTo(180 + 175, 560); c.lineTo(180 - 175, 560); c.fill();
    c.strokeStyle = '#fff6'; c.lineWidth = 2;
    for (const o of [-55, 55]) { c.beginPath(); c.moveTo(180 + o * .2, H0); c.lineTo(180 + o * 1.06, 560); c.stroke(); }
    const ph = (dist % 100) / 100;
    for (let i = 0; i < 8; i++) { const d = (i + ph) / 8, s = sc(d); c.fillStyle = 'rgba(255,255,255,.13)'; c.fillRect(X(1, d) - 165 * s, Y(d), 330 * s, 3 * s); }
    [...obs].sort((a, b) => a.d - b.d).forEach(o => {
      const s = sc(o.d), x = X(o.l, o.d), y = Y(o.d);
      if (o.t == 'c') { c.fillStyle = '#facc15'; c.strokeStyle = '#a16207'; c.lineWidth = 2; c.beginPath(); c.arc(x, y - 30 * s, 12 * s, 0, 7); c.fill(); c.stroke(); }
      else if (o.t == 'b') { c.fillStyle = '#ef4444'; c.fillRect(x - 40 * s, y - 38 * s, 80 * s, 38 * s); c.fillStyle = '#fff'; c.fillRect(x - 40 * s, y - 24 * s, 80 * s, 8 * s); }
      else if (o.t == 'h') { c.fillStyle = '#64748b'; c.fillRect(x - 42 * s, y - 95 * s, 8 * s, 95 * s); c.fillRect(x + 34 * s, y - 95 * s, 8 * s, 95 * s); c.fillStyle = '#f59e0b'; c.fillRect(x - 42 * s, y - 95 * s, 84 * s, 26 * s); }
      else { c.fillStyle = '#2563eb'; c.fillRect(x - 42 * s, y - 120 * s, 84 * s, 120 * s); c.fillStyle = '#93c5fd'; c.fillRect(x - 32 * s, y - 100 * s, 64 * s, 34 * s); c.fillStyle = '#facc15'; c.fillRect(x - 36 * s, y - 16 * s, 14 * s, 8 * s); c.fillRect(x + 22 * s, y - 16 * s, 14 * s, 8 * s); }
    });
    const s = sc(.92), x = X(px, .92), gy = Y(.92), y = gy - jy * s, h = roll ? 36 : 70;
    c.fillStyle = '#0004'; c.beginPath(); c.ellipse(x, gy, 20 * s, 6 * s, 0, 0, 7); c.fill();
    c.fillStyle = '#f97316'; c.fillRect(x - 14 * s, y - h * s, 28 * s, (h - 18) * s);
    c.fillStyle = '#1e3a8a'; c.fillRect(x - 12 * s, y - 18 * s, 24 * s, 18 * s);
    c.fillStyle = '#fcd34d'; c.beginPath(); c.arc(x, y - (h + 8) * s, 10 * s, 0, 7); c.fill();
    c.fillStyle = '#ef4444'; c.fillRect(x - 11 * s, y - (h + 17) * s, 22 * s, 7 * s);
    if (over) { c.fillStyle = '#000a'; c.fillRect(0, 0, 360, 560); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '800 36px system-ui'; c.fillText('PERDU', 180, 270); c.font = '700 20px system-ui'; c.fillText(Math.round(dist) + ' m — touche pour rejouer', 180, 305); }
  };
  const loop = () => { if (!over) upd(); draw(); $('#sbd').textContent = dist | 0; $('#sbc').textContent = coins; raf = requestAnimationFrame(loop); };
  cv.onpointerdown = e => { if (over) return reset(); sx = [e.clientX, e.clientY]; };
  cv.onpointerup = e => {
    if (!sx) return; const dx = e.clientX - sx[0], dy = e.clientY - sx[1]; sx = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    Math.abs(dx) > Math.abs(dy) ? act(dx > 0 ? 'r' : 'l') : act(dy < 0 ? 'u' : 'd');
  };
  const kd = e => { const m = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd' }[e.key]; if (m) { e.preventDefault(); act(m); } };
  document.addEventListener('keydown', kd);
  reset(); loop();
  stop = () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); };
}

/* ---------- BUBBLE SHOOTER ---------- */
function initBubble() {
  const el = $('#bubble');
  el.innerHTML = '<div class="box"><div class="gtop"><span>Points <b id="bus">0</b></span><b id="bud"></b></div><canvas id="bcv" width="360" height="560"></canvas><div class="msg" id="bum"></div></div>';
  const cv = $('#bcv'), c = cv.getContext('2d'), R = 18, RH = R * 1.732, ROWS = 14, SX = 180, SY = 515;
  const BC = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7', '#f97316'];
  let B, cur, nxt, mb, ang = -Math.PI / 2, score = 0, over, L, nc, raf;
  const cl = r => r % 2 ? 9 : 10, pos = (r, q) => [R + q * 2 * R + (r % 2 ? R : 0), R + r * RH];
  const nbs = (r, q) => {
    const [x, y] = pos(r, q), o = [];
    for (let a = r - 1; a <= r + 1; a++) for (let b = 0; a >= 0 && a < ROWS && b < cl(a); b++) {
      if (a == r && b == q) continue; const [u, w] = pos(a, b); if (Math.hypot(u - x, w - y) < 2 * R + 3) o.push([a, b]);
    }
    return o;
  };
  const pick = () => { const s = new Set(); B.flat().forEach(v => v >= 0 && s.add(v)); const a = [...s]; return a.length ? a[Math.random() * a.length | 0] : 0; };
  function lvl() {
    L = lvGet('bubble'); nc = Math.min(3 + (L / 3 | 0), 6); B = Array.from({ length: ROWS }, (_, r) => Array(cl(r)).fill(-1));
    const n = Math.min(4 + (L / 2 | 0), 9); for (let r = 0; r < n; r++) for (let q = 0; q < cl(r); q++) B[r][q] = Math.random() * nc | 0;
    cur = pick(); nxt = pick(); mb = null; over = 0; $('#bud').textContent = dif(L); $('#bum').textContent = '';
  }
  const snap = () => {
    let best = null, bd = 1e9;
    for (let r = 0; r < ROWS; r++) for (let q = 0; q < cl(r); q++) { if (B[r][q] >= 0) continue; const [x, y] = pos(r, q), d = Math.hypot(x - mb.x, y - mb.y); if (d < bd) { bd = d; best = [r, q]; } }
    const [r, q] = best, k = mb.c; B[r][q] = k; mb = null; cur = nxt; nxt = pick();
    const seen = new Set([r + ',' + q]), st = [[r, q]];
    while (st.length) { const [a, b] = st.pop(); for (const [u, w] of nbs(a, b)) { const key = u + ',' + w; if (!seen.has(key) && B[u][w] == k) { seen.add(key); st.push([u, w]); } } }
    if (seen.size >= 3) {
      seen.forEach(s => { const [a, b] = s.split(','); B[a][b] = -1; }); score += seen.size * 10;
      const ok = new Set(), s2 = [];
      for (let b = 0; b < cl(0); b++) if (B[0][b] >= 0) { ok.add('0,' + b); s2.push([0, b]); }
      while (s2.length) { const [a, b] = s2.pop(); for (const [u, w] of nbs(a, b)) { const key = u + ',' + w; if (!ok.has(key) && B[u][w] >= 0) { ok.add(key); s2.push([u, w]); } } }
      for (let a = 0; a < ROWS; a++) for (let b = 0; b < cl(a); b++) if (B[a][b] >= 0 && !ok.has(a + ',' + b)) { B[a][b] = -1; score += 20; }
    }
    $('#bus').textContent = score;
    if (!B.flat().some(v => v >= 0)) { over = 1; $('#bum').textContent = 'Gagné !'; winXP(); lvUp('bubble'); setTimeout(lvl, 1500); }
    else if (B[ROWS - 2].some(v => v >= 0)) { over = 2; $('#bum').textContent = 'Débordement ! Touche pour rejouer'; }
  };
  const upd = () => {
    if (!mb) return;
    for (let i = 0; i < 2; i++) {
      mb.x += mb.vx * 6; mb.y += mb.vy * 6;
      if (mb.x < R) { mb.x = R; mb.vx *= -1; } if (mb.x > 360 - R) { mb.x = 360 - R; mb.vx *= -1; }
      let hit = mb.y <= R;
      for (let r = 0; r < ROWS && !hit; r++) for (let q = 0; q < cl(r); q++) if (B[r][q] >= 0) { const [x, y] = pos(r, q); if (Math.hypot(x - mb.x, y - mb.y) < 2 * R - 4) { hit = 1; break; } }
      if (hit) { snap(); return; }
    }
  };
  const ball = (x, y, k) => {
    c.beginPath(); c.arc(x, y, R - 1, 0, 7); c.fillStyle = BC[k]; c.fill();
    const g = c.createRadialGradient(x - 6, y - 6, 1, x, y, R); g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.3)');
    c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5; c.stroke();
  };
  const draw = () => {
    c.fillStyle = '#1e1b4b'; c.fillRect(0, 0, 360, 560);
    c.setLineDash([8, 6]); c.strokeStyle = '#ef4444aa'; c.lineWidth = 2; const ly = pos(ROWS - 2, 0)[1] - R; c.beginPath(); c.moveTo(0, ly); c.lineTo(360, ly); c.stroke();
    c.strokeStyle = '#fff5'; c.beginPath(); c.moveTo(SX, SY); c.lineTo(SX + Math.cos(ang) * 150, SY + Math.sin(ang) * 150); c.stroke(); c.setLineDash([]);
    for (let r = 0; r < ROWS; r++) for (let q = 0; q < cl(r); q++) if (B[r][q] >= 0) { const [x, y] = pos(r, q); ball(x, y, B[r][q]); }
    if (!mb) ball(SX, SY, cur); else ball(mb.x, mb.y, mb.c);
    ball(SX + 90, SY + 22, nxt); c.fillStyle = '#fff'; c.font = '700 12px system-ui'; c.textAlign = 'center'; c.fillText('SUIVANT', SX + 90, SY - 6);
    if (over == 2) { c.fillStyle = '#000a'; c.fillRect(0, 0, 360, 560); c.fillStyle = '#fff'; c.font = '800 34px system-ui'; c.fillText('PERDU', 180, 280); }
  };
  const aim = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * 360 / r.width, y = (e.clientY - r.top) * 560 / r.height; ang = Math.max(-Math.PI + .2, Math.min(-.2, Math.atan2(y - SY, x - SX))); };
  cv.onpointerdown = aim; cv.onpointermove = aim;
  cv.onpointerup = e => { aim(e); if (over == 2) { score = 0; return lvl(); } if (over || mb) return; mb = { x: SX, y: SY, vx: Math.cos(ang), vy: Math.sin(ang), c: cur }; };
  const loop = () => { upd(); draw(); raf = requestAnimationFrame(loop); };
  lvl(); loop(); stop = () => cancelAnimationFrame(raf);
}

/* ---------- MENU ---------- */
const games = { mines: initMines, tower: initTower, chicken: initChicken, merge: initMerge, words: initWords, blast: initBlast, mj: initMj, water: initWater, knife: initKnife, solo: initSolo, hexa: initHexa, screw: initScrew, candy: initCandy, subway: initSubway, bubble: initBubble };
document.querySelectorAll('.card').forEach(c => c.onclick = () => {
  show('#' + c.dataset.g); games[c.dataset.g]();
});
$('#home').onclick = () => show('#menu');
setBal(bal); xpShow();
show('#menu');
