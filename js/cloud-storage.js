// Cloud Storage — Firebase Firestore CRUD for GOB Configurator
// Uses global firebase object from CDN compat scripts

let db = null;
let designsCollection = null;

// ─── Firebase Config ───
// Paste your Firebase project config here after creating the project
const firebaseConfig = {
  apiKey: "AIzaSyAQ30H9QGeQMylmymVc0RBJ6jKSby3IUBc",
  authDomain: "gob-configurator-76940.firebaseapp.com",
  projectId: "gob-configurator-76940",
  storageBucket: "gob-configurator-76940.firebasestorage.app",
  messagingSenderId: "626901522350",
  appId: "1:626901522350:web:7782d8fc5d3ff2392a5a3f"
};

export function initFirebase() {
  if (!window.firebase) {
    console.warn('Firebase SDK not loaded — cloud saves disabled');
    return false;
  }
  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  designsCollection = db.collection('designs');
  return true;
}

export function isFirebaseReady() {
  return db !== null && firebaseConfig.apiKey !== "";
}

function extractMetadata(state) {
  const w = ((state.width || 0) / 1000).toFixed(1);
  const d = ((state.depth || 0) / 1000).toFixed(1);
  const h = ((state.height || 0) / 1000).toFixed(1);
  return {
    customer: state.customer?.name || '',
    dimensions: `${w}m x ${d}m x ${h}m`,
    tier: state.tier || 'signature',
  };
}

export async function saveDesign(name, state) {
  if (!designsCollection) throw new Error('Firebase not initialised');
  const meta = extractMetadata(state);
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const doc = await designsCollection.add({
    name,
    customer: meta.customer,
    dimensions: meta.dimensions,
    tier: meta.tier,
    savedAt: now,
    updatedAt: now,
    state: JSON.parse(JSON.stringify(state)),
  });
  return doc.id;
}

export async function updateDesign(docId, name, state) {
  if (!designsCollection) throw new Error('Firebase not initialised');
  const meta = extractMetadata(state);
  await designsCollection.doc(docId).update({
    name,
    customer: meta.customer,
    dimensions: meta.dimensions,
    tier: meta.tier,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    state: JSON.parse(JSON.stringify(state)),
  });
}

export async function listDesigns() {
  if (!designsCollection) throw new Error('Firebase not initialised');
  const snap = await designsCollection.orderBy('updatedAt', 'desc').get();
  return snap.docs.map(doc => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name,
      customer: d.customer,
      dimensions: d.dimensions,
      tier: d.tier,
      savedAt: d.savedAt?.toDate?.() || null,
      updatedAt: d.updatedAt?.toDate?.() || null,
    };
  });
}

export async function loadDesign(docId) {
  if (!designsCollection) throw new Error('Firebase not initialised');
  const doc = await designsCollection.doc(docId).get();
  if (!doc.exists) throw new Error('Design not found');
  return doc.data().state;
}

export async function deleteDesign(docId) {
  if (!designsCollection) throw new Error('Firebase not initialised');
  await designsCollection.doc(docId).delete();
}
