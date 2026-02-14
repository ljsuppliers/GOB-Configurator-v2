// Central state store with event-based change propagation
// Every UI change updates this state → triggers redraw of SVG + recalculation of price

let _state = {};
const _listeners = [];
let _nextCompId = 100;

export function initState(defaults) {
  _state = JSON.parse(JSON.stringify(defaults));
  _nextCompId = 100;
  notify();
}

export function getState() {
  return _state;
}

export function update(path, value) {
  const keys = path.split('.');
  let obj = _state;
  for (let i = 0; i < keys.length - 1; i++) {
    if (obj[keys[i]] === undefined) obj[keys[i]] = {};
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
  notify();
}

export function updateBatch(updates) {
  for (const [path, value] of Object.entries(updates)) {
    const keys = path.split('.');
    let obj = _state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] === undefined) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
  }
  notify();
}

// Component management
export function addComponent(comp) {
  comp.id = 'comp-' + (_nextCompId++);
  _state.components.push(comp);
  notify();
  return comp.id;
}

export function removeComponent(id) {
  _state.components = _state.components.filter(c => c.id !== id);
  notify();
}

export function updateComponent(id, updates) {
  const comp = _state.components.find(c => c.id === id);
  if (comp) {
    Object.assign(comp, updates);
    notify();
  }
}

// Room management
export function addRoom(label, widthMm) {
  _state.rooms.push({ label, widthMm });
  notify();
}

export function removeRoom(index) {
  if (_state.rooms.length > 1) {
    _state.rooms.splice(index, 1);
    notify();
  }
}

export function updateRoom(index, updates) {
  Object.assign(_state.rooms[index], updates);
  notify();
}

// Listeners
export function subscribe(fn) {
  _listeners.push(fn);
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx >= 0) _listeners.splice(idx, 1);
  };
}

function notify() {
  for (const fn of _listeners) {
    try { fn(_state); } catch (e) { console.error('State listener error:', e); }
  }
}

// Serialization for save/load
export function serialize() {
  return JSON.stringify(_state, null, 2);
}

export function deserialize(json) {
  _state = JSON.parse(json);
  _nextCompId = 100 + (_state.components?.length || 0);
  notify();
}

// Get derived values
export function getDerived() {
  const s = _state;
  const areaSqm = (s.width / 1000) * (s.depth / 1000);
  const widthM = (s.width / 1000).toFixed(1);
  const depthM = (s.depth / 1000).toFixed(1);
  const heightM = (s.height / 1000).toFixed(1);
  const dimensions = `${widthM}m x ${depthM}m x ${heightM}m`;
  const customerFirstName = (s.customer?.name || '').split(' ')[0] || '';

  return { areaSqm, widthM, depthM, heightM, dimensions, customerFirstName };
}
