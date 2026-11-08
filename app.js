import * as THREE from
'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

/* =====================================
   NOVA PLAY — MOTEUR PRINCIPAL
===================================== */

const $ = id => document.getElementById(id);

let balance = Number(localStorage.getItem('novaBalance') || 0);
let currentGame = '';
let renderer = null;
let scene = null;
let camera = null;
let clock = null;
let animationFrame = null;

let objects = {};
let state = {};
let raycaster = new THREE.Raycaster();
let pointer = new THREE.Vector2();
let clickable = [];
let miniTimeout = null;

function updateBalance() {
  $('balance').textContent = balance.toFixed(3);
  $('profileBalance').textContent = balance.toFixed(3);
  localStorage.setItem('novaBalance', String(balance));
}

function earn(value) {
  balance += value;
  updateBalance();
}

function message(text) {
  $('message').textContent = text;
}

function control(text, callback, style = '') {
  const button = document.createElement('button');
  button.textContent = text;
  button.className = style;
  button.addEventListener('click', callback);
  $('controls').appendChild(button);
}

/* =====================================
   THREE.JS
===================================== */

function destroyScene() {
  if (animationFrame) cancelAnimationFrame(animationFrame);

  animationFrame = null;

  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }

  renderer = null;
  scene = null;
  camera = null;
  objects = {};
  clickable = [];
}

function createScene(background = 0x14263e) {
  destroyScene();

  const viewport = $('viewport');

  viewport.innerHTML = '';

  scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  scene.fog = new THREE.Fog(background, 20, 55);

  camera = new THREE.PerspectiveCamera(
    48,
    viewport.clientWidth / viewport.clientHeight,
    0.1,
    100
  );

  camera.position.set(0, 8, 15);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  renderer.setSize(
    viewport.clientWidth,
    viewport.clientHeight
  );

  renderer.shadowMap.enabled = true;

  renderer.outputColorSpace = THREE.SRGBColorSpace;

  viewport.appendChild(renderer.domElement);

  scene.add(
    new THREE.HemisphereLight(
      0xd4e9ff,
      0x263247,
      2
    )
  );

  const light = new THREE.DirectionalLight(
    0xffffff,
    2.5
  );

  light.position.set(-7, 12, 8);
  light.castShadow = true;

  scene.add(light);

  clock = new THREE.Clock();

  renderer.domElement.addEventListener(
    'pointerdown',
    handleSceneClick
  );

  animate();
}

function animate() {
  if (!renderer || !scene) return;

  animationFrame = requestAnimationFrame(animate);

  const t = clock.getElapsedTime();

  if (currentGame === 'chicken') {
    objects.cars?.forEach((car, i) => {
      car.position.x = Math.sin(t * 1.1 + i * 1.8) * 4.5;
    });

    if (objects.chicken && state.jumping) {
      objects.chicken.position.y =
        0.55 + Math.abs(Math.sin(t * 9)) * 0.35;
    }
  }

  if (currentGame === 'crane' && state.moving) {
    const x = Math.sin(t * 1.1) * 3.8;

    if (objects.hook) {
      objects.hook.position.x = x;
    }

    if (objects.house) {
      objects.house.position.x = x;
    }

    if (objects.cable) {
      objects.cable.position.x = x;
    }
  }

  if (currentGame === 'rain') {
    objects.tiles?.forEach((tile, i) => {
      if (!tile.userData.revealed) {
        tile.position.y =
          0.12 + Math.sin(t * 2 + i * 0.2) * 0.025;
      }
    });
  }

  renderer.render(scene, camera);
}

function material(color, metalness = 0, roughness = 0.65) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness
  });
}

function makeBox(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material(color)
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  scene.add(mesh);

  return mesh;
}

function makeSphere(radius, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 18),
    material(color)
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;

  scene.add(mesh);

  return mesh;
}

function makeCylinder(radius, height, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      radius,
      radius,
      height,
      20
    ),
    material(color, 0.2)
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;

  scene.add(mesh);

  return mesh;
}

function handleSceneClick(event) {
  if (!renderer || !camera) return;
  if (currentGame !== 'rain') return;

  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(clickable, false);

  if (!hits.length) return;

  revealTile(hits[0].object);
}

/* =====================================
   NAVIGATION
===================================== */

function openGame(name) {
  currentGame = name;

  $('home').classList.add('hidden');
  $('mini').classList.add('hidden');
  $('game').classList.remove('hidden');

  $('controls').innerHTML = '';
  $('message').textContent = '';
  $('rainGrid').classList.add('hidden');
  $('rainGrid').innerHTML = '';

  if (name === 'chicken') setupChicken();
  if (name === 'rain') setupRain();
  if (name === 'crane') setupCrane();
}

function backHome() {
  destroyScene();

  currentGame = '';

  $('game').classList.add('hidden');
  $('mini').classList.add('hidden');
  $('home').classList.remove('hidden');
}

document.querySelectorAll('[data-game]').forEach(card => {
  card.addEventListener('click', () => {
    openGame(card.dataset.game);
  });
});

$('backBtn').addEventListener('click', backHome);

/* =====================================
   CHICKEN ROAD
===================================== */

function makeChicken() {
  const chicken = new THREE.Group();

  const body = makeSphere(
    0.45, 0xffc83f, 0, 0, 0
  );

  body.scale.set(0.85, 1.15, 0.8);
  chicken.add(body);

  const head = makeSphere(
    0.29, 0xffdb60, 0, 0.47, 0.05
  );

  chicken.add(head);

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 12, 12),
    material(0x111827)
  );

  eye.position.set(-0.12, 0.55, 0.28);
  chicken.add(eye);

  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.27, 5),
    material(0xff793e)
  );

  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.45, 0.32);

  chicken.add(beak);

  const crest = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 12),
    material(0xe94f5c)
  );

  crest.position.set(0, 0.79, 0);
  chicken.add(crest);

  scene.add(chicken);

  return chicken;
}

function makeCar(color) {
  const car = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.5, 0.8),
    material(color)
  );

  body.position.y = 0.15;
  car.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.4, 0.68),
    material(0x9bcfea)
  );

  roof.position.y = 0.55;
  car.add(roof);

  for (const x of [-0.48, 0.48]) {
    for (const z of [-0.39, 0.39]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16),
        material(0x161b26)
      );

      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, -0.12, z);

      car.add(wheel);
    }
  }

  scene.add(car);

  return car;
}

function setupChicken() {
  $('gameTitle').textContent = 'CHICKEN ROAD';

  $('description').textContent =
    'Traverse la route. Appuie sur avancer pour passer les voies.';

  $('score').textContent = 'ÉTAPES : 0 / 6';

  createScene(0x9cc9df);

  camera.position.set(0, 8, 15);
  camera.lookAt(0, 0, 0);

  makeBox(16, 0.3, 18, 0x3d7950, 0, -0.35, 0);
  makeBox(13, 0.12, 6, 0x303844, 0, -0.1, -1);

  for (let x = -5; x <= 5; x += 2) {
    makeBox(0.08, 0.03, 0.55, 0xffffff, x, -0.02, -1);
  }

  const cars = [];

  const colors = [
    0xf05262,
    0x319ce5,
    0xf4bd4f,
    0x9b80ec
  ];

  for (let i = 0; i < 4; i++) {
    const car = makeCar(colors[i]);

    car.position.set(
      -4 + i * 2.6,
      0.25,
      -1.5 + (i % 2) * 1.5
    );

    cars.push(car);
  }

  const chicken = makeChicken();

  chicken.position.set(0, 0.5, 5);

  objects = { chicken, cars };

  state = {
    step: 0,
    alive: true,
    jumping: false
  };

  control('AVANCER', moveChicken, 'green');
  control('ENCAISSER', collectChicken, 'purple');
  control('RECOMMENCER', setupChicken, 'dark');

  message('Prêt. Avance pour commencer.');
}

function moveChicken() {
  if (!state.alive) {
    message('Partie terminée. Recommence.');
    return;
  }

  if (state.step >= 6) {
    message('Tu as traversé la route ! Encaisse ton score.');
    return;
  }

  state.step++;

  const chicken = objects.chicken;

  chicken.position.z -= 1.2;

  state.jumping = true;

  setTimeout(() => {
    state.jumping = false;
  }, 450);

  const collision = objects.cars.some(car => {
    return (
      Math.abs(car.position.z - chicken.position.z) < 0.8 &&
      Math.abs(car.position.x - chicken.position.x) < 1
    );
  });

  $('score').textContent = `ÉTAPES : ${state.step} / 6`;

  if (collision) {
    state.alive = false;
    message('Collision ! Tu as perdu cette manche.');
    return;
  }

  message('Bien joué. Continue ou encaisse.');
}

function collectChicken() {
  if (!state.alive || state.step === 0) {
    message('Aucun score à encaisser.');
    return;
  }

  const prize = state.step * 0.001;

  earn(prize);

  state.alive = false;

  message(`Score encaissé : ${prize.toFixed(3)} crédit virtuel.`);
}

/* =====================================
   RAIN 50
===================================== */

function setupRain() {
  $('gameTitle').textContent = 'RAIN 50';

  $('description').textContent =
    'Clique directement sur les cases du plateau 3D.';

  $('score').textContent = 'BONUS : 0';

  createScene(0x10213b);

  camera.position.set(0, 9, 10);
  camera.lookAt(0, 0, 0);

  makeBox(12, 0.3, 8, 0x1b3049, 0, -0.25, 0);

  const traps = new Set();

  while (traps.size < 10) {
    traps.add(Math.floor(Math.random() * 50));
  }

  const tiles = [];

  for (let i = 0; i < 50; i++) {
    const column = i % 10;
    const row = Math.floor(i / 10);

    const x = (column - 4.5) * 0.92;
    const z = (row - 2) * 0.92;

    const tile = makeBox(
      0.82, 0.24, 0.82,
      0x3475a2,
      x, 0.05, z
    );

    tile.userData = {
      index: i,
      trap: traps.has(i),
      revealed: false
    };

    tiles.push(tile);
    clickable.push(tile);
  }

  objects = { tiles };

  state = {
    traps,
    revealed: 0,
    ended: false
  };

  control('ENCAISSER', cashRain, 'purple');
  control('NOUVELLE PARTIE', setupRain, 'dark');

  message('Dix pièges sont cachés. Trouve les cases sûres.');
}

function revealTile(tile) {
  if (state.ended || tile.userData.revealed) return;

  tile.userData.revealed = true;

  if (tile.userData.trap) {
    tile.material.color.set(0xe74464);
    tile.scale.y = 2;

    state.ended = true;

    objects.tiles.forEach(t => {
      if (t.userData.trap) {
        t.material.color.set(0xe74464);
      }
    });

    message('Piège découvert. Manche terminée.');
    return;
  }

  tile.material.color.set(0x20b77b);
  tile.scale.y = 1.7;

  state.revealed++;

  $('score').textContent = `BONUS : ${state.revealed}`;

  message('Case sûre. Continue ou encaisse.');
}

function cashRain() {
  if (state.ended || state.revealed === 0) {
    message('Aucun bonus à encaisser.');
    return;
  }

  const prize = state.revealed * 0.001;

  earn(prize);

  state.ended = true;

  message(`Tu encaisses ${prize.toFixed(3)} crédit virtuel.`);
}

/* =====================================
   CRANE HOUSE
===================================== */

function createHouse(color) {
  const house = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.9, 1.25),
    material(color)
  );

  body.castShadow = true;
  house.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.05, 0.75, 4),
    material(0xe8b85f)
  );

  roof.position.y = 0.8;
  roof.rotation.y = Math.PI / 4;

  house.add(roof);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.5, 0.05),
    material(0x392a42)
  );

  door.position.set(0, -0.2, 0.64);

  house.add(door);

  scene.add(house);

  return house;
}

function setupCrane() {
  $('gameTitle').textContent = 'CRANE HOUSE';

  $('description').textContent =
    'Le crochet se déplace automatiquement. Clique sur lâcher pour poser la maison.';

  $('score').textContent = 'MAISONS : 0';

  createScene(0x9cc9df);

  camera.position.set(8, 8, 13);
  camera.lookAt(0, 1, 0);

  makeBox(14, 0.5, 10, 0x344b5d, 0, -0.45, 0);

  makeBox(1.2, 2, 1.2, 0xe9a52f, -4, 1, 0);
  makeBox(1.8, 0.3, 1.8, 0xf3c75a, -4, 2.1, 0);

  makeBox(9, 0.3, 0.4, 0xe9a52f, 0, 4, 0);
  makeBox(0.25, 2.2, 0.3, 0xe9a52f, 3.8, 3, 0);

  const cable = makeCylinder(
    0.035, 1.5, 0xdce7f4,
    0, 3.05, 0
  );

  const hook = new THREE.Group();

  const hookRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.07, 10, 20, Math.PI * 1.5),
    material(0xdce7f4, 0.7)
  );

  hookRing.rotation.z = Math.PI;

  hook.add(hookRing);

  hook.position.set(0, 2.2, 0);

  scene.add(hook);

  const house = createHouse(0xf16c87);

  house.position.set(0, 1.25, 0);

  objects = {
    hook,
    cable,
    house
  };

  state = {
    moving: true,
    stack: 0
  };

  control('LÂCHER LA MAISON', dropHouse, 'green');
  control('RECOMMENCER', setupCrane, 'dark');

  message('Observe le crochet et lâche la maison au bon moment.');
}

function dropHouse() {
  if (!state.moving) return;

  state.moving = false;

  const x = objects.hook.position.x;
  const house = objects.house;

  if (Math.abs(x) < 0.85) {
    const y = 0.55 + state.stack * 0.95;

    house.position.set(x, y, 0);

    state.stack++;

    earn(0.001);

    $('score').textContent = `MAISONS : ${state.stack}`;

    message('Maison correctement empilée. +0.001 crédit virtuel.');
  } else {
    house.position.set(x, 0.55, 0);

    message('La maison est tombée à côté de la tour.');
  }

  const colors = [
    0x54b9ef,
    0x65d69b,
    0xb28af0,
    0xf1bd55,
    0xe87992
  ];

  const next = createHouse(
    colors[state.stack % colors.length]
  );

  next.position.set(0, 1.25, 0);

  objects.house = next;

  state.moving = true;
}

/* =====================================
   MINI-JEUX
===================================== */

function openMini(title, description) {
  $('home').classList.add('hidden');
  $('game').classList.add('hidden');
  $('mini').classList.remove('hidden');

  $('miniTitle').textContent = title;
  $('miniDescription').textContent = description;
  $('miniContent').innerHTML = '';
  $('miniMessage').textContent = '';
}

function startReaction() {
  openMini(
    'REFLEX TEST',
    'Attends que le bouton passe au vert, puis clique.'
  );

  const button = document.createElement('button');

  button.textContent = 'ATTENDS...';
  button.className = 'red';

  $('miniContent').appendChild(button);

  let ready = false;
  let finished = false;
  let start = 0;

  button.onclick = () => {
    if (finished) return;

    if (!ready) {
      $('miniMessage').textContent = 'Trop tôt !';
      return;
    }

    finished = true;

    const time = Date.now() - start;

    if (time < 900) {
      earn(0.001);
      $('miniMessage').textContent =
        `${time} ms. Bravo, +0.001 crédit virtuel.`;
    } else {
      $('miniMessage').textContent =
        `${time} ms. Essaie de faire mieux.`;
    }

    button.disabled = true;
  };

  miniTimeout = setTimeout(() => {
    ready = true;
    start = Date.now();

    button.textContent = 'CLIQUE MAINTENANT';
    button.className = 'green';
  }, 1800 + Math.random() * 3000);
}

function startMemory() {
  openMini(
    'MEMORY GRID',
    'Observe les couleurs puis reproduis la séquence.'
  );

  const colors = [
    '#ed526c',
    '#3fa9f5',
    '#42d99b',
    '#f2c14e'
  ];

  const sequence = Array.from(
    { length: 4 },
    () => Math.floor(Math.random() * 4)
  );

  const display = document.createElement('div');

  display.style.cssText =
    'display:flex;gap:9px;margin:20px 0';

  sequence.forEach(index => {
    const block = document.createElement('div');

    block.style.cssText =
      `width:45px;height:45px;border-radius:8px;background:${colors[index]}`;

    display.appendChild(block);
  });

  $('miniContent').appendChild(display);

  const controls = document.createElement('div');

  controls.className = 'controls';

  $('miniContent').appendChild(controls);

  let answers = [];

  miniTimeout = setTimeout(() => {
    display.innerHTML = '';

    $('miniMessage').textContent =
      'À toi de reproduire la séquence.';
  }, 2000);

  colors.forEach((color, index) => {
    const button = document.createElement('button');

    button.style.background = color;
    button.style.width = '55px';
    button.style.height = '55px';

    button.onclick = () => {
      answers.push(index);

      if (answers.length === sequence.length) {
        const correct = answers.every(
          (value, i) => value === sequence[i]
        );

        if (correct) {
          earn(0.001);

          $('miniMessage').textContent =
            'Réussi ! +0.001 crédit virtuel.';
        } else {
          $('miniMessage').textContent =
            'Séquence incorrecte.';
        }

        controls.querySelectorAll('button').forEach(
          button => button.disabled = true
        );
      }
    };

    controls.appendChild(button);
  });
}

function startSafeTiles() {
  openMini(
    'SAFE TILES',
    'Trouve une case sûre parmi neuf cases.'
  );

  const mine = Math.floor(Math.random() * 9);

  const grid = document.createElement('div');

  grid.style.cssText =
    'display:grid;grid-template-columns:repeat(3,75px);gap:8px';

  $('miniContent').appendChild(grid);

  let ended = false;

  for (let i = 0; i < 9; i++) {
    const button = document.createElement('button');

    button.textContent = '?';
    button.className = 'dark';
    button.style.height = '65px';

    button.onclick = () => {
      if (ended) return;

      ended = true;

      if (i === mine) {
        button.textContent = 'MINE';
        button.className = 'red';

        $('miniMessage').textContent =
          'Mine découverte. Partie terminée.';
      } else {
        button.textContent = 'SAFE';
        button.className = 'green';

        earn(0.001);

        $('miniMessage').textContent =
          'Case sûre. +0.001 crédit virtuel.';
      }

      grid.querySelectorAll('button').forEach(
        button => button.disabled = true
      );
    };

    grid.appendChild(button);
  }
}

$('reactionBtn').addEventListener('click', startReaction);
$('memoryBtn').addEventListener('click', startMemory);
$('safeBtn').addEventListener('click', startSafeTiles);

$('closeMini').addEventListener('click', () => {
  clearTimeout(miniTimeout);

  $('mini').classList.add('hidden');
  $('home').classList.remove('hidden');
});

/* =====================================
   PAYPAL
===================================== */

$('paypalBtn').addEventListener('click', () => {
  const amount = Number($('paypalAmount').value);

  if (!Number.isFinite(amount) || amount < 1 || amount > 500) {
    alert('Entre un montant entre 1 et 500 euros.');
    return;
  }

  const url =
    'https://www.paypal.com/paypalme/SH0PNOVA/' +
    encodeURIComponent(amount.toFixed(2) + 'EUR');

  window.open(url, '_blank', 'noopener');
});

/* =====================================
   RESPONSIVE
===================================== */

window.addEventListener('resize', () => {
  if (!renderer || !camera) return;

  const viewport = $('viewport');

  camera.aspect =
    viewport.clientWidth / viewport.clientHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    viewport.clientWidth,
    viewport.clientHeight
  );
});

/* DÉMARRAGE */
updateBalance();
