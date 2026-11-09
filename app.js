const $ = s => document.querySelector(s);
let bal = 1000, stop = () => {};
try { bal = +localStorage.getItem('mj_bal') || 1000; } catch (e) {}

function setBal(v) {
  bal = Math.round(v * 100) / 100;
  $('#bal').textContent = bal.toFixed(2);
  try { localStorage.setItem('mj_bal', bal); } catch (e) {}
  $('#refill').classList.toggle('hidden', bal >= 1);
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
    <label>Crédits en jeu<input class="stk" type="number" value="10" min="1"></label>${extra}
    <div class="mult">x1.00</div>
    <button class="go">Jouer</button><button class="out" disabled>Encaisser</button></div>
    <div class="msg"></div></div>`;
  const q = s => el.querySelector(s);
  return {
    q,
    msg: t => q('.msg').textContent = t,
    mult: m => q('.mult').textContent = 'x' + m.toFixed(2),
    run: v => {
      el.querySelectorAll('.ctl input,.ctl select').forEach(x => x.disabled = v);
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
function initMines() {
  const g = setup('#mines', '<label>Mines<select class="n">' + [1, 3, 5, 10, 20].map(n => `<option>${n}</option>`).join('') + '</select></label>');
  g.q('.stage').innerHTML = '<div class="grid"></div>';
  let on = false, b, k, s, m;
  const T = [...Array(25)].map((_, i) => {
    const c = document.createElement('button');
    c.className = 'tile'; c.disabled = true; c.onclick = () => pick(i);
    g.q('.grid').append(c); return c;
  });
  const mu = n => { let r = .97; for (let i = 0; i < n; i++) r *= (25 - i) / (25 - m - i); return r; };
  const reveal = () => T.forEach((c, i) => {
    if (!c.classList.contains('ok') && !c.classList.contains('bad')) { c.textContent = b.has(i) ? '💣' : '💎'; c.classList.add('dim'); }
    c.disabled = true;
  });
  const cash = () => {
    on = false; const w = s * mu(k); setBal(bal + w);
    g.msg('Gagné : +' + w.toFixed(2) + ' crédits'); reveal(); g.run(false);
  };
  function pick(i) {
    if (!on) return;
    const c = T[i];
    if (b.has(i)) { on = false; c.textContent = '💥'; c.classList.add('bad'); reveal(); g.msg('Boom ! Perdu'); g.run(false); return; }
    c.textContent = '🪙'; c.classList.add('ok'); c.disabled = true; k++; g.mult(mu(k));
    if (k == 25 - m) cash();
  }
  g.q('.go').onclick = () => {
    s = g.take(); if (!s) return;
    m = +g.q('.n').value; b = new Set(); while (b.size < m) b.add(Math.random() * 25 | 0);
    k = 0; on = true; g.mult(1); g.run(true);
    T.forEach(c => { c.textContent = ''; c.className = 'tile'; c.disabled = false; });
  };
  g.q('.out').onclick = () => { if (on && k > 0) cash(); };
  stop = () => { if (on) { setBal(bal + s); on = false; } };
}

/* ---------- TOWER BUILDER ---------- */
function initTower() {
  const g = setup('#tower', '<button class="drop">⬇ Poser le bloc</button>');
  g.q('.stage').innerHTML = '<div class="tw"><div class="world"></div></div>';
  const W = 300, H = 26, wd = g.q('.world'), tw = g.q('.tw');
  let on = false, n, x0, w0, px, s, cur, raf, t0;
  const mu = k => Math.pow(1.22, k);
  const blk = (x, wi, fl) => {
    const d = document.createElement('div'); d.className = 'bl';
    d.style.cssText = `left:${x}px;width:${wi}px;bottom:${fl * H}px`; wd.append(d); return d;
  };
  const loop = () => {
    px = (W - w0) * (.5 + .5 * Math.sin((performance.now() - t0) * (.003 + n * .0003)));
    cur.style.left = px + 'px'; raf = requestAnimationFrame(loop);
  };
  const spawn = () => { cur = blk(0, w0, n + 1); t0 = performance.now(); loop(); };
  const cash = rm => {
    on = false; cancelAnimationFrame(raf); if (rm) cur.remove();
    const w = s * mu(n); setBal(bal + w); g.msg('Gagné : +' + w.toFixed(2) + ' crédits'); g.run(false);
  };
  const drop = () => {
    if (!on) return;
    cancelAnimationFrame(raf);
    if (Math.abs(px - x0) < 5) px = x0;
    const o = w0 - Math.abs(px - x0);
    if (o < 6) {
      on = false; cur.style.transition = 'transform .7s,opacity .7s';
      cur.style.transform = 'translateY(300px) rotate(25deg)'; cur.style.opacity = 0;
      g.msg('Raté ! La tour s\'effondre'); g.run(false); return;
    }
    const nl = Math.max(px, x0);
    cur.style.left = nl + 'px'; cur.style.width = o + 'px';
    x0 = nl; w0 = o; n++; g.mult(mu(n));
    if (n >= 12) { cash(false); return; }
    wd.style.transform = `translateY(${Math.max(0, n - 8) * H}px)`;
    spawn();
  };
  tw.onclick = drop; g.q('.drop').onclick = drop;
  g.q('.go').onclick = () => {
    s = g.take(); if (!s) return;
    wd.innerHTML = ''; wd.style.transform = '';
    n = 0; x0 = 80; w0 = 140; blk(x0, w0, 0).classList.add('base');
    on = true; g.mult(1); g.run(true); spawn();
  };
  g.q('.out').onclick = () => { if (on && n > 0) cash(true); };
  stop = () => { if (on) { setBal(bal + s); on = false; } cancelAnimationFrame(raf); };
}

/* ---------- CHICKEN ROAD ---------- */
const MH = '<svg class="mh" viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#2f3541"/><circle cx="40" cy="40" r="33" fill="#7b8494"/><circle cx="40" cy="40" r="26" fill="none" stroke="#4b5563" stroke-width="3"/><path d="M40 14V66M14 40H66M22 22L58 58M58 22L22 58" stroke="#5b6472" stroke-width="3"/></svg>';
const CH = '<svg viewBox="0 0 80 90" style="display:block"><path d="M30 68v16M52 68v16M24 86h14M46 86h14" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M18 50Q2 44 6 26Q18 30 24 42z" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><ellipse cx="40" cy="52" rx="26" ry="22" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><ellipse cx="32" cy="56" rx="12" ry="13" fill="#e5e7eb" stroke="#cbd5e1" stroke-width="2"/><circle cx="52" cy="28" r="15" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><circle cx="46" cy="12" r="5" fill="#ef4444"/><circle cx="54" cy="10" r="5" fill="#ef4444"/><circle cx="61" cy="14" r="4" fill="#ef4444"/><path d="M65 25L78 30L65 35z" fill="#f59e0b"/><ellipse cx="63" cy="40" rx="3" ry="5" fill="#ef4444"/><circle cx="57" cy="25" r="2.5" fill="#111"/></svg>';
const FIRE = '<svg class="fire" viewBox="0 0 80 100"><path d="M40 98C10 90 8 60 28 40c0 14 8 16 10 6C44 30 38 16 46 2c14 20 34 36 26 62C68 86 56 96 40 98z" fill="#f97316"/><path d="M40 98C24 92 24 76 36 62c2 8 6 8 8 2 4 8 10 14 6 24-2 6-6 9-10 10z" fill="#fde047"/></svg>';
const CAR = (c, d) => `<svg class="car" viewBox="0 0 40 80" style="animation-duration:${d + 2}s;animation-delay:-${d}s"><rect x="4" y="4" width="32" height="72" rx="10" fill="${c}"/><rect x="9" y="18" width="22" height="14" rx="3" fill="#bfdbfe"/><rect x="9" y="50" width="22" height="9" rx="3" fill="#93c5fd"/><rect x="0" y="12" width="5" height="14" rx="2" fill="#111"/><rect x="35" y="12" width="5" height="14" rx="2" fill="#111"/><rect x="0" y="54" width="5" height="14" rx="2" fill="#111"/><rect x="35" y="54" width="5" height="14" rx="2" fill="#111"/></svg>`;

function initChicken() {
  const g = setup('#chicken', '<label>Difficulté<select class="d"><option value=".08">Facile</option><option value=".15">Moyen</option><option value=".25">Difficile</option><option value=".4">Hardcore</option></select></label><button class="adv" disabled>Avancer</button>');
  g.q('.stage').innerHTML = '<div class="road"></div>';
  const rd = g.q('.road'), adv = g.q('.adv'), N = 15, ch = document.createElement('div');
  const cols = ['#dc2626', '#2563eb', '#eab308', '#16a34a', '#f8fafc'];
  let on = false, k = 0, p = +g.q('.d').value, s, L = [];
  const mu = i => .97 / Math.pow(1 - p, i);
  const place = l => { l.append(ch); ch.classList.remove('hop'); void ch.offsetWidth; ch.classList.add('hop'); };
  const build = () => {
    rd.innerHTML = ''; L = []; ch.className = 'ch'; ch.innerHTML = CH;
    for (let i = 0; i <= N; i++) {
      const d = document.createElement('div'); d.className = 'ln' + (i ? '' : ' st');
      d.innerHTML = (i % 3 == 1 ? CAR(cols[i % 5], Math.random() * 3 + 1) : '') + (i ? MH : '') +
        `<span class="lm">${i ? 'x' + mu(i).toFixed(2) : 'DÉPART'}</span>`;
      rd.append(d); L.push(d);
    }
    L[0].append(ch); rd.scrollLeft = 0;
  };
  const cash = () => {
    on = false; const w = s * mu(k); setBal(bal + w);
    g.msg('Gagné : +' + w.toFixed(2) + ' crédits'); adv.disabled = true; g.run(false);
  };
  g.q('.d').onchange = () => { p = +g.q('.d').value; build(); };
  adv.onclick = () => {
    if (!on) return;
    if (Math.random() < p) {
      on = false; L[k + 1].insertAdjacentHTML('beforeend', FIRE);
      ch.classList.add('dead'); place(L[k + 1]);
      g.msg('Grillée par les flammes ! Perdu'); adv.disabled = true; g.run(false); return;
    }
    k++; L[k].classList.add('done'); place(L[k]);
    g.mult(mu(k)); rd.scrollTo({ left: L[k].offsetLeft - 120, behavior: 'smooth' });
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

/* ---------- MENU ---------- */
const games = { mines: initMines, tower: initTower, chicken: initChicken };
document.querySelectorAll('.card').forEach(c => c.onclick = () => {
  show('#' + c.dataset.g); games[c.dataset.g]();
});
$('#home').onclick = () => show('#menu');
$('#refill').onclick = () => setBal(1000);
setBal(bal);
show('#menu');
