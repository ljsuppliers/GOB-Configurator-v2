// Side elevation renderer (left and right flanks)
// Shows: wall outline, roof/fascia, cladding, windows, gutter, downpipes

import { renderCladding } from './cladding.js';
import { renderComponentElevation } from './components.js';
import { renderGutterSystem } from './gutter.js';
import { horizontalDimension } from './dimensions.js';

export function renderSideElevation(state, layout, componentsData, side = 'left') {
  const { x, y, scale } = layout;
  const w = state.depth * scale; // side width = building depth
  const h = state.height * scale;
  const roofHClamped = Math.min(Math.max(8, 6), 14);

  let svg = '';

  // Roof/fascia strip
  svg += `<rect x="${x}" y="${y - roofHClamped}" width="${w}" height="${roofHClamped}" fill="none" stroke="#000" stroke-width="2"/>`;

  // Main wall outline
  svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#000" stroke-width="3"/>`;

  // Cladding
  const claddingType = state.cladding?.[side] || 'anthracite-steel';
  svg += renderCladding(claddingType, x + 2, y + 2, w - 4, h - 4, 'side');

  // Corner details
  const cornerDepth = 6;
  if (side === 'left') {
    // Left corner (front-facing edge)
    if (state.cornerLeft === 'closed') {
      svg += `<rect x="${x}" y="${y}" width="${cornerDepth}" height="${h}" fill="white" stroke="#000" stroke-width="1.5"/>`;
    }
  } else {
    // Right corner (front-facing edge)
    if (state.cornerRight === 'closed') {
      svg += `<rect x="${x + w - cornerDepth}" y="${y}" width="${cornerDepth}" height="${h}" fill="white" stroke="#000" stroke-width="1.5"/>`;
    }
  }

  // Side screen (signature with overhang)
  if (state.tier === 'signature' && state.overhangDepth > 0) {
    const screenW = state.overhangDepth * scale;
    const screenX = side === 'left' ? x - screenW : x + w;
    svg += `<rect x="${screenX}" y="${y}" width="${screenW}" height="${h * 0.85}" fill="none" stroke="#000" stroke-width="1.5" stroke-dasharray="4,2"/>`;
    // Small label
    svg += `<text x="${screenX + screenW / 2}" y="${y + h * 0.88}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-style="italic" fill="#666">side screen</text>`;
  }

  // Components on this side
  const sideComps = (state.components || []).filter(c => c.elevation === side);
  const allComps = { ...componentsData.doors, ...componentsData.windows };

  for (const comp of sideComps) {
    const def = allComps[comp.type];
    if (!def) continue;

    const compW = def.width * scale;
    const compH = (def.height || state.height * 0.84) * scale;
    const compX = x + (comp.positionX || 0) * scale;
    const compY = y + h - compH;

    // White background
    svg += `<rect x="${compX}" y="${compY}" width="${compW}" height="${compH}" fill="white" stroke="none"/>`;
    svg += renderComponentElevation(comp.type, compX, compY, compW, compH, {
      hasOpener: def.hasOpener
    });
  }

  // Gutter with downpipes on sides
  svg += renderGutterSystem(x, y, w, h, {
    showDownpipes: true,
    downpipeLeft: true,
    downpipeRight: false
  });

  // Dimension below
  svg += horizontalDimension(x, y + h + 8, w, `${state.depth}mm overall depth`, {
    offset: 30,
    textSize: 11
  });

  // Label
  const label = side === 'left' ? 'Left elevation' : 'Right elevation';
  svg += `<text x="${x + w / 2}" y="${y - roofHClamped - 15}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#000" text-decoration="underline">${label}</text>`;

  return `<g class="${side}-elevation">${svg}</g>`;
}
