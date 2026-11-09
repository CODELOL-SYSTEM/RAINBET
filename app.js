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
let bal = 1000, stop = () => {}, gameRunning = false;
try { const sv = localStorage.getItem('mj_bal'); if (sv !== null) bal = Math.max(1, +sv || 1); } catch (e) {}

function setBal(v) {
  bal = Math.max(1, Math.round(v * 100) / 100);
  $('#bal').textContent = fmt(bal);
  try { localStorage.setItem('mj_bal', bal); } catch (e) {}
}
function show(id) {
  if (gameRunning) return false;
  stop(); stop = () => {};
  document.querySelectorAll('.scr').forEach(s => s.classList.add('hidden'));
  $(id).classList.remove('hidden');
  return true;
}

// Panneau commun
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
      gameRunning = v;
      $('#home').disabled = v;
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
  const pal = ['#e9a15b', '#d9776a', '#e8c07d', '#c98b6b', '#cf6f77'];
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

/* ---------- MENU ---------- */
const games = { mines: initMines, tower: initTower, chicken: initChicken };
document.querySelectorAll('.card').forEach(c => c.onclick = () => {
  show('#' + c.dataset.g); games[c.dataset.g]();
});
$('#home').onclick = () => { if (!gameRunning) show('#menu'); };

// Profil : ajout de crédits avec PayPal et demande de retrait
const PAYPAL_ME_URL = ''; // Mets ici ton lien PayPal.Me ou ta page de paiement.
const profileModal = $('#profileModal');
$('#profileOpen').onclick = () => { if (!gameRunning) profileModal.classList.remove('hidden'); };
$('#profileClose').onclick = () => profileModal.classList.add('hidden');
profileModal.addEventListener('click', e => {
  if (e.target === profileModal) profileModal.classList.add('hidden');
});

// Ajouter des crédits avec PayPal
$('#deposit').onclick = () => {
  if (PAYPAL_ME_URL) {
    window.open(PAYPAL_ME_URL, '_blank', 'noopener,noreferrer');
  } else {
    alert('Le lien PayPal doit être configuré par le propriétaire du site.');
  }
};

// Retirer des crédits
const walletModal = $('#walletModal');
const closeWallet = () => {
  walletModal.classList.add('hidden');
  $('#walletMessage').textContent = '';
};
$('#withdraw').onclick = () => {
  if (!gameRunning) {
    profileModal.classList.add('hidden');
    walletModal.classList.remove('hidden');
    $('#walletTitle').textContent = 'Retrait de crédits';
  }
};
$('#walletClose').onclick = closeWallet;
walletModal.addEventListener('click', e => {
  if (e.target === walletModal) closeWallet();
});

$('#withdrawForm').addEventListener('input', e => {
  if (e.target.name === 'credits') {
    const n = Math.max(0, Number(e.target.value) || 0);
    $('#withdrawValue').textContent =
      'Montant estimé : ' + (n / 10000 * 3).toFixed(2).replace('.', ',') + ' €';
  }
});

$('#withdrawForm').onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const credits = Math.floor(Number(f.get('credits')));
  const email = String(f.get('email')).trim();

  if (credits < 10000 || credits % 10000 !== 0) {
    $('#walletMessage').textContent = 'Le retrait doit être un multiple de 10 000 crédits.';
    return;
  }
  if (credits > bal) {
    $('#walletMessage').textContent = 'Tu ne possèdes pas assez de crédits.';
    return;
  }

  const request = {
    nom: String(f.get('surname')).trim(),
    prenom: String(f.get('firstname')).trim(),
    email,
    credits,
    euros: credits / 10000 * 3,
    date: new Date().toISOString(),
    statut: 'En attente de vérification'
  };

  try {
    const requests = JSON.parse(localStorage.getItem('mj_withdrawals') || '[]');
    requests.push(request);
    localStorage.setItem('mj_withdrawals', JSON.stringify(requests));
    $('#walletMessage').textContent =
      'Demande enregistrée sur cet appareil. Elle reste à vérifier manuellement.';
    e.currentTarget.reset();
    $('#withdrawValue').textContent = 'Montant estimé : 3 €';
  } catch (err) {
    $('#walletMessage').textContent = 'Impossible d’enregistrer la demande sur cet appareil.';
  }
};

setBal(bal);
show('#menu');
