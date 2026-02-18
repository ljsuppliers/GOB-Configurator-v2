// Drag-and-drop system for placing doors/windows on elevations
// Components from the palette can be dropped onto elevation views
// Existing components on the drawing can be repositioned

import { addComponent, updateComponent, removeComponent, getState } from '../state.js';

let dragState = null;
let svgEl = null;
let scale = 0.08;
let componentsData = null;
let onUpdate = null;

export function initDragDrop(svgElement, compData, updateCallback) {
  // Clean up previous listeners if re-initialising
  if (svgEl) {
    svgEl.removeEventListener('dragover', handleDragOver);
    svgEl.removeEventListener('drop', handleDrop);
    svgEl.removeEventListener('mousedown', handleMouseDown);
  }

  svgEl = svgElement;
  componentsData = compData;
  onUpdate = updateCallback;

  // Listen for drops from the component palette
  svgEl.addEventListener('dragover', handleDragOver);
  svgEl.addEventListener('drop', handleDrop);

  // Listen for clicks on existing components (to select/move/delete)
  svgEl.addEventListener('mousedown', handleMouseDown);

  // These go on document — only bind once
  if (!initDragDrop._docBound) {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    initDragDrop._docBound = true;
  }
}

export function setScale(s) {
  scale = s;
}

export function cleanup() {
  if (!svgEl) return;
  svgEl.removeEventListener('dragover', handleDragOver);
  svgEl.removeEventListener('drop', handleDrop);
  svgEl.removeEventListener('mousedown', handleMouseDown);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

function handleDrop(e) {
  e.preventDefault();
  const data = e.dataTransfer.getData('application/json');
  if (!data) return;

  try {
    const compInfo = JSON.parse(data);
    const rect = svgEl.getBoundingClientRect();
    const svgPoint = svgEl.createSVGPoint();
    svgPoint.x = e.clientX - rect.left;
    svgPoint.y = e.clientY - rect.top;

    // Convert pixel position to SVG coordinates
    const ctm = svgEl.getScreenCTM().inverse();
    const svgCoord = svgPoint.matrixTransform(ctm);

    // Determine which elevation was targeted based on position
    const elevation = detectElevation(svgCoord.x, svgCoord.y);
    if (!elevation) return;

    // Convert SVG position to building mm
    const state = getState();
    const positionX = Math.round((svgCoord.x - elevation.originX) / scale / 50) * 50; // snap to 50mm

    const allComps = { ...componentsData.doors, ...componentsData.windows };
    const def = allComps[compInfo.type];
    if (!def) return;

    // Check bounds
    const maxWidth = elevation.name === 'front' ? state.width : state.depth;
    const clampedX = Math.max(0, Math.min(positionX, maxWidth - def.width));

    addComponent({
      type: compInfo.type,
      elevation: elevation.name,
      positionX: clampedX,
      label: def.label
    });

  } catch (err) {
    console.error('Drop error:', err);
  }
}

function detectElevation(svgX, svgY) {
  // This uses approximate layout positions — the engine.js layout determines these
  const state = getState();
  const margin = 60;
  const gap = 40;
  const topY = margin + 55;
  const frontW = state.width * scale;
  const sideW = state.depth * scale;
  const frontH = state.height * scale;
  const frontX = margin + 40;
  const leftX = frontX + frontW + gap;
  const rightX = leftX + sideW + gap;
  const lowerY = topY + frontH + gap + 50;

  // Check front elevation area
  if (svgX >= frontX && svgX <= frontX + frontW && svgY >= topY && svgY <= topY + frontH) {
    return { name: 'front', originX: frontX, originY: topY };
  }
  // Check left elevation
  if (svgX >= leftX && svgX <= leftX + sideW && svgY >= topY && svgY <= topY + frontH) {
    return { name: 'left', originX: leftX, originY: topY };
  }
  // Check right elevation
  if (svgX >= rightX && svgX <= rightX + sideW && svgY >= topY && svgY <= topY + frontH) {
    return { name: 'right', originX: rightX, originY: topY };
  }

  return null;
}

// Detect if clicking on plan view
function detectPlanView(svgX, svgY) {
  const state = getState();
  const margin = 60;
  const gap = 40;
  const topY = margin + 55;
  const frontW = state.width * scale;
  const sideW = state.depth * scale;
  const frontH = state.height * scale;
  const frontX = margin + 40;
  const leftX = frontX + frontW + gap;
  const rightX = leftX + sideW + gap;
  const lowerY = topY + frontH + gap + 50;
  const planW = state.width * scale;
  const planD = state.depth * scale;
  const planX = frontX;
  const planY = lowerY;

  // Check if within plan view bounds
  if (svgX >= planX && svgX <= planX + planW && svgY >= planY && svgY <= planY + planD) {
    return { x: planX, y: planY, w: planW, d: planD };
  }
  return null;
}

function handleMouseDown(e) {
  // Check if clicking on an existing component in the SVG
  const target = e.target.closest('.component, [data-comp-id]');
  if (!target) return;

  const compId = target.dataset?.compId;
  if (!compId) return;

  // Check if dragging on plan view
  const rect = svgEl.getBoundingClientRect();
  const svgPoint = svgEl.createSVGPoint();
  svgPoint.x = e.clientX - rect.left;
  svgPoint.y = e.clientY - rect.top;
  const ctm = svgEl.getScreenCTM().inverse();
  const svgCoord = svgPoint.matrixTransform(ctm);
  const planBounds = detectPlanView(svgCoord.x, svgCoord.y);

  dragState = {
    compId,
    startX: e.clientX,
    startY: e.clientY,
    active: false,
    isPlanView: !!planBounds,
    planBounds
  };
}

function handleMouseMove(e) {
  if (!dragState) return;

  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  if (!dragState.active && Math.abs(dx) + Math.abs(dy) > 5) {
    dragState.active = true;
  }

  if (dragState.active) {
    // Update component position in real-time
    const state = getState();
    const comp = state.components.find(c => c.id === dragState.compId);
    if (comp) {
      const allComps = { ...componentsData.doors, ...componentsData.windows };
      const def = allComps[comp.type];
      const maxW = comp.elevation === 'front' ? state.width : state.depth;
      let mmDelta;

      if (dragState.isPlanView) {
        // Plan view dragging: use Y delta for side walls, X delta for front
        const dy = e.clientY - dragState.startY;
        mmDelta = Math.round(dy / scale / 50) * 50;
        if (comp.elevation === 'right') {
          // Right wall: invert the delta
          mmDelta = -mmDelta;
        }
      } else {
        // Elevation view dragging: use X delta
        mmDelta = Math.round(dx / scale / 50) * 50;
      }

      const newPos = Math.max(0, Math.min((comp.positionX || 0) + mmDelta, maxW - (def?.width || 0)));
      updateComponent(dragState.compId, { positionX: newPos });
      dragState.startX = e.clientX;
      dragState.startY = e.clientY;
    }
  }
}

function handleMouseUp() {
  dragState = null;
}

// Delete a component by ID (called from UI)
export function deleteComponent(id) {
  removeComponent(id);
}
