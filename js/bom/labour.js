// LABOUR + SUBCONTRACT COST for the Materials & Orders costing page.
//
// LIAM'S MODEL (2026-09-05 pm): team of 2 @ £200/day each = £400/day.
//   BUILD DAYS by model size (everything standard is inside these days:
//   floor, walls, roof, plaster + decoration, front cladding, standard
//   canopy + decking, main door; plastering arranged + paid by the installer):
//     Midi  4.0 x 3.0  = 12 days (£4,800)   [Liam 2026-09-06]
//     Maxi  5.0 x 3.5  = 14 days (£5,600)
//     Multi 6.0 x 4.0  = 16 days (£6,400)
//     Multi+ 7.0 x 4.5 = 18 days (£7,200)
//   PLUS on EVERY job: 1 day delivery + 2 days groundworks = 3 days (£1,200).
//   So a Maxi = 17 days = £6,800.
//   EXTRAS add days on top (partition, extra height, side cladding, etc.).
//   Electrics are the ELECTRICIAN's (fixed rates) - never in the team days.
//
// The quote's "Installation & Groundworks" (pricing.js, £5,000-£16,000 by
// area band) is what the CUSTOMER pays - revenue. This file is the COST.

export const DEFAULT_DAY_RATE = 400;      // 2 x £200
export const DELIVERY_DAYS = 1;
export const GROUNDWORKS_DAYS = 2;

/** Build days by EXTERNAL footprint (m²), bands set around the 4 models.
 *  Beyond Multi+ (31.5m²): +2 days per extra 7m² (ESTIMATE). */
export function buildDaysFor(externalAreaM2) {
  // Liam 2026-09-06: build labour down £400 (1 day) across the board:
  // Midi 12 / Maxi 14 (£5,600) / Multi 16 / Multi+ 18.
  if (externalAreaM2 <= 14.75) return { days: 12, model: 'Midi' };     // 4.0x3.0 = 12.0  (Liam 2026-09-06: Midi is 12)
  if (externalAreaM2 <= 20.75) return { days: 14, model: 'Maxi' };     // 5.0x3.5 = 17.5
  if (externalAreaM2 <= 27.75) return { days: 16, model: 'Multi' };    // 6.0x4.0 = 24.0
  if (externalAreaM2 <= 35) return { days: 18, model: 'Multi+' };      // 7.0x4.5 = 31.5
  return { days: 18 + 2 * Math.ceil((externalAreaM2 - 35) / 7), model: 'larger than Multi+ (ESTIMATE +2 days per 7m²)' };
}

const DOOR_CATS = new Set(['sliding', 'bifold', 'french', 'door', 'single']);

export function computeLabour(state, componentDefs) {
  const lab = state.labour || {};
  const dayRate = lab.dayRate > 0 ? lab.dayRate : DEFAULT_DAY_RATE;
  const w = state.width / 1000, d = state.depth / 1000;
  const externalArea = w * d;
  const extH = Math.max(state.height || 2500, 2500 + (state.structuralExtras?.heightUpgrade || 0));
  const comps = state.components || [];
  const cat = (c) => (componentDefs[c.type] || {}).category || 'standard';
  const doors = comps.filter((c) => DOOR_CATS.has(cat(c)));
  const nonFrontWindows = comps.filter((c) => !DOOR_CATS.has(cat(c)) && c.elevation !== 'front');
  const isSteel = (c) => c === 'anthracite-steel' || c === 'grey-steel';
  const slattedSides = ['left', 'right'].filter((s) => !isSteel(state.cladding?.[s])).length;
  const screens = (state.externalFeatures || []).filter((f) => /privacy/i.test(f.type || '')).length;
  const hasCanopy = state.tier === 'signature' && state.hasCanopy !== false && !state.deductions?.removeCanopy;

  const lines = [];
  const day = (id, label, days, est) => { if (days) lines.push({ id, label, days, amount: Math.round(days * dayRate), estimate: !!est }); };

  const base = buildDaysFor(externalArea);
  day('build', `Build - ${base.model} band (${externalArea.toFixed(1)}m² external): floor, walls, roof, plaster & decorate (installer's plasterer), front cladding, canopy & decking, main door`, base.days, /ESTIMATE/.test(base.model));
  day('delivery', 'Delivery (1 day)', DELIVERY_DAYS);
  day('groundworks', 'Groundworks - Ground Screw or Concrete Block System (2 days)', GROUNDWORKS_DAYS);

  // ---- EXTRAS (clear additions to the standard build) ----
  if (state.partitionRoom?.enabled) day('partition', `Partition room (${state.partitionRoom.label || state.partitionRoom.type}) incl. interior door`, 2.0);
  if (extH >= 2750) day('height', `Extra height (${(extH / 1000).toFixed(2)}m external): taller walls, joist oversail canopy box, more board`, 1.0, true);
  if (state.bathroom?.enabled) day('bathroom', `${state.bathroom.type === 'wc' ? 'WC' : 'Shower room'} carpentry/tiling fit-out (plumber separate, see subcontract)`, 1.0, true);
  if (slattedSides) day('side_cladding', `Slatted cladding on ${slattedSides} side wall${slattedSides === 1 ? '' : 's'}: stick wall + cladding (0.5 day each)`, slattedSides * 0.5, true);
  if (nonFrontWindows.length) day('windows', `Windows on side/rear walls ×${nonFrontWindows.length} (0.5 day each)`, nonFrontWindows.length * 0.5, true);
  const extraDoors = Math.max(0, doors.length - 1);
  if (extraDoors) day('extra_doors', `Additional doors ×${extraDoors} (0.5 day each)`, extraDoors * 0.5, true);
  if (state.structuralExtras?.secretDoor) day('secret_door', 'Secret cladded door (clad + hang on site)', 0.5, true);
  if ((state.structuralExtras?.additionalDecking || 0) > 0) day('extra_decking', `Extra decking rows ×${state.structuralExtras.additionalDecking}`, 0.5, true);
  if (screens) day('privacy', `Privacy screens ×${screens} (0.5 day each)`, screens * 0.5, true);
  // Manual adjustment (± days) for anything else on this job
  const adj = Number(lab.extraDays || 0);
  if (adj) day('adjust', lab.extraDaysLabel || 'Job-specific adjustment', adj);

  const installDays = Math.round(lines.reduce((s, l) => s + (l.days || 0), 0) * 2) / 2;
  const installTotal = lines.reduce((s, l) => s + l.amount, 0);

  // ---- ELECTRICIAN (subcontracted, fixed rates) ----
  const elec = [];
  const efixed = (id, label, amount) => { if (amount) elec.push({ id, label, days: null, amount: Math.round(amount) }); };
  // Electrician labour only (GOB supplies all electrical materials): £500 small
  // (4 downlights) / £600 medium (6-8) / £700 large (10-12) - Liam 2026-09-05.
  const intM2 = (w - 0.3) * (d - 0.3);
  const elecFee = intM2 <= 12 ? 500 : intM2 <= 24 ? 600 : 700;
  efixed('electrical_package', `Electrician - standard pack 1st + 2nd fix (${intM2 <= 12 ? 'small' : intM2 <= 24 ? 'medium' : 'large'} building), labour only`, elecFee);
  if (hasCanopy) efixed('canopy_lights', `Canopy lights ×${Math.max(1, Math.floor(w))} (£25 each)`, Math.max(1, Math.floor(w)) * 25);
  if ((state.acUnits || []).length) efixed('ac', `Air conditioning install ×${state.acUnits.length} (£400 each)`, state.acUnits.length * 400);
  const upDown = (state.externalFeatures || []).filter((f) => f.type === 'upDownLight').length;
  if (upDown) efixed('updown', `Up/down lights ×${upDown} (£30 each)`, upDown * 30);
  const elecTotal = elec.reduce((s, l) => s + l.amount, 0);

  // ---- OTHER SUBCONTRACT (editable: plumber etc.) ----
  const sub = [];
  const other = Number(lab.otherSubcontract || 0);
  if (other) sub.push({ id: 'other', label: lab.otherSubcontractLabel || 'Other subcontract (plumber etc.)', days: null, amount: Math.round(other) });
  const subTotal = sub.reduce((s, l) => s + l.amount, 0);
  const needsPlumber = !!state.bathroom?.enabled && !other;

  return {
    dayRate, externalArea, model: base.model, buildDays: base.days,
    install: { lines, total: installTotal, days: installDays },
    electrician: { lines: elec, total: elecTotal },
    subcontract: { lines: sub, total: subTotal, needsPlumber },
    total: installTotal + elecTotal + subTotal,
  };
}
