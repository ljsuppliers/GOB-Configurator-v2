// LABOUR + SUBCONTRACT COST for the Materials & Orders costing page.
// Ported from the designer's labourPricing.ts (Liam's Jul-2026 figures:
// £400/day, base days by internal area, £400 delivery, per-item extras,
// electrician fixed rates). That model was written for the PANEL system; the
// premium timber floor/roof/EPDM build gets an EDITABLE extra-days line
// (default is a flagged ESTIMATE) until Liam sets real day counts.
//
// NOTE: the quote's "Installation & Groundworks" figure (pricing.js, by
// external area band £5,000-£16,000) is what the CUSTOMER PAYS - revenue. The
// numbers here are what the job COSTS GOB in labour + subcontract.

export const DEFAULT_DAY_RATE = 400;
export const DELIVERY_AMOUNT = 400;
export const DEFAULT_PREMIUM_EXTRA_DAYS = 2; // ESTIMATE - Liam to set

export function baseInstallDaysFor(internalAreaM2) {
  if (internalAreaM2 <= 12) return 8;
  if (internalAreaM2 <= 16) return 9;
  if (internalAreaM2 <= 20) return 10;
  if (internalAreaM2 <= 24) return 11;
  return 12;
}

const DOOR_CATS = new Set(['sliding', 'bifold', 'french', 'door', 'single']);

/**
 * @param state 2D configurator state (mm, external excl. canopy)
 * @param componentDefs merged doors+windows map
 * @returns { dayRate, install: {lines,total,days}, electrician: {lines,total}, subcontract: {lines,total}, total, settings }
 */
export function computeLabour(state, componentDefs) {
  const lab = state.labour || {};
  const dayRate = lab.dayRate > 0 ? lab.dayRate : DEFAULT_DAY_RATE;
  const premiumExtraDays = lab.premiumExtraDays !== undefined && lab.premiumExtraDays !== null && lab.premiumExtraDays !== ''
    ? Number(lab.premiumExtraDays) : DEFAULT_PREMIUM_EXTRA_DAYS;
  const w = state.width / 1000, d = state.depth / 1000;
  const internalArea = Math.max(0, (w - 0.3) * (d - 0.3));
  const hasCanopy = state.tier === 'signature' && state.hasCanopy !== false && !state.deductions?.removeCanopy;
  const hasDecking = state.tier === 'signature' && state.hasDecking !== false && !state.deductions?.removeDecking;
  const comps = state.components || [];
  const cat = (c) => (componentDefs[c.type] || {}).category || 'standard';
  const doors = comps.filter((c) => DOOR_CATS.has(cat(c)));
  const nonFrontWindows = comps.filter((c) => !DOOR_CATS.has(cat(c)) && c.elevation !== 'front');
  const isSteel = (c) => c === 'anthracite-steel' || c === 'grey-steel';
  const slattedSides = ['left', 'right'].filter((s) => !isSteel(state.cladding?.[s])).length;
  const screens = (state.externalFeatures || []).filter((f) => /privacy/i.test(f.type || '')).length;

  const lines = [];
  const day = (id, label, days, est) => { if (days) lines.push({ id, label, days, amount: Math.round(days * dayRate), estimate: !!est }); };
  const fixed = (id, label, amount, est) => { if (amount) lines.push({ id, label, days: null, amount: Math.round(amount), estimate: !!est }); };

  const baseDays = baseInstallDaysFor(internalArea);
  day('base', `Base install - ${internalArea.toFixed(1)}m² internal (shell, roof, front cladding, interior, floor, main door)`, baseDays);
  day('plastered', 'Plastered & decorated interior (premium standard)', 2.5);
  day('premium_system', 'Premium timber floor + timber roof/EPDM vs panels - EXTRA DAYS (ESTIMATE, set your figure)', premiumExtraDays, true);
  fixed('delivery', 'Delivery (standard)', DELIVERY_AMOUNT);
  if (nonFrontWindows.length) day('windows', `Windows on side/rear walls ×${nonFrontWindows.length} (0.5 day each)`, nonFrontWindows.length * 0.5);
  const extraDoors = Math.max(0, doors.length - 1);
  if (extraDoors) day('extra_doors', `Additional doors ×${extraDoors} (0.5 day each)`, extraDoors * 0.5);
  if (state.partitionRoom?.enabled) day('partition', `Partition room (${state.partitionRoom.label || state.partitionRoom.type}) incl. interior door`, 2.0);
  if (slattedSides) day('side_cladding', `Slatted cladding on ${slattedSides} side wall${slattedSides === 1 ? '' : 's'} (0.5 day each)`, slattedSides * 0.5);
  if (hasCanopy) day('canopy', 'Canopy (structure + soffit + fascia + lights wiring route)', 1.0);
  if (hasDecking) {
    const deckDepth = ((state.deckingDepth || 400) + (state.structuralExtras?.additionalDecking || 0) * 140) / 1000;
    day('decking', `Decking ${w.toFixed(1)}m × ${deckDepth.toFixed(2)}m`, Math.min(2, 1 + (w * deckDepth) / 10));
  }
  if (screens) day('privacy', `Privacy screens ×${screens} (0.5 day each)`, screens * 0.5);
  if (state.structuralExtras?.secretDoor) day('secret_door', 'Secret cladded door (clad + hang on site)', 0.5, true);
  const installDays = lines.reduce((s, l) => s + (l.days || 0), 0);
  const installTotal = lines.reduce((s, l) => s + l.amount, 0);

  // Electrician (subcontracted, fixed rates)
  const elec = [];
  const efixed = (id, label, amount, est) => { if (amount) elec.push({ id, label, days: null, amount: Math.round(amount), estimate: !!est }); };
  efixed('electrical_package', 'Electrician - standard package, 1st + 2nd fix', 600);
  if (hasCanopy) efixed('canopy_lights', `Canopy lights ×${Math.max(1, Math.floor(w))} (£25 each)`, Math.max(1, Math.floor(w)) * 25);
  if ((state.acUnits || []).length) efixed('ac', `Air conditioning install ×${state.acUnits.length} (£400 each)`, state.acUnits.length * 400);
  const upDown = (state.externalFeatures || []).filter((f) => f.type === 'upDownLight').length;
  if (upDown) efixed('updown', `Up/down lights ×${upDown} (£30 each)`, upDown * 30);
  const elecTotal = elec.reduce((s, l) => s + l.amount, 0);

  // Other subcontract (editable): plumber for bathroom/WC, groundworks etc.
  const sub = [];
  const other = Number(lab.otherSubcontract || 0);
  if (other) sub.push({ id: 'other', label: lab.otherSubcontractLabel || 'Other subcontract (plumber / groundworks)', days: null, amount: Math.round(other) });
  const subTotal = sub.reduce((s, l) => s + l.amount, 0);
  const needsPlumber = !!state.bathroom?.enabled && !other;

  return {
    dayRate, premiumExtraDays, internalArea,
    install: { lines, total: installTotal, days: installDays },
    electrician: { lines: elec, total: elecTotal },
    subcontract: { lines: sub, total: subTotal, needsPlumber },
    total: installTotal + elecTotal + subTotal,
  };
}
