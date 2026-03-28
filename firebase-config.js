/**
 * FLO — Firebase Configuration
 * ─────────────────────────────────────────────────────────────────
 * SETUP STEPS (one-time, ~5 minutes):
 *
 * 1. Go to https://console.firebase.google.com
 * 2. Click "Add project" → name it "flo-spending" → Create
 * 3. In the project dashboard, click the </> (Web) icon to add a web app
 *    → App nickname: "Flo" → Register app
 *    → Copy the firebaseConfig object values below
 *
 * 4. Enable Google Sign-In:
 *    Authentication → Sign-in method → Google → Enable → Save
 *    Under "Authorized domains" add: ashoktak.github.io
 *
 * 5. Create Firestore database:
 *    Firestore Database → Create database → Start in production mode
 *    → Choose a region → Enable
 *
 * 6. Set Firestore security rules:
 *    Firestore → Rules tab → paste contents of firestore.rules → Publish
 *
 * 7. (Optional) Firebase Hosting instead of GitHub Pages:
 *    npm install -g firebase-tools
 *    firebase login && firebase init hosting && firebase deploy
 * ─────────────────────────────────────────────────────────────────
 * NOTE: Firebase API keys are safe to commit to public repos.
 * Security is enforced by Firestore Rules, not the API key.
 * ─────────────────────────────────────────────────────────────────
 */

const firebaseConfig = {
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
  authDomain:        "REPLACE_WITH_YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket:     "REPLACE_WITH_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId:             "REPLACE_WITH_YOUR_APP_ID",
};
