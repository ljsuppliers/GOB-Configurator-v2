// CRM data layer: customers, notes and documents in Firestore (compat SDK).
// Replaces Insightly (contacts + projects). A "project" is a design document
// in the existing `designs` collection carrying a `customerId`; legacy
// Insightly projects were imported as design docs with `legacy: true`.
//
//   customers/{id}            contact card (see emptyCustomer)
//   customers/{id}/notes/{id} timeline: notes, calls, stage changes
//   customers/{id}/files/{id} document metadata (file bytes in Storage once enabled)

function db() { return firebase.firestore(); }
const ts = () => firebase.firestore.FieldValue.serverTimestamp();

export function emptyCustomer() {
  return {
    name: '', firstName: '', lastName: '', email: '', phone: '', mobile: '',
    address: '', postcode: '', town: '', source: '', owner: '', tags: [],
    background: '', status: 'active', insightlyContactId: null,
  };
}

/** Lowercase blob used for the search box (name, email, phones, address). */
export function searchBlobFor(c) {
  return [c.name, c.firstName, c.lastName, c.email, c.phone, c.mobile, c.address, c.postcode, c.town, (c.tags || []).join(' ')]
    .filter(Boolean).join(' ').toLowerCase();
}

function fromDoc(doc) {
  const d = doc.data();
  return {
    id: doc.id, ...d,
    createdAt: d.createdAt?.toDate?.() || null,
    updatedAt: d.updatedAt?.toDate?.() || null,
  };
}

export async function listCustomers() {
  const snap = await db().collection('customers').orderBy('nameLower').get();
  return snap.docs.map(fromDoc);
}

export async function getCustomer(id) {
  const doc = await db().collection('customers').doc(id).get();
  return doc.exists ? fromDoc(doc) : null;
}

/** Create (no id) or update (id) a customer. Returns the id. */
export async function saveCustomer(id, data, author) {
  const c = { ...emptyCustomer(), ...data };
  delete c.id; delete c.createdAt; delete c.updatedAt;
  if (!c.name) c.name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  if (!c.firstName && !c.lastName && c.name) {
    const parts = c.name.trim().split(/\s+/);
    c.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
    c.firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
  }
  c.nameLower = (c.name || '').toLowerCase();
  c.searchBlob = searchBlobFor(c);
  c.updatedAt = ts();
  c.updatedBy = author || '';
  if (id) {
    await db().collection('customers').doc(id).set(c, { merge: true });
    return id;
  }
  c.createdAt = ts();
  c.createdBy = author || '';
  const ref = await db().collection('customers').add(c);
  return ref.id;
}

export async function deleteCustomer(id) {
  await db().collection('customers').doc(id).delete();
}

export async function listNotes(customerId) {
  const snap = await db().collection('customers').doc(customerId).collection('notes').orderBy('createdAt', 'desc').limit(500).get();
  return snap.docs.map(fromDoc);
}

/** kind: 'note' | 'call' | 'email' | 'stage' | 'system' */
export async function addNote(customerId, { body, title = '', kind = 'note', projectId = '', projectName = '' }, author) {
  const ref = await db().collection('customers').doc(customerId).collection('notes').add({
    body: body || '', title, kind, projectId, projectName,
    author: author || '', createdAt: ts(), updatedAt: ts(),
  });
  return ref.id;
}

export async function deleteNote(customerId, noteId) {
  await db().collection('customers').doc(customerId).collection('notes').doc(noteId).delete();
}

export async function listFiles(customerId) {
  const snap = await db().collection('customers').doc(customerId).collection('files').orderBy('createdAt', 'desc').get();
  const files = snap.docs.map(fromDoc);
  // Imported files carry a storagePath but no public URL: resolve a signed
  // download URL for the signed-in user (staff-only bucket rules).
  if (firebase.storage) {
    await Promise.all(files.filter((f) => f.storagePath && !f.url).map(async (f) => {
      try { f.url = await firebase.storage().ref(f.storagePath).getDownloadURL(); } catch (e) { /* not uploaded yet */ }
    }));
  }
  return files;
}

export async function addFileRecord(customerId, meta, author) {
  const ref = await db().collection('customers').doc(customerId).collection('files').add({ ...meta, author: author || '', createdAt: ts() });
  return ref.id;
}

export async function deleteFileRecord(customerId, fileId) {
  await db().collection('customers').doc(customerId).collection('files').doc(fileId).delete();
}

/** Upload a browser File into Storage under the customer and record it.
 *  Needs Cloud Storage enabled on the Firebase project (Blaze plan). */
export async function uploadFile(customerId, file, author) {
  if (!firebase.storage) throw new Error('Cloud Storage not enabled on this project yet');
  const path = `customers/${customerId}/${Date.now()}_${file.name}`;
  const snap = await firebase.storage().ref(path).put(file, { contentType: file.type });
  const url = await snap.ref.getDownloadURL();
  return addFileRecord(customerId, { name: file.name, size: file.size, contentType: file.type, storagePath: path, url }, author);
}

/** Link a design document to a customer (and back-fill name/address on the
 *  board metadata is done by the app's save). */
export async function setDesignCustomer(designId, customerId) {
  await db().collection('designs').doc(designId).update({ customerId: customerId || '', updatedAt: ts() });
}

/** Very small fuzzy match for "this design's customer name looks like this
 *  customer": surname + first-name initial, or exact email. */
export function matchScore(customer, { name = '', email = '', phone = '', postcode = '' }) {
  let s = 0;
  const e = (email || '').trim().toLowerCase();
  if (e && customer.email && customer.email.toLowerCase() === e) s += 10;
  const digits = (x) => String(x || '').replace(/\D/g, '');
  const p = digits(phone);
  if (p && (digits(customer.phone) === p || digits(customer.mobile) === p)) s += 8;
  const pc = (postcode || '').replace(/\s/g, '').toUpperCase();
  if (pc && (customer.postcode || '').replace(/\s/g, '').toUpperCase() === pc) s += 4;
  const n = (name || '').trim().toLowerCase();
  if (n) {
    const cn = (customer.name || '').toLowerCase();
    if (cn === n) s += 6;
    else {
      const surname = n.split(/\s+/).pop();
      if (surname && surname.length > 2 && (customer.lastName || '').toLowerCase() === surname) s += 3;
    }
  }
  return s;
}

/* ───────────── PROJECTS (the Insightly "Projects" pipeline) ───────────── */
// Stage names copied from the Insightly Project Pipeline so the team works the same way.
export const PIPELINE = [
  { order: 1, name: 'Quote sent', status: 'quote' },
  { order: 2, name: 'Holding Deposit (Holding invoice + approx delivery date)', status: 'deposit' },
  { order: 3, name: 'Guillaume 2nd Visit', status: 'deposit' },
  { order: 4, name: 'Contractors (1. electrician, 2. landscaper, 3. air con, 4. tree surgeon) notified', status: 'deposit' },
  { order: 5, name: 'Drawing sent to customer', status: 'deposit' },
  { order: 6, name: 'Planning permission (Craig paid)', status: 'deposit' },
  { order: 7, name: 'Specification', status: 'deposit' },
  { order: 8, name: '1st Stage Invoice', status: 'deposit' },
  { order: 9, name: 'Assign team', status: 'ordered' },
  { order: 10, name: 'Registered installer form', status: 'ordered' },
  { order: 11, name: "Jewsons' order", status: 'ordered' },
  { order: 12, name: 'Checklist for other materials', status: 'ordered' },
  { order: 13, name: 'Out for delivery', status: 'delivered' },
  { order: 14, name: '2nd stage Invoice - 50% due on delivery', status: 'delivered' },
  { order: 15, name: 'Half Way - 3rd stage Installer Team payment 1', status: 'installing' },
  { order: 16, name: 'Complete - 3rd stage Installer Team payment 2', status: 'installing' },
  { order: 17, name: 'Final Invoice', status: 'complete' },
  { order: 18, name: 'Google Review', status: 'complete' },
];
export const PROJECT_STATUSES = [
  { value: 'NOT STARTED', label: 'Not started' }, { value: 'IN PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' }, { value: 'CANCELLED', label: 'Cancelled' }, { value: 'ABANDONED', label: 'Abandoned' },
];
const STATUS_TO_STAGE = { quote: 1, deposit: 2, ordered: 11, delivered: 13, installing: 15, complete: 18, cancelled: 0 };
/** Stage order for a project: stored value, else inferred from the job status. */
export function stageOf(job) {
  if (job && job.stage) return job.stage;
  if (job && job.insightly && job.insightly.stageOrder) return job.insightly.stageOrder;
  return STATUS_TO_STAGE[(job && job.jobStatus) || 'quote'] || 1;
}
export function stageName(order) { const s = PIPELINE.find((p) => p.order === order); return s ? s.name : ''; }
export function projectStatusOf(job) {
  if (job && job.projectStatus) return job.projectStatus;
  if (job && job.insightly && job.insightly.status) return job.insightly.status;
  if (job && job.jobStatus === 'complete') return 'COMPLETED';
  if (job && job.jobStatus === 'cancelled') return 'CANCELLED';
  return 'IN PROGRESS';
}

export async function updateProject(designId, fields) {
  await db().collection('designs').doc(designId).update({ ...fields, updatedAt: ts() });
}

/** A project with no drawing yet (the Insightly way: name + details), linked to a customer. */
export async function createProject({ name, customerId = '', customerName = '', address = '', details = '', quoteNumber = '' }, author) {
  const surname = (customerName || name || '').trim().split(/\s+/).pop() || 'JOB';
  const ref = await db().collection('designs').add({
    name, customer: customerName, address, dimensions: '', tier: 'signature',
    ref: `${surname.replace(/[^A-Za-z0-9-]/g, '').toUpperCase()}-${quoteNumber || 'NOQUOTENO'}`, quoteNumber,
    jobStatus: 'quote', stage: 1, stageName: PIPELINE[0].name, projectStatus: 'IN PROGRESS', details,
    installStart: '', installEnd: '', installerName: '', ordersOrdered: 0, ordersDelivered: 0, deliveries: [],
    customerId, legacy: true, hasState: false, state: null, createdBy: author || '',
    savedAt: ts(), updatedAt: ts(),
  });
  return ref.id;
}

export async function deleteProject(designId) {
  await db().collection('designs').doc(designId).delete();
}

/** Attach an existing configurator design to a project that has no drawing:
 *  the project doc takes the drawing state (and the design's install/orders
 *  metadata), the separate design doc is removed. Notes stay on the customer. */
export async function mergeDesignIntoProject(projectId, designId) {
  const dref = db().collection('designs').doc(designId);
  const pref = db().collection('designs').doc(projectId);
  const [dsnap, psnap] = await Promise.all([dref.get(), pref.get()]);
  if (!dsnap.exists || !psnap.exists) throw new Error('Design or project not found');
  const d = dsnap.data(); const p = psnap.data();
  if (!d.state || !d.state.width) throw new Error('That design has no drawing');
  const state = JSON.parse(JSON.stringify(d.state));
  state.customer = state.customer || {};
  if (p.quoteNumber) state.customer.number = p.quoteNumber;
  state.customerId = p.customerId || state.customerId || '';
  const fields = { state, hasState: true, tier: d.tier || p.tier || 'signature', dimensions: d.dimensions || p.dimensions || '', address: p.address || d.address || '',
    installStart: d.installStart || p.installStart || '', installEnd: d.installEnd || p.installEnd || '', installerName: d.installerName || p.installerName || '',
    ordersOrdered: d.ordersOrdered || 0, ordersDelivered: d.ordersDelivered || 0, deliveries: d.deliveries || [],
    mergedFromDesign: designId, mergedFromName: d.name || '', updatedAt: ts() };
  await pref.update(fields);
  await dref.delete();
}
