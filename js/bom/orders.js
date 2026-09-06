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
      // Never let a slow/offline Firestore hold the page up: 4s cap, then fall back.
      const doc = await Promise.race([
        db.collection('settings').doc('catalogue').get(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Firestore catalogue read timed out')), 4000)),
      ]);
      if (doc.exists) {
        const saved = doc.data();
        if (saved && Array.isArray(saved.materials)) return mergeShipped(saved, base);
      }
    }
  } catch (e) { console.warn('Firestore catalogue load failed', e); }
  try {
    const ls = localStorage.getItem(LS_KEY);
    if (ls) {
      const saved = JSON.parse(ls);
      if (saved && Array.isArray(saved.materials)) return mergeShipped(saved, base);
    }
  } catch (e) { /* ignore */ }
  return base || { version: 1, suppliers: [], materials: [] };
}

/**
 * Bring a SAVED catalogue up to date with the shipped data/catalogue.json
 * without overwriting anything Liam has edited: new materials/suppliers are
 * added, and a saved cost of £0 is filled from the shipped cost (with its
 * notes). Non-zero saved costs, suppliers and routing are left alone.
 */
export function mergeShipped(saved, base) {
  if (!base || !Array.isArray(base.materials)) return saved;
  const out = { ...saved, materials: [...saved.materials], suppliers: [...(saved.suppliers || [])], installers: [...(saved.installers || [])] };
  const have = new Map(out.materials.map((m) => [m.name.toLowerCase(), m]));
  // Structure sync: when the shipped catalogue is NEWER than the saved copy,
  // the shipped units / pack sizes / order units / categories / supply modes /
  // notes win (they are code-driven), while saved COSTS, suppliers, supplier
  // emails, stock counts and installers are kept. Items dropped from the
  // shipped file are dropped too.
  const newer = (base.version || 0) > (saved.version || 0);
  const shippedNames = new Set(base.materials.map((m) => m.name.toLowerCase()));
  for (const bm of base.materials) {
    const sm = have.get(bm.name.toLowerCase());
    if (!sm) { out.materials.push({ ...bm }); continue; }
    if (newer) {
      for (const k of ['unit', 'packSize', 'orderUnit', 'category', 'supply', 'destination', 'inStock', 'notes', 'sku']) sm[k] = bm[k];
      if (sm.supplier === 'Local timber merchant') sm.supplier = 'Builders merchant'; // merged 2026-09-06
      if (!(sm.unitCost > 0) && bm.unitCost > 0) sm.unitCost = bm.unitCost;
      if (!sm.supplier && bm.supplier) sm.supplier = bm.supplier;
    } else if (!(sm.unitCost > 0) && bm.unitCost > 0) {
      sm.unitCost = bm.unitCost;
      if (bm.notes && !(sm.notes || '').includes('CLAUDE ESTIMATE')) sm.notes = bm.notes;
      if (!sm.supplier && bm.supplier) sm.supplier = bm.supplier;
    }
  }
  if (newer) {
    out.materials = out.materials.filter((m) => shippedNames.has(m.name.toLowerCase()));
    const tm = out.suppliers.find((s) => s.name === 'Local timber merchant');
    const bmS = out.suppliers.find((s) => s.name === 'Builders merchant');
    if (tm && bmS && !bmS.email && tm.email) bmS.email = tm.email;
    out.suppliers = out.suppliers.filter((s) => s.name !== 'Local timber merchant' && s.name !== 'Factory Direct Flooring');
    for (const bs of base.suppliers || []) if (!out.suppliers.some((s) => s.name.toLowerCase() === bs.name.toLowerCase())) out.suppliers.push({ ...bs });
    out.version = base.version;
  }
  const haveSup = new Set(out.suppliers.map((s) => s.name.toLowerCase()));
  for (const bs of base.suppliers || []) if (!haveSup.has(bs.name.toLowerCase())) out.suppliers.push({ ...bs });
  return out;
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

// ---------------------------------------------------------------------------
// STOCK-LENGTH PLANNING (Liam 2026-09-05: "suggest the optimal size... use
// common sizes as they are most affordable and available").
// Sawn/treated carcassing (C16/C24) is stocked in 3.6 / 4.2 / 4.8 / 5.4 / 6.0m
// (2.4 + 3.0 also common). CLS is 2.4 / 3.0 / 3.6 / 4.2 / 4.8m. Battens
// 2.4 / 3.0 / 3.6 / 4.8m. Firrings are custom made - no stock plan, we just
// state the exact pieces.
// ---------------------------------------------------------------------------
// `splittable`: plates, rails and battens are routinely made of two pieces
// joined over a stud/joist, so an over-length run is planned as joined pieces.
// Structural joists are NOT split - anything over 6.0m is flagged.
const STOCK_LENGTHS = [
  { test: /firring/i, lengths: null },
  { test: /\bCLS\b/i, lengths: [2.4, 3.0, 3.6, 4.2, 4.8], splittable: true },
  { test: /batten/i, lengths: [2.4, 3.0, 3.6, 4.8], splittable: true },
  { test: /2x2/i, lengths: [2.4, 3.0, 3.6, 4.8], splittable: true },
  { test: /C(16|24)|tanalised|treated|timber|joist/i, lengths: [2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0], splittable: false },
];
const SPARE_FACTOR = 1.10; // Liam: "rather over order than under order"

export function stockRuleFor(name) {
  for (const r of STOCK_LENGTHS) if (r.test.test(name)) return r.lengths ? r : null;
  return null;
}
export function stockLengthsFor(name) { const r = stockRuleFor(name); return r ? r.lengths : null; }

/**
 * Plan stock lengths for a list of cuts [{ len, n, what }].
 * Greedy per cut group: pick the stock length with the least waste PER PIECE
 * (ties -> shorter stock, easier to handle/deliver). Pieces longer than the
 * longest stock are flagged (need a joined/special length).
 * Returns { lengths: {stockLen: count}, totalM, notes[], text }.
 */
export function planStock(cuts, stockLengths, splittable = false) {
  const lengths = {};
  const notes = [];
  let totalM = 0;
  const maxL = stockLengths[stockLengths.length - 1];
  // Expand over-length runs into joined pieces where that is normal practice.
  const work = [];
  for (const c of cuts) {
    if (!c || !(c.len > 0) || !(c.n > 0)) continue;
    if (c.len > maxL + 1e-6 && splittable) {
      const k = Math.ceil(c.len / maxL);
      work.push({ len: c.len / k, n: c.n * k, what: `${c.what || 'pieces'} - each ${c.len.toFixed(2)}m run made of ${k} joined pieces` });
    } else work.push(c);
  }
  for (const c of work) {
    const n = Math.ceil(c.n * SPARE_FACTOR);
    const fits = stockLengths.filter((L) => L + 1e-6 >= c.len);
    if (fits.length === 0) {
      const L = stockLengths[stockLengths.length - 1];
      notes.push(`${n} x ${c.len.toFixed(2)}m (${c.what || 'pieces'}) LONGER THAN ${L}m STOCK - order ${n} special lengths or join over a bearing`);
      lengths[`${c.len.toFixed(2)}*`] = (lengths[`${c.len.toFixed(2)}*`] || 0) + n;
      totalM += n * c.len;
      continue;
    }
    let best = null;
    for (const L of fits) {
      const per = Math.floor(L / c.len + 1e-6);
      const wastePerPiece = (L - per * c.len) / per;
      if (!best || wastePerPiece < best.wastePerPiece - 1e-6 || (Math.abs(wastePerPiece - best.wastePerPiece) < 1e-6 && L < best.L)) {
        best = { L, per, wastePerPiece };
      }
    }
    const count = Math.ceil(n / best.per);
    lengths[best.L] = (lengths[best.L] || 0) + count;
    totalM += count * best.L;
    notes.push(`${n} x ${c.len.toFixed(2)}m (${c.what || 'pieces'}) -> ${count} x ${best.L}m (${best.per} per length)`);
  }
  const text = Object.entries(lengths)
    .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
    .map(([L, k]) => `${k} x ${L}m`)
    .join(' + ');
  return { lengths, totalM: Math.round(totalM * 10) / 10, notes, text };
}

/**
 * SUPPLY modes (Liam 2026-09-05 pm): one choice per line replaces the old
 * stock tick + site/factory destination.
 *   'site'    = supplier delivers straight to site (ORDER needed)
 *   'factory' = supplier delivers to Biggin Hill, we load + bring it (ORDER needed)
 *   'stock'   = from factory stock, we bring it (NO order)
 */
export const SUPPLY_MODES = [
  { value: 'site', label: 'Supplier → site', long: 'Supplier delivers straight to site' },
  { value: 'factory', label: 'Supplier → factory, we bring it', long: 'Supplier delivers to the factory (Biggin Hill); logistics load + deliver to site' },
  { value: 'stock', label: 'Factory stock, we bring it', long: 'From factory stock - nothing to order; logistics load + deliver to site' },
];
export function supplyFor(mat, ov) {
  if (ov && ov.supply) return ov.supply;
  if (ov && ov.inStock === true) return 'stock';
  if (ov && ov.destination) return ov.destination;
  if (!mat) return 'site';
  if (mat.supply) return mat.supply;
  if (mat.inStock) return 'stock';
  return mat.destination === 'factory' ? 'factory' : 'site';
}

/**
 * Join BOM rows to catalogue materials by name.
 * `overrides` = per-JOB { [name]: { supply? } } - so factory stock can be
 * allocated to one job without changing the catalogue default (everything
 * is supplier-to-site as standard - Liam 2026-09-05).
 */
export function mergeBomRows(bomRows) {
  const out = new Map();
  for (const r of bomRows) {
    const key = r.name.toLowerCase();
    if (!out.has(key)) { out.set(key, { ...r, cuts: r.cuts ? [...r.cuts] : undefined }); continue; }
    const m = out.get(key);
    m.qty = Math.round((m.qty + r.qty) * 100) / 100;
    if (r.costQty || m.costQty) m.costQty = (m.costQty || 0) + (r.costQty || 0);
    if (r.orderText) m.orderText = m.orderText ? `${m.orderText} + ${r.orderText}` : r.orderText;
    m.derivation = `${m.derivation}\n+ ${r.derivation}`;
    if (r.cuts) m.cuts = [...(m.cuts || []), ...r.cuts];
  }
  return [...out.values()];
}

export function joinBom(bomRows, catalogue, overrides = {}) {
  const byName = new Map(catalogue.materials.map((m) => [m.name.toLowerCase(), m]));
  return mergeBomRows(bomRows).map((r) => {
    const mat = byName.get(r.name.toLowerCase()) || null;
    const ov = overrides[r.name] || {};
    const packSize = mat && mat.packSize > 0 ? mat.packSize : 1;
    let orderQty = Math.max(0, Math.ceil(r.qty / packSize - 1e-9));
    let orderUnit = mat && mat.orderUnit ? mat.orderUnit : (mat ? mat.unit : '');
    let lineCost = mat ? (mat.unitCost || 0) * (r.costQty > 0 ? r.costQty : r.qty) : 0;
    let stockPlan = null;
    const orderText = r.orderText || '';
    const stockRule = r.cuts ? stockRuleFor(r.name) : null;
    if (r.cuts && stockRule) {
      stockPlan = planStock(r.cuts, stockRule.lengths, !!stockRule.splittable);
      orderQty = Object.values(stockPlan.lengths).reduce((a, b) => a + b, 0);
      orderUnit = stockPlan.text ? `lengths: ${stockPlan.text}` : orderUnit;
      // cost on the metres actually bought (catalogue cost is per linear m)
      if (mat && /m\b/i.test(mat.unit || '')) lineCost = (mat.unitCost || 0) * stockPlan.totalM;
    }
    return {
      ...r,
      material: mat,
      supplier: mat ? mat.supplier || '' : '',
      unit: mat ? mat.unit : '',
      unitCost: mat ? mat.unitCost || 0 : 0,
      lineCost,
      orderQty,
      orderUnit,
      stockPlan,
      orderText,
      supply: supplyFor(mat, ov),
      // derived (kept for the ordering code): stock lines are never ordered;
      // 'factory' orders are addressed to Biggin Hill
      destination: supplyFor(mat, ov) === 'factory' ? 'factory' : 'site',
      inStock: supplyFor(mat, ov) === 'stock',
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
  // (factory-bound orders: our logistics team brings these to site later)
  const lines = order.items.map((l) => {
    const unitWord = l.orderUnit && l.orderUnit !== 'each' ? l.orderUnit : '';
    const unitBit = unitWord && !new RegExp(`\\b${unitWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(l.name) ? ` (${unitWord})` : '';
    const sku = l.material && l.material.sku ? `  [${l.material.sku}]` : '';
    let s;
    const unitLabel = /^(each|panel|board|sheet)$/i.test(l.unit || '') ? '' : ` ${l.unit || ''}`;
    const needed = `  (${l.qty}${unitLabel} needed)`;
    if (l.stockPlan && l.stockPlan.text) {
      s = `- ${l.name}: ${l.stockPlan.text}${sku}${needed}`;
      for (const n of l.stockPlan.notes) s += `\n    ${n}`;
    } else if (l.orderText) {
      const showNeeded = /m²|m2|linear|^m$/i.test(l.unit || '') && !/needed/i.test(l.orderText);
      s = `- ${l.name}: ${l.orderText}${sku}${showNeeded ? needed : ''}`;
    } else if (l.orderUnit && l.orderUnit !== l.unit) {
      const sameCount = Number(l.orderQty) === Number(l.qty);
      s = `- ${l.orderQty} × ${l.orderUnit} - ${l.name}${sku}${sameCount ? '' : needed}`;
    } else if (/m²|m2|linear m|^m$/i.test(l.unit || '')) {
      s = `- ${l.name}: ${l.qty} ${l.unit}${sku}  (please supply in your standard sheet/roll/length size to cover this)`;
    } else {
      s = `- ${l.orderQty} × ${l.name}${unitBit}${sku}`;
    }
    // Panel schedules, firring specs and cut instructions travel with the order line.
    if (/insulated wall panel|firring/i.test(l.name) && l.derivation) s += `\n    ${l.derivation.split('\n')[0]}`;
    return s;
  });
  const subject = `Purchase order ${ref} - Garden Office Buildings`;
  const note = (opts.supplierNotes || {})[order.supplierName] || {};
  const body = [
    'Hi,',
    '',
    `Please can we place the following order. Our reference: ${ref}.`,
    '',
    ...lines,
    '',
    'Delivery address:',
    dest,
    ...(note.delivery ? ['', `Requested delivery: ${note.delivery}`] : []),
    ...(note.notes ? ['', `Notes: ${note.notes}`] : []),
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
  return { name: '', category: '', sku: '', unit: 'each', unitCost: 0, supplier: '', packSize: null, orderUnit: '', supply: 'site', destination: 'site', inStock: false, notes: '' };
}
