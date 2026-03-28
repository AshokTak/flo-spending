/* ===== FLO — AUTH.JS ===== */
/* Firebase Auth (Google Sign-In) + Firestore persistence */

// ─── Firebase init ────────────────────────────────────────────────
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

let currentUser = null;

// ─── Auth state observer ─────────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    showLoadingState();
    try {
      await loadStateFromFirestore();
    } catch (e) {
      console.error('Firestore load error:', e);
      // Fall back to empty state; seed will populate demo data
    }
    showApp(user);
    // Only seed demo data for brand-new users (empty accounts)
    if (!state.accounts || state.accounts.length === 0) {
      seedDemoData();
    }
    init();
  } else {
    currentUser = null;
    showLoginScreen();
  }
});

// ─── Sign in / out ────────────────────────────────────────────────
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  auth.signInWithPopup(provider).catch((err) => {
    console.error('Sign-in error:', err);
    showAuthError(err.message);
  });
}

function signOutUser() {
  auth.signOut().then(() => {
    // Reset in-memory state
    state = { accounts:[], transactions:[], recurring:[], budgets:[], goals:[],
      settings:{ payFrequency:'monthly', incomePerPeriod:0, nextPayDate:'', currency:'$', lastResetKey:'' }};
  });
}

// ─── Firestore read ───────────────────────────────────────────────
async function loadStateFromFirestore() {
  const snap = await db
    .collection('users').doc(currentUser.uid)
    .collection('data').doc('state')
    .get();

  if (snap.exists) {
    const data = snap.data();
    state = {
      accounts:     data.accounts     || [],
      transactions: data.transactions || [],
      recurring:    data.recurring    || [],
      budgets:      data.budgets      || [],
      goals:        data.goals        || [],
      settings:     data.settings     || { payFrequency:'monthly', incomePerPeriod:0, nextPayDate:'', currency:'$', lastResetKey:'' },
    };
  }
  // If snap doesn't exist, state stays as empty default → seedDemoData will run
}

// ─── Firestore write (fire-and-forget) ───────────────────────────
function saveState() {
  if (!currentUser || !db) return;
  db.collection('users').doc(currentUser.uid)
    .collection('data').doc('state')
    .set(state)
    .catch(e => console.error('Firestore save error:', e));
}

// ─── UI: show / hide screens ──────────────────────────────────────
function showLoginScreen() {
  document.getElementById('login-overlay').classList.remove('hidden');
  document.getElementById('app-loading').classList.add('hidden');
  document.getElementById('sidebar').classList.add('hidden');
  document.getElementById('main').classList.add('hidden');
  document.getElementById('hamburger').classList.add('hidden');
}

function showLoadingState() {
  document.getElementById('login-overlay').classList.add('hidden');
  document.getElementById('app-loading').classList.remove('hidden');
  document.getElementById('sidebar').classList.add('hidden');
  document.getElementById('main').classList.add('hidden');
}

function showApp(user) {
  document.getElementById('login-overlay').classList.add('hidden');
  document.getElementById('app-loading').classList.add('hidden');
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('main').classList.remove('hidden');
  document.getElementById('hamburger').classList.remove('hidden');

  // Populate user info in sidebar
  const nameEl   = document.getElementById('user-name');
  const emailEl  = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');
  if (nameEl)   nameEl.textContent  = user.displayName || 'User';
  if (emailEl)  emailEl.textContent = user.email || '';
  if (avatarEl) {
    if (user.photoURL) {
      avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}" referrerpolicy="no-referrer">`;
    } else {
      avatarEl.textContent = (user.displayName || 'U')[0].toUpperCase();
    }
  }
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}
