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

/** Short "where it's used" labels (Liam 2026-09-06: accurate, short, concise).
 *  Shown next to the material name instead of the catalogue category. */
export const USE_TAGS = {
  'Adjustable plastic pedestal': 'Under the floor frame',
  'DPM sheet': 'Under the pedestals, on the slab',
  'Radix ground screw': 'Foundation',
  '5x2 tanalised C24 timber': 'Floor joists + rim',
  '18x38 treated batten': 'Floor PIR support + cladding sub-frame',
  '75mm PIR insulation board': 'Floor + stick-wall bays',
  '22mm P5 T&G chipboard (2400x600)': 'Floor deck',
  'Kingspan 100mm insulated wall panel (1.1m wide)': 'Rear + unclad side walls',
  'U-channel (40x102x40mm)': 'Panel tops, corners, opening edges',
  'Standard base trim (steel)': 'Panel bottoms',
  'CLS 3x2 timber': 'Lining frame inside the panels',
  'CLS 4x2 timber': 'Stick walls: front, clad sides, corners',
  'Treated CLS 4x2 timber': 'Stick-wall sole plates',
  '12mm Plywood (1220×2440 sheet)': 'Stick-wall sheathing + canopy box',
  'Tyvek breather membrane': 'Over the ply, stick walls',
  'Tyvek/breather tape (roll)': 'Tyvek laps + openings',
  'Western Red Cedar slatted cladding 140×2500mm': 'External cladding',
  'Larch slatted cladding 140×2500mm': 'External cladding',
  'Composite slatted cladding (Latte) 200×2500mm': 'External cladding',
  'Composite slatted cladding (Coffee) 200×2500mm': 'External cladding',
  'Front-cladding return (closed corner)': 'Closed-corner inside return',
  'Corner trims': 'Building corners',
  'Close corner trims': 'Closed corners',
  '6x2 tanalised C24 timber': 'Roof joists + flitch over openings',
  '7x2 tanalised C24 timber': 'Roof joists',
  'Flitch beam bolts': 'Flitch over front openings',
  '4x2 tanalised C24 timber': 'Wall plate on panel tops',
  '18mm OSB3 board (2440x1220)': 'Webs between doubled roof joists',
  'Tapered firring (47mm, 1:40)': 'Roof fall + canopy overhang',
  '18mm T&G OSB3 roof board (2400x590)': 'Roof deck',
  'EPDM roof kit (membrane, adhesive, edge trims)': 'Roof covering',
  '100mm PIR insulation board': 'Roof, between joists',
  '2x2 tanalised C16 timber': 'Canopy frame',
  'Soffit vent strip (2.5m)': 'Front soffit + rear rim vents',
  'Vapour control layer (roll)': 'Under roof joists + behind wall lining',
  '300mm plastic fascia (5m length, GAP)': 'Fascia: front + sides',
  '200mm plastic fascia (5m length, GAP)': 'Fascia: rear',
  '400mm plastic soffit (5m length, GAP)': 'Canopy soffit',
  'Fascia corner (500mm plastic)': 'Fascia corners',
  'Steel top cap': 'Over the EPDM edge',
  'Half-Round Gutter 4 Mtr (Black)': 'Rear gutter',
  'Half-Round Gutter Fascia Bracket (Black)': 'Rear gutter',
  'Half-Round Stop End Outlet (Black)': 'Rear gutter',
  'Half-Round Gutter Stop End Ext (Black)': 'Rear gutter',
  'Half-Round Gutter Joiner (Black)': 'Rear gutter',
  'Round 68mm Downpipe 2.5 Mtr (Black)': 'Downpipe',
  'Round Downpipe Clip (Black)': 'Downpipe',
  'Round Downpipe Shoe (Black)': 'Downpipe',
  'Plasterboard 12.5mm (1200x2400 sheet)': 'Internal walls + ceiling',
  'Plasterboard scrim/jointing tape (90m roll)': 'Plasterboard joints',
  'Plasterboard corner bead (2.4m)': 'Internal corners + reveals',
  'Multi-finish plaster (25kg bag)': 'Skim coat',
  'Drywall screw 3.5 x 38mm black (coarse)': 'Plasterboard to studs',
  'White trade emulsion paint (10L)': 'Walls + ceiling',
  'Satin wood paint (750ml)': 'Skirting',
  'Skirting board': 'Internal perimeter',
  'Decorators caulk (tube)': 'Internal junctions',
  'Medium Oak vinyl': 'Internal floor finish',
  'Vinyl spray adhesive (500ml can)': 'Vinyl to deck',
  'Composite decking board (3.6m)': 'Front decking',
  'Decking screws - colour-headed (Winchester grey)': 'Decking boards',
  'Bitumen paint (1L)': 'Decking sub-frame',
  'Door mat': 'Handover',
  'Anthracite touch-up pen': 'Trim + panel touch-ups',
  'Mitre bond kit (adhesive + activator)': 'Trim mitres',
  'Packer shim assortment (box)': 'Levelling frames + timber',
  'uPVC frame fixing screw': 'Door + window frames',
  'Expanding foam can': 'Around openings',
  'Gun foam (can)': 'Around openings + perimeter gaps',
  'Door/window seal': 'Door + window frames',
  '25x25mm white PVC reveal trim (2.5m length)': 'Window + door reveals',
  'TimberLok 150mm': 'Floor doubling',
  'TimberLok 100mm': 'Roof joists, plates, studs, canopy',
  'TimberLok 89mm': 'Lining frame into panels, corners',
  'TimberLok 225mm': 'Floor rim into joist ends',
  'Wood screw 5.0 x 100mm': 'Stick framing',
  'Wood screw 5.0 x 70mm': 'Battens + firrings',
  'Wood screw 5.0 x 50mm': 'Ply, floor + roof decks, pedestals',
  'Grey RAL 7016 self-drilling trim screw 25mm': 'Visible steel trims',
  'Self-drilling screw 25mm plain (hidden trims / U-channel)': 'U-channel + hidden trims',
  'Bay pole self-drilling screw 70mm (timber to panel)': 'Wall plates into panel steel',
  'Concrete screw 100mm (Ammo)': 'Pedestals to slab',
  'Stainless self-drilling screw 40mm (gutters/fascia)': 'Gutter brackets + clips',
  'Polytop pins 40mm anthracite': 'Fascia boards',
  'Polytop pins 65mm anthracite': 'Soffit boards',
  'Stainless angled brad 16g x 38mm': 'Cedar/larch boards',
  'Jiffy hanger 47mm (mini joist hanger)': 'Roof joist ends',
  'Square twist nails 30mm (1kg bag)': 'Jiffy hangers',
  'Twisted restraint strap 30x2.5x600mm': 'Roof tie-down to plates',
  'Silicone - anthracite grey RAL 7016 (310ml)': 'External trims + joints',
  'Silicone - clear (310ml)': 'Panel joints, glazing, flashings',
  'Silicone - white (310ml)': 'Internal thresholds + trims',
  'Grab adhesive / Gripfill (tube)': 'Skirting, reveals, OSB webs',
  'PVA wood glue (1L)': 'Floor deck joints',
  '8mm staples (box)': 'Tyvek + DPM',
  'Duck tape (roll)': 'DPM/Tyvek laps',
  'Masking tape (roll)': 'Decorating',
  'Stanley blades (pack)': 'Site kit',
  '115mm angle grinder disc': 'Cutting steel trims + panels',
  'Drill bits 3.2mm + 4.2mm (set)': 'Site kit',
  'Glass cleaner': 'Cleaning kit', 'Solvent cleaner': 'Cleaning kit', 'Hand wipes (tub)': 'Cleaning kit', 'Roll tissue': 'Cleaning kit',
  'Paint roller & tray set (large + small)': 'Decorating', 'Paint brushes (pack)': 'Decorating + bitumen',
  'Foil insulation tape (roll)': 'VCL laps + back boxes',
  'Consumer unit (garden room, 4-6 way, RCBO/dual RCD)': 'Electrics', '13A double socket (screwless white)': 'Internal sockets', '13A double socket with USB': 'Internal socket (USB)',
  'Double back box (47mm, plasterboard or surface)': 'Sockets + switches', 'Single back box (35mm, plasterboard or surface)': 'RJ45 / isolator',
  'RJ45 internet socket (single)': 'Broadband point', 'Dimmable LED downlight (fire-rated, recessed)': 'Ceiling', 'LED dimmer switch (trailing-edge, multi-gang plate)': 'Lighting switch',
  'External up/down wall light (anthracite/black, IP44)': 'External wall', 'Canopy light (recessed, IP65)': 'Canopy soffit', '1.5mm twin & earth cable': 'Lighting circuit', '2.5mm twin & earth cable': 'Socket circuit', 'Cable clip': 'Cable runs', 'Grommet pack': 'Cable entries',
  'IP65 weatherproof double socket': 'External socket', 'Air conditioning isolator switch': 'AC unit', '1.5kW electric radiator': 'Heating', 'Fuse spur': 'Radiator', 'CAT6 data cable (m)': 'Extra data points',
};

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
  }

  /* ---------- FLOOR (5x2, doubled ring + 1.2m grid) ---------- */
  const fJoists = Math.ceil(w / 0.4) + 1;
  const fDoubledInternals = Math.max(0, Math.floor((fJoists - 2) / 3));
  const fDoubledLm = 2 * w + 2 * d + fDoubledInternals * d;
  add('5x2 tanalised C24 timber', Math.ceil((fJoists * d + 2 * w + fDoubledLm) * 1.10),
    `Floor: ${fJoists} joists x ${d.toFixed(2)}m @400mm front-to-back + rim (2 x ${w.toFixed(2)}m) + DOUBLING (outer ring + every 3rd joist / 1.2m grid: ${fDoubledInternals} x ${d.toFixed(2)}m), +10%`,
    [{ len: d, n: fJoists + 2 + fDoubledInternals, what: 'floor joists incl. doubled sides + grid doubles' }, { len: w, n: 4, what: 'front + rear rim, doubled' }]);
  add('18x38 treated batten', Math.ceil(2 * (fJoists - 1) * d), `Floor PIR support battens, joist sides, tops 75mm down`,
    [{ len: d, n: 2 * (fJoists - 1), what: 'floor PIR battens' }]);
  add('75mm PIR insulation board', Math.ceil(w * d), `Floor: friction-fit between the 5x2 joists, ${(w * d).toFixed(1)}m2`);
  add('22mm P5 T&G chipboard (2400x600)', Math.ceil((w * d) * 1.05 / CHIPBOARD_M2), `Floor deck: ${(w * d).toFixed(1)}m2 + 5%, glued at every joint`);

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
  let liningStudsTotal = 0, liningRunTotal = 0;
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
    liningStudsTotal = liningStuds; liningRunTotal = liningRun;
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
    } else {
      add('2x2 tanalised C16 timber', canopy2x2Lm,
        `CANOPY BOX (${h.toFixed(2)}m method): ONE layer of 2x2 fixed UNDER the oversailed roof joists to deepen the overhang box - 2 runs x ${w.toFixed(2)}m + ${crossPieces} cross pieces @400mm x ${canopyMm}mm, +10%`, canopyCuts);
    }
    add('12mm Plywood (1220×2440 sheet)', Math.ceil((w * 0.3 + w * canopyM) * 1.10 / PLY_SHEET_M2),
      `CANOPY BOX PLY: front face (${w.toFixed(2)} x 0.30m) + underside (${w.toFixed(2)} x ${canopyM.toFixed(2)}m) + 10% - solid fixing for the fascia + soffit (needed on the 2x2 frame AND the oversailed-joist box)`);
  } else {
    add('12mm Plywood (1220×2440 sheet)', Math.ceil((w * 0.3) * 1.10 / PLY_SHEET_M2), `Front fascia backing strip (classic, no canopy): ${w.toFixed(2)} x 0.30m + 10%`);
  }
  add('Soffit vent strip (2.5m)', Math.ceil((2 * w) / 2.5), `Front soffit vent + rear rim mesh vents (cross-flow)`);
  add('Vapour control layer (roll)', 2, `Warm-side VCL under the roof joists + continuous VCL to all walls behind the lining`);

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
  add('White trade emulsion paint (10L)', Math.ceil(boardM2 / 50), `2 coats (3 on fresh skim where needed)`);
  add('Skirting board', Math.ceil(Math.max(0, 2 * (w + d) - fhWidth(front) - fhWidth(rear) - fhWidth(left) - fhWidth(right))), `Perimeter minus full-height openings, linear m`);
  add('Medium Oak vinyl', Math.ceil((w - 0.2) * (d - 0.2)), `Internal floor area (colour per customer choice)`);
  add('Vinyl spray adhesive (500ml can)', Math.ceil((w - 0.2) * (d - 0.2) / 4), `~4m2 per can`);

  /* ======================================================================
     ELECTRICAL KIT (GOB buys + supplies all components from stock; the
     electrician charges labour only - £500/£600/£700 for 1st + 2nd fix by
     building size - and brings his own consumables: connectors, sleeving,
     glands, earth rod). Electrical + internet CONNECTION to the house is the
     electrician's own job direct with the customer (his materials).
     STANDARD PACK (Liam 2026-09-05 = designer "medium" + 5th socket):
       5 double sockets (1 USB), dimmable LED downlights by size (4-12),
       1 external up/down light, consumer unit, RJ45 point, dimmer/switch
       plate per lighting zone, canopy lights 1/m on the signature canopy.
     ====================================================================== */
  const internalM2 = (w - 0.3) * (d - 0.3);
  const downlights = internalM2 <= 12 ? 4 : internalM2 <= 18 ? 6 : internalM2 <= 24 ? 8 : internalM2 <= 30 ? 10 : 12;
  const ex = state.extras || {};
  const zones = 1 + (state.partitionRoom?.enabled ? 1 : 0) + (state.straightPartition?.enabled ? 1 : 0) + (ex.additionalLightingZone || 0);
  const extSockets = ex.externalSocket || 0;
  const upDownLights = 1 + (ex.upDownLight || 0); // 1 included in the standard pack
  const extraSockets = (ex.additionalSocket || 0) + (ex.additionalSocketUsb || 0);
  const acCount = (state.acUnits || []).length || (ex.acUnit && ex.acUnit !== 'none' ? 1 : 0);
  const cat6 = ex.cat6Point || 0;
  const extLightRun = upDownLights * 8 + extSockets * 8;
  const perimE = 2 * (w + d);
  const run15 = perimE * 1.5 + downlights * 1.5 + extLightRun + (hasCanopy ? w + 6 : 0);
  const run25 = perimE * 2 + extraSockets * 4 + extSockets * 6 + acCount * 15 + (ex.heater ? 10 : 0);

  add('Consumer unit (garden room, 4-6 way, RCBO/dual RCD)', 1, `1 per build - main switch + RCD protection, fed from the electrician's supply cable`);
  add('13A double socket (screwless white)', 4 + (ex.additionalSocket || 0), `Standard pack 4 (5th is the USB one)${ex.additionalSocket ? ` + ${ex.additionalSocket} extra` : ''}`);
  add('13A double socket with USB', 1 + (ex.additionalSocketUsb || 0), `Standard pack 1${ex.additionalSocketUsb ? ` + ${ex.additionalSocketUsb} extra` : ''}`);
  add('Double back box (47mm, plasterboard or surface)', 5 + extraSockets + zones + (ex.heater ? 1 : 0), `Sockets (${5 + extraSockets}) + ${zones} switch/dimmer plate${zones === 1 ? '' : 's'}${ex.heater ? ' + radiator spur' : ''}`);
  add('Single back box (35mm, plasterboard or surface)', 1 + cat6 + acCount, `RJ45 point (1)${cat6 ? ` + ${cat6} extra CAT6` : ''}${acCount ? ` + ${acCount} AC isolator` : ''}`);
  add('RJ45 internet socket (single)', 1 + cat6, `Standard pack 1 (customer's broadband hook-up point)${cat6 ? ` + ${cat6} extra CAT6 point${cat6 === 1 ? '' : 's'}` : ''}`);
  if (cat6) add('CAT6 data cable (m)', cat6 * 15, `~15m per extra data point`);
  add('Dimmable LED downlight (fire-rated, recessed)', downlights, `Standard pack: ${downlights} downlights for ${internalM2.toFixed(1)}m² internal (4/6/8/10/12 by size), 2 rows`);
  add('LED dimmer switch (trailing-edge, multi-gang plate)', zones, `1 per lighting zone: dimmer gang for the downlights + switch gang for the external/canopy lights`);
  add('External up/down wall light (anthracite/black, IP44)', upDownLights, `Standard pack 1${ex.upDownLight ? ` + ${ex.upDownLight} extra` : ''}`);
  if (hasCanopy) add('Canopy light (recessed, IP65)', Math.max(1, Math.floor(w)), `STANDARD with the signature canopy: 1 per metre of width, rounded down - own switch gang`);
  if (extSockets) add('IP65 weatherproof double socket', extSockets, `External socket extra x${extSockets}`);
  if (acCount) add('Air conditioning isolator switch', acCount, `1 per AC unit (unit itself is supplied/fitted by the AC installer)`);
  if (ex.heater) add('1.5kW electric radiator', ex.heater, `Oil-filled panel radiator extra`);
  if (ex.heater) add('Fuse spur', ex.heater, `Fused spur per radiator`);
  add('1.5mm twin & earth cable', Math.ceil(run15 * 1.15), `LIGHTING: ~1.5x perimeter (${perimE.toFixed(1)}m) + 1.5m per downlight + external/canopy lights, +15%`);
  add('2.5mm twin & earth cable', Math.ceil(run25 * 1.15), `SOCKET RADIAL: ~2x perimeter${acCount ? ' + 15m per AC radial' : ''}${extSockets ? ' + external sockets' : ''}, +15%`);
  add('Cable clip', Math.ceil(((run15 + run25) * 1.15) / 0.3), `~1 per 300mm of cable run`);
  add('Grommet pack', 1, `Cable entries through back boxes/joists`);
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
    add('uPVC frame fixing screw', opCount * 8, `~8 per opening`);
    add('Door/window seal', opCount, `1 per opening`);
    add('25x25mm white PVC reveal trim (2.5m length)', Math.ceil(opCount * 5.5 / 2.5) + 2, `Reveals + 2 spare`);
  }

  /* ---------- DECKING ---------- */
  if (hasDecking) {
    const deckDepthM = ((state.deckingDepth || 400) + (state.structuralExtras?.additionalDecking || 0) * 140) / 1000;
    add('Composite decking board (3.6m)', Math.ceil((w * deckDepthM) / (3.6 * 0.14) * 1.1), `Front decking ${w.toFixed(2)}m x ${deckDepthM.toFixed(2)}m + 10%`);
    add('Decking screws - colour-headed (Winchester grey)', Math.ceil(w * deckDepthM * 25 * 1.25), `~25/m2 + 25% over-estimate (Liam: over on fixings)`);
  }

  add('Door mat', 1, `Complimentary with every job`);

  /* ======================================================================
     INSTALLATION KIT (factory stock, mostly Montravia / online fixings).
     Liam 2026-09-05: calculate what we actually need per part of the job,
     OVER-estimate on fixings to be safe, then the logistics team converts to
     boxes when loading (catalogue packSize = box count).
     ====================================================================== */
  const OVER = 1.25; // +25% on every screw/nail count
  const up = (n) => Math.ceil(n * OVER);
  const perim = 2 * (w + d);
  const totalStuds = stickWalls.reduce((t, sw) => t + Math.ceil(sw.run / 0.4) + 1, 0) + closedCorners * 2 + openCorners * 4;
  const openingsAll = [...front, ...rear, ...left, ...right];
  const floorM2 = w * d;
  const roofDeckM2 = (w + 0.2) * roofLen;

  // -- TimberLok structural screws (Liam's confirmed uses) --
  add('TimberLok 150mm', up(fDoubledLm / 0.4 + rJoists * ladder.ply * 0), `FLOOR DOUBLING: laminating the doubled ring + 1.2m-grid joist pairs, 1 per 400mm staggered (${fDoubledLm.toFixed(1)}m of doubled run) +25%`);
  const canopyFixings = hasCanopy ? Math.ceil(w / 0.4) * 2 + 8 : 0;
  add('TimberLok 100mm', up(rJoists * 4 + (2 * sideRun + w) / 0.6 + 8 + totalStuds * 2 + canopyFixings + closedCorners * 10), `ROOF joists to wall plates/flitch (~4 skew per joist, ${rJoists} joists) + flat 4x2 wall plate into panel tops @600mm + STUDS to sole plate (2 per stud, ${totalStuds} studs) + CANOPY 2x2 frame/box to the front wall/joists (${canopyFixings}) + closed-corner extensions, +25% (Liam: used for all of these)`);
  add('TimberLok 89mm', up(liningStudsTotal * 3 + liningRunTotal / 0.6 + closedCorners * 12 + (hasCanopy ? Math.ceil(w / 0.4) + 1 : 0) + totalStuds), `CLS 3x2 LINING FRAME into the panels: 3 per stud (${liningStudsTotal} studs) + plates @600mm + closed-corner extension framing + canopy 2x2 cross pieces + stud-to-plate where 100mm is too long, +25%. (89mm not a FastenMaster size - Timberfix/Spax 6x90 equivalent)`);
  add('TimberLok 225mm', up(fJoists * 2 * 2 + 8), `FLOOR RIM through into the joist ends: 2 per joist end, both rims (${fJoists} joists) + 8 spare, +25%. (nearest stock size 200/250mm TimberLok)`);
  // -- Wood screws --
  add('Wood screw 5.0 x 100mm', up(totalStuds * 6 + (hasCanopy ? Math.ceil(w / 0.4) * 2 + 8 : 0) + wideFront.length * 12), `STICK FRAMING: ~6 per stud (studs to plates, noggins, kings; ${totalStuds} studs) + canopy 2x2 frame/box fixings + flitch packing, +25%`);
  add('Wood screw 5.0 x 70mm', up(cladBattenLm / 0.4 + 2 * (fJoists - 1) * d / 0.6 + (rJoists + 4) * roofLen / 0.4), `BATTENS + FIRRINGS: cladding sub-frame battens @400mm crossings (${cladBattenLm.toFixed(0)}m) + floor PIR battens @600mm + firrings down into joists @400mm, +25%`);
  add('Wood screw 5.0 x 50mm', up(plySheets * 30 + floorM2 * 12 + roofDeckM2 * 10 + pedestals * 4), `SHEET FIXING: ply sheathing ~30/sheet (${plySheets} sheets) + 22mm floor deck ~12/m² (${floorM2.toFixed(1)}m²) + 18mm roof deck ~10/m² (${roofDeckM2.toFixed(1)}m²) + 4 per pedestal head, +25%`);
  add('Drywall screw 3.5 x 38mm black (coarse)', up(boardM2 * 12), `PLASTERBOARD: ~12/m² over ${boardM2.toFixed(0)}m² of board, +25%`);
  // -- Steel / trim fixings --
  const visibleTrimM = (panelWalls.reduce((t, p) => t + p.run, 0)) /* base trims */ + 4 * wallH /* corners */ + (w + 2 * roofLen) /* top cap */;
  const uChannelM = panelWalls.reduce((t, p) => t + p.run, 0) + 8 * wallH;
  const trimRunM = visibleTrimM + uChannelM;
  add('Grey RAL 7016 self-drilling trim screw 25mm', up(visibleTrimM / 0.3), `VISIBLE ANTHRACITE STEEL TRIMS @300mm: base trims + corner trims + top cap (~${visibleTrimM.toFixed(0)}m), +25%`);
  add('Self-drilling screw 25mm plain (hidden trims / U-channel)', up(uChannelM / 0.3), `U-CHANNEL + hidden trims @300mm (~${uChannelM.toFixed(0)}m) - cheaper plain self-drillers, not visible (Liam), +25%`);
  add('Bay pole self-drilling screw 70mm (timber to panel)', up(((2 * sideRun + w) / 0.4) + liningRunTotal / 0.6), `4x2 WALL PLATE + lining plates into the panel steel @400-600mm, +25%`);
  if (!groundScrews) add('Concrete screw 100mm (Ammo)', up(pedestals * 2), `PEDESTALS anchored to the slab: 2 per pedestal (${pedestals}), +25%`);
  add('Stainless self-drilling screw 40mm (gutters/fascia)', up(Math.ceil(w / 0.5) * 2 + 3 * 2 + 12), `GUTTER brackets 2 each (${Math.ceil(w / 0.5)}) + downpipe clips + fascia corners, +25%. (Whether these also fix the fascia boards is UNCONFIRMED - fascia is on polytop pins here; ask the fitters)`);
  add('Polytop pins 40mm anthracite', up(((w + 2 * roofLen) + w) / 0.4 * 2), `FASCIA (front + sides + rear, both edges @400mm), +25%`);
  if (hasCanopy) add('Polytop pins 65mm anthracite', up((w / 0.4) * 2 + 12), `SOFFIT boards into the 2x2 canopy frame @400mm both edges, +25%`);
  // -- Cladding fixings --
  const timberCladRuns = [...cladTotals].filter(([n]) => /cedar|larch/i.test(n)).reduce((t, [, c]) => t + c, 0);
  if (timberCladRuns > 0) add('Stainless angled brad 16g x 38mm', up(timberCladRuns * Math.ceil(wallH / 0.4) * 2), `CEDAR/LARCH boards: 2 brads per board per batten row (${timberCladRuns} boards x ${Math.ceil(wallH / 0.4)} rows), +25%`);
  // -- Roof joist hangers + ties --
  add('Jiffy hanger 47mm (mini joist hanger)', up(rJoists * 2), `ROOF JOISTS: 1 hanger per joist end on the front + rear plates (${rJoists} joists x 2), +25%`);
  add('Square twist nails 30mm (1kg bag)', Math.ceil(up(rJoists * 2) * 8 / 350), `~8 nails per jiffy hanger, ~350 nails per 1kg bag`);
  add('Twisted restraint strap 30x2.5x600mm', Math.ceil(w / 1.2) * 2, `ROOF TIE-DOWN: straps over the joists down the face of the front + rear plates/panels @1.2m centres - resists wind uplift on a lightweight flat roof (${Math.ceil(w / 1.2)} per side)`);
  // -- Sealants + adhesives (Liam: we use a LOT of silicone; 14.5 tubes on a 17m-perimeter Maxi) --
  add('Silicone - anthracite grey RAL 7016 (310ml)', Math.ceil(perim * 0.85), `EXTERNAL: trims, panel joints, openings - ~0.85 tubes per metre of external perimeter (${perim.toFixed(1)}m)`);
  add('Silicone - clear (310ml)', Math.ceil(perim * 0.85), `Panel T&G joints, flashings, glazing - ~0.85 tubes per metre of perimeter`);
  add('Silicone - white (310ml)', 2, `Internal thresholds + trim edges (avg 2/job)`);
  add('Decorators caulk (tube)', 2, `Internal junctions (avg 1.75/job)`);
  add('Grab adhesive / Gripfill (tube)', 3 + (ladder.web ? 1 : 0), `Skirting, reveals, general (avg 2.5/job, rounded up) + 1 for OSB webs on doubled-joist roofs (webs are PVA-glued + screwed)`);
  add('Mitre bond kit (adhesive + activator)', floorM2 > 20 ? 2 : 1, `Trim mitres - 1 per job, 2 on Multi/Multi+`);
  add('PVA wood glue (1L)', Math.ceil(floorM2 / 15), `22mm T&G floor deck glued at every joint (~1L per 15m², ${floorM2.toFixed(1)}m²)`);
  add('Gun foam (can)', Math.ceil(openingsAll.length / 3) + 1, `Openings + perimeter gaps (~1 can per 3 openings + 1)`);
  add('Packer shim assortment (box)', 1, `Level + plumb every frame; flat packers under timber`);
  // -- Tapes + consumables --
  add('8mm staples (box)', 1, `Tyvek + DPM stapling (avg half a box/job - order whole box)`);
  add('Duck tape (roll)', 2, `DPM/Tyvek laps + general (avg 1.25/job)`);
  add('Masking tape (roll)', 2, `Decorating + spraying (avg 1.25/job)`);
  add('Stanley blades (pack)', 2, `avg 1.25 packs/job`);
  add('115mm angle grinder disc', Math.ceil(trimRunM / 20) + 2, `Cutting steel trims / panels (~1 disc per 20m of trim + 2; avg 4.25/job)`);
  add('Drill bits 3.2mm + 4.2mm (set)', 1, `1 of each per job`);
  add('Glass cleaner', 1, `Cleaning kit`);
  add('Solvent cleaner', 2, `Cleaning kit`);
  add('Hand wipes (tub)', 3, `Cleaning kit`);
  add('Roll tissue', 5, `Cleaning kit`);
  add('Anthracite touch-up pen', 1, `Per job`);
  // -- Decorating (plastered + decorated standard) --
  add('Paint roller & tray set (large + small)', 1, `Per job`);
  add('Paint brushes (pack)', 2, `Cutting in + bitumen`);
  add('White trade emulsion paint (10L)', Math.ceil((boardM2 * 3) / 120), `Mist coat + 2 coats over ${boardM2.toFixed(0)}m² of plaster; 10L covers ~120m² per coat`);
  add('Satin wood paint (750ml)', Math.ceil((perim * 0.12 * 2) / 12), `Skirting boards: ${perim.toFixed(1)}m x 120mm x 2 coats, ~12m² per tin`);
  if (hasDecking) add('Bitumen paint (1L)', 1, `Decking sub-frame protection`);
  // -- Site equipment (loaded from the factory, comes back) --
  if (groundScrews) add('Auger + fuel', 1, `Ground screws`);
  add('Shovel / spade / post hole digger', 1, `Site kit`);
  add('Tarpaulins x2 + tonne bag + black bin', 1, `Site kit`);
  add('Marketing sign board + banner', 1, `If applicable`);
  add('Gazebo tent + case', 1, `Site kit`);
  add('Rubber protection mats', 1, `Site kit`);
  add('Timber bearers / risers (under panels on site)', 1, `Site kit`);

  return rows;
}
