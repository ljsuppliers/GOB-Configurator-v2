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
  return snap.docs.map(fromDoc);
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
