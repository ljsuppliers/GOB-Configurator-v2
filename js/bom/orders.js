// Materials catalogue + supplier purchase orders for the 2D configurator.
// Catalogue baseline ships in data/catalogue.json (seeded from the designer's
// Supabase catalogue); every edit Liam makes is saved as a full copy to
// Firestore (settings/catalogue) with a localStorage fallback, so he has
// complete control over names, costs, suppliers, pack sizes and routing.

const LS_KEY = 'gob-catalogue-v1';
const FACTORY_ADDRESS = 'Garden Office Buildings\nRear of 158 Main Road\nBiggin Hill, Kent\nTN16 3BA';

let _db = null;
function fs() {
  if (_db) return _db;
  if (window.firebase && firebase.apps && firebase.apps.length > 0) {
    _db = firebase.firestore();
  }
  return _db;
}

export async function loadCatalogue() {
  // Priority: Firestore (shared across devices) > localStorage > shipped JSON.
  let base = null;
  try {
    const resp = await fetch('data/catalogue.json');
    base = await resp.json();
  } catch (e) { console.warn('catalogue.json load failed', e); }
  try {
    const db = fs();
    if (db) {
      const doc = await db.collection('settings').doc('catalogue').get();
      if (doc.exists) {
        const saved = doc.data();
        if (saved && Array.isArray(saved.materials)) return saved;
      }
    }
  } catch (e) { console.warn('Firestore catalogue load failed', e); }
  try {
    const ls = localStorage.getItem(LS_KEY);
    if (ls) {
      const saved = JSON.parse(ls);
      if (saved && Array.isArray(saved.materials)) return saved;
    }
  } catch (e) { /* ignore */ }
  return base || { version: 1, suppliers: [], materials: [] };
}

export async function saveCatalogue(cat) {
  cat.updated = new Date().toISOString().slice(0, 10);
  try { localStorage.setItem(LS_KEY, JSON.stringify(cat)); } catch (e) { /* ignore */ }
  const db = fs();
  if (db) {
    await db.collection('settings').doc('catalogue').set(JSON.parse(JSON.stringify(cat)));
    return 'cloud';
  }
  return 'local';
}

/** Join BOM rows to catalogue materials by name. */
export function joinBom(bomRows, catalogue) {
  const byName = new Map(catalogue.materials.map((m) => [m.name.toLowerCase(), m]));
  return bomRows.map((r) => {
    const mat = byName.get(r.name.toLowerCase()) || null;
    const packSize = mat && mat.packSize > 0 ? mat.packSize : 1;
    const orderQty = Math.max(0, Math.ceil(r.qty / packSize - 1e-9));
    return {
      ...r,
      material: mat,
      supplier: mat ? mat.supplier || '' : '',
      unit: mat ? mat.unit : '',
      unitCost: mat ? mat.unitCost || 0 : 0,
      lineCost: mat ? (mat.unitCost || 0) * r.qty : 0,
      orderQty,
      orderUnit: mat && mat.orderUnit ? mat.orderUnit : (mat ? mat.unit : ''),
      destination: mat ? mat.destination || 'site' : 'site',
      inStock: mat ? !!mat.inStock : false,
      inCatalogue: !!mat,
    };
  });
}

/** Group joined lines into supplier orders, split by destination. */
export function buildOrders(lines, catalogue, opts) {
  const supByName = new Map(catalogue.suppliers.map((s) => [s.name.toLowerCase(), s]));
  const groups = new Map();
  for (const l of lines) {
    if (l.inStock || l.orderQty <= 0) continue;
    const supplierName = l.supplier || 'NO SUPPLIER SET';
    const key = `${supplierName}||${l.destination}`;
    if (!groups.has(key)) {
      groups.set(key, {
        supplierName,
        supplier: supByName.get(supplierName.toLowerCase()) || null,
        destination: l.destination,
        items: [],
      });
    }
    groups.get(key).items.push(l);
  }
  const orders = [...groups.values()].sort((a, b) => a.supplierName.localeCompare(b.supplierName));
  for (const o of orders) o.email = orderEmailText(o, opts);
  return orders;
}

function orderEmailText(order, opts = {}) {
  const ref = opts.ref || 'GOB-ORDER';
  const siteAddress = (opts.siteAddress || '').trim();
  const dest = order.destination === 'factory'
    ? FACTORY_ADDRESS
    : (siteAddress ? `Job site:\n${siteAddress}` : 'Job site: [SITE ADDRESS - fill in]');
  const lines = order.items.map((l) => {
    const unitBit = l.orderUnit && l.orderUnit !== 'each' ? ` (${l.orderUnit})` : '';
    const sku = l.material && l.material.sku ? `  [${l.material.sku}]` : '';
    let s = `- ${l.orderQty} x ${l.name}${unitBit}${sku}`;
    // Panel schedules and cut instructions travel with the order line.
    if (/insulated wall panel/i.test(l.name) && l.derivation) s += `\n    ${l.derivation}`;
    return s;
  });
  const subject = `Purchase order ${ref} - Garden Office Buildings`;
  const body = [
    'Hi,',
    '',
    `Please can we place the following order. Our reference: ${ref}.`,
    '',
    ...lines,
    '',
    'Delivery address:',
    dest,
    '',
    'Please confirm price and delivery date. Any questions, call us on 01689 818 400.',
    '',
    'Thanks,',
    'Garden Office Buildings',
    'info@gardenofficebuildings.co.uk · 01689 818 400',
  ].join('\n');
  return { subject, body };
}

export function catalogueEmptyMaterial() {
  return { name: '', category: '', sku: '', unit: 'each', unitCost: 0, supplier: '', packSize: null, orderUnit: '', destination: 'site', inStock: false, notes: '' };
}
