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
    startPosX: comp.positionX || 0,
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

function handlePlanComponentDragStart(e, target) {
  const compId = target.dataset.compId;
  const elevation = target.dataset.elevation;
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
    startPosX: comp.positionX || 0,
    elevation: comp.elevation,
    active: false
  };
  
  target.classList.add('dragging');
  e.preventDefault();
}

function handleMouseMove(e) {
  if (!dragState) return;
  
  const dx = e.clientX - dragState.startX;
  
  // Only start dragging after small movement threshold
  if (!dragState.active && Math.abs(dx) > 3) {
    dragState.active = true;
  }
  
  if (!dragState.active) return;
  
  // Convert pixel delta to mm
  const mmDelta = dx * dragState.scale;
  
  if (dragState.type === 'feature') {
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
    // Plan view component dragging - use Y delta
    const dy = e.clientY - dragState.startY;
    const mmDelta = dy * dragState.scaleY;
    
    // Get component definition for bounds checking
    const allComps = { ...componentsData.doors, ...componentsData.windows };
    const def = allComps[dragState.comp.type];
    if (!def) return;
    
    const maxW = vueApp.state.depth;
    let newPos = dragState.startPosX + mmDelta;
    
    // For right wall, invert the delta (dragging up should increase positionX)
    if (dragState.comp.elevation === 'right') {
      newPos = dragState.startPosX - mmDelta;
    }
    
    newPos = Math.round(newPos / 50) * 50; // Snap to 50mm grid
    newPos = Math.max(0, Math.min(newPos, maxW - def.width));
    
    // Update Vue state directly
    dragState.comp.positionX = newPos;
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
  } else {
    const el = document.querySelector(`[data-comp-id="${dragState.compId}"]`);
    if (el) el.classList.remove('dragging');
  }
  
  dragState = null;
}
