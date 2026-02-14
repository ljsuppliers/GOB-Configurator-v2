// SVG component library for doors and windows
// Each function returns an SVG group element string

const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, children = '') {
  const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
  if (children) return `<${tag} ${a}>${children}</${tag}>`;
  return `<${tag} ${a}/>`;
}

// Glass indicator: diagonal lines in corners
function glassCorners(x, y, w, h, size = 20) {
  const s = Math.min(size, w * 0.15, h * 0.08);
  return [
    el('line', { x1: x, y1: y, x2: x + s, y2: y + s, stroke: '#000', 'stroke-width': 1.5 }),
    el('line', { x1: x + w, y1: y, x2: x + w - s, y2: y + s, stroke: '#000', 'stroke-width': 1.5 }),
    el('line', { x1: x, y1: y + h, x2: x + s, y2: y + h - s, stroke: '#000', 'stroke-width': 1.5 }),
    el('line', { x1: x + w, y1: y + h, x2: x + w - s, y2: y + h - s, stroke: '#000', 'stroke-width': 1.5 }),
  ].join('');
}

// ─── ELEVATION COMPONENTS ────────────────────────────────────

export function slidingDoorElevation(x, y, w, h, options = {}) {
  const frameW = 4;
  const innerPad = 8;
  const handleW = 8, handleH = 30;
  const midX = x + w / 2;
  const arrowDir = options.direction || 'right'; // sliding direction

  let svg = '';
  // Outer frame
  svg += el('rect', { x, y, width: w, height: h, fill: 'none', stroke: '#000', 'stroke-width': 4 });
  // Inner frame
  svg += el('rect', { x: x + innerPad, y: y + innerPad, width: w - innerPad * 2, height: h - innerPad * 2, fill: 'none', stroke: '#000', 'stroke-width': 2 });
  // Central division
  svg += el('line', { x1: midX, y1: y + innerPad, x2: midX, y2: y + h - innerPad, stroke: '#000', 'stroke-width': 3 });

  // Left pane glass corners
  svg += glassCorners(x + innerPad + 4, y + innerPad + 4, (w / 2) - innerPad - 8, h - innerPad * 2 - 8);
  // Right pane glass corners
  svg += glassCorners(midX + 4, y + innerPad + 4, (w / 2) - innerPad - 8, h - innerPad * 2 - 8);

  // Handle
  const hx = midX - handleW / 2;
  const hy = y + h / 2 - handleH / 2;
  svg += el('rect', { x: hx, y: hy, width: handleW, height: handleH, fill: '#3F3F3F', stroke: 'none' });

  // Sliding arrow
  const arrowY = y + h - 30;
  const arrowLen = w * 0.35;
  if (arrowDir === 'right') {
    const ax1 = x + w * 0.15;
    const ax2 = ax1 + arrowLen;
    svg += el('line', { x1: ax1, y1: arrowY, x2: ax2, y2: arrowY, stroke: '#000', 'stroke-width': 2 });
    svg += `<polyline points="${ax2 - 8},${arrowY - 5} ${ax2},${arrowY} ${ax2 - 8},${arrowY + 5}" fill="none" stroke="#000" stroke-width="2"/>`;
  } else {
    const ax2 = x + w * 0.85;
    const ax1 = ax2 - arrowLen;
    svg += el('line', { x1: ax1, y1: arrowY, x2: ax2, y2: arrowY, stroke: '#000', 'stroke-width': 2 });
    svg += `<polyline points="${ax1 + 8},${arrowY - 5} ${ax1},${arrowY} ${ax1 + 8},${arrowY + 5}" fill="none" stroke="#000" stroke-width="2"/>`;
  }

  return `<g class="component sliding-door">${svg}</g>`;
}

export function bifoldDoorElevation(x, y, w, h, options = {}) {
  const leaves = options.leaves || Math.max(3, Math.round(w / 800));
  const frameW = 4;
  const leafW = w / leaves;

  let svg = '';
  // Outer frame
  svg += el('rect', { x, y, width: w, height: h, fill: 'none', stroke: '#000', 'stroke-width': 4 });

  // Individual leaf divisions
  for (let i = 1; i < leaves; i++) {
    const lx = x + leafW * i;
    svg += el('line', { x1: lx, y1: y, x2: lx, y2: y + h, stroke: '#000', 'stroke-width': 2 });
  }

  // Glass corners on each leaf
  for (let i = 0; i < leaves; i++) {
    const lx = x + leafW * i + 6;
    svg += glassCorners(lx, y + 6, leafW - 12, h - 12);
  }

  // Folding direction arrows
  const arrowY = y + h - 25;
  const midX = x + w / 2;
  svg += `<polyline points="${midX - 20},${arrowY} ${midX - 40},${arrowY - 8} ${midX - 40},${arrowY + 8}" fill="none" stroke="#000" stroke-width="2"/>`;
  svg += `<polyline points="${midX + 20},${arrowY} ${midX + 40},${arrowY - 8} ${midX + 40},${arrowY + 8}" fill="none" stroke="#000" stroke-width="2"/>`;

  return `<g class="component bifold-door">${svg}</g>`;
}

export function singleDoorElevation(x, y, w, h, options = {}) {
  const hingeSide = options.hingeSide || 'left';
  const hingeW = 6, hingeH = 16;

  let svg = '';
  // Frame
  svg += el('rect', { x, y, width: w, height: h, fill: 'none', stroke: '#000', 'stroke-width': 4 });
  // Glass panel
  const gp = 15;
  svg += el('rect', { x: x + gp, y: y + gp, width: w - gp * 2, height: h - gp * 2, fill: 'none', stroke: '#000', 'stroke-width': 2 });
  // Glass corners
  svg += glassCorners(x + gp + 3, y + gp + 3, w - gp * 2 - 6, h - gp * 2 - 6);

  // Hinges (3)
  const hx = hingeSide === 'left' ? x - 2 : x + w - hingeW + 2;
  for (let i = 0; i < 3; i++) {
    const hy = y + h * (0.15 + i * 0.3);
    svg += el('rect', { x: hx, y: hy, width: hingeW, height: hingeH, fill: '#3F3F3F' });
  }

  // Handle
  const handleX = hingeSide === 'left' ? x + w - 20 : x + 12;
  svg += el('rect', { x: handleX, y: y + h / 2 - 12, width: 8, height: 24, fill: '#3F3F3F' });

  // Lock
  const lockX = hingeSide === 'left' ? x + w - 16 : x + 8;
  svg += el('rect', { x: lockX, y: y + h / 2 + 20, width: 5, height: 8, fill: '#3F3F3F' });

  return `<g class="component single-door">${svg}</g>`;
}

export function windowElevation(x, y, w, h, options = {}) {
  const hasOpener = options.hasOpener || false;
  const openerH = h * 0.3;

  let svg = '';
  // Frame
  svg += el('rect', { x, y, width: w, height: h, fill: 'none', stroke: '#000', 'stroke-width': 3 });

  if (hasOpener) {
    // Lower fixed pane
    const fixedH = h - openerH;
    svg += el('rect', { x: x + 4, y: y + openerH + 2, width: w - 8, height: fixedH - 6, fill: 'none', stroke: '#000', 'stroke-width': 1.5 });
    // Upper opener pane
    svg += el('rect', { x: x + 4, y: y + 4, width: w - 8, height: openerH - 6, fill: 'none', stroke: '#000', 'stroke-width': 1.5 });
    // Division line
    svg += el('line', { x1: x + 4, y1: y + openerH, x2: x + w - 4, y2: y + openerH, stroke: '#000', 'stroke-width': 2 });
    // Handle bar on opener
    const barW = w * 0.5;
    svg += el('rect', { x: x + (w - barW) / 2, y: y + openerH - 5, width: barW, height: 4, fill: 'none', stroke: '#000', 'stroke-width': 1.5 });
    // Glass corners on fixed pane
    svg += glassCorners(x + 8, y + openerH + 6, w - 16, fixedH - 14);
    // Glass corners on opener
    svg += glassCorners(x + 8, y + 8, w - 16, openerH - 14);
  } else {
    // Single fixed pane
    svg += el('rect', { x: x + 4, y: y + 4, width: w - 8, height: h - 8, fill: 'none', stroke: '#000', 'stroke-width': 1.5 });
    svg += glassCorners(x + 8, y + 8, w - 16, h - 16);
  }

  return `<g class="component window">${svg}</g>`;
}

export function slotWindowElevation(x, y, w, h, options = {}) {
  let svg = '';
  svg += el('rect', { x, y, width: w, height: h, fill: 'none', stroke: '#000', 'stroke-width': 3 });
  svg += el('rect', { x: x + 3, y: y + 3, width: w - 6, height: h - 6, fill: 'none', stroke: '#000', 'stroke-width': 1.5 });
  svg += glassCorners(x + 6, y + 6, w - 12, h - 12, 10);

  if (options.hasOpener) {
    const barW = w * 0.4;
    svg += el('rect', { x: x + (w - barW) / 2, y: y + h - 6, width: barW, height: 3, fill: 'none', stroke: '#000', 'stroke-width': 1 });
  }

  return `<g class="component slot-window">${svg}</g>`;
}

// ─── PLAN VIEW COMPONENTS ────────────────────────────────────

export function slidingDoorPlan(x, y, w, wallThickness) {
  let svg = '';
  // Gap in wall (no wall lines here)
  // Parallel lines representing sliding panels
  const t = wallThickness;
  svg += el('line', { x1: x, y1: y, x2: x + w, y2: y, stroke: '#000', 'stroke-width': 2 });
  svg += el('line', { x1: x, y1: y + t, x2: x + w, y2: y + t, stroke: '#000', 'stroke-width': 2 });
  // Mid-line
  svg += el('line', { x1: x + w / 2, y1: y, x2: x + w / 2, y2: y + t, stroke: '#000', 'stroke-width': 1.5 });

  return `<g class="plan-component sliding-door">${svg}</g>`;
}

export function hingedDoorPlan(x, y, w, wallThickness, options = {}) {
  const swingDir = options.swingDir || 'inward';
  const hingeSide = options.hingeSide || 'left';
  const radius = w;

  let svg = '';
  // Quarter-circle arc
  let arcPath;
  if (hingeSide === 'left' && swingDir === 'inward') {
    arcPath = `M ${x} ${y + wallThickness} A ${radius} ${radius} 0 0 1 ${x + w} ${y + wallThickness + radius}`;
    // Door line
    svg += el('line', { x1: x, y1: y, x2: x, y2: y + wallThickness, stroke: '#000', 'stroke-width': 2 });
  } else {
    arcPath = `M ${x + w} ${y + wallThickness} A ${radius} ${radius} 0 0 0 ${x} ${y + wallThickness + radius}`;
    svg += el('line', { x1: x + w, y1: y, x2: x + w, y2: y + wallThickness, stroke: '#000', 'stroke-width': 2 });
  }
  svg += el('path', { d: arcPath, fill: 'none', stroke: '#000', 'stroke-width': 1.5, 'stroke-dasharray': '4,3' });

  return `<g class="plan-component hinged-door">${svg}</g>`;
}

// ─── COMPONENT RENDERER ──────────────────────────────────────

export function renderComponentElevation(compType, x, y, w, h, options = {}) {
  if (compType.startsWith('sliding-door')) return slidingDoorElevation(x, y, w, h, options);
  if (compType.startsWith('bifold')) return bifoldDoorElevation(x, y, w, h, options);
  if (compType.startsWith('single-')) return singleDoorElevation(x, y, w, h, options);
  if (compType.startsWith('slot-window')) return slotWindowElevation(x, y, w, h, options);
  if (compType.startsWith('window-')) return windowElevation(x, y, w, h, options);
  return '';
}

export function renderComponentPlan(compType, x, y, w, wallThickness, options = {}) {
  if (compType.includes('sliding') || compType.includes('bifold')) {
    return slidingDoorPlan(x, y, w, wallThickness);
  }
  if (compType.includes('single-') || compType.includes('door')) {
    return hingedDoorPlan(x, y, w, wallThickness, options);
  }
  // Windows in plan: just a thin line
  return `<g class="plan-component window">
    <line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="#000" stroke-width="2"/>
    <line x1="${x}" y1="${y + wallThickness}" x2="${x + w}" y2="${y + wallThickness}" stroke="#000" stroke-width="2"/>
  </g>`;
}
