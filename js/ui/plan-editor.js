// Plan editor: direct manipulation of internal walls, their doors and room labels on the
// floor plan, plus drawing new walls / labels with the toolbar tools. Writes straight into
// vueApp.state so pricing, BOM and the PDFs follow. (Liam 21 Oct 2026: "a really easy to use
// but functional design tool".)
let app = null, drag = null, raf = 0;
const SNAP = 50;
const snap = (v) => Math.round(v / SNAP) * SNAP;

export function initPlanEditor(vueApp) {
  app = vueApp;
  const canvas = document.getElementById('drawing-canvas');
  if (!canvas) return;
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('keydown', onKey);
}

/** Pointer position in plan millimetres (the plan group's own coordinate space). */
function planPoint(e) {
  const g = document.getElementById('plan-group');
  if (!g) return null;
  const svg = g.ownerSVGElement; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const m = g.getScreenCTM(); if (!m) return null;
  const p = pt.matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}
const wallById = (id) => (app.state.partitions || []).find((p) => p.id === id);
const labelById = (id) => (app.state.roomLabels || []).find((l) => l.id === id);
function clampWall(p) {
  const W = app.state.width, D = app.state.depth, wt = 150;
  if (p.dir === 'h') { p.x = Math.max(wt, Math.min(p.x, W - wt - 300)); p.y = Math.max(wt, Math.min(p.y, D - wt)); p.len = Math.max(300, Math.min(p.len, W - wt - p.x)); }
  else { p.x = Math.max(wt, Math.min(p.x, W - wt)); p.y = Math.max(wt, Math.min(p.y, D - wt - 300)); p.len = Math.max(300, Math.min(p.len, D - wt - p.y)); }
}

function onDown(e) {
  if (!app || !app.state || e.button !== 0) return;
  const tool = app.planTool || 'select';
  const pt = planPoint(e); if (!pt) return;
  const handle = e.target.closest('.pw-handle');
  const wallEl = e.target.closest('.plan-wall');
  const doorEl = e.target.closest('.plan-door');
  const labelEl = e.target.closest('.plan-room-label');
  const floorEl = e.target.closest('.plan-floor');

  if (tool === 'select') {
    if (handle) { const p = wallById(handle.dataset.pwId); if (!p) return; drag = { kind: 'handle', p, end: handle.dataset.end, start: pt, o: { x: p.x, y: p.y, len: p.len } }; app.planSelection = { type: 'wall', id: p.id }; }
    else if (doorEl) { const p = wallById(doorEl.dataset.pwId); const j = Number(doorEl.dataset.door); if (!p || !p.doors || !p.doors[j]) return; drag = { kind: 'door', p, j, start: pt }; app.planSelection = { type: 'door', id: p.id, j }; }
    else if (labelEl) { const l = labelById(labelEl.dataset.rlId); if (!l) return; drag = { kind: 'label', l, start: pt, o: { x: l.x, y: l.y } }; app.planSelection = { type: 'label', id: l.id }; }
    else if (wallEl) { const p = wallById(wallEl.dataset.pwId); if (!p) return; drag = { kind: 'wall', p, start: pt, o: { x: p.x, y: p.y } }; app.planSelection = { type: 'wall', id: p.id }; }
    else if (floorEl || e.target.closest('#plan-group')) { app.planSelection = null; return; }
    else return;
    e.preventDefault(); return;
  }
  if (tool === 'wall-v' || tool === 'wall-h') {
    if (!e.target.closest('#plan-group')) return;
    const id = 'pw-' + Date.now();
    const p = { id, dir: tool === 'wall-v' ? 'v' : 'h', x: snap(pt.x), y: snap(pt.y), len: 300, label: '', doors: [], loadBearing: false };
    clampWall(p); app.state.partitions.push(p); drag = { kind: 'draw', p, start: { x: p.x, y: p.y } }; app.planSelection = { type: 'wall', id };
    e.preventDefault(); return;
  }
  if (tool === 'door') {
    if (!wallEl) return;
    const p = wallById(wallEl.dataset.pwId); if (!p) return;
    const along = p.dir === 'h' ? (pt.x - p.x) / p.len : (pt.y - p.y) / p.len;
    if (!Array.isArray(p.doors)) p.doors = [];
    p.doors.push({ pos: Math.max(0, Math.min(1, Math.round(along * 20) / 20)), swing: 'a', flipped: false });
    app.planSelection = { type: 'door', id: p.id, j: p.doors.length - 1 };
    e.preventDefault(); return;
  }
  if (tool === 'label') {
    if (!e.target.closest('#plan-group')) return;
    const l = { id: 'rl-' + Date.now(), text: 'Room', x: snap(pt.x), y: snap(pt.y) };
    app.state.roomLabels.push(l); app.planSelection = { type: 'label', id: l.id }; app.planTool = 'select';
    e.preventDefault(); return;
  }
}

function onMove(e) {
  if (!drag) return;
  const pt = planPoint(e); if (!pt) return;
  const dx = pt.x - drag.start.x, dy = pt.y - drag.start.y;
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const d = drag; if (!d) return;
    if (d.kind === 'wall') { d.p.x = snap(d.o.x + dx); d.p.y = snap(d.o.y + dy); clampWall(d.p); }
    else if (d.kind === 'handle') {
      const p = d.p;
      if (p.dir === 'h') { if (d.end === 'b') p.len = snap(d.o.len + dx); else { const nx = snap(d.o.x + dx); p.len = d.o.len + (d.o.x - nx); p.x = nx; } }
      else { if (d.end === 'b') p.len = snap(d.o.len + dy); else { const ny = snap(d.o.y + dy); p.len = d.o.len + (d.o.y - ny); p.y = ny; } }
      clampWall(p);
    }
    else if (d.kind === 'draw') { const p = d.p; if (p.dir === 'h') p.len = snap(Math.max(300, pt.x - p.x)); else p.len = snap(Math.max(300, pt.y - p.y)); clampWall(p); }
    else if (d.kind === 'door') { const p = d.p; const along = p.dir === 'h' ? (pt.x - p.x) / p.len : (pt.y - p.y) / p.len; p.doors[d.j].pos = Math.max(0, Math.min(1, Math.round(along * 40) / 40)); }
    else if (d.kind === 'label') { d.l.x = snap(d.o.x + dx); d.l.y = snap(d.o.y + dy); }
  });
}
function onUp() { if (drag && drag.kind === 'draw' && drag.p.len < 300) app.state.partitions = app.state.partitions.filter((p) => p !== drag.p); drag = null; }
function onKey(e) {
  if (!app || !app.state) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
  if (e.key === 'Escape') { app.planTool = 'select'; app.planSelection = null; return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && app.planSelection) { app.deletePlanSelection(); e.preventDefault(); }
}
