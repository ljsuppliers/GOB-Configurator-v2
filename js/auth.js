// Staff login for the GOB Configurator + CRM (Firebase Authentication, compat SDK).
// Anyone with a gardenofficebuildings.co.uk Google account is staff; extra
// personal accounts are listed in EXTRA_STAFF. Email + password accounts are
// also allowed for team members without a Google Workspace login (created in
// the Firebase console -> Authentication -> Users), same email rules apply.
export const STAFF_DOMAIN = 'gardenofficebuildings.co.uk';
export const EXTRA_STAFF = ['ljb4496@gmail.com'];

export function isStaffEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return false;
  return e.endsWith('@' + STAFF_DOMAIN) || EXTRA_STAFF.includes(e);
}

export function authAvailable() {
  return !!(window.firebase && firebase.auth);
}

/** Calls onUser(user|null, errorMessage) on every auth change. Non-staff
 *  accounts are signed straight back out. */
export function initAuth(onUser) {
  if (!authAvailable()) { onUser(null, 'Firebase Auth not loaded'); return; }
  firebase.auth().onAuthStateChanged((u) => {
    if (u && !isStaffEmail(u.email)) {
      const who = u.email;
      firebase.auth().signOut();
      onUser(null, `${who} is not a Garden Office Buildings account. Sign in with your @${STAFF_DOMAIN} address.`);
      return;
    }
    onUser(u || null, '');
  });
}

export async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await firebase.auth().signInWithPopup(provider);
}

export async function signInWithEmail(email, password) {
  await firebase.auth().signInWithEmailAndPassword(String(email || '').trim(), password);
}

export async function sendPasswordReset(email) {
  await firebase.auth().sendPasswordResetEmail(String(email || '').trim());
}

export function signOut() {
  return firebase.auth().signOut();
}

export function currentUser() {
  return authAvailable() ? firebase.auth().currentUser : null;
}

/** Short display name for the header chip / note authors. */
export function userLabel(u) {
  if (!u) return '';
  if (u.displayName) return u.displayName.split(' ')[0];
  return (u.email || '').split('@')[0];
}

export function friendlyAuthError(err) {
  const code = err && err.code ? err.code : '';
  if (code === 'auth/popup-closed-by-user') return 'Sign-in window closed before finishing.';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') return 'Wrong email or password.';
  if (code === 'auth/user-not-found') return 'No account with that email. Use Sign in with Google or ask Liam to add you.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a minute and try again.';
  if (code === 'auth/unauthorized-domain') return 'This site is not authorised for sign-in yet (Firebase console -> Authentication -> Settings -> Authorised domains).';
  return (err && err.message) || 'Sign-in failed.';
}
