// Plan view renderer
// Shows: floor plan with walls, door swings, room labels, component positions

import { renderComponentPlan, slidingDoorPlan, hingedDoorPlan } from './components.js';
import { horizontalDimension, verticalDimension } from './dimensions.js';

export function renderPlanView(state, layout, componentsData) {
  const { x, y, scale } = layout;
  const w = state.width * scale;
  const d = state.depth * scale;
  const wallT = 6; // wall thickness in drawing units

  let svg = '';

  // Outer walls
  svg += `<rect x="${x}" y="${y}" width="${w}" height="${d}" fill="white" stroke="#000" stroke-width="3"/>`;
  // Inner wall line
  svg += `<rect x="${x + wallT}" y="${y + wallT}" width="${w - wallT * 2}" height="${d - wallT * 2}" fill="white" stroke="#000" stroke-width="1.5"/>`;

  // Room partitions
  if (state.rooms && state.rooms.length > 1) {
    let partX = x;
    for (let i = 0; i < state.rooms.length - 1; i++) {
      partX += state.rooms[i].widthMm * scale;
      // Partition wall
      svg += `<line x1="${partX}" y1="${y}" x2="${partX}" y2="${y + d}" stroke="#000" stroke-width="3"/>`;
      svg += `<line x1="${partX + wallT}" y1="${y}" x2="${partX + wallT}" y2="${y + d}" stroke="#000" stroke-width="1.5"/>`;

      // Interior door in partition (gap + arc)
      const doorW = 25;
      const doorY = y + d * 0.4;
      svg += `<rect x="${partX}" y="${doorY}" width="${wallT}" height="${doorW}" fill="white" stroke="none"/>`;
      svg += hingedDoorPlan(partX, doorY, doorW, wallT, { swingDir: 'inward', hingeSide: 'left' });
    }
  }

  // Room labels
  let labelX = x;
  for (const room of (state.rooms || [{ label: 'Office', widthMm: state.width }])) {
    const roomW = room.widthMm * scale;
    svg += `<text x="${labelX + roomW / 2}" y="${y + d / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#333">${room.label}</text>`;
    labelX += roomW;
  }

  // Front wall openings (doors/windows on front)
  const frontComps = (state.components || []).filter(c => c.elevation === 'front');
  const allComps = { ...componentsData.doors, ...componentsData.windows };

  for (const comp of frontComps) {
    const def = allComps[comp.type];
    if (!def) continue;

    const compW = def.width * scale;
    const compX = x + (comp.positionX || 0) * scale;

    // Clear the wall where the component sits
    svg += `<rect x="${compX}" y="${y}" width="${compW}" height="${wallT}" fill="white" stroke="none"/>`;

    // Render plan view component
    if (comp.type.includes('door')) {
      svg += renderComponentPlan(comp.type, compX, y, compW, wallT);
    } else {
      // Windows: just show the glass line
      svg += `<line class="plan-component" data-comp-id="${comp.id}" data-elevation="front" x1="${compX}" y1="${y + wallT / 2}" x2="${compX + compW}" y2="${y + wallT / 2}" stroke="#000" stroke-width="2"/>`;
    }
  }

  // Left wall components
  const leftComps = (state.components || []).filter(c => c.elevation === 'left');
  for (const comp of leftComps) {
    const def = allComps[comp.type];
    if (!def) continue;

    const compW = def.width * scale;
    const compY = y + (comp.positionX || 0) * scale;

    // Clear wall section
    svg += `<rect x="${x}" y="${compY}" width="${wallT}" height="${compW}" fill="white" stroke="none"/>`;

    if (comp.type.includes('door')) {
      // Rotated door in left wall
      svg += `<g transform="translate(${x},${compY}) rotate(90) translate(0,${-wallT})">`;
      svg += renderComponentPlan(comp.type, 0, 0, compW, wallT);
      svg += `</g>`;
    } else {
      svg += `<line class="plan-component" data-comp-id="${comp.id}" data-elevation="left" x1="${x + wallT / 2}" y1="${compY}" x2="${x + wallT / 2}" y2="${compY + compW}" stroke="#000" stroke-width="2"/>`;
    }
  }

  // Right wall components
  const rightComps = (state.components || []).filter(c => c.elevation === 'right');
  for (const comp of rightComps) {
    const def = allComps[comp.type];
    if (!def) continue;

    const compW = def.width * scale;
    // Right wall: positionX 0 (front) = bottom of plan, positionX max (rear) = top
    const compY = y + (state.depth - (comp.positionX || 0)) * scale;

    svg += `<rect x="${x + w - wallT}" y="${compY}" width="${wallT}" height="${compW}" fill="white" stroke="none"/>`;

    if (comp.type.includes('door')) {
      svg += `<g transform="translate(${x + w},${compY}) rotate(90) translate(0,${-wallT})">`;
      svg += renderComponentPlan(comp.type, 0, 0, compW, wallT);
      svg += `</g>`;
    } else {
      svg += `<line class="plan-component" data-comp-id="${comp.id}" data-elevation="right" x1="${x + w - wallT / 2}" y1="${compY}" x2="${x + w - wallT / 2}" y2="${compY + compW}" stroke="#000" stroke-width="2"/>`;
    }
  }

  // Overhang/decking (front)
  if (state.tier === 'signature' && state.overhangDepth > 0) {
    const ovD = state.overhangDepth * scale;
    svg += `<rect x="${x - 4}" y="${y - ovD}" width="${w + 8}" height="${ovD}" fill="none" stroke="#000" stroke-width="1.5" stroke-dasharray="4,2"/>`;
    svg += `<text x="${x + w / 2}" y="${y - ovD / 2 + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-style="italic" fill="#666">decking</text>`;
  }

  // Dimensions
  svg += horizontalDimension(x, y + d + 5, w, `${state.width}mm overall width`, {
    offset: 25,
    textSize: 11
  });

  svg += verticalDimension(x, y, d, `${state.depth}mm overall depth`, {
    offset: -30,
    textSize: 11
  });

  // Label
  svg += `<text x="${x + w / 2}" y="${y - (state.tier === 'signature' ? state.overhangDepth * scale + 15 : 15)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#000" text-decoration="underline">Plan view</text>`;

  // Electrician note
  svg += `<text x="${x + w / 2}" y="${y + d + 65}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-style="italic" fill="#666">Location of lighting, sockets, switches, heating, AC/consumer unit TBD on 1st visit by electrician</text>`;

  return `<g class="plan-view">${svg}</g>`;
}
