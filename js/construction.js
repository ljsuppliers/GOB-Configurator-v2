// Construction drawings for the installer job pack. Everything is derived
// from the SAME rules as the materials engine (premium-bom.js), so the base
// grid, panel plan, stud positions and joist ladder match what was ordered.
//
// Premium build, as agreed with Liam (2026-09-16):
//  BASE   5x2 C24 joists front→back @400. Doubled joist lines at 1.2m centres
//         across the width + both outer joists. Supports (ground screws, blocks
//         + pedestals, or pedestals on a slab) under the doubled lines only,
//         ≤1.3m apart along the depth. Front + rear end joists doubled.
//         75/100mm PIR between joists on 18x38 side battens, 22mm P5 T&G
//         moisture-resistant chipboard over the lot. Walls stand ON the deck.
//  WALLS  Rear = 100mm Kingspan panels, laid first, full width, cut piece at
//         the right-hand end. Steel-clad sides = panels, laid from the rear,
//         cut piece at the front against the stick wall. Panels are T&G and
//         anthracite one side only, so a cut panel yields one groove-edge piece
//         (rear right end / right side front) and one tongue-edge piece (left
//         side front). Clad sides + front = 4x2 tanalised studs @400 on a 4x2
//         base plate, kings each side of every opening, DOUBLED 6x2 flitch
//         (no OSB web) over EVERY door and window, 12mm ply + Tyvek + battens
//         + cladding outside, 75mm PIR + VCL + plasterboard inside. Panel walls:
//         double 18x38 battens + plasterboard inside (no PIR, no VCL: the panel
//         is the vapour barrier; no tape on the joints).
//  HEIGHTS (Liam 2026-09-19) Panel walls = 2140 panel + 49 flat 4x2 plate =
//         2189 to the top of the plate. The front stud wall (base plate, studs,
//         head plate) tops out at the SAME 2189. The doubled 6x2 flitch sits ON
//         TOP of the front wall head plate, FULL WIDTH (joined + staggered when
//         wider than 4.8m; Liam 22 Sep 2026),
//         so its top is ~2334, level with the roof joist tops. Doors (2050) on
//         the 49 base plate reach 2099; the head plate underside is 2140, so a
//         4x2 packer under the head plate closes the ~40mm gap at each door.
//  CORNERS Closed corner (canopy + decking only) = that side wall carried
//         400mm forward, same construction as the side. Open corner = built-up
//         4x2 post (~200x200) cloaked by trims.
//  ROOF   6x2 (doubled by span) joists front→back @400; the two EDGE joists
//         are always doubled. ≤2.5m building: joists
//         stop at the front wall, hung off the flitch on jiffy hangers (level:
//         rear end on the panel plate at 2189, front end on the flitch underside
//         at 2189). Canopy = the two outer joists oversail 400, a 6x2 tie
//         joist across their ends, 6x2 noggings @400 between (the "canopy
//         ladder"), one layer of 2x2 under, ply front + underside, 300 fascia,
//         400 soffit, steel top cap. Taller: every joist oversails 400 instead.
//         Rear oversail 100mm on every job. (Some teams used a 2x2 frame with
//         the firrings overhanging; the ladder is now the standard.)
//  DECKING Standard 400: 4x2 joists @400 x 400 off the base front end joist +
//         4x2 front rim, supports under the rim ≤1.3m. Extra depth = its own
//         frame (see the BOM). Trex boards along the width.
//  PANELS sit in the steel panel base trim (screwed through the chipboard into
//         the joists), screwed to it from INSIDE; U-channel caps every exposed
//         panel edge (tops, corners, opening reveals); flat 4x2 plate on the
//         capped tops with bay-pole screws @400; panel-to-panel corners
//         screwed through with bay-pole screws @400, 180x40 L trim outside. Cut side panel meets the front stud wall at the
//         built-up 4x2 corner post (~200x200): panel edge screws to the post,
//         front wall end stud screws to the post, corner trims cloak it.
//         Firrings on top tapering to the rear + 2 reverse firrings (side
//         edges), 18mm T&G OSB, one-piece EPDM, 75/100mm PIR set 30mm down.
//         Half-round gutter full width at the rear, downpipe one end (both ends
//         from 6m wide).
import { supportLayout, panelPlan, openingsOnWall, roofLadderFor, isSteelClad } from './bom/premium-bom.js?v=54';

const F = 'font-family:Inter,Arial,sans-serif';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const rc = (x, y, w, h, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.fill || 'none'}" stroke="${o.stroke || '#222'}" stroke-width="${o.sw ?? 6}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}/>`;
const ln = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke || '#222'}" stroke-width="${o.sw ?? 6}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
const tx = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 90}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || '#111'}" style="${F}"${o.bold ? ' font-weight="700"' : ''}${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ''}>${esc(s)}</text>`;
const dot = (x, y, r, o = {}) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${o.fill || '#0f766e'}" stroke="${o.stroke || '#0b3d3a'}" stroke-width="4"/>`;
function dimH(x1, x2, y, label) {
  return ln(x1, y, x2, y, { sw: 3 }) + ln(x1, y - 40, x1, y + 40, { sw: 3 }) + ln(x2, y - 40, x2, y + 40, { sw: 3 }) + tx((x1 + x2) / 2, y - 25, label, { size: 70 });
}
function dimV(y1, y2, x, label) {
  return ln(x, y1, x, y2, { sw: 3 }) + ln(x - 40, y1, x + 40, y1, { sw: 3 }) + ln(x - 40, y2, x + 40, y2, { sw: 3 }) + tx(x - 30, (y1 + y2) / 2, label, { size: 70, rot: -90 });
}
const mm = (m) => Math.round(m * 1000);
const sheet = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;background:#fff">${body}</svg>`;

export function buildConstructionDrawings(state, componentDefs) {
  const w = state.width / 1000, d = state.depth / 1000, hM = state.height / 1000;
  const tall = state.height >= 2750;
  const isSig = state.tier !== 'classic';
  const hasCanopy = isSig && state.hasCanopy !== false && !state.deductions?.removeCanopy;
  const hasDecking = isSig && state.hasDecking !== false && !state.deductions?.removeDecking;
  const canopy = hasCanopy ? (state.overhangDepth || 400) / 1000 : (isSig ? 0 : 0.1);
  const closedL = hasCanopy && hasDecking && state.cornerLeft === 'closed';
  const closedR = hasCanopy && hasDecking && state.cornerRight === 'closed';
  const leftPanel = isSteelClad(state.cladding?.left), rightPanel = isSteelClad(state.cladding?.right);
  const pir = state.pirFloorRoof === 100 ? 100 : 75;
  const firr = state.firringFrontMm || 70;
  const foundation = state.foundationType === 'ground-screw' || state.foundationType === 'hybrid' ? 'Radix ground screws'
    : state.foundationType === 'concrete-pile' ? 'Concrete blocks on Postcrete (2 bags per hole) + adjustable pedestals' : 'Adjustable pedestals on the existing concrete base';
  const sup = supportLayout(w, d);
  const ladder = roofLadderFor(d - 0.2);
  const plan = panelPlan(state);
  const ops = (side) => openingsOnWall(state, componentDefs, side);
  const M = 700; // margin, mm
  const out = [];

  /* ── 1. Base supports + floor framing (one sheet, plan) ── */
  {
    const W = mm(w), D = mm(d);
    const SW = W + 2 * M + 1400, SH = D + 2 * M + 900;
    let s = '';
    s += rc(M, M, W, D, { sw: 10 });
    // single joists
    for (let x = 0.4; x < w - 0.05; x += 0.4) { const X = M + mm(x); if (!sup.lines.some((L) => Math.abs(L - x) < 0.01)) s += ln(X, M, X, M + D, { sw: 4, stroke: '#94a3b8' }); }
    // doubled lines
    for (const L of sup.lines) { const X = M + mm(L); s += rc(X - 47, M, 94, D, { fill: '#cbd5e1', stroke: '#334155', sw: 5 }); }
    // end joists doubled
    s += rc(M, M, W, 94, { fill: '#cbd5e1', stroke: '#334155', sw: 5 }) + rc(M, M + D - 94, W, 94, { fill: '#cbd5e1', stroke: '#334155', sw: 5 });
    // supports
    for (const L of sup.lines) for (const R of sup.rows) s += dot(M + mm(L), M + mm(R), 90);
    // dims
    s += dimH(M, M + W, M - 250, `${W}mm external width`);
    s += dimV(M, M + D, M - 300, `${D}mm external depth`);
    for (let i = 1; i < sup.lines.length; i++) s += dimH(M + mm(sup.lines[i - 1]), M + mm(sup.lines[i]), M + D + 250, `${mm(sup.lines[i] - sup.lines[i - 1])}`);
    for (let i = 1; i < sup.rows.length; i++) s += dimV(M + mm(sup.rows[i - 1]), M + mm(sup.rows[i]), M + W + 300, `${mm(sup.rows[i] - sup.rows[i - 1])}`);
    s += tx(M + W / 2, M + D + 520, 'FRONT', { size: 110, bold: true });
    s += tx(M + W / 2, M - 480, 'REAR', { size: 110, bold: true });
    out.push({
      key: 'base', title: `1. Base supports & floor framing (plan, from above)`,
      svg: sheet(SW, SH, s),
      notes: [
        `${foundation}: ${sup.count} supports = ${sup.lines.length} lines across the width × ${sup.rows.length} rows along the depth (green dots). Rows ${sup.rowSpacingMm}mm apart (max 1300mm).`,
        `5x2 C24 floor joists run FRONT→BACK at 400mm centres (grey). The shaded lines are DOUBLED joists (two 5x2 laminated with TimberLok 150s @400 staggered) at 1200mm centres + both outer joists; supports sit under these only. Front + rear end joists doubled.`,
        `${pir}mm PIR between joists on 18x38 side battens, then 22mm P5 T&G moisture-resistant chipboard laid across the joists (staggered joints). Walls stand on the chipboard.`,
        state.foundationType === 'concrete-pile' ? `Blocks: dig, 2 bags Postcrete per hole, one 440×215×100 block per point, adjustable pedestal on each block, frame on the pedestal heads.` : state.foundationType === 'ground-screw' || state.foundationType === 'hybrid' ? `Ground screws driven at the marked points, frame fixed to the screw heads with TimberLok 100s.` : `Pedestals anchored to the slab with 2 concrete screws each; DPM over the slab first.`,
      ],
    });
  }

  /* ── 2. Wall plan (top-down) with panel plan ── */
  {
    const W = mm(w), D = mm(d), ext = 400;
    const SW = W + 2 * M + 1600, SH = D + 2 * M + ext + 1200;
    let s = '';
    const y0 = M + ext; // rear wall at y0, front at y0+D
    // floor deck outline
    s += rc(M, y0, W, D, { sw: 6, stroke: '#94a3b8', dash: '40 30' });
    // rear panel wall (100mm)
    s += rc(M, y0, W, 100, { fill: '#334155', stroke: '#111', sw: 4 });
    { let x = 0; for (const p of plan.rear.pieces) { const X0 = M + mm(x); x += p.width; if (x < w - 0.01) s += ln(M + mm(x), y0 - 60, M + mm(x), y0 + 160, { sw: 5, stroke: '#f59e0b' }); s += tx(X0 + mm(p.width) / 2, y0 - 90, p.cut ? `CUT ${mm(p.width)}` : `${mm(p.width)}`, { size: 58, fill: p.cut ? '#b45309' : '#334155' }); } }
    // sides
    const side = (isLeft, isPanel, pieces, closed) => {
      const X = isLeft ? M : M + W - 100;
      const runTop = y0 + 100, runBot = y0 + D + (closed ? ext : 0);
      if (isPanel) {
        s += rc(X, runTop, 100, runBot - runTop, { fill: '#334155', stroke: '#111', sw: 4 });
        let yy = 0; for (const p of pieces) { const Y0 = runTop + mm(yy); yy += p.width; const Y = runTop + mm(yy); if (Y < runBot - 10) s += ln(X - 60, Y, X + 160, Y, { sw: 5, stroke: '#f59e0b' }); s += tx(isLeft ? X - 110 : X + 210, Y0 + mm(p.width) / 2, p.cut ? `CUT ${mm(p.width)}` : `${mm(p.width)}`, { size: 58, rot: isLeft ? -90 : 90, fill: p.cut ? '#b45309' : '#334155' }); }
      } else {
        s += rc(X, runTop, 100, runBot - runTop, { fill: '#fde68a', stroke: '#92400e', sw: 4 });
        for (let yy = 0.4; yy < (runBot - runTop) / 1000; yy += 0.4) s += ln(X, runTop + mm(yy), X + 100, runTop + mm(yy), { sw: 3, stroke: '#92400e' });
      }
      // openings on this side
      for (const o of ops(isLeft ? 'left' : 'right')) {
        // left elevation positionX measured from the REAR, right from the FRONT
        const fromRear = isLeft ? o.posM : d - o.posM - o.widthM;
        const Y = y0 + mm(fromRear);
        s += rc(X - 20, Y, 140, mm(o.widthM), { fill: '#bfdbfe', stroke: '#1d4ed8', sw: 4 });
        s += tx(isLeft ? X - 110 : X + 210, Y + mm(o.widthM) / 2, `${mm(o.widthM)} ${o.type.includes('door') ? 'door' : 'window'}`, { size: 52, rot: isLeft ? -90 : 90, fill: '#1d4ed8' });
      }
    };
    side(true, leftPanel, plan.left ? plan.left.pieces : [], closedL);
    side(false, rightPanel, plan.right ? plan.right.pieces : [], closedR);
    // front stick wall
    const fy = y0 + D - 100;
    s += rc(M + 100, fy, W - 200, 100, { fill: '#fde68a', stroke: '#92400e', sw: 4 });
    for (let xx = 0.4; xx < w - 0.2; xx += 0.4) s += ln(M + mm(xx), fy, M + mm(xx), fy + 100, { sw: 3, stroke: '#92400e' });
    for (const o of ops('front')) { s += rc(M + mm(o.posM), fy - 20, mm(o.widthM), 140, { fill: '#bfdbfe', stroke: '#1d4ed8', sw: 4 }); s += tx(M + mm(o.posM + o.widthM / 2), fy + 230, `${mm(o.widthM)} ${o.fullHeight ? (o.type.includes('window') ? 'FH window' : 'door') : 'window'}`, { size: 52, fill: '#1d4ed8' }); }
    // Corners: the front stick wall sits BETWEEN the side walls, which run the full depth to
    // the front face. Its DOUBLED END STUDS meet the side wall. A built-up post exists only
    // where glazing meets glazing at an open corner (Liam 22 Sep 2026).
    const nearCorner = (o2, atStart) => o2.some((o) => o.fullHeight && (atStart ? o.posM <= 0.05 : o.posM + o.widthM >= o.wallM - 0.05));
    const glassL = !closedL && nearCorner(ops('front'), true) && nearCorner(ops('left'), false);
    const glassR = !closedR && nearCorner(ops('front'), false) && nearCorner(ops('right'), true);
    // A glass-corner post sits INSIDE the side wall line (x from 100mm in), flush with the
    // front face, both posts at exactly the same depth; the side wall stops behind it.
    const postY = fy - 100; // 200mm deep, front face flush with the building front
    if (glassL) { s += rc(M, postY, 100, 200, { fill: '#fff', stroke: 'none' }); s += rc(M + 100, postY, 200, 200, { fill: '#92400e', stroke: '#111', sw: 4 }) + tx(M + 200, postY - 40, 'post', { size: 50 }); }
    else s += rc(M + 100, fy, 47, 100, { fill: '#f59e0b', stroke: '#92400e', sw: 3 }) + rc(M + 147, fy, 47, 100, { fill: '#f59e0b', stroke: '#92400e', sw: 3 });
    if (glassR) { s += rc(M + W - 100, postY, 100, 200, { fill: '#fff', stroke: 'none' }); s += rc(M + W - 300, postY, 200, 200, { fill: '#92400e', stroke: '#111', sw: 4 }) + tx(M + W - 200, postY - 40, 'post', { size: 50 }); }
    else s += rc(M + W - 194, fy, 47, 100, { fill: '#f59e0b', stroke: '#92400e', sw: 3 }) + rc(M + W - 147, fy, 47, 100, { fill: '#f59e0b', stroke: '#92400e', sw: 3 });
    // canopy / decking line
    if (hasCanopy || hasDecking) s += rc(M, y0 + D, W, ext, { sw: 4, stroke: '#0f766e', dash: '60 40' }) + tx(M + W / 2, y0 + D + ext / 2 + 30, `${hasCanopy ? 'canopy' : ''}${hasCanopy && hasDecking ? ' + ' : ''}${hasDecking ? 'decking' : ''} ${ext}mm`, { size: 80, fill: '#0f766e' });
    s += dimH(M, M + W, y0 - 250, `${W}mm`);
    s += dimV(y0, y0 + D, M - 300, `${D}mm`);
    s += tx(M + W / 2, y0 + D + ext + 500, 'FRONT (stick wall, 4x2 @400)', { size: 100, bold: true });
    s += tx(M + W / 2, M - 350, 'REAR (Kingspan panels, laid first)', { size: 100, bold: true });
    s += tx(M - 450, y0 + D / 2, leftPanel ? 'LEFT: panels' : 'LEFT: stick + cladding', { size: 90, rot: -90 });
    s += tx(M + W + 450, y0 + D / 2, rightPanel ? 'RIGHT: panels' : 'RIGHT: stick + cladding', { size: 90, rot: 90 });
    // legend
    const lx = M, ly = y0 + D + ext + 650;
    s += rc(lx, ly, 160, 90, { fill: '#334155', sw: 2 }) + tx(lx + 220, ly + 70, '100mm Kingspan panel', { size: 70, anchor: 'start' });
    s += rc(lx + 1500, ly, 160, 90, { fill: '#fde68a', stroke: '#92400e', sw: 2 }) + tx(lx + 1720, ly + 70, '4x2 stick frame', { size: 70, anchor: 'start' });
    s += rc(lx + 2900, ly, 160, 90, { fill: '#bfdbfe', stroke: '#1d4ed8', sw: 2 }) + tx(lx + 3120, ly + 70, 'door / window', { size: 70, anchor: 'start' });
    s += ln(lx + 4200, ly, lx + 4200, ly + 90, { sw: 5, stroke: '#f59e0b' }) + tx(lx + 4280, ly + 70, 'panel joint', { size: 70, anchor: 'start' });
    s += rc(lx, ly + 150, 160, 90, { fill: '#f59e0b', stroke: '#92400e', sw: 2 }) + tx(lx + 220, ly + 220, 'doubled end studs of the front wall, meeting the side wall (no post)', { size: 70, anchor: 'start' });
    s += rc(lx + 4200, ly + 150, 160, 90, { fill: '#92400e', stroke: '#111', sw: 2 }) + tx(lx + 4420, ly + 220, 'built-up 4x2 post (~200x200) INSIDE the side wall line: ONLY where glazing meets glazing at an open corner', { size: 70, anchor: 'start' });
    const notes = [
      `Rear wall FIRST, full width: ${plan.rear.pieces.length} pieces (${plan.rear.pieces.map((p) => mm(p.width)).join(' + ')}mm). Cut piece at the RIGHT-hand end.`,
    ];
    if (plan.left) notes.push(`Left side (from the rear): ${plan.left.pieces.map((p) => mm(p.width)).join(' + ')}mm${closedL ? ' incl. the 400mm closed-corner return' : ''}. Cut piece at the FRONT against the stick wall (U-channel).`);
    else notes.push(`Left side: stick frame (4x2 @400), 75mm PIR, ply + Tyvek + battens + ${(state.cladding?.left || '').replace(/-/g, ' ')} cladding${closedL ? '; carried 400mm forward for the closed corner' : ''}.`);
    if (plan.right) notes.push(`Right side (from the rear): ${plan.right.pieces.map((p) => mm(p.width)).join(' + ')}mm${closedR ? ' incl. the 400mm closed-corner return' : ''}. Cut piece at the FRONT.`);
    else notes.push(`Right side: stick frame (4x2 @400), 75mm PIR, ply + Tyvek + battens + ${(state.cladding?.right || '').replace(/-/g, ' ')} cladding${closedR ? '; carried 400mm forward for the closed corner' : ''}.`);
    notes.push(`PANELS TO ORDER: ${plan.total} × 1100mm × ${mm(plan.panelHeightM)}mm. ${plan.cutNote}`);
    notes.push(`Panel widths are written on each piece (CUT = cut on site). Panels are anthracite OUTSIDE / white inside and tongue-and-groove: never flip a piece to put white out. The side walls run the FULL depth to the front face and the front stick wall sits between them; its doubled end studs meet the side wall. A corner post is only built where glazing meets glazing at an open corner. Front corners: ${closedL ? 'left CLOSED (side wall carried 400mm forward)' : 'left OPEN (built-up 4x2 post, corner trims)'}, ${closedR ? 'right CLOSED' : 'right OPEN'}.`);
    out.push({ key: 'walls', title: '2. Wall plan & Kingspan panel layout (from above)', svg: sheet(SW, SH, s), notes });
  }

  /* ── 3. Front wall framing (elevation from outside) ── */
  {
    const PL = 49, FL = 145; // flat 4x2 plate, 6x2 flitch depth
    // The front frame sits BETWEEN panel sides (100mm each), so it is narrower than the building.
    const offL = leftPanel ? 0.1 : 0, offR = rightPanel ? 0.1 : 0;
    const frameW = w - offL - offR;
    const W = mm(frameW), H = mm(plan.panelHeightM) + PL; // 2140 + 49 = 2189 to the top of the head plate
    const SW = W + 2 * M + 800, SH = H + FL + 2 * M + 700;
    let s = '';
    const gy = M + FL + H; // ground line (top of chipboard)
    const top = M + FL;    // top of the head plate
    s += ln(M - 200, gy, M + W + 200, gy, { sw: 8 });
    // base + head plates
    s += rc(M, gy - PL, W, PL, { fill: '#fde68a', stroke: '#92400e', sw: 4 });
    s += rc(M, top, W, PL, { fill: '#fde68a', stroke: '#92400e', sw: 4 });
    // flitch ON TOP of the head plate, full width
    s += rc(M, M, W, FL, { fill: '#7c2d12', stroke: '#111', sw: 4 });
    s += tx(M + W / 2, M + FL / 2 + 25, `2 × 6x2 flitch ON TOP of the head plate, full width ${W}mm${W > 4800 ? ' (joined pieces, joints staggered between the two layers)' : ''}`, { size: 60, fill: '#fff' });
    const fronts = ops('front').sort((a, b) => a.posM - b.posM);
    // openings are positioned from the BUILDING's left edge; the frame starts offL in from it
    const inOpening = (x) => fronts.some((o) => x + offL > o.posM + 0.001 && x + offL < o.posM + o.widthM - 0.001);
    const studTop = top + PL, studH = H - 2 * PL;
    for (let x = 0; x <= frameW + 0.001; x += 0.4) { const xx = Math.min(x, frameW - 0.047); if (!inOpening(xx + 0.02)) s += rc(M + mm(xx), studTop, 47, studH, { fill: '#fde68a', stroke: '#92400e', sw: 3 }); }
    // doubled end studs (they meet the side walls)
    s += rc(M, studTop, 47, studH, { fill: '#f59e0b', stroke: '#92400e', sw: 3 }) + rc(M + 47, studTop, 47, studH, { fill: '#f59e0b', stroke: '#92400e', sw: 3 });
    s += rc(M + W - 47, studTop, 47, studH, { fill: '#f59e0b', stroke: '#92400e', sw: 3 }) + rc(M + W - 94, studTop, 47, studH, { fill: '#f59e0b', stroke: '#92400e', sw: 3 });
    for (const o of fronts) {
      const X = M + mm(o.posM - offL), OW = mm(o.widthM), OH = mm(o.heightM);
      const oy = o.fullHeight ? gy - PL - OH : gy - PL - 900 - OH; // standard windows cill 900
      // DOUBLED 4x2 each side of every opening (king + jack)
      for (const k of [X - 94, X - 47, X + OW, X + OW + 47]) s += rc(k, studTop, 47, studH, { fill: '#f59e0b', stroke: '#92400e', sw: 3 });
      // opening
      const oTop = Math.max(oy, studTop);
      s += rc(X, oTop, OW, gy - PL - oTop, { fill: '#bfdbfe', stroke: '#1d4ed8', sw: 4 });
      // packer between the opening head and the head plate
      const gap = oTop - studTop;
      if (gap > 5) {
        s += rc(X, studTop, OW, gap, { fill: '#fcd34d', stroke: '#92400e', sw: 3 });
        s += tx(X + OW / 2, studTop + gap / 2 + 20, `4x2 packer ${gap}mm`, { size: 52 });
      }
      s += dimH(X, X + OW, gy + 200, `${OW}mm`);
      if (!o.fullHeight) s += rc(X, gy - PL - 900, OW, 47, { fill: '#fde68a', stroke: '#92400e', sw: 3 });
    }
    s += dimH(M, M + W, M - 250, `${W}mm frame${offL || offR ? ` (building ${mm(w)}mm less ${mm(offL + offR)}mm of panel sides)` : ''}`);
    s += dimV(top, gy, M - 300, `${H}mm to top of plate`);
    s += dimV(M, top, M - 300, `${FL}`);
    out.push({
      key: 'front', title: '3. Front wall framing (elevation, viewed from outside)', svg: sheet(SW, SH, s),
      notes: [
        `4x2 TANALISED C24 throughout: base plate on the chipboard, studs @400mm from the LEFT, head plate. The frame is ${W}mm wide: it sits BETWEEN the side walls${offL || offR ? ' (100mm panels each side)' : ''}, and its DOUBLED END STUDS (orange) meet the side walls - no corner post unless glazing meets glazing at an open corner. Frame is ${H}mm to the top of the head plate = the panel walls (${mm(plan.panelHeightM)}mm panel + ${PL}mm flat 4x2 plate). DOUBLED 4x2 uprights (orange) each side of every door and window.`,
        `DOUBLED 6x2 flitch (two 6x2 laminated with TimberLok 100s, NO OSB web) sits ON TOP of the head plate the FULL width of the front${W > 4800 ? ', made of joined pieces with the joints staggered between the two layers' : ''}. Its top is level with the roof joist tops. ${tall ? 'Taller build: the roof joists run OVER the flitch and oversail to form the canopy.' : 'Standard 2.5m build: the roof joists hang off the flitch on jiffy hangers.'}`,
        `Doors and full-height windows (2050mm) sit on the base plate; a 4x2 packer under the head plate closes the gap to the door head (about ${H - 2 * PL - 2050}mm, trim to suit). Standard windows shown on a 900mm cill; check the drawing for the customer's positions.`,
        `Outside: 12mm ply, Tyvek, 18x38 battens @400, ${(state.cladding?.front || '').replace(/-/g, ' ')} cladding. Inside: 75mm PIR in every bay, VCL, 12.5mm plasterboard, skim.`,
      ],
    });
  }

  /* ── 4. Rear + side elevations ── */
  {
    const H = mm(plan.panelHeightM), PL = 49;
    const elev = (label, runM, pieces, isPanel, openings, mirror, closed, frontAtRight, mirrorOps = false) => {
      const W = mm(runM), SW = W + 2 * M + 800, SH = H + 2 * M + 500;
      let s = '';
      const gy = M + H;
      s += ln(M - 200, gy, M + W + 200, gy, { sw: 8 });
      if (isPanel) {
        let x = 0;
        for (const p of pieces) {
          const px = mirror ? runM - x - p.width : x; // mirror: draw from the right
          s += rc(M + mm(px), M, mm(p.width), H, { fill: p.cut ? '#64748b' : '#334155', stroke: '#111', sw: 4 });
          s += tx(M + mm(px + p.width / 2), M + H / 2, p.cut ? `CUT ${mm(p.width)}` : `${mm(p.width)}`, { size: 70, fill: '#fff' });
          x += p.width;
        }
        s += rc(M, M - 49, W, 49, { fill: '#fde68a', stroke: '#92400e', sw: 3 }) + tx(M + W / 2, M - 80, '49mm flat 4x2 plate on the panel heads (bay-pole screws @400): 2189 to top', { size: 60 });
      } else {
        // stud wall: base plate + studs + head plate = panel height + 49 (2189), same top as the panel walls
        const inOp = (x) => openings.some((o) => x > o.posM + 0.001 && x < o.posM + o.widthM - 0.001);
        s += rc(M, gy - PL, W, PL, { fill: '#fde68a', stroke: '#92400e', sw: 4 }) + rc(M, M - PL, W, PL, { fill: '#fde68a', stroke: '#92400e', sw: 4 });
        for (let x = 0; x <= runM + 0.001; x += 0.4) { const xx = Math.min(x, runM - 0.047); if (!inOp(xx + 0.02)) s += rc(M + mm(xx), M, 47, H - PL, { fill: '#fde68a', stroke: '#92400e', sw: 3 }); }
        s += rc(M + W - 47, M, 47, H - PL, { fill: '#fde68a', stroke: '#92400e', sw: 3 });
        s += tx(M + W / 2, M - 80, `49mm head plate: ${H + PL} to top, level with the panel walls`, { size: 60 });
      }
      for (const o of openings) {
        const pos = mirrorOps ? runM - o.posM - o.widthM : o.posM;
        const X = M + mm(pos), OW = mm(o.widthM), OH = mm(o.heightM);
        const oy = o.fullHeight ? gy - PL - OH : gy - PL - 900 - OH;
        const top = Math.max(oy, M);
        s += rc(X, top, OW, gy - PL - top, { fill: '#bfdbfe', stroke: '#1d4ed8', sw: 4 });
        if (!isPanel) {
          for (const k of [X - 94, X - 47, X + OW, X + OW + 47]) s += rc(k, M, 47, H - PL, { fill: '#f59e0b', stroke: '#92400e', sw: 3 });
          if (top - M > 5) { s += rc(X, M, OW, top - M, { fill: '#fcd34d', stroke: '#92400e', sw: 3 }); s += tx(X + OW / 2, M + (top - M) / 2 + 18, `packer ${top - M}`, { size: 44 }); }
        }
        s += dimH(X, X + OW, gy + 200, `${OW}mm`);
      }
      if (closed) s += rc(frontAtRight ? M + W - 400 : M, M - 130, 400, 60, { fill: '#0f766e', sw: 2 }) + tx(frontAtRight ? M + W - 200 : M + 200, M - 200, '400mm closed-corner return', { size: 60, fill: '#0f766e' });
      s += dimH(M, M + W, M - 350, `${W}mm`);
      s += dimV(M - PL, gy, M - 300, `${H + PL}mm`);
      if (label !== 'rear') { s += tx(frontAtRight ? M : M + W, gy + 380, 'REAR', { size: 90, bold: true }); s += tx(frontAtRight ? M + W : M, gy + 380, 'FRONT', { size: 90, bold: true }); }
      else { s += tx(M, gy + 380, "BUILDING'S RIGHT", { size: 80, bold: true }); s += tx(M + W, gy + 380, "BUILDING'S LEFT", { size: 80, bold: true }); }
      return sheet(SW, SH, s);
    };
    const rearOps = ops('rear');
    // Standing BEHIND the building looking at the rear wall, the building's left (as on the
    // plan, seen from the front) is on your RIGHT - so this view is the plan mirrored.
    out.push({ key: 'rear', title: '4. Rear wall (viewed from outside, standing behind the building)', svg: elev('rear', w, plan.rear.pieces, true, rearOps, true, false, false, true),
      notes: [`This view is the plan MIRRORED: the building's left-hand end (plan) is on the RIGHT here. Panels are laid from the building's LEFT (right of this view) across to the right; the CUT piece is at the building's right-hand end, which is the LEFT of this view (groove edge factory, cut edge into the corner trim). 180x40 L corner trims both rear corners.`, `Inside: double 18x38 battens (verticals @600 + rows @600), plasterboard, skim${state.featureWalls?.rear || state.featureWall === 'rear' ? ' — EXCEPT this wall carries the oak acoustic slat panels over the plasterboard (no skim/paint)' : ''}. No VCL needed on panel walls.`] });
    // LEFT wall seen from outside (standing to the left of the building, looking at it): the REAR is on the LEFT,
    // the front on the right. Panel pieces start at the rear (left); left-wall positions are measured from the rear.
    const leftRun = plan.left ? plan.left.runM : d - 0.11 + (closedL ? 0.4 : 0);
    out.push({ key: 'left', title: '5. Left side wall (viewed from outside; rear on the left, front on the right)', svg: elev('left', leftRun, plan.left ? plan.left.pieces : [], leftPanel, ops('left'), false, closedL, true),
      notes: [leftPanel ? `Panels start at the REAR (left of this view) and run to the front; the cut piece is at the FRONT against the stick wall's U-channel (tongue edge factory).` : `Stick wall: 4x2 @400 from the rear, 75mm PIR, VCL, plasterboard; outside ply + Tyvek + battens + ${(state.cladding?.left || '').replace(/-/g, ' ')} cladding.`, closedL ? 'Closed corner: this wall is carried 400mm forward, same construction, inside return clad in the front cladding, 200x40x40 U trim on the corner.' : 'Open front corner: built-up 4x2 post, 50x50 L trim over cladding (or 180 L + U where glazing meets glazing).'] });
    // RIGHT wall seen from outside: the FRONT is on the LEFT, the rear on the right. Panel pieces start at the
    // rear (right, so mirrored); right-wall positions are measured from the front, which is the left of this view.
    const rightRun = plan.right ? plan.right.runM : d - 0.11 + (closedR ? 0.4 : 0);
    out.push({ key: 'right', title: '6. Right side wall (viewed from outside; front on the left, rear on the right)', svg: elev('right', rightRun, plan.right ? plan.right.pieces : [], rightPanel, ops('right'), true, closedR, false),
      notes: [rightPanel ? `Panels start at the REAR (right of this view) and run to the front; the cut piece is at the FRONT (groove edge factory).` : `Stick wall: 4x2 @400 from the rear, 75mm PIR, VCL, plasterboard; outside ply + Tyvek + battens + ${(state.cladding?.right || '').replace(/-/g, ' ')} cladding.`, closedR ? 'Closed corner: carried 400mm forward, same construction, 200x40x40 U trim.' : 'Open front corner: built-up 4x2 post, 50x50 L trim (or 180 L + U where glazing meets glazing).'] });
  }

  /* ── 7. Roof framing (plan) ── */
  {
    const W = mm(w), D = mm(d), C = mm(canopy), RO = 100;
    const SW = W + 2 * M + 1400, SH = D + C + RO + 2 * M + 1100;
    let s = '';
    const y0 = M + RO; // rear wall line at y0 (rear oversail above it), front wall at y0 + D
    s += rc(M, y0, W, D, { sw: 8, stroke: '#94a3b8', dash: '40 30' }); // walls
    s += rc(M, y0, W, 100, { fill: '#fde68a', stroke: '#92400e', sw: 3 });
    // tall: joists oversail over the flitch; standard: joists stop at the flitch's rear face (hangers)
    const jTop = y0 - RO, jBot = tall ? y0 + D + C : y0 + D - 150;
    const n = Math.ceil(w / ladder.spacing) + 1;
    const edgePly = Math.max(2, ladder.ply); // edge joists DOUBLED as standard (Liam 2026-09-19)
    for (let i = 0; i < n; i++) {
      const edge = i === 0 || i === n - 1;
      const ply = edge ? edgePly : ladder.ply;
      const x = i === n - 1 ? w - 0.047 * ply : Math.min(i * ladder.spacing, w - 0.047 * ply);
      const bot = edge && canopy > 0 ? y0 + D + C : jBot; // outer pair sails forward to form the canopy
      s += rc(M + mm(x), jTop, 47 * ply, bot - jTop, { fill: edge ? '#cbd5e1' : '#e2e8f0', stroke: '#334155', sw: 4 });
      // firring on top (dashed centre line)
      s += ln(M + mm(x) + 23 * ply, jTop, M + mm(x) + 23 * ply, y0 + D + C, { sw: 3, stroke: '#0f766e', dash: '50 30' });
    }
    s += tx(M + 47 * edgePly + 60, jTop + 200, `edge joists DOUBLED (${edgePly} × 6x2)${canopy > 0 ? `, sail forward ${C}mm` : ''}`, { size: 56, anchor: 'start', rot: 90 });
    // flitch band on the front wall (drawn over the joists so it reads)
    s += rc(M, y0 + D - 150, W, 150, { fill: '#7c2d12', stroke: '#111', sw: 4, op: tall ? 0.85 : 1 }) + tx(M + W / 2, y0 + D - 50, tall ? 'front wall: 2×6x2 flitch ON TOP of the head plate, joists run over it' : 'front wall: 2×6x2 flitch ON TOP of the head plate, joists hang off it (tops level)', { size: 60, fill: '#fff' });
    // reverse firrings along the side edges
    s += rc(M - 47, jTop, 47, y0 + D + C - jTop, { fill: '#ccfbf1', stroke: '#0f766e', sw: 3 }) + rc(M + W, jTop, 47, y0 + D + C - jTop, { fill: '#ccfbf1', stroke: '#0f766e', sw: 3 });
    // canopy structure
    if (canopy > 0) {
      if (tall) {
        s += rc(M, y0 + D, W, C, { sw: 5, stroke: '#0f766e' }) + tx(M + W / 2, y0 + D + C + 120, `joists oversail ${C}mm + one layer of 2x2 under (canopy box, ply front + underside)`, { size: 70, fill: '#0f766e' });
      } else {
        // outer joists oversail, 6x2 tie across the front, noggings @400 between
        s += rc(M, y0 + D + C - 47, W, 47, { fill: '#e2e8f0', stroke: '#334155', sw: 4 });
        for (let x = 0.4; x < w - 0.1; x += 0.4) s += rc(M + mm(x), y0 + D, 47, C - 47, { fill: '#f1f5f9', stroke: '#64748b', sw: 3 });
        s += tx(M + W / 2, y0 + D + C + 120, `canopy ladder: the DOUBLED outer joists sail forward ${C}mm, 6x2 tie joist across the front, 6x2 noggings @400 between, 2x2 layer under`, { size: 70, fill: '#0f766e' });
      }
    }
    // gutter
    s += rc(M - 100, y0 - RO - 120, W + 200, 100, { fill: '#111', sw: 2 }) + tx(M + W / 2, y0 - RO - 160, 'half-round gutter, full width, rear (falls to the downpipe)', { size: 60 });
    const dps = w >= 6 ? [M - 50, M + W + 50] : [M + W + 50];
    for (const X of dps) s += dot(X, y0 - RO - 70, 70, { fill: '#111', stroke: '#111' });
    s += dimH(M, M + W, M - 400, `${W}mm`);
    s += dimV(y0, y0 + D, M - 300, `${D}mm`);
    if (canopy > 0) s += dimV(y0 + D, y0 + D + C, M + W + 300, `${C}`);
    s += dimV(y0 - RO, y0, M + W + 300, `${RO}`);
    s += tx(M + W / 2, y0 + D + C + 450, 'FRONT', { size: 110, bold: true });
    s += tx(M + W / 2, M - 550, 'REAR', { size: 110, bold: true });
    out.push({
      key: 'roof', title: '7. Roof framing (plan, from above)', svg: sheet(SW, SH, s),
      notes: [
        `${n} roof joists (${ladder.label}) run FRONT→BACK at ${mm(ladder.spacing)}mm centres from the LEFT; the two EDGE joists are DOUBLED as standard. ${tall ? `Taller build (${hM.toFixed(2)}m): joists run OVER the front flitch/top plate and oversail ${C}mm to form the canopy; one layer of 2x2 fixed under the oversail deepens the canopy box.` : `Standard 2.5m build: joists STOP at the front wall and hang off the flitch on jiffy hangers (twist nails). The flitch sits ON TOP of the front head plate, so the joists run LEVEL: rear end on the 49mm plate over the panels (2189), front end in the hangers with the underside at 2189. The ${C}mm canopy ladder: the two OUTER (doubled) joists are cut ${C}mm longer and sail forward, a 6x2 tie joist runs across their ends, 6x2 noggings @400 sit between in line with the joists, then one layer of 2x2 under and ply on the front + underside. See sheet 9 for the section.`} Every job: joists and firrings oversail the REAR by ${RO}mm.`,
        `Firrings (green dashed) on top of every joist, ${firr}mm at the front tapering to 0 at the rear so the water runs to the rear gutter; the 2 reverse firrings (side edges) square the sides. 18mm T&G OSB across the joists, one-piece EPDM with adhesive, edge trim. ${pir}mm PIR between joists set 30mm below the joist tops (vented cold roof), plasterboard ceiling.`,
        `Half-round black gutter across the full rear width, downpipe at ${w >= 6 ? 'BOTH ends (building over 6m)' : 'one end'}. Steel top cap over the fascia + roof edge on the FRONT and SIDES only. Ply on the front face + underside of the canopy for the fascia and soffit.`,
      ],
    });
  }

  /* ── 8. Build-up sections ── */
  {
    const col = (x, title, layers) => {
      let s = tx(x + 900, 260, title, { size: 95, bold: true });
      let y = 380;
      for (const [label, h, fill, stroke] of layers) {
        s += rc(x, y, 1800, h, { fill, stroke: stroke || '#334155', sw: 4 }) + tx(x + 900, y + h / 2 + 30, label, { size: 68, fill: fill === '#334155' || fill === '#111' ? '#fff' : '#111' });
        y += h;
      }
      return s;
    };
    const SW = 4 * 2100 + 600, SH = 3200;
    let s = '';
    s += col(300, 'FLOOR (top → ground)', [
      ['underlay + laminate (Wickes)', 140, '#f5f5f4'], ['22mm P5 T&G moisture-resistant chipboard', 160, '#d6d3d1'],
      [`${pir}mm PIR on 18x38 battens`, 260, '#fef3c7'], ['5x2 C24 joists @400 centres (doubled lines @1200 centres)', 300, '#fde68a', '#92400e'], [foundation.split(' (')[0], 260, '#e2e8f0'],
    ]);
    s += col(2400, 'STICK WALL (outside → in)', [
      [`${(state.cladding?.front || 'cladding').replace(/-/g, ' ')}`, 200, '#a16207', '#78350f'], ['18x38 battens @400 centres (ventilated cavity)', 160, '#fde68a', '#92400e'], ['Tyvek breather membrane', 90, '#fff'],
      ['12mm ply sheathing', 130, '#d6d3d1'], ['4x2 tanalised studs @400 centres + 75mm PIR', 340, '#fef3c7'], ['VCL (vapour control, taped)', 90, '#bfdbfe'], ['12.5mm plasterboard + skim + paint', 160, '#f5f5f4'],
    ]);
    s += col(4500, 'PANEL WALL (outside → in)', [
      ['100mm Kingspan panel, anthracite out (panel = vapour barrier)', 460, '#334155'],
      ['double 18x38 battens (vertical @600 centres + rows @600 centres)', 300, '#fde68a', '#92400e'], ['12.5mm plasterboard + skim + paint', 160, '#f5f5f4'],
    ]);
    s += col(6600, 'ROOF (top → ceiling)', [
      ['one-piece EPDM, fully adhered, edge trim', 100, '#111'], ['18mm T&G OSB', 140, '#d6d3d1'], [`firrings ${firr}mm → 0 (fall to rear)`, 180, '#ccfbf1', '#0f766e'],
      [`${ladder.label} joists @${mm(ladder.spacing)} centres (edges doubled)`, 300, '#fde68a', '#92400e'], [`${pir}mm PIR set 30mm down (vented)`, 260, '#fef3c7'], ['12.5mm plasterboard + skim + paint', 160, '#f5f5f4'],
    ]);
    out.push({
      key: 'sections', title: '8. Build-up of floor, walls and roof (layers, outside to inside)', svg: sheet(SW, SH, s),
      notes: [
        'Stick walls carry a VCL on the warm side (behind the plasterboard). Panel walls do not: the Kingspan panel is the vapour barrier.',
        'Fixings: TimberLok 150 for floor doubling, TimberLok 100 for studs to plates, joists to plates, canopy frame; jiffy hangers + twist nails for joists to the flitch on 2.5m builds; bay-pole screws for the 4x2 top plate into the panel heads; 5.0×70 wood screws for battens and firrings.',
      ],
    });
  }

  /* ── 9. Section through the front wall + canopy (side view) ── */
  {
    const PL = 49, FL = 145, PH = mm(plan.panelHeightM), TOP = PH + PL; // 2140 + 49 = 2189
    const C = hasCanopy ? mm(canopy) : 100;
    const x0 = 1500, base = 3200; // outside face of the stud frame at x0; deck top at y=base
    const X = (x) => x0 + x, Y = (y) => base - y;
    const box = (x, y, wd, ht, o) => rc(X(x), Y(y + ht), wd, ht, o);
    const SW = 3400, SH = 3600;
    let s = '';
    const T = '#fde68a', TS = '#92400e';
    // base
    box(0, 0, 0, 0);
    s += box(0, -147, 1700, 125, { fill: T, stroke: TS, sw: 3 }) + tx(X(850), Y(-85), '5x2 floor joists (front end joist doubled)', { size: 44 });
    s += box(0, -22, 1700, 22, { fill: '#d6d3d1', stroke: '#444', sw: 2 }) + tx(X(1100), Y(-8), '22mm P5 chipboard', { size: 40 });
    if (hasDecking) {
      s += box(-400, -117, 400, 95, { fill: T, stroke: TS, sw: 3 }) + tx(X(-200), Y(-70), '4x2 deck joist', { size: 40 });
      s += box(-400, -22, 400, 25, { fill: '#78716c', stroke: '#292524', sw: 2 }) + tx(X(-200), Y(-40), 'Trex boards', { size: 40, fill: '#fff' });
    }
    // wall frame
    s += box(0, 0, 95, PL, { fill: T, stroke: TS, sw: 3 }) + tx(X(230), Y(20), 'base plate 4x2 flat', { size: 40, anchor: 'start' });
    s += box(0, PL, 95, PH - PL, { fill: '#fef3c7', stroke: TS, sw: 3, dash: '20 14' });
    s += box(0, PH, 95, PL, { fill: T, stroke: TS, sw: 3 }) + tx(X(230), Y(PH + 16), 'head plate 4x2 flat', { size: 40, anchor: 'start' });
    // door
    s += box(12, PL, 70, 2050, { fill: '#bfdbfe', stroke: '#1d4ed8', sw: 3 }) + tx(X(47), Y(1000), '2050 door', { size: 44, rot: -90 });
    s += box(0, PL + 2050, 95, PH - PL - 2050, { fill: '#fcd34d', stroke: TS, sw: 3 }) + tx(X(230), Y(PL + 2050 + 12), `4x2 packer ${PH - PL - 2050}mm`, { size: 40, anchor: 'start' });
    s += box(-12, -22, 12, 40, { fill: '#334155', stroke: '#111', sw: 2 }) + tx(X(-30), Y(60), 'door base trim', { size: 36, anchor: 'end' });
    // inside lining
    s += box(95, 0, 13, TOP, { fill: '#f5f5f4', stroke: '#444', sw: 2 }) + tx(X(120), Y(1400), 'plasterboard (75mm PIR + VCL in the bays)', { size: 40, anchor: 'start', rot: -90 });
    // flitch on top of the head plate
    s += box(0, TOP, 94, FL, { fill: '#7c2d12', stroke: '#111', sw: 3 }) + tx(X(47), Y(TOP + 60), '2×6x2', { size: 34, fill: '#fff' });
    s += tx(X(120), Y(TOP + 100), 'flitch ON TOP of the head plate', { size: 40, anchor: 'start' });
    // roof joist hanging off the flitch (2.5m) or running over it (tall)
    if (tall) {
      s += box(-C, TOP, C + 1700, FL, { fill: '#e2e8f0', stroke: '#334155', sw: 3 }) + tx(X(800), Y(TOP + 60), '6x2 roof joist oversails the flitch', { size: 40 });
    } else {
      s += box(94, TOP, 1600, FL, { fill: '#e2e8f0', stroke: '#334155', sw: 3 }) + tx(X(800), Y(TOP + 60), '6x2 roof joist in a jiffy hanger off the flitch (level)', { size: 40 });
      s += box(-C, TOP, C, FL, { fill: '#e2e8f0', stroke: '#334155', sw: 3, dash: '16 10' }) + tx(X(-C / 2), Y(TOP + 60), 'outer joist / nogging', { size: 34 });
      s += box(-C, TOP, 47, FL, { fill: '#cbd5e1', stroke: '#334155', sw: 3 });
      s += tx(X(-C - 20), Y(TOP + 200), 'tie joist', { size: 34, anchor: 'end' });
    }
    // 2x2 under the canopy, ply, soffit, fascia
    s += box(-C, TOP - 47, C, 47, { fill: T, stroke: TS, sw: 2 }) + tx(X(-C / 2), Y(TOP - 30), '2x2', { size: 32 });
    s += box(-C - 12, TOP - 59, C + 12, 12, { fill: '#d6d3d1', stroke: '#444', sw: 2 });
    s += box(-C - 24, TOP - 69, C + 24, 10, { fill: '#fff', stroke: '#111', sw: 2 }) + tx(X(-C / 2), Y(TOP - 110), '12mm ply + 400 soffit (vented)', { size: 36 });
    // roof build-up on top: firring, OSB, EPDM
    const F = firr;
    s += `<polygon points="${X(-C)},${Y(TOP + FL)} ${X(1700)},${Y(TOP + FL)} ${X(1700)},${Y(TOP + FL + Math.max(10, F - 40))} ${X(-C)},${Y(TOP + FL + F)}" fill="#ccfbf1" stroke="#0f766e" stroke-width="3"/>`;
    s += tx(X(700), Y(TOP + FL + 25), `firring ${F}mm → 0 at the rear`, { size: 36 });
    s += `<polygon points="${X(-C)},${Y(TOP + FL + F)} ${X(1700)},${Y(TOP + FL + Math.max(10, F - 40))} ${X(1700)},${Y(TOP + FL + Math.max(10, F - 40) + 18)} ${X(-C)},${Y(TOP + FL + F + 18)}" fill="#d6d3d1" stroke="#444" stroke-width="2"/>`;
    s += `<polygon points="${X(-C - 24)},${Y(TOP + FL + F + 18)} ${X(1700)},${Y(TOP + FL + Math.max(10, F - 40) + 18)} ${X(1700)},${Y(TOP + FL + Math.max(10, F - 40) + 22)} ${X(-C - 24)},${Y(TOP + FL + F + 22)}" fill="#111" stroke="#111" stroke-width="2"/>`;
    s += tx(X(700), Y(TOP + FL + F + 60), '18mm OSB + EPDM (wraps over the fascia under the steel top cap)', { size: 36 });
    // ply on the front face + fascia 300 + top cap
    const fasciaTop = TOP + FL + F + 22, fasciaBot = fasciaTop - 300;
    s += box(-C - 12, fasciaBot, 12, 300, { fill: '#d6d3d1', stroke: '#444', sw: 2 });
    s += box(-C - 22, fasciaBot, 10, 300, { fill: '#fff', stroke: '#111', sw: 2 });
    s += box(-C - 30, fasciaTop - 4, 40, 8, { fill: '#334155', stroke: '#111', sw: 2 });
    s += tx(X(-C - 40), Y(fasciaBot + 150), '300 fascia on 12mm ply, steel top cap', { size: 36, anchor: 'end' });
    // cladding outside the stud wall up to the soffit
    s += box(-12, -22, 12, TOP - 47 - 22 + 22, { fill: '#d6d3d1', stroke: '#444', sw: 2 });
    s += box(-50, -22, 38, TOP - 47, { fill: '#fef3c7', stroke: TS, sw: 2 });
    s += box(-70, -22, 20, TOP - 47, { fill: '#a16207', stroke: '#78350f', sw: 2 });
    s += tx(X(-90), Y(1500), 'cladding / battens / Tyvek / 12mm ply', { size: 36, anchor: 'end', rot: -90 });
    // ceiling + roof PIR
    s += box(108, TOP - 13, 1592, 13, { fill: '#f5f5f4', stroke: '#444', sw: 2 }) + tx(X(900), Y(TOP - 60), 'plasterboard ceiling on the joist undersides', { size: 36 });
    // dims
    s += dimV(Y(TOP), Y(0), X(-C - 250), `${TOP} to top of plate`);
    s += dimV(Y(TOP + FL), Y(TOP), X(-C - 250), `${FL}`);
    s += dimH(X(-C), X(0), Y(-300), `${C} canopy`);
    if (hasDecking) s += dimH(X(-400), X(0), Y(-420), `400 decking`);
    s += ln(X(-C - 600), Y(0), X(1800), Y(0), { sw: 2, stroke: '#94a3b8', dash: '30 20' }) + tx(X(1780), Y(-40), 'deck top = 0', { size: 36, anchor: 'end' });
    s += tx(X(-C - 400), Y(TOP + 500), 'OUTSIDE', { size: 90, bold: true }) + tx(X(1400), Y(TOP + 500), 'INSIDE', { size: 90, bold: true });
    out.push({
      key: 'section', title: '9. Section through the front wall + canopy (side view, at a door)', svg: sheet(SW, SH, s),
      notes: [
        `Heights: ${PH}mm panel + ${PL}mm flat 4x2 plate = ${TOP}mm to the top of every wall (panel walls and stud walls alike). The doubled 6x2 flitch sits ON TOP of the front head plate (${TOP} to ${TOP + FL}); no second head plate. ${tall ? 'Taller build: the roof joists run over the flitch and oversail to form the canopy.' : 'Roof joists hang off the flitch on jiffy hangers so they run level, rear ends on the 4x2 plate over the panels.'}`,
        `Door head: 2050mm door on the ${PL}mm base plate = ${PL + 2050}; head plate underside at ${PH}; fill the ${PH - PL - 2050}mm with a 4x2 packer (trim to suit). Fit frames to a rough opening 10mm bigger each way, pack, foam and silicone. Door base trim under every door; panel base trim under full-height windows.`,
        `Canopy: ${tall ? 'every joist oversails' : 'the two outer joists oversail, a 6x2 tie joist across their ends, 6x2 noggings @400 between'}; one layer of 2x2 under; 12mm ply on the front face and underside; 300mm fascia front and sides (200mm rear), 400mm soffit with vent strip, EPDM up and over under the steel top cap.`,
        `Panels: sit in the steel panel base trim (screwed through the chipboard into the joists), screwed to the trim from INSIDE. U-channel caps every exposed panel edge (tops, corners, opening reveals). Flat 4x2 plate on the capped tops, bay-pole screws @400. Panel-to-panel corners screwed through @400, 180x40 L trim outside. Cut side panel meets the front stud wall at the built-up 4x2 corner post (~200x200): panel edge and end stud both screw to the post; corner trims cloak it.`,
        `Roof bearing: joists sit on the 4x2 plate over the side and rear panels, skew-fixed with TimberLok 100s; 6x2 end joists close the front (tie joist) and rear (100mm oversail). Roof PIR set 30mm below the joist tops; VCL under the joists; plasterboard ceiling.`,
        ...(hasDecking ? [`Standard 400mm decking: 4x2 joists @400 x 400mm off the base front end joist (TimberLok 150s through the end joist), 4x2 front rim, supports under the rim at max 1.3m. Extra decking is its own frame on its own supports (see the BOM). Trex boards run along the width.`] : []),
      ],
    });
  }
  return out;
}
