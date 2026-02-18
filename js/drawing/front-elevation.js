// Front elevation renderer
// Shows: wall outline, roof/fascia, placed doors and windows, cladding, gutter, overhang

import { renderCladding } from './cladding.js';
import { renderComponentElevation } from './components.js';
import { renderGutterSystem, renderOverhang } from './gutter.js';
import { horizontalDimension, verticalDimension } from './dimensions.js';

export function renderFrontElevation(state, layout, componentsData) {
  const { x, y, scale } = layout;
  const w = state.width * scale;
  const h = state.height * scale;
  const wallStroke = 2;
  const roofH = 8 * scale / 0.05; // fascia strip scaled
  const roofHClamped = Math.min(Math.max(roofH, 6), 14);

  let svg = '';

  // Overhang (if signature)
  if (state.tier === 'signature' && state.overhangDepth > 0) {
    svg += renderOverhang(x, y, w, state.overhangDepth, { softitLights: true });
  }

  // Roof/fascia strip
  svg += `<rect x="${x}" y="${y - roofHClamped}" width="${w}" height="${roofHClamped}" fill="none" stroke="#000" stroke-width="2"/>`;

  // Main wall outline
  svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#000" stroke-width="${wallStroke + 1}"/>`;

  // Cladding (render behind components, only where there are no components)
  const frontCladding = state.cladding?.front || 'western-red-cedar';
  // We'll render cladding as a background then components will overlay
  svg += renderCladding(frontCladding, x + 2, y + 2, w - 4, h - 4, 'front');

  // White out areas where components will be placed, then draw components
  const frontComps = (state.components || []).filter(c => c.elevation === 'front');
  const allComps = { ...componentsData.doors, ...componentsData.windows };

  for (const comp of frontComps) {
    const def = allComps[comp.type];
    if (!def) continue;

    const compW = def.width * scale;
    const compH = (def.height || state.height * 0.84) * scale;
    const compX = x + (comp.positionX || 0) * scale;
    const compY = y + h - compH; // components sit at floor level

    // White background to clear cladding
    svg += `<g class="component draggable" data-comp-id="${comp.id}">`;
    svg += `<rect x="${compX}" y="${compY}" width="${compW}" height="${compH}" fill="white" stroke="none"/>`;

    // Render the component
    svg += renderComponentElevation(comp.type, compX, compY, compW, compH, {
      hasOpener: def.hasOpener,
      leaves: def.width > 3000 ? Math.round(def.width / 800) : (def.width > 2000 ? 3 : undefined)
    });
    svg += `</g>`;
  }

  // Gutter system
  svg += renderGutterSystem(x, y, w, h, {
    showDownpipes: false
  });

  // Dimension: overall width below
  svg += horizontalDimension(x, y + h + 8, w, `${state.width}mm overall width`, {
    offset: 30,
    textSize: 11
  });

  // Dimension: overall height to the left
  svg += verticalDimension(x, y, h, `${state.height}mm overall height`, {
    offset: -35,
    textSize: 11
  });

  // Label
  svg += `<text x="${x + w / 2}" y="${y - roofHClamped - 15}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#000" text-decoration="underline">Front elevation</text>`;

  return `<g class="front-elevation">${svg}</g>`;
}
