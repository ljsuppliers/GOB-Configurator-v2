// PREMIUM build system BOM engine for the 2D configurator.
// Ported from the designer's bomRules.ts premium path (2026-09-05) so both
// tools agree on quantities. All state dimensions are EXTERNAL millimetres.
//
// Premium system (confirmed with Liam 2026-08/09):
//  - Pedestals on the slab (or ground screws), 5x2 C24 floor frame DIRECTLY
//    on the pedestal heads (NO bearer layer). Outer ring doubled + every 3rd
//    joist doubled (1.2m grid). 75mm PIR on 18x38 side battens, 22mm P5 T&G.
//  - 100mm Kingspan panels on the rear + any steel-clad side, ALL ONE LENGTH
//    (square building, no raked sides). 3x2 CLS lining frame inside them.
//  - Front always stick: 4x2 CLS @400, treated sole plate, 12mm ply, Tyvek,
//    75mm PIR in the bays. Slat-clad sides also stick (rockwool in bays).
//  - Flat timber roof: joist ladder by span, stock firrings 75/100mm -> 0
//    at the rear + 4 reverse firrings squaring the sides, 18mm T&G OSB,
//    one-piece EPDM. Vented cold roof: 100mm PIR set 30mm below joist tops.
//  - CANOPY METHOD (Liam 2026-09-05, corrects the earlier "joists always
//    oversail" rule):
//      * 2.5m building: joists STOP at the front wall (no height to spare).
//        The firrings (tall 75mm end) run on over the joists and OVERHANG the
//        front by 400mm - they form the canopy. A 2x2 frame is then built on
//        the top-front of the front wall underneath them, fixed to the front
//        top plate and to the flitch beam over the door.
//      * 2.75m / 3.0m building: roof JOISTS oversail the front by 400mm,
//        firrings on top, plus ONE layer of 2x2 under the oversailed joists to
//        make a bigger overhang box.
//      * Classic (no canopy): 100mm overhang only (a token canopy).
//      * EVERY job: roof joists AND firrings oversail the REAR by 100mm.
//      * Ply on the front face + underside of the canopy frame on every
//        canopied build (2x2 frame or oversailed joists) - fascia + soffit
//        need something solid to fix to.
//  - Insulation: 75mm PIR in ALL stick-wall bays (front + clad sides).
//    Rockwool is partition walls only. No foam tape (no roof panels).
//  - EXTERNAL DIMENSIONS EXCLUDE the 400mm canopy/decking (Liam 2026-09-05).
//    Internal = external - 150mm per wall.
//  - Timber rows carry `cuts` [{len, n}] so orders.js can plan stock lengths.
//  - Plastered + decorated interior ONLY. Electrical pack ALWAYS included,
//    canopy lights standard with the signature canopy.
//  - Corners: open or closed (closed = side wall carried +400mm forward).
//    "Corner trims" / "Close corner trims" are named lines, products TBC.

const PANEL_W = 1.1;          // Kingspan cover width, m
const PLY_SHEET_M2 = 1.22 * 2.44;
const OSB_TG_M2 = 2.4 * 0.59; // 18mm T&G roof boards
const CHIPBOARD_M2 = 1.44;    // 22mm P5 T&G 2400x600
const PLASTERBOARD_M2 = 1.2 * 2.4;

export function wallPanelHeightFor(heightM) {
  const map = { 2.5: 2.14, 2.75: 2.35, 3.0: 2.5, 3.5: 2.85 };
  return map[heightM] ?? Math.max(0, heightM - 0.35);
}

export function premiumRoofLadder(spanM) {
  if (spanM <= 2.9) return { sku: '6x2 tanalised C24 timber', label: 'single 6x2', spacing: 0.4, ply: 1, web: false, depthM: 0.145 };
  if (spanM <= 3.6) return { sku: '6x2 tanalised C24 timber', label: 'doubled 6x2 + 18mm OSB web', spacing: 0.4, ply: 2, web: true, depthM: 0.145 };
  if (spanM <= 4.0) return { sku: '6x2 tanalised C24 timber', label: 'doubled 6x2 + 18mm OSB web @300mm', spacing: 0.3, ply: 2, web: true, depthM: 0.145 };
  return { sku: '7x2 tanalised C24 timber', label: 'doubled 7x2 + 18mm OSB web @300mm', spacing: 0.3, ply: 2, web: true, depthM: 0.17 };
}

const isSteel = (c) => c === 'anthracite-steel' || c === 'grey-steel';

/** Openings on a given elevation from the 2D component list. */
function openingsOn(state, componentDefs, elevation) {
  return (state.components || [])
    .filter((c) => c.elevation === elevation)
    .map((c) => {
      const def = componentDefs[c.type] || {};
      return {
        type: c.type,
        widthM: (def.width || 900) / 1000,
        heightM: (def.height || 2100) / 1000,
        category: def.category || 'standard',
        fullHeight: def.category === 'sliding' || def.category === 'bifold' || def.category === 'french'
          || def.category === 'door' || def.category === 'fullHeight',
      };
    });
}

/**
 * Build the premium BOM. Returns [{ name, qty, derivation }].
 * `state` is the 2D configurator state (mm, external). `componentDefs` is the
 * merged doors+windows map from data/components.json.
 */
export function buildPremiumBom(state, componentDefs) {
  const w = state.width / 1000;          // external width, m
  const d = state.depth / 1000;          // external depth, m
  // External height: the height box OR 2.5m + the priced height upgrade
  // (250/450/500mm), whichever is taller - Liam sets one or the other.
  const heightUpgradeMm = state.structuralExtras?.heightUpgrade || 0;
  const extHeightMm = Math.max(state.height || 2500, 2500 + heightUpgradeMm);
  const h = extHeightMm / 1000;          // external height, m
  const tall = extHeightMm >= 2750;      // 2.75m / 3.0m builds: joists oversail
  const wallH = wallPanelHeightFor(h);
  const rows = [];
  // `cuts` = [{ len, n, what }] piece list for timber, so the ordering step
  // can pick the cheapest common stock lengths (3.6 / 4.2 / 4.8 / 5.4 / 6.0m).
  const add = (name, qty, derivation, cuts) => {
    if (qty > 0) rows.push(cuts ? { name, qty, derivation, cuts } : { name, qty, derivation });
  };

  const groundScrews = state.foundationType === 'ground-screw';
  const hasCanopy = !!state.hasCanopy && !state.deductions?.removeCanopy;
  const hasDecking = !!state.hasDecking && !state.deductions?.removeDecking;
  // Signature canopy = 400mm. Classic = 100mm token overhang (Liam 2026-09-05).
  const canopyM = hasCanopy ? (state.overhangDepth || 400) / 1000 : 0.10;
  // How the canopy is formed depends on height (see header):
  const canopyMethod = !hasCanopy
    ? 'classic'
    : tall ? 'joists-oversail' : 'firrings-overhang';
  const closedCorners = ['cornerLeft', 'cornerRight'].filter((k) => state[k] === 'closed').length;
  const openCorners = (hasCanopy && hasDecking) ? 2 - closedCorners : 0;

  const front = openingsOn(state, componentDefs, 'front');
  const rear = openingsOn(state, componentDefs, 'rear');
  const left = openingsOn(state, componentDefs, 'left');
  const right = openingsOn(state, componentDefs, 'right');
  const fhOn = (ops) => ops.filter((o) => o.fullHeight);
  const fhWidth = (ops) => fhOn(ops).reduce((s, o) => s + o.widthM, 0);

  /* ---------- FOUNDATIONS ---------- */
  const cols = Math.ceil(w / 1.3) + 1;
  const rowsN = Math.ceil(d / 1.3) + 1;
  const pedestals = cols * rowsN;
  if (groundScrews) {
    add('Radix ground screw', pedestals, `${cols}x${rowsN} grid (max 1.3m spacing) under the 5x2 joist lines`);
  } else {
    add('Adjustable plastic pedestal', pedestals, `${cols}x${rowsN} grid (max 1.3m spacing), rows under the 5x2 joist lines - frame builds DIRECTLY on the heads (no bearers). Anchored to the slab`);
    add('DPM sheet', Math.ceil(w * d * 1.1), `Over the slab under the pedestals (${(w * d).toFixed(1)}m2 + 10% laps)`);
    add('Concrete frame anchor', pedestals * 2, `2 per pedestal (${pedestals} pedestals)`);
  }

  /* ---------- FLOOR (5x2, doubled ring + 1.2m grid) ---------- */
  const fJoists = Math.ceil(w / 0.4) + 1;
  const fDoubledInternals = Math.max(0, Math.floor((fJoists - 2) / 3));
  const fDoubledLm = 2 * w + 2 * d + fDoubledInternals * d;
  add('5x2 tanalised C24 timber', Math.ceil((fJoists * d + 2 * w + fDoubledLm) * 1.10),
    `Floor: ${fJoists} joists x ${d.toFixed(2)}m @400mm front-to-back + rim (2 x ${w.toFixed(2)}m) + DOUBLING (outer ring + every 3rd joist / 1.2m grid: ${fDoubledInternals} x ${d.toFixed(2)}m), +10%`,
    [{ len: d, n: fJoists + 2 + fDoubledInternals, what: 'floor joists incl. doubled sides + grid doubles' }, { len: w, n: 4, what: 'front + rear rim, doubled' }]);
  add('Structural timber screw (100mm)', Math.ceil(fDoubledLm / 0.4),
    `Laminating the doubled ring + grid pairs, 1 per 400mm staggered (${fDoubledLm.toFixed(1)}m of doubled run)`);
  add('Wood screw 40mm', pedestals * 4, `Joists/rim to pedestal head plates, 4 per pedestal`);
  add('18x38 treated batten', Math.ceil(2 * (fJoists - 1) * d), `Floor PIR support battens, joist sides, tops 75mm down`,
    [{ len: d, n: 2 * (fJoists - 1), what: 'floor PIR battens' }]);
  add('75mm PIR insulation board', Math.ceil(w * d), `Floor: friction-fit between the 5x2 joists, ${(w * d).toFixed(1)}m2`);
  add('22mm P5 T&G chipboard (2400x600)', Math.ceil((w * d) * 1.05 / CHIPBOARD_M2), `Floor deck: ${(w * d).toFixed(1)}m2 + 5%, glued at every joint`);
  add('Wood screw 60mm', Math.ceil(w * d * 12), `Floor deck ~12 screws/m2`);

  /* ---------- WALLS ---------- */
  // Panel walls: rear always; sides when steel-clad. Side run excludes the
  // stick front zone (110mm) and gains 400mm when that corner is CLOSED and
  // the closed section is panel-continuous? Closed-corner extension is
  // STICK-framed (assumption pending Liam) so panels stop at the front line.
  const sideRun = d - 0.11;
  const panelWalls = [];
  panelWalls.push({ label: 'rear', run: w, openings: fhOn(rear) });
  if (isSteel(state.cladding.left)) panelWalls.push({ label: 'left side', run: sideRun, openings: fhOn(left) });
  if (isSteel(state.cladding.right)) panelWalls.push({ label: 'right side', run: sideRun, openings: fhOn(right) });
  let panelCount = 0;
  const panelBits = [];
  for (const pw of panelWalls) {
    const net = Math.max(0, pw.run - pw.openings.reduce((s, o) => s + o.widthM, 0));
    const n = Math.ceil(net / PANEL_W);
    panelCount += n;
    panelBits.push(`${pw.label}: ${n}`);
  }
  if (panelCount > 0) {
    add('Kingspan 100mm insulated wall panel (1.1m wide)', panelCount,
      `TOTAL: ${panelCount} panels, ALL @ ${wallH.toFixed(2)}m length (square building, no angle cuts). ${panelBits.join(', ')}. Anthracite. Headers above openings cut from the opening cut-outs`);
    add('U-channel (40x102x40mm)', Math.ceil((panelWalls.reduce((s, p) => s + p.run, 0) + 8 * wallH) / 3),
      `Panel wall tops + corners + opening edges / 3m lengths`);
    add('Standard base trim (steel)', Math.ceil(panelWalls.reduce((s, p) => s + Math.max(0, p.run - p.openings.reduce((x, o) => x + o.widthM, 0)), 0) / 3),
      `Base trim capping the panel bottoms / 3m lengths`);
    // 3x2 CLS lining frame inside panel walls
    const liningRun = panelWalls.reduce((s, p) => s + Math.max(0, p.run - p.openings.reduce((x, o) => x + o.widthM, 0)), 0);
    const liningStuds = Math.ceil(liningRun / 0.6) + panelWalls.length;
    add('CLS 3x2 timber', Math.ceil((liningStuds * wallH + 2 * liningRun) * 1.10),
      `Lining frame on panel walls: studs @600mm (${liningStuds} x ${wallH.toFixed(2)}m) + top & bottom plates, +10%. Bays empty (panels insulate)`,
      [{ len: wallH, n: liningStuds, what: 'lining studs' }, ...panelWalls.map((p) => ({ len: p.run, n: 2, what: `${p.label} lining plates` }))]);
  }

  // Stick walls: front always + any slat-clad side + closed-corner extensions.
  // ALL stick-wall bays get 75mm PIR (Liam 2026-09-05: clad sides same as the
  // front; Rockwool is for partition walls only).
  const stickWalls = [{ label: 'front', run: w, openings: front }];
  if (!isSteel(state.cladding.left)) stickWalls.push({ label: 'left side', run: sideRun, openings: left });
  if (!isSteel(state.cladding.right)) stickWalls.push({ label: 'right side', run: sideRun, openings: right });
  let stickLm = 0, plySheets = 0, tyvekM2 = 0, pirWallM2 = 0, soleLm = 0;
  const stickCuts = [];
  const soleCuts = [];
  for (const sw of stickWalls) {
    const studs = Math.ceil(sw.run / 0.4) + 1;
    const fhCount = fhOn(sw.openings).length;
    const kings = fhCount * (6 * wallH + 2);
    stickLm += (studs * wallH + 2 * sw.run + sw.run /* noggins */ + 4 * wallH + kings) * 1.10;
    stickCuts.push({ len: wallH, n: studs + 4 + fhCount * 6, what: `${sw.label} studs + corner/king studs` });
    stickCuts.push({ len: sw.run, n: 3, what: `${sw.label} top plate x2 + noggin run` });
    soleCuts.push({ len: sw.run, n: 1, what: `${sw.label} sole plate` });
    const areaM2 = sw.run * wallH;
    plySheets += Math.ceil(areaM2 * 1.10 / PLY_SHEET_M2);
    tyvekM2 += Math.ceil(areaM2 * 1.10);
    const netM2 = Math.max(0, areaM2 - fhOn(sw.openings).reduce((s, o) => s + o.widthM * o.heightM, 0)) * 1.10;
    pirWallM2 += Math.ceil(netM2);
    soleLm += sw.run;
  }
  // Closed corners (Liam 2026-09-05): the +400mm forward section is built the
  // SAME WAY as that side wall (panel if steel side, 4x2 stick if clad side),
  // shares the side's external cladding, and its inside return is clad in the
  // FRONT wall's cladding. The canopy above it comes from the firring
  // overhang (2.5m) or the oversailing joists (2.75m/3.0m) - see header; the
  // closed corner gives it a little support.
  const closedCornerSides = ['cornerLeft', 'cornerRight']
    .filter((k) => state[k] === 'closed')
    .map((k) => (k === 'cornerLeft' ? 'left' : 'right'));
  for (const side of closedCornerSides) {
    const steelSide = isSteel(state.cladding[side]);
    if (steelSide) {
      panelCount += 1; // one extra 1.1m panel piece covers the 400mm extension
      add('Kingspan 100mm insulated wall panel (1.1m wide)', 1,
        `CLOSED ${side} corner: side wall carried ${(state.overhangDepth || 400)}mm forward in PANEL (matches the side wall) - cut from one extra panel @ ${wallH.toFixed(2)}m`);
    } else {
      stickLm += ((2 * wallH) + 3 * 0.4) * 1.10;
      stickCuts.push({ len: wallH, n: 2, what: `closed ${side} corner studs` });
      soleLm += 0.4;
      plySheets += 1;
      tyvekM2 += Math.ceil(0.4 * wallH * 1.2);
    }
    add('Front-cladding return (closed corner)', 1,
      `Inside return of the CLOSED ${side} corner clad in the FRONT wall cladding (${state.cladding.front}) - boards from the front-wall cladding order`);
  }
  if (closedCorners > 0) {
    add('Close corner trims', closedCorners, `1 set per CLOSED corner - product TBC with Liam`);
  }
  // Open corners: timber corner post built up from 4x2s (~200x200: 3-4
  // back-to-back + 1 on the side - team practice varies, standard TBC),
  // cloaked with the open corner trims. Doors/windows may meet glass-to-glass.
  if (openCorners > 0) {
    add('CLS 4x2 timber', Math.ceil(openCorners * 4 * wallH * 1.10),
      `OPEN corner post${openCorners === 1 ? '' : 's'}: ~200x200 built-up 4x2 post (4 x ${wallH.toFixed(2)}m per corner), cloaked by the corner trims`,
      [{ len: wallH, n: openCorners * 4, what: 'open-corner post members' }]);
  }
  add('Corner trims', Math.max(0, 4 - closedCorners), `Corner trim sets (incl. cloaking any open-corner posts) - product TBC`);
  add('CLS 4x2 timber', Math.ceil(stickLm - soleLm), `Stick walls (${stickWalls.map((x) => x.label).join(' + ')}${closedCorners ? ` + ${closedCorners} closed-corner extension${closedCorners === 1 ? '' : 's'}` : ''}): studs @400mm + plates + noggins + opening framing, +10%`, stickCuts);
  add('Treated CLS 4x2 timber', Math.ceil(soleLm * 1.10), `Stick-wall sole plates at deck level (treated)`, soleCuts);
  add('12mm Plywood (1220×2440 sheet)', plySheets, `Stick wall external sheathing + 10% (openings cut out on site)`);
  add('Tyvek breather membrane', tyvekM2, `Over the ply, under the battens (m2 + 10%)`);
  add('Tyvek/breather tape (roll)', 1, `Tape laps + around openings`);
  add('Staple box', 1, `Fix Tyvek before battens`);
  if (pirWallM2 > 0) add('75mm PIR insulation board', pirWallM2, `ALL stick wall bays (${stickWalls.map((x) => x.label).join(' + ')}): 75mm PIR friction-fit between the 4x2 studs (no Rockwool - partitions only)`);
  // Cladding boards + double-batten sub-frame on every slat-clad wall
  // (front always clad; sides when not steel). Closed-corner returns add
  // ~0.4m to the front-cladding run.
  const cladWalls = [];
  if (!isSteel(state.cladding.front)) cladWalls.push({ wall: 'front', type: state.cladding.front, run: w, ops: front });
  if (!isSteel(state.cladding.left)) cladWalls.push({ wall: 'left side', type: state.cladding.left, run: sideRun, ops: left });
  if (!isSteel(state.cladding.right)) cladWalls.push({ wall: 'right side', type: state.cladding.right, run: sideRun, ops: right });
  let cladBattenLm = 0;
  const cladTotals = new Map();
  for (const cw of cladWalls) {
    const openW = fhOn(cw.ops).reduce((s2, o) => s2 + o.widthM, 0);
    let run = Math.max(0, cw.run - openW);
    if (cw.wall === 'front') run += closedCorners * 0.4; // inside returns clad in front cladding
    const boardW = cw.type === 'western-red-cedar' || cw.type === 'larch' ? 0.14 : 0.2;
    const name = cw.type === 'western-red-cedar' ? 'Western Red Cedar slatted cladding 140×2500mm'
      : cw.type === 'larch' ? 'Larch slatted cladding 140×2500mm'
      : cw.type === 'composite-latte' ? 'Composite slatted cladding (Latte) 200×2500mm'
      : 'Composite slatted cladding (Coffee) 200×2500mm';
    const runs = Math.ceil(run / boardW);
    cladTotals.set(name, (cladTotals.get(name) || 0) + runs + 4);
    cladBattenLm += Math.ceil(run / 0.4) * wallH + cw.run * Math.ceil(wallH / 0.4);
  }
  for (const [name, count] of cladTotals) {
    add(name, count, `Vertical cladding runs across the clad walls (+4 spares per wall). Colour/type per wall spec`);
  }
  if (cladBattenLm > 0) {
    add('18x38 treated batten', Math.ceil(cladBattenLm * 1.05), `Cladding double-batten sub-frame (vertical counter-battens + horizontal rows @400mm) on the clad walls`,
      cladWalls.flatMap((cw) => [{ len: wallH, n: Math.ceil(cw.run / 0.4) + 1, what: `${cw.wall} vertical counter-battens` }, { len: cw.run, n: Math.ceil(wallH / 0.4) + 1, what: `${cw.wall} horizontal batten rows` }]));
    add('Stainless cladding screw', Math.ceil(cladBattenLm / 0.4) , `~1 per slat per batten crossing (approx by batten run)`);
  }

  // Flitch over wide front openings
  const wideFront = fhOn(front).filter((o) => o.widthM >= 1.8);
  if (wideFront.length > 0) {
    const flitchLm = wideFront.reduce((s, o) => s + 2 * (o.widthM + 0.3), 0);
    add('6x2 tanalised C24 timber', Math.ceil(flitchLm * 1.05), `Flitch pairs over ${wideFront.length} wide front opening${wideFront.length === 1 ? '' : 's'} (opening + 150mm bearing each side, x2 timbers)`,
      wideFront.map((o) => ({ len: o.widthM + 0.3, n: 2, what: `flitch pair over ${(o.widthM * 1000).toFixed(0)}mm opening` })));
    add('Flitch beam bolts', wideFront.reduce((s, o) => s + Math.ceil((o.widthM + 0.3) / 0.6), 0), `~600mm centres`);
  }

  /* ---------- ROOF ---------- */
  const span = d - 0.2;
  const ladder = premiumRoofLadder(span);
  const REAR_OVERSAIL = 0.10; // joists AND firrings oversail the rear 100mm on every job
  // Joists: rear plate to front top plate = external depth, + 100mm rear
  // oversail. They only run on past the FRONT wall on TALL builds.
  const joistOversailM = canopyMethod === 'joists-oversail' ? canopyM : 0;
  const joistLen = d + joistOversailM + REAR_OVERSAIL;
  // Firrings + deck + EPDM run the full depth + canopy/overhang + rear oversail.
  const roofLen = d + canopyM + REAR_OVERSAIL;
  const rJoists = Math.ceil(w / ladder.spacing) + 1;
  const canopyMm = (canopyM * 1000).toFixed(0);
  add(ladder.sku, Math.ceil((rJoists * ladder.ply * joistLen + 2 * w) * 1.10),
    `Roof: ${ladder.label} - ${rJoists}${ladder.ply === 2 ? ' pairs' : ''} x ${joistLen.toFixed(2)}m @${(ladder.spacing * 1000).toFixed(0)}mm + rim, +10%. Bears on front top plate/flitch + rear wall plate, OVERSAILS THE REAR BY 100mm. ${
      canopyMethod === 'joists-oversail'
        ? `${(h).toFixed(2)}m BUILD: joists also OVERSAIL the front by ${canopyMm}mm to form the canopy`
        : canopyMethod === 'firrings-overhang'
          ? `2.5m BUILD: joists STOP at the front wall (no height to oversail) - the canopy is formed by the firring overhang + 2x2 frame below`
          : `CLASSIC: joists stop at the front wall, ${canopyMm}mm token overhang in the firrings/deck only`
    }`,
    [{ len: joistLen, n: rJoists * ladder.ply, what: 'roof joists' }, { len: w, n: 2, what: 'front + rear rim' }]);
  add('4x2 tanalised C24 timber', Math.ceil((2 * sideRun + w) * 1.05), `Flat 4x2 wall plate on the panel wall tops (sides + rear)`,
    [{ len: sideRun, n: 2, what: 'side wall plates' }, { len: w, n: 1, what: 'rear wall plate' }]);
  if (ladder.web) add('18mm OSB3 board (2440x1220)', Math.ceil((rJoists * joistLen * ladder.depthM * 1.10) / PLY_SHEET_M2), `OSB webs glued+screwed between the doubled joist pairs, ripped from full sheets`);
  // Firrings are CUSTOM MADE per job (Liam 2026-09-05): give the exact spec.
  const firrFrontMm = Math.round((roofLen / 40) * 1000);
  add('Tapered firring (47mm, 1:40)', Math.ceil((rJoists + 4) * roofLen),
    `CUSTOM MADE FOR THIS JOB: ${rJoists} firrings x ${roofLen.toFixed(2)}m long, 47mm wide, tapering from ${firrFrontMm}mm at the FRONT to 0 at the REAR (1:40 fall), one per joist; PLUS 4 REVERSE firrings x ${roofLen.toFixed(2)}m (0 at the front rising to ${firrFrontMm}mm at the rear) laid along the side edges, 2 per side, so the sides read level. Length = ${d.toFixed(2)}m building + ${canopyMm}mm front + 100mm rear oversail. ${
      canopyMethod === 'firrings-overhang'
        ? `THE TALL END OVERHANGS THE FRONT BY ${canopyMm}mm ON TOP OF THE JOISTS - this overhang IS the canopy (2.5m method)`
        : canopyMethod === 'joists-oversail'
          ? `They sit on top of the oversailed joists right out to the canopy edge`
          : `They run ${canopyMm}mm past the front wall (classic token overhang)`
    }`,
    [{ len: roofLen, n: rJoists + 4, what: 'firrings (custom tapers)' }]);
  add('18mm T&G OSB3 roof board (2400x590)', Math.ceil((w + 0.2) * roofLen * 1.05 / OSB_TG_M2), `Roof deck ${(w + 0.2).toFixed(2)} x ${roofLen.toFixed(2)}m incl. 100mm side overhangs + ${canopyMm}mm front + 100mm rear, +5%`);
  add('EPDM roof kit (membrane, adhesive, edge trims)', Math.ceil((w + 0.2) * roofLen * 1.15), `One-piece EPDM, deck m2 + 15% wraps/upstands, up-and-over the squared side edges`);
  add('100mm PIR insulation board', Math.ceil(w * d), `VENTED COLD ROOF: between joists over the room only (${w.toFixed(2)} x ${d.toFixed(2)}m), set 30mm BELOW joist tops (50mm air path)`);
  // Canopy 2x2 frame - one layer either way, method decides where it sits.
  // Ply on the front face + underside on EVERY canopied build (fascia + soffit
  // need a solid fixing) - Liam 2026-09-05.
  if (hasCanopy) {
    const crossPieces = Math.ceil(w / 0.4) + 1;
    const canopy2x2Lm = Math.ceil((2 * w + crossPieces * canopyM) * 1.10);
    const canopyCuts = [{ len: w, n: 2, what: 'canopy 2x2 front + back rails' }, { len: canopyM, n: crossPieces, what: 'canopy 2x2 cross pieces' }];
    if (canopyMethod === 'firrings-overhang') {
      add('2x2 tanalised C16 timber', canopy2x2Lm,
        `CANOPY FRAME (2.5m method): 2x2 frame on the TOP-FRONT of the front wall, UNDER the ${canopyMm}mm firring overhang - 2 runs x ${w.toFixed(2)}m + ${crossPieces} cross pieces @400mm x ${canopyMm}mm, +10%. Fixed to the front top plate AND to the flitch beam over the door opening`, canopyCuts);
      add('Structural timber screw (100mm)', Math.ceil(w / 0.4) * 2 + 8,
        `Canopy frame: into the front top plate / flitch @400mm + frame assembly`);
    } else {
      add('2x2 tanalised C16 timber', canopy2x2Lm,
        `CANOPY BOX (${h.toFixed(2)}m method): ONE layer of 2x2 fixed UNDER the oversailed roof joists to deepen the overhang box - 2 runs x ${w.toFixed(2)}m + ${crossPieces} cross pieces @400mm x ${canopyMm}mm, +10%`, canopyCuts);
      add('Structural timber screw (100mm)', Math.ceil(w / 0.4) * 2 + 8,
        `Canopy box: 2x2 up into the oversailed joists @400mm + frame assembly`);
    }
    add('12mm Plywood (1220×2440 sheet)', Math.ceil((w * 0.3 + w * canopyM) * 1.10 / PLY_SHEET_M2),
      `CANOPY BOX PLY: front face (${w.toFixed(2)} x 0.30m) + underside (${w.toFixed(2)} x ${canopyM.toFixed(2)}m) + 10% - solid fixing for the fascia + soffit (needed on the 2x2 frame AND the oversailed-joist box)`);
  } else {
    add('12mm Plywood (1220×2440 sheet)', Math.ceil((w * 0.3) * 1.10 / PLY_SHEET_M2), `Front fascia backing strip (classic, no canopy): ${w.toFixed(2)} x 0.30m + 10%`);
  }
  add('Soffit vent strip (2.5m)', Math.ceil((2 * w) / 2.5), `Front soffit vent + rear rim mesh vents (cross-flow)`);
  add('Vapour control layer (roll)', 2, `Warm-side VCL under the roof joists + continuous VCL to all walls behind the lining`);
  add('Grab adhesive (tube)', Math.ceil((ladder.web ? rJoists * joistLen / 6 : 0) + 2), `OSB webs into joist pairs (~6m/tube) + skirting`);

  /* ---------- EXTERNAL TRIMS / RAINWATER ---------- */
  add('300mm plastic fascia (5m length, GAP)', Math.ceil((w + 2 * roofLen) / 5), `Front (${w.toFixed(2)}m) + both sides (2 x ${roofLen.toFixed(2)}m incl. canopy + rear oversail)`);
  add('200mm plastic fascia (5m length, GAP)', Math.ceil(w / 5), `Rear`);
  if (hasCanopy) add('400mm plastic soffit (5m length, GAP)', Math.ceil(w / 5), `Front canopy soffit (closes the 2x2 frame underside)`);
  add('Fascia corner (500mm plastic)', 4, `4 corners`);
  add('Steel top cap', Math.ceil((w + 2 * roofLen) / 3), `Over the EPDM edge, front + sides / 3m lengths`);
  add('Half-Round Gutter 4 Mtr (Black)', Math.ceil(w / 4), `Rear gutter`);
  add('Half-Round Gutter Fascia Bracket (Black)', Math.ceil(w / 0.5), `1 per 500mm`);
  add('Half-Round Stop End Outlet (Black)', 1, `Downpipe corner`);
  add('Half-Round Gutter Stop End Ext (Black)', 1, `Opposite corner`);
  add('Round 68mm Downpipe 2.5 Mtr (Black)', 1, `Gutter to ground`);
  add('Round Downpipe Clip (Black)', 3, `Per build`);
  add('Round Downpipe Shoe (Black)', 1, `At ground level`);
  if (Math.ceil(w / 4) > 1) add('Half-Round Gutter Joiner (Black)', Math.ceil(w / 4) - 1, `Between gutter sections`);

  /* ---------- INTERIOR (plastered + decorated ONLY) ---------- */
  const wallsNetM2 = Math.max(0, 2 * (w + d) * wallH
    - [...front, ...rear, ...left, ...right].filter((o) => o.fullHeight).reduce((s, o) => s + o.widthM * o.heightM, 0));
  const ceilM2 = (w - 0.2) * (d - 0.2);
  const boardM2 = (wallsNetM2 + ceilM2) * 1.10;
  add('Plasterboard 12.5mm (1200x2400 sheet)', Math.ceil(boardM2 / PLASTERBOARD_M2), `Walls (${wallsNetM2.toFixed(1)}m2) + ceiling (${ceilM2.toFixed(1)}m2) + 10%`);
  add('Plasterboard scrim/jointing tape (90m roll)', Math.ceil(boardM2 / 45), `Board joints`);
  add('Plasterboard corner bead (2.4m)', 4 + [...front, ...rear, ...left, ...right].length, `Corners + reveals`);
  add('Multi-finish plaster (25kg bag)', Math.ceil(boardM2 / 10), `Skim ~10m2/bag`);
  add('Drywall screw (35mm)', Math.ceil(boardM2 * 12), `~12/m2`);
  add('White trade emulsion paint (10L)', Math.ceil(boardM2 / 50), `2 coats (3 on fresh skim where needed)`);
  add('Skirting board', Math.ceil(Math.max(0, 2 * (w + d) - fhWidth(front) - fhWidth(rear) - fhWidth(left) - fhWidth(right))), `Perimeter minus full-height openings, linear m`);
  add('Decorators caulk (tube)', 2, `Internal junctions`);
  add('White silicone', 2, `Thresholds + trim edges`);
  add('Medium Oak vinyl', Math.ceil((w - 0.2) * (d - 0.2)), `Internal floor area (colour per customer choice)`);
  add('Vinyl spray adhesive (500ml can)', Math.ceil((w - 0.2) * (d - 0.2) / 4), `~4m2 per can`);

  /* ---------- ELECTRICAL PACK (ALWAYS INCLUDED) + CANOPY LIGHTS ---------- */
  add('Consumer Unit', 1, `8-way with main switch + RCD - standard in every premium build`);
  add('13A double socket', 4, `Standard pack: 5 double sockets total, 1 of them USB`);
  add('13A double socket with USB', 1, `Standard pack (the USB one)`);
  add('Double back box (47mm, plasterboard or surface)', 6, `5 sockets + 1 switch`);
  add('Single back box (35mm, plasterboard or surface)', 1, `RJ45 internet point`);
  add('RJ45 internet socket (single)', 1, `Standard in every build`);
  add('Dimmable LED downlight (recessed)', Math.max(6, Math.ceil((w - 0.2) * (d - 0.2) / 2.5)), `Internal downlights sized to floor area`);
  add('Dimmable switch plate (multi-gang)', 1, `Internal dimmer + external/canopy switch gangs`);
  if (hasCanopy) {
    add('Canopy light (recessed, IP65)', Math.max(1, Math.floor(w)), `STANDARD with the signature canopy: 1 per metre of width, rounded down (Liam 2026-09-05) - own switch gang`);
  }
  add('1.5mm twin & earth cable', Math.ceil(2 * (w + d) * 1.5), `Lighting circuit ~1.5x perimeter`);
  add('2.5mm twin & earth cable', Math.ceil(2 * (w + d) * 2), `Socket radial ~2x perimeter`);
  add('Cable clip', Math.ceil((2 * (w + d) * 3.5) / 0.3), `~1 per 300mm of run`);
  add('Grommet pack', 1, `Cable entries`);
  add('Foil insulation tape (roll)', 2, `VCL laps + back-box patches`);

  /* ---------- OPENINGS (products) ---------- */
  for (const [wallName, ops] of [['front', front], ['rear', rear], ['left side', left], ['right side', right]]) {
    for (const o of ops) {
      const def = componentDefs[o.type] || {};
      add(def.label || o.type, 1, `On the ${wallName}${def.width ? ` - ${def.width}mm wide` : ''}`);
    }
  }
  const opCount = [...front, ...rear, ...left, ...right].length;
  if (opCount > 0) {
    add('Expanding foam can', opCount, `~1 per opening`);
    add('External silicone (anthracite)', opCount, `~1 per opening`);
    add('Packer shim assortment (box)', 1, `Level + plumb every frame`);
    add('uPVC frame fixing screw', opCount * 8, `~8 per opening`);
    add('Door/window seal', opCount, `1 per opening`);
    add('25x25mm white PVC reveal trim (2.5m length)', Math.ceil(opCount * 5.5 / 2.5) + 2, `Reveals + 2 spare`);
  }

  /* ---------- DECKING ---------- */
  if (hasDecking) {
    const deckDepthM = ((state.deckingDepth || 400) + (state.structuralExtras?.additionalDecking || 0) * 140) / 1000;
    add('Composite decking board (3.6m)', Math.ceil((w * deckDepthM) / (3.6 * 0.14) * 1.1), `Front decking ${w.toFixed(2)}m x ${deckDepthM.toFixed(2)}m + 10%`);
    add('Grey-headed composite decking screw (stainless)', Math.ceil(w * deckDepthM * 25), `~25/m2`);
  }

  add('Door mat', 1, `Complimentary with every job`);
  add('Anthracite touch-up pen', 1, `Per job`);
  add('Mitre bond kit (adhesive + activator)', 1, `Per job`);
  add('Clear silicone', 4, `Panel T&G joints + general`);
  add('Anthracite stitching screw (self-drilling, box of 50)', 3, `Steel trims into panel steel @300mm`);
  add('Self-drilling screw 50mm (wood to metal)', Math.ceil((2 * (w + d) * 2.5) / 0.4 / 50) * 50, `Battens/plates into panel steel`);
  add('Wood screw 40mm', Math.ceil(plySheets * 30), `Ply sheathing ~30 per sheet`);

  return rows;
}
