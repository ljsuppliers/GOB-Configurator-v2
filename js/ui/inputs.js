// Custom input components for the configurator panel
// Handles binding inputs to state, creating component palettes, etc.

import { update, getState, addComponent, removeComponent } from '../state.js';

// Bind a standard input element to a state path
export function bindInput(selector, statePath, options = {}) {
  const el = document.querySelector(selector);
  if (!el) return;

  const transform = options.transform || (v => v);
  const type = options.type || el.type;

  el.addEventListener('input', () => {
    let val = el.value;
    if (type === 'number') val = parseFloat(val) || 0;
    if (type === 'checkbox') val = el.checked;
    update(statePath, transform(val));
  });

  return el;
}

// Bind a select element
export function bindSelect(selector, statePath) {
  const el = document.querySelector(selector);
  if (!el) return;

  el.addEventListener('change', () => {
    update(statePath, el.value);
  });

  return el;
}

// Bind radio buttons
export function bindRadio(name, statePath) {
  const radios = document.querySelectorAll(`input[name="${name}"]`);
  radios.forEach(r => {
    r.addEventListener('change', () => {
      if (r.checked) update(statePath, r.value);
    });
  });
}

// Bind a numeric stepper (+ / - buttons)
export function bindStepper(containerId, statePath, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const min = options.min || 0;
  const max = options.max || 99;
  const step = options.step || 1;

  const display = container.querySelector('.stepper-value');
  const btnMinus = container.querySelector('.stepper-minus');
  const btnPlus = container.querySelector('.stepper-plus');

  if (!display || !btnMinus || !btnPlus) return;

  btnMinus.addEventListener('click', () => {
    const state = getState();
    const keys = statePath.split('.');
    let val = state;
    for (const k of keys) val = val?.[k];
    const newVal = Math.max(min, (val || 0) - step);
    update(statePath, newVal);
    display.textContent = newVal;
  });

  btnPlus.addEventListener('click', () => {
    const state = getState();
    const keys = statePath.split('.');
    let val = state;
    for (const k of keys) val = val?.[k];
    const newVal = Math.min(max, (val || 0) + step);
    update(statePath, newVal);
    display.textContent = newVal;
  });
}

// Create a draggable component palette item
export function createPaletteItem(compType, compDef) {
  const item = document.createElement('div');
  item.className = 'palette-item';
  item.draggable = true;
  item.innerHTML = `
    <span class="palette-icon">${getComponentIcon(compType)}</span>
    <span class="palette-label">${compDef.label}</span>
    <span class="palette-size">${compDef.width}mm</span>
  `;

  item.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: compType,
      label: compDef.label
    }));
    e.dataTransfer.effectAllowed = 'copy';
    item.classList.add('dragging');
  });

  item.addEventListener('dragend', () => {
    item.classList.remove('dragging');
  });

  // Also support click-to-add (adds to front elevation at center)
  item.addEventListener('dblclick', () => {
    const state = getState();
    const pos = Math.round((state.width / 2 - compDef.width / 2) / 50) * 50;
    addComponent({
      type: compType,
      elevation: 'front',
      positionX: Math.max(0, pos),
      label: compDef.label
    });
  });

  return item;
}

function getComponentIcon(type) {
  if (type.includes('sliding')) return '⬜';
  if (type.includes('bifold')) return '📐';
  if (type.includes('single')) return '🚪';
  if (type.includes('slot')) return '▬';
  if (type.includes('window')) return '🪟';
  return '□';
}

// Render the component list (placed components) with delete buttons
export function renderComponentList(containerId, components, onDelete) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!components || components.length === 0) {
    container.innerHTML = '<p class="empty-msg">No components placed. Drag from palette or double-click to add.</p>';
    return;
  }

  container.innerHTML = components.map(comp => `
    <div class="placed-component" data-id="${comp.id}">
      <span class="comp-label">${comp.label || comp.type}</span>
      <span class="comp-elev">${comp.elevation}</span>
      <span class="comp-pos">${comp.positionX || 0}mm</span>
      <button class="comp-delete" data-id="${comp.id}" title="Remove">×</button>
    </div>
  `).join('');

  container.querySelectorAll('.comp-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      removeComponent(btn.dataset.id);
    });
  });
}

// Update all input values from state (for initial load / state restore)
export function syncInputsFromState(state) {
  setVal('#input-width', state.width);
  setVal('#input-depth', state.depth);
  setVal('#input-height', state.height);
  setRadio('tier', state.tier);
  setVal('#input-building-type', state.buildingType);
  setVal('#select-roof-type', state.roofType);
  setVal('#select-front-cladding', state.cladding?.front);
  setVal('#select-left-cladding', state.cladding?.left);
  setVal('#select-right-cladding', state.cladding?.right);
  setVal('#select-rear-cladding', state.cladding?.rear);
  setRadio('cornerLeft', state.cornerLeft);
  setRadio('cornerRight', state.cornerRight);
  setVal('#input-overhang', state.overhangDepth);
  setVal('#select-foundation', state.foundationType);
  setVal('#input-customer-name', state.customer?.name);
  setVal('#input-customer-address', state.customer?.address);
  setVal('#input-customer-number', state.customer?.number);
  setVal('#input-customer-date', state.customer?.date);

  // Structural extras
  setVal('#select-height-upgrade', state.structuralExtras?.heightUpgrade || 0);
  setVal('#select-partition', state.structuralExtras?.partition || 'none');
  setCheck('#check-secret-door', state.structuralExtras?.secretDoor);
  setVal('#input-additional-decking', state.structuralExtras?.additionalDecking || 0);

  // Electrical extras
  setVal('#select-ac', state.extras?.acUnit || 'none');
  setCheck('#check-quinetic', state.extras?.quineticSwitch);
  setCheck('#check-hdmi', state.extras?.hdmiCables);
  setCheck('#check-floodlight', state.extras?.floodlightCabling);

  // Steppers
  setStepper('stepper-ext-socket', state.extras?.externalSocket || 0);
  setStepper('stepper-updown-light', state.extras?.upDownLight || 0);
  setStepper('stepper-heater', state.extras?.heater || 0);
  setStepper('stepper-add-socket', state.extras?.additionalSocket || 0);
  setStepper('stepper-add-socket-usb', state.extras?.additionalSocketUsb || 0);
  setStepper('stepper-add-lighting', state.extras?.additionalLightingZone || 0);
  setStepper('stepper-cat6', state.extras?.cat6Point || 0);

  // Site
  setVal('#input-boundary-left', state.site?.boundaryLeft);
  setVal('#input-boundary-right', state.site?.boundaryRight);
  setVal('#input-boundary-rear', state.site?.boundaryRear);
}

function setVal(sel, val) {
  const el = document.querySelector(sel);
  if (el && val !== undefined) el.value = val;
}

function setRadio(name, val) {
  if (!val) return;
  const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
  if (el) el.checked = true;
}

function setCheck(sel, val) {
  const el = document.querySelector(sel);
  if (el) el.checked = !!val;
}

function setStepper(containerId, val) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const display = container.querySelector('.stepper-value');
  if (display) display.textContent = val;
}
