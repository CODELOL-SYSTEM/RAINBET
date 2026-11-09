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
function initChicken() {
  const g = setup('#chicken', '<label>Difficulté<select class="d"><option value=".08">Facile</option><option value=".15">Moyen</option><option value=".25">Difficile</option><option value=".4">Hardcore</option></select></label><button class="adv" disabled>🐔 Avancer</button>');
  g.q('.stage').innerHTML = '<div class="road"></div>';
  const rd = g.q('.road'), adv = g.q('.adv'), N = 15, ch = document.createElement('div');
  let on = false, k = 0, p = +g.q('.d').value, s, L = [];
  const mu = i => .97 / Math.pow(1 - p, i);
  const build = () => {
    rd.innerHTML = ''; L = []; ch.textContent = '🐔';
    for (let i = 0; i <= N; i++) {
      const d = document.createElement('div'); d.className = 'ln';
      d.innerHTML = i ? `<span class="lm">x${mu(i).toFixed(2)}</span><span class="mh">⚫</span>` : '<span class="lm">Départ</span>';
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
      on = false; L[k + 1].querySelector('.mh').textContent = '🚗💥';
      ch.textContent = '🍗'; L[k + 1].append(ch);
      g.msg('Écrasée ! Perdu'); adv.disabled = true; g.run(false); return;
    }
    k++; L[k].classList.add('done'); L[k].querySelector('.mh').textContent = '✅'; L[k].append(ch);
    g.mult(mu(k)); rd.scrollTo({ left: L[k].offsetLeft - 90, behavior: 'smooth' });
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
