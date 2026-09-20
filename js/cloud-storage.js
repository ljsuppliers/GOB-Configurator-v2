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

/** A fresh Firestore document id, minted locally (works offline). */
export function newDesignId() { return designsCollection ? designsCollection.doc().id : ('local-' + Date.now()); }

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
    customerId: state.customerId || '',
    hasState: true,
  };
}

export async function saveDesign(name, state, author = '', docId = '') {
  if (!designsCollection) throw new Error('Firebase not initialised');
  const meta = extractMetadata(state);
  const now = firebase.firestore.FieldValue.serverTimestamp();
  // A caller-supplied id makes the write idempotent (the offline outbox retries it).
  const ref = docId ? designsCollection.doc(docId) : designsCollection.doc();
  await ref.set({
    name,
    ...meta,
    source: 'crm', stage: 1, stageName: 'Quote sent', projectStatus: 'IN PROGRESS', createdBy: author || '',
    savedAt: now,
    updatedAt: now,
    state: JSON.parse(JSON.stringify(state)),
  });
  return ref.id;
}

export async function updateDesign(docId, name, state, author = '', quoteTotal = null) {
  if (!designsCollection) throw new Error('Firebase not initialised');
  const meta = extractMetadata(state);
  const ref = designsCollection.doc(docId);
  let changes = [];
  try {
    const prev = await ref.get();
    const p = prev.exists ? prev.data() : null;
    changes = describeChanges(p && p.state, state, p && p.quoteTotal, quoteTotal);
  } catch (e) { changes = [{ path: 'state', text: 'Saved (previous version unreadable)' }]; }
  await ref.update({
    name,
    ...meta,
    quoteTotal: quoteTotal === null ? firebase.firestore.FieldValue.delete() : quoteTotal,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: author || '',
    state: JSON.parse(JSON.stringify(state)),
  });
  if (changes.length) {
    const hist = ref.collection('history');
    let merged = false;
    try {
      const last = await hist.orderBy('at', 'desc').limit(1).get();
      if (!last.empty) {
        const ld = last.docs[0].data(); const at = ld.at?.toDate?.();
        if (ld.by === (author || '') && at && Date.now() - at.getTime() < 10 * 60 * 1000) {
          const byPath = new Map((ld.changes || []).map((c) => [c.path, c]));
          for (const c of changes) byPath.set(c.path, c);
          const all = [...byPath.values()];
          await last.docs[0].ref.update({ at: firebase.firestore.FieldValue.serverTimestamp(), count: all.length, changes: all.slice(0, 60), quoteTotal: quoteTotal === null ? null : quoteTotal });
          merged = true;
        }
      }
    } catch (e) { /* fall through to a new entry */ }
    if (!merged) await hist.add({ at: firebase.firestore.FieldValue.serverTimestamp(), by: author || '', count: changes.length, changes: changes.slice(0, 60), quoteTotal: quoteTotal === null ? null : quoteTotal });
  }
}

export async function listHistory(docId) {
  if (!designsCollection) throw new Error('Firebase not initialised');
  const snap = await designsCollection.doc(docId).collection('history').orderBy('at', 'desc').limit(200).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), at: d.data().at?.toDate?.() || null }));
}

/* Human-readable diff of two design states for the edit history. */
const LABELS = { width: 'External width', depth: 'External depth', height: 'Height', tier: 'Range', hasCanopy: 'Canopy', hasDecking: 'Decking', deckingDepth: 'Decking depth', overhangDepth: 'Canopy depth',
  cornerLeft: 'Left corner', cornerRight: 'Right corner', foundationType: 'Foundation', flooring: 'Flooring', pirFloorRoof: 'PIR floor/roof', firringFrontMm: 'Firring height', jobStatus: 'Job status', customerId: 'Customer link' };
function flat(obj, prefix, out) {
  if (obj === null || obj === undefined) return out;
  if (Array.isArray(obj)) {
    if (prefix === 'components') obj.forEach((c) => { out[`components.${c.id}`] = `${c.label || c.type}${c.customWidth ? ' ' + c.customWidth + 'mm' : ''} on ${c.elevation} @ ${c.positionX}mm`; });
    else if (prefix === 'customExtras') obj.forEach((c, i) => { out[`customExtras.${i}`] = `${c.label} £${c.price}`; });
    else if (prefix === 'acUnits' || prefix === 'externalFeatures' || prefix === 'drawingLabels') obj.forEach((c, i) => { out[`${prefix}.${c.id || i}`] = JSON.stringify(c); });
    else out[prefix] = JSON.stringify(obj);
    return out;
  }
  if (typeof obj === 'object') { for (const k of Object.keys(obj)) flat(obj[k], prefix ? `${prefix}.${k}` : k, out); return out; }
  out[prefix] = obj; return out;
}
const SKIP = /^(survey\.siteSketch|orderStatus|ordersSent|orderNotes|bomOverrides)/;
function nice(path) {
  if (LABELS[path]) return LABELS[path];
  const p = path.split('.');
  if (p[0] === 'components') return 'Door/window';
  if (p[0] === 'customer') return 'Customer ' + p[1];
  if (p[0] === 'cladding') return 'Cladding ' + p[1];
  if (p[0] === 'extras') return 'Extra: ' + p[1].replace(/([A-Z])/g, ' $1').toLowerCase();
  if (p[0] === 'structuralExtras') return 'Structural extra: ' + p[1].replace(/([A-Z])/g, ' $1').toLowerCase();
  if (p[0] === 'featureWalls') return 'Feature wall ' + p[1];
  if (p[0] === 'installer') return 'Installer ' + p[1];
  if (p[0] === 'labour') return 'Labour ' + p[1];
  if (p[0] === 'discount') return 'Discount ' + p[1];
  if (p[0] === 'customExtras') return 'Custom extra';
  return path.replace(/\./g, ' › ');
}
const show = (v) => v === undefined || v === null || v === '' ? '(blank)' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v).length > 60 ? String(v).slice(0, 57) + '…' : String(v);
export function describeChanges(prevState, nextState, prevTotal, nextTotal) {
  const out = [];
  if (!prevState) return [{ path: 'state', text: 'First save' }];
  const a = flat(prevState, '', {}), b = flat(nextState, '', {});
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (SKIP.test(k)) continue;
    const va = a[k], vb = b[k];
    if (JSON.stringify(va) === JSON.stringify(vb)) continue;
    if (k.startsWith('components.')) { out.push({ path: k, text: va === undefined ? `Added ${vb}` : vb === undefined ? `Removed ${va}` : `Moved/changed ${va} → ${vb}` }); continue; }
    out.push({ path: k, text: `${nice(k)}: ${show(va)} → ${show(vb)}` });
  }
  if (prevTotal !== undefined && prevTotal !== null && nextTotal !== null && nextTotal !== undefined && Math.round(prevTotal) !== Math.round(nextTotal)) out.unshift({ path: 'quoteTotal', text: `Quote total: £${Math.round(prevTotal).toLocaleString()} → £${Math.round(nextTotal).toLocaleString()}` });
  return out;
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
      customerId: d.customerId || '',
      source: d.source || (d.legacy ? 'insightly' : 'configurator'),
      drawingSource: d.drawingSource || '',
      legacyName: d.legacyName || '',
      quoteTotal: typeof d.quoteTotal === 'number' ? d.quoteTotal : null,
      updatedBy: d.updatedBy || '',
      stage: d.stage || 0,
      stageName: d.stageName || '',
      projectStatus: d.projectStatus || '',
      details: d.details || (d.insightly && d.insightly.details) || '',
      owner: d.owner || (d.insightly && d.insightly.owner) || '',
      legacy: !!d.legacy,
      brand: d.brand === 'grannexe' ? 'grannexe' : 'gob', // GOB unless marked Grannexe (CRM-only projects)
      hasState: d.hasState !== undefined ? !!d.hasState : !!(d.state && d.state.width),
      insightly: d.insightly || null,
      savedAt: d.savedAt?.toDate?.() || null,
      updatedAt: d.updatedAt?.toDate?.() || null,
    };
  });
}

export async function loadDesign(docId) {
  if (!designsCollection) throw new Error('Firebase not initialised');
  const doc = await designsCollection.doc(docId).get();
  if (!doc.exists) throw new Error('Design not found');
  const st = doc.data().state;
  if (!st || !st.width) throw new Error('This project has no drawing yet - open it from the customer page to start one');
  return st;
}

export async function deleteDesign(docId) {
  if (!designsCollection) throw new Error('Firebase not initialised');
  await designsCollection.doc(docId).delete();
}
