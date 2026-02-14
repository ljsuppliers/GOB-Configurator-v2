// Main drawing engine — orchestrates all views into a single SVG
// Layout: Upper zone = 3 elevations side by side, Lower zone = plan view + title block

import { renderFrontElevation } from './front-elevation.js';
import { renderSideElevation } from './side-elevation.js';
import { renderPlanView } from './plan-view.js';
import { renderTitleBlock } from './title-block.js';

let componentsData = null;

export function initDrawingEngine(compData) {
  componentsData = compData;
}

export function generateDrawing(state) {
  if (!componentsData) return '<svg></svg>';

  // Calculate scale factor to fit in the canvas
  // We want the drawing to fit in roughly 900x600px viewing area
  const canvasW = 900;
  const canvasH = 640;
  const margin = 60;

  // Compute scale: 1mm = scale px
  // The widest row is: front_width + gap + side_depth + gap + side_depth
  const totalRealWidth = state.width + state.depth * 2 + 600; // gaps in mm
  const totalRealHeight = state.height + state.depth + 800; // elevation + plan + gaps

  const scaleX = (canvasW - margin * 2) / totalRealWidth;
  const scaleY = (canvasH - margin * 2) / totalRealHeight;
  const scale = Math.min(scaleX, scaleY, 0.12); // cap at 0.12 to prevent too-large rendering

  const gap = 40; // px gap between views
  const topY = margin + 35; // leave room for labels

  // ─── UPPER ZONE: THREE ELEVATIONS ───
  const frontW = state.width * scale;
  const frontH = state.height * scale;
  const sideW = state.depth * scale;
  const sideH = state.height * scale;

  // Front elevation position
  const frontX = margin + 40;
  const frontY = topY + 20;

  // Left elevation to the right of front
  const leftX = frontX + frontW + gap;
  const leftY = frontY;

  // Right elevation to the right of left
  const rightX = leftX + sideW + gap;
  const rightY = frontY;

  // ─── LOWER ZONE: PLAN VIEW + TITLE BLOCK ───
  const lowerY = frontY + frontH + gap + 50;

  const planW = state.width * scale;
  const planD = state.depth * scale;
  const planX = margin + 40;
  const planY = lowerY;

  // Title block
  const titleW = Math.max(180, sideW * 2 + gap);
  const titleH = 200;
  const titleX = planX + planW + gap;
  const titleY = lowerY;

  // Total SVG dimensions
  const svgW = Math.max(rightX + sideW + margin, titleX + titleW + margin);
  const svgH = Math.max(planY + planD + 90, titleY + titleH + margin);

  let svg = '';

  // Page border
  svg += `<rect x="5" y="5" width="${svgW - 10}" height="${svgH - 10}" fill="none" stroke="#000" stroke-width="2" rx="0"/>`;

  // Front elevation
  svg += renderFrontElevation(state, { x: frontX, y: frontY, scale }, componentsData);

  // Left elevation
  svg += renderSideElevation(state, { x: leftX, y: leftY, scale }, componentsData, 'left');

  // Right elevation
  svg += renderSideElevation(state, { x: rightX, y: rightY, scale }, componentsData, 'right');

  // Plan view
  svg += renderPlanView(state, { x: planX, y: planY, scale }, componentsData);

  // Title block
  svg += renderTitleBlock(state, { x: titleX, y: titleY, width: titleW, height: titleH });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" height="100%" style="background:white;">${svg}</svg>`;
}

// Get the raw SVG for PDF export
export function getSvgForExport(state) {
  return generateDrawing(state);
}
