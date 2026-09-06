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

export function jobRefFor(state) {
  const parts = (state.customer?.name || '').trim().split(/\s+/).filter(Boolean);
  const surname = (parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'JOB').replace(/[^A-Za-z0-9'-]/g, '').toUpperCase() || 'JOB';
  const num = String(state.customer?.number || '').replace(/\D/g, '');
  return num ? `${surname}-${num}` : `${surname}-NOQUOTENO`;
}

/** Summary fields stored next to the state so the job board can list every
 *  job (status, ref, install dates, upcoming deliveries) without loading it. */
function extractMetadata(state) {
  const w = ((state.width || 0) / 1000).toFixed(1);
  const d = ((state.depth || 0) / 1000).toFixed(1);
  const h = ((state.height || 0) / 1000).toFixed(1);
  const ref = jobRefFor(state);
  const deliveries = [];
  for (const [sup, note] of Object.entries(state.orderNotes || {})) {
    if (!note || !note.delivery) continue;
    const st = Object.entries(state.orderStatus || {}).find(([k]) => k.split('||')[1] === sup);
    deliveries.push({ supplier: sup, date: note.delivery, status: st ? st[1].status : '' });
  }
  const orders = Object.values(state.orderStatus || {});
  return {
    customer: state.customer?.name || '',
    address: state.customer?.address || '',
    dimensions: `${w}m x ${d}m x ${h}m`,
    tier: state.tier || 'signature',
    ref,
    quoteNumber: state.customer?.number || '',
    jobStatus: state.jobStatus || 'quote',
    installStart: state.installer?.startDate || '',
    installEnd: state.installer?.endDate || '',
    installerName: state.installer?.name || '',
    ordersOrdered: orders.filter((o) => o.status).length,
    ordersDelivered: orders.filter((o) => o.status === 'delivered').length,
    deliveries,
  };
}

export async function saveDesign(name, state) {
  if (!designsCollection) throw new Error('Firebase not initialised');
  const meta = extractMetadata(state);
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const doc = await designsCollection.add({
    name,
    ...meta,
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
    ...meta,
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
      address: d.address || '',
      dimensions: d.dimensions,
      tier: d.tier,
      ref: d.ref || '',
      quoteNumber: d.quoteNumber || '',
      jobStatus: d.jobStatus || 'quote',
      installStart: d.installStart || '',
      installEnd: d.installEnd || '',
      installerName: d.installerName || '',
      ordersOrdered: d.ordersOrdered || 0,
      ordersDelivered: d.ordersDelivered || 0,
      deliveries: d.deliveries || [],
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
