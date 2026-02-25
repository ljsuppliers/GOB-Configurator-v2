// Simple component drag handler for Vue-based app
// Handles dragging doors/windows on the drawing canvas

let dragState = null;
let vueApp = null;
let componentsData = null;

// Layout constants (must match drawing-engine.js)
const MARGIN = 700;
const DIM = 600;
const LAB_H = 350;
const GAP = 600;

export function initComponentDrag(app, compData) {
  vueApp = app;
  componentsData = compData;
  
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

export function cleanup() {
  document.removeEventListener('mousedown', handleMouseDown);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
}

function handleMouseDown(e) {
  // Check for label arrow drag first (highest z-priority for small targets)
  const arrowTarget = e.target.closest('.label-arrow.draggable');
  if (arrowTarget) {
    handleLabelDragStart(e, arrowTarget, 'arrow');
    return;
  }

  // Check for label text drag
  const labelTarget = e.target.closest('.label-text.draggable');
  if (labelTarget) {
    handleLabelDragStart(e, labelTarget, 'text');
    return;
  }

  // Check for AC unit drag
  const acTarget = e.target.closest('.ac-unit.draggable');
  if (acTarget) {
    handleAcUnitDragStart(e, acTarget);
    return;
  }

  // Check for external feature first
  const featureTarget = e.target.closest('.external-feature.draggable');
  if (featureTarget) {
    handleFeatureDragStart(e, featureTarget);
    return;
  }

  // Check for plan-component (floor plan dragging)
  const planTarget = e.target.closest('.plan-component');
  if (planTarget) {
    handlePlanComponentDragStart(e, planTarget);
    return;
  }

  // Otherwise check for component on elevations
  const target = e.target.closest('.component.draggable');
  if (!target) return;
  
  const compId = target.dataset.compId;
  if (!compId || !vueApp) return;
  
  // Find the component in Vue state
  const comp = vueApp.state.components.find(c => c.id === compId);
  if (!comp) return;
  
  // Get SVG element and compute scale
  const svg = target.closest('svg');
  if (!svg) return;
  
  const vb = svg.getAttribute('viewBox');
  if (!vb) return;
  const [, , vbW] = vb.split(' ').map(Number);
  const svgRect = svg.getBoundingClientRect();
  const scale = vbW / svgRect.width;
  
  dragState = {
    type: 'component',
    compId,
    comp,
    svg,
    svgRect,
    scale,
    startX: e.clientX,
    startY: e.clientY,
    startPosX: comp.positionX ?? 0,
    elevation: comp.elevation,
    active: false
  };

  target.classList.add('dragging');
  e.preventDefault();
}

function handleFeatureDragStart(e, target) {
  const featId = target.dataset.featureId;
  if (!featId || !vueApp) return;
  
  // Find the feature in Vue state
  const feat = vueApp.state.externalFeatures.find(f => f.id === featId);
  if (!feat) return;
  
  // Get SVG element and compute scale
  const svg = target.closest('svg');
  if (!svg) return;
  
  const vb = svg.getAttribute('viewBox');
  if (!vb) return;
  const [, , vbW] = vb.split(' ').map(Number);
  const svgRect = svg.getBoundingClientRect();
  const scale = vbW / svgRect.width;
  
  dragState = {
    type: 'feature',
    featId,
    feat,
    svg,
    svgRect,
    scale,
    startX: e.clientX,
    startY: e.clientY,
    startPosX: feat.x || 0,
    active: false
  };
  
  target.classList.add('dragging');
  e.preventDefault();
}

function handleAcUnitDragStart(e, target) {
  const acId = target.dataset.acId;
  if (!acId || !vueApp) return;

  const unit = vueApp.state.acUnits.find(u => u.id === acId);
  if (!unit) return;

  const svg = target.closest('svg');
  if (!svg) return;

  const vb = svg.getAttribute('viewBox');
  if (!vb) return;
  const [, , vbW, vbH] = vb.split(' ').map(Number);
  const svgRect = svg.getBoundingClientRect();

  dragState = {
    type: 'ac-unit',
    unitId: acId,
    unit,
    svg,
    scaleX: vbW / svgRect.width,
    scaleY: vbH / svgRect.height,
    startX: e.clientX,
    startY: e.clientY,
    startPosX: unit.x,
    startPosY: unit.y,
    active: false
  };

  target.classList.add('dragging');
  e.preventDefault();
}

function handleLabelDragStart(e, target, dragPart) {
  const labelId = target.dataset.labelId;
  if (!labelId || !vueApp) return;

  const label = vueApp.state.drawingLabels.find(l => l.id === labelId);
  if (!label) return;

  const svg = target.closest('svg');
  if (!svg) return;

  const vb = svg.getAttribute('viewBox');
  if (!vb) return;
  const [, , vbW, vbH] = vb.split(' ').map(Number);
  const svgRect = svg.getBoundingClientRect();

  dragState = {
    type: 'label',
    dragPart,
    labelId,
    label,
    svg,
    scaleX: vbW / svgRect.width,
    scaleY: vbH / svgRect.height,
    startX: e.clientX,
    startY: e.clientY,
    startPosX: dragPart === 'arrow' ? label.arrowX : label.x,
    startPosY: dragPart === 'arrow' ? label.arrowY : label.y,
    active: false
  };

  target.classList.add('dragging');
  e.preventDefault();
}

function handlePlanComponentDragStart(e, target) {
  const compId = target.dataset.compId;
  const elevation = target.dataset.elevation;
  console.log('[drag] handlePlanComponentDragStart compId:', compId, 'elevation:', elevation, 'vueApp:', !!vueApp);
  if (!compId || !vueApp) return;
  
  // Find the component in Vue state
  const comp = vueApp.state.components.find(c => c.id === compId);
  if (!comp) return;
  
  // Get SVG element and compute scale
  const svg = target.closest('svg');
  if (!svg) return;
  
  const vb = svg.getAttribute('viewBox');
  if (!vb) return;
  const [, , vbW, vbH] = vb.split(' ').map(Number);
  const svgRect = svg.getBoundingClientRect();
  const scaleX = vbW / svgRect.width;
  const scaleY = vbH / svgRect.height;
  
  dragState = {
    type: 'plan-component',
    compId,
    comp,
    svg,
    scaleX,
    scaleY,
    startX: e.clientX,
    startY: e.clientY,
    startPosX: comp.planPositionX ?? comp.positionX ?? 0,
    elevation: comp.elevation,
    active: false
  };

  target.classList.add('dragging');
  e.preventDefault();
}

function handleMouseMove(e) {
  if (!dragState) return;
  
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  // Only start dragging after small movement threshold
  if (!dragState.active && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
    dragState.active = true;
  }

  if (!dragState.active) return;

  // Convert pixel delta to mm (used by 1D draggers)
  const mmDelta = dx * (dragState.scale || dragState.scaleX || 1);
  
  if (dragState.type === 'ac-unit') {
    // AC unit 2D dragging on plan view
    const dxPx = e.clientX - dragState.startX;
    const dyPx = e.clientY - dragState.startY;
    let newX = dragState.startPosX + dxPx * dragState.scaleX;
    let newY = dragState.startPosY + dyPx * dragState.scaleY;
    newX = Math.round(newX / 50) * 50;
    newY = Math.round(newY / 50) * 50;
    dragState.unit.x = newX;
    dragState.unit.y = newY;
  } else if (dragState.type === 'label') {
    // Label text or arrow 2D dragging
    const dxPx = e.clientX - dragState.startX;
    const dyPx = e.clientY - dragState.startY;
    let newX = dragState.startPosX + dxPx * dragState.scaleX;
    let newY = dragState.startPosY + dyPx * dragState.scaleY;
    newX = Math.round(newX / 50) * 50;
    newY = Math.round(newY / 50) * 50;
    if (dragState.dragPart === 'arrow') {
      dragState.label.arrowX = newX;
      dragState.label.arrowY = newY;
    } else {
      dragState.label.x = newX;
      dragState.label.y = newY;
    }
  } else if (dragState.type === 'feature') {
    // External feature dragging (horizontal only)
    const featureWidths = {
      'upDownLight': 120,
      'socket': 150
    };
    const featWidth = featureWidths[dragState.feat.type] || 150;

    // Calculate new position with bounds
    let newPos = dragState.startPosX + mmDelta;
    newPos = Math.round(newPos / 50) * 50; // Snap to 50mm grid
    newPos = Math.max(0, Math.min(newPos, vueApp.state.width - featWidth));

    // Update Vue state directly
    dragState.feat.x = newPos;
  } else if (dragState.type === 'plan-component') {
    // Plan view component dragging
    const allComps = { ...componentsData.doors, ...componentsData.windows };
    const def = allComps[dragState.comp.type];
    if (!def) return;
    
    let mmDelta, maxW;
    
    if (dragState.comp.elevation === 'front' || dragState.comp.elevation === 'rear') {
      // Front/rear wall: drag horizontally (X delta)
      const dx = e.clientX - dragState.startX;
      mmDelta = dx * dragState.scaleX;
      maxW = vueApp.state.width;
    } else {
      // Side walls: drag vertically (Y delta)
      const dy = e.clientY - dragState.startY;
      mmDelta = dy * dragState.scaleY;
      maxW = vueApp.state.depth;
      // For right wall, invert the delta (dragging up should increase positionX)
      if (dragState.comp.elevation === 'right') {
        mmDelta = -mmDelta;
      }
    }
    
    let newPos = dragState.startPosX + mmDelta;
    newPos = Math.round(newPos / 50) * 50; // Snap to 50mm grid
    newPos = Math.max(0, Math.min(newPos, maxW - def.width));

    // Update planPositionX independently of elevation positionX
    dragState.comp.planPositionX = newPos;
  } else {
    // Component dragging on elevation
    // Get component definition for bounds checking
    const allComps = { ...componentsData.doors, ...componentsData.windows };
    const def = allComps[dragState.comp.type];
    if (!def) return;
    
    // Get max position based on elevation
    const maxW = dragState.elevation === 'front' 
      ? vueApp.state.width 
      : vueApp.state.depth;
    
    // Calculate new position with bounds
    let newPos = dragState.startPosX + mmDelta;
    newPos = Math.round(newPos / 50) * 50; // Snap to 50mm grid
    newPos = Math.max(0, Math.min(newPos, maxW - def.width));
    
    // Update Vue state directly
    dragState.comp.positionX = newPos;
  }
}

function handleMouseUp(e) {
  if (!dragState) return;

  // Remove dragging class
  if (dragState.type === 'feature') {
    const el = document.querySelector(`[data-feature-id="${dragState.featId}"]`);
    if (el) el.classList.remove('dragging');
  } else if (dragState.type === 'ac-unit') {
    const el = document.querySelector(`[data-ac-id="${dragState.unitId}"]`);
    if (el) el.classList.remove('dragging');
  } else if (dragState.type === 'label') {
    const el = document.querySelector(`[data-label-id="${dragState.labelId}"]`);
    if (el) el.classList.remove('dragging');
  } else {
    const el = document.querySelector(`[data-comp-id="${dragState.compId}"]`);
    if (el) el.classList.remove('dragging');
  }

  dragState = null;
}
