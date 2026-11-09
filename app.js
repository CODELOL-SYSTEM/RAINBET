import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, addDoc, query, where, orderBy, onSnapshot,
  getDocs, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

/* FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyDecLiaNoWpJSqfIV7DCPNdD8Y0iPoPT6A",
  authDomain: "pexi-play.firebaseapp.com",
  projectId: "pexi-play",
  storageBucket: "pexi-play.firebasestorage.app",
  messagingSenderId: "175370623468",
  appId: "1:175370623468:web:82b66d44cac69b6502c8c9",
  measurementId: "G-JFNB7XSXPL"
};

const ADMIN_EMAIL = "pc2alex.les@gmail.com";
const STARTING_CREDITS = 1000;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let user = null;
let profile = null;
let activeGame = null;
let game = {};
let stopNotifications = null;
let stopRequests = null;
let stopUserNotifications = null;

const $ = s => document.querySelector(s);
const money = n => (Number(n) || 0).toLocaleString("fr-FR");
const euros = n => (Number(n) || 0).toLocaleString("fr-FR", {
  minimumFractionDigits: 2, maximumFractionDigits: 2
}) + " €";

function showMessage(id, message) {
  const el = $(id);
  if (el) el.textContent = message;
}

function page(name) {
  ["auth","home","game-area","profile","withdraw-section","admin"].forEach(id => {
    $("#" + id).classList.toggle("hidden", id !== name);
  });
}

function renderBalance() {
  $("#balance").textContent = money(profile?.credits || 0);
  $("#profile-balance").textContent = money(profile?.credits || 0);
}

function userRef(uid = user.uid) {
  return doc(db, "users", uid);
}

async function loadProfile(firebaseUser) {
  const ref = userRef(firebaseUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    profile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      displayName: firebaseUser.displayName || "",
      credits: STARTING_CREDITS
    };
    await setDoc(ref, { ...profile, createdAt: serverTimestamp() });
  } else {
    profile = snap.data();
  }

  profile.credits = Number(profile.credits || 0);
  renderBalance();
  $("#player-email").textContent = firebaseUser.email || "";
}

function showNotification(title, description) {
  const area = $("#notifications");
  const card = document.createElement("div");
  card.className = "notice";

  const logo = document.createElement("div");
  logo.className = "notice-logo";
  logo.textContent = "P";

  const content = document.createElement("div");
  const heading = document.createElement("strong");
  heading.textContent = title;
  const text = document.createElement("p");
  text.textContent = description;

  content.append(heading, text);
  card.append(logo, content);
  area.prepend(card);

  setTimeout(() => card.remove(), 9000);
}

function listenToNotifications() {
  if (stopUserNotifications) stopUserNotifications();

  const q = query(
    collection(db, "notifications"),
    where("uid", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  stopUserNotifications = onSnapshot(q, snapshot => {
    const list = $("#my-notifications");
    list.replaceChildren();

    if (snapshot.empty) {
      list.textContent = "Aucune notification pour le moment.";
      return;
    }

    snapshot.forEach(item => {
      const data = item.data();
      const div = document.createElement("div");
      div.className = "request";

      const title = document.createElement("b");
      title.textContent = data.title || "PEXI PLAY";

      const desc = document.createElement("p");
      desc.textContent = data.description || "";

      div.append(title, desc);
      list.append(div);

      if (!data.seen) {
        showNotification(data.title || "PEXI PLAY", data.description || "");
        updateDoc(item.ref, { seen: true }).catch(console.error);
      }
    });
  }, error => console.error("Notifications:", error));
}

function login() {
  signInWithPopup(auth, provider).catch(error => {
    showMessage("#auth-message", "Connexion impossible : " + error.message);
  });
}

async function logout() {
  if (stopRequests) stopRequests();
  if (stopUserNotifications) stopUserNotifications();
  if (stopNotifications) stopNotifications();
  await signOut(auth);
}

$("#google-login").addEventListener("click", login);
$("#logout").addEventListener("click", logout);

onAuthStateChanged(auth, async firebaseUser => {
  user = firebaseUser;

  if (!user) {
    profile = null;
    page("auth");
    return;
  }

  try {
    await loadProfile(user);
    listenToNotifications();

    if (user.email?.toLowerCase() === ADMIN_EMAIL) {
      page("admin");
      listenToAdminRequests();
    } else {
      page("home");
    }
  } catch (error) {
    console.error(error);
    showMessage("#auth-message", "Erreur Firebase : " + error.message);
    page("auth");
  }
});

/* NAVIGATION */
$("#profile-btn").addEventListener("click", () => page("profile"));
$("#profile-back").addEventListener("click", () => page("home"));
$("#withdraw-open").addEventListener("click", () => page("withdraw-section"));
$("#withdraw-back").addEventListener("click", () => page("profile"));
$("#admin-back").addEventListener("click", () => page("home"));

/* RETRAIT JOUEUR */
$("#withdraw-form").addEventListener("input", () => {
  const credits = Number($("#withdraw-form").elements.credits.value || 0);
  $("#withdraw-value").textContent = euros(credits * 0.0003);
});

$("#withdraw-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!user || !profile) return;

  const form = event.currentTarget;
  const surname = form.elements.surname.value.trim();
  const firstname = form.elements.firstname.value.trim();
  const email = form.elements.email.value.trim();
  const credits = Math.floor(Number(form.elements.credits.value));

  if (!surname || !firstname || !email || !Number.isFinite(credits)) {
    showMessage("#withdraw-message", "Vérifie les informations saisies.");
    return;
  }

  if (credits < 10000 || credits % 1000 !== 0) {
    showMessage("#withdraw-message", "Le minimum est de 10 000 crédits.");
    return;
  }

  if (credits > profile.credits) {
    showMessage("#withdraw-message", "Tu n'as pas assez de crédits.");
    return;
  }

  const amount = credits * 0.0003;

  try {
    await runTransaction(db, async transaction => {
      const ref = userRef();
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error("Compte introuvable.");

      const currentCredits = Number(snap.data().credits || 0);
      if (currentCredits < credits) throw new Error("Solde insuffisant.");

      transaction.update(ref, { credits: currentCredits - credits });

      const requestRef = doc(collection(db, "withdrawals"));
      transaction.set(requestRef, {
        uid: user.uid,
        playerEmail: user.email || "",
        surname,
        firstname,
        paypalEmail: email,
        credits,
        amount,
        status: "pending",
        createdAt: serverTimestamp()
      });
    });

    profile.credits -= credits;
    renderBalance();
    form.reset();
    $("#withdraw-value").textContent = "3,00 €";
    showMessage("#withdraw-message", "Demande envoyée ! Tu seras averti quand elle sera payée.");
  } catch (error) {
    console.error(error);
    showMessage("#withdraw-message", "Erreur : " + error.message);
  }
});

/* TABLEAU ADMIN */
function listenToAdminRequests() {
  if (stopRequests) stopRequests();

  const q = query(
    collection(db, "withdrawals"),
    where("status", "==", "pending"),
    orderBy("createdAt", "asc")
  );

  stopRequests = onSnapshot(q, snapshot => {
    const area = $("#admin-requests");
    area.replaceChildren();

    if (snapshot.empty) {
      area.textContent = "Aucune demande en attente.";
      return;
    }

    snapshot.forEach(item => {
      const data = item.data();
      const card = document.createElement("div");
      card.className = "request";

      const heading = document.createElement("h3");
      heading.textContent = `${data.firstname || ""} ${data.surname || ""}`;

      const details = document.createElement("p");
      details.textContent =
        `Compte : ${data.playerEmail || "inconnu"} | PayPal : ${data.paypalEmail || "inconnu"}`;

      const amount = document.createElement("p");
      amount.textContent =
        `${money(data.credits)} crédits — ${euros(data.amount)}`;

      const button = document.createElement("button");
      button.className = "primary";
      button.textContent = "Marquer comme payé";
      button.addEventListener("click", () => markAsPaid(item.id, data, button));

      card.append(heading, details, amount, button);
      area.append(card);
    });
  }, error => {
    console.error(error);
    showMessage("#admin-requests", "Erreur de lecture : " + error.message);
  });
}

async function markAsPaid(requestId, request, button) {
  if (user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    alert("Accès administrateur refusé.");
    return;
  }

  const confirmed = confirm(
    `As-tu réellement envoyé ${euros(request.amount)} à ${request.paypalEmail} sur PayPal ?`
  );
  if (!confirmed) return;

  button.disabled = true;

  try {
    const paidQuery = query(
      collection(db, "withdrawals"),
      where("uid", "==", request.uid),
      where("status", "==", "paid")
    );

    const previous = await getDocs(paidQuery);
    const withdrawalNumber = previous.size + 1;

    const requestRef = doc(db, "withdrawals", requestId);
    const notificationRef = doc(collection(db, "notifications"));

    const title = "PEXI PLAY";
    const description = withdrawalNumber === 1
      ? `Félicitations ! Tu as effectué ton premier retrait de ${euros(request.amount)}. Ton paiement PayPal a été envoyé à ${request.paypalEmail}.`
      : `Félicitations ! Ton ${withdrawalNumber}ème retrait de ${euros(request.amount)} a été payé. Ton paiement PayPal a été envoyé à ${request.paypalEmail}.`;

    await runTransaction(db, async transaction => {
      const fresh = await transaction.get(requestRef);
      if (!fresh.exists()) throw new Error("Demande introuvable.");
      if (fresh.data().status !== "pending") throw new Error("Cette demande a déjà été traitée.");

      transaction.update(requestRef, {
        status: "paid",
        paidAt: serverTimestamp(),
        paidBy: user.email
      });

      transaction.set(notificationRef, {
        uid: request.uid,
        title,
        description,
        amount: request.amount,
        withdrawalNumber,
        seen: false,
        createdAt: serverTimestamp()
      });
    });

    showMessage("#admin-requests", "Demande marquée comme payée.");
  } catch (error) {
    console.error(error);
    alert("Impossible de traiter la demande : " + error.message);
    button.disabled = false;
  }
}

/* JEUX */
function startGame(name) {
  if (!profile) return;

  const bet = Math.floor(Number($("#bet").value));
  if (!Number.isFinite(bet) || bet < 1) {
    alert("Entre une mise valide.");
    return;
  }

  if (bet > profile.credits) {
    alert("Tu n'as pas assez de crédits.");
    return;
  }

  profile.credits -= bet;
  renderBalance();
  setDoc(userRef(), { credits: profile.credits }, { merge: true })
    .catch(console.error);

  activeGame = name;
  game = { bet, multiplier: 1, step: 0, active: true, mines: [] };

  $("#game-content").replaceChildren();
  $("#multiplier").textContent = "x1.00";
  $("#game-message").textContent = "Partie en cours. Bonne chance !";
  $("#game-title").textContent = ({
    mines: "Coin Miner",
    tower: "Tower Builder",
    chicken: "Chicken Road"
  })[name];

  if (name === "mines") setupMines();
  if (name === "tower") setupTower();
  if (name === "chicken") setupChicken();

  $("#advance").textContent = name === "mines" ? "Découvrir une case" :
    name === "tower" ? "Construire un étage" : "Avancer la poule";

  page("game-area");
}

function setGameText(message) {
  $("#game-message").textContent = message;
  $("#multiplier").textContent = "x" + game.multiplier.toFixed(2);
}

async function endGame(won) {
  if (!game.active) return;
  game.active = false;

  if (won) {
    const prize = Math.floor(game.bet * game.multiplier);
    profile.credits += prize;
    await setDoc(userRef(), { credits: profile.credits }, { merge: true });
    renderBalance();
    setGameText(`Bravo ! Tu gagnes ${money(prize)} crédits.`);
  } else {
    setGameText("Perdu ! Tu as perdu ta mise.");
  }

  $("#advance").disabled = true;
  $("#cashout").disabled = true;
  $("#back-home").textContent = "Retour aux jeux";
}

$("#cashout").addEventListener("click", () => {
  if (!game.active || game.step === 0) return;
  endGame(true);
});

$("#back-home").addEventListener("click", () => {
  if (game.active) {
    alert("Termine ta partie avant de revenir aux jeux.");
    return;
  }
  page("home");
});

$$("[data-game]").forEach(button => {
  button.addEventListener("click", () => startGame(button.dataset.game));
});

/* COIN MINER */
function setupMines() {
  const grid = document.createElement("div");
  grid.className = "tile-grid";
  game.mines = [];

  while (game.mines.length < 5) {
    const n = Math.floor(Math.random() * 25);
    if (!game.mines.includes(n)) game.mines.push(n);
  }

  for (let i = 0; i < 25; i++) {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.textContent = "?";
    tile.addEventListener("click", () => {
      if (!game.active || tile.disabled) return;
      tile.disabled = true;
      game.step++;

      if (game.mines.includes(i)) {
        tile.textContent = "💣";
        tile.classList.add("mine");
        endGame(false);
      } else {
        tile.textContent = "💎";
        tile.classList.add("safe");
        game.multiplier = 1 + game.step * 0.25;
        setGameText(`${game.step} case(s) sûre(s). Tu peux encaisser.`);
      }
    });
    grid.append(tile);
  }

  $("#game-content").append(grid);
}

/* TOWER BUILDER */
function setupTower() {
  const tower = document.createElement("div");
  tower.className = "tower";
  tower.id = "tower-stack";
  $("#game-content").append(tower);
  const base = document.createElement("div");
  base.className = "floor";
  tower.append(base);
}

function towerStep() {
  const tower = $("#tower-stack");
  if (!tower || !game.active) return;

  if (Math.random() < 0.16) {
    endGame(false);
    return;
  }

  const floor = document.createElement("div");
  floor.className = "floor";
  tower.append(floor);

  game.step++;
  game.multiplier = 1 + game.step * 0.2;
  setGameText(`${game.step} étage(s) construits. Continue ou encaisse.`);

  if (game.step >= 20) endGame(true);
}

/* CHICKEN ROAD */
function setupChicken() {
  const road = document.createElement("div");
  road.className = "road";
  road.id = "chicken-road";
  for (let i = 0; i < 12; i++) {
    const tile = document.createElement("div");
    tile.textContent = "🟩";
    road.append(tile);
  }
  $("#game-content").append(road);
  const chicken = document.createElement("p");
  chicken.id = "chicken-position";
  chicken.textContent = "🐔 Départ";
  chicken.style.fontSize = "28px";
  chicken.style.marginTop = "12px";
  $("#game-content").append(chicken);
}

function chickenStep() {
  if (!game.active) return;
  const tiles = $("#chicken-road").children;
  const tile = tiles[game.step];
  if (!tile) return;

  if (Math.random() < 0.22) {
    tile.textContent = "🕳️";
    endGame(false);
    return;
  }

  tile.textContent = "🐔";
  game.step++;
  game.multiplier = 1 + game.step * 0.3;
  $("#chicken-position").textContent = `🐔 Étape ${game.step}`;
  setGameText(`${game.step} étape(s) réussie(s). Encaisse ou continue.`);

  if (game.step >= 12) endGame(true);
}

$("#advance").addEventListener("click", () => {
  if (!game.active) return;
  if (activeGame === "tower") towerStep();
  if (activeGame === "chicken") chickenStep();
  if (activeGame === "mines") {
    const next = [...$("#game-content").querySelectorAll(".tile")]
      .find(tile => !tile.disabled);
    if (next) next.click();
  }
});
