// Plan editor: direct manipulation on the floor plan and the site plan.
//  - internal walls (move, end handles, draw), their doors (slide, add), room labels (move, add)
//  - site layer: existing buildings, parking, paths, fences, trees, text, north arrow (move, resize, draw)
//  - zoom (ctrl/cmd + wheel or buttons) and pan (middle button, space + drag, or the Pan tool)
//  - background map calibration: two clicks + a real distance
// Everything writes straight into vueApp.state so pricing, BOM and the PDFs follow.
let app = null, drag = null, raf = 0, spaceHeld = false;
const SNAP = 50;
const snap = (v) => Math.round(v / SNAP) * SNAP;
const uid = (p) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export function initPlanEditor(vueApp) {
  app = vueApp;
  const canvas = document.getElementById('drawing-canvas');
  if (!canvas) return;
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('dblclick', onDblClick);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', (e) => { if (e.key === ' ') spaceHeld = false; });
}

/** Pointer position in plan millimetres (the plan group's own coordinate space; CSS zoom included via getScreenCTM). */
function planPoint(e) {
  const g = document.getElementById('plan-group');
  if (!g) return null;
  const svg = g.ownerSVGElement; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  // During a drag the sheet may re-lay out (the site plan grows to fit what is being drawn), which would
  // move the cursor's mm position under it. Freeze the mapping at pointer-down so a drag stays 1:1.
  const inv = (drag && drag.inv) || (g.getScreenCTM() && g.getScreenCTM().inverse());
  if (!inv) return null;
  const p = pt.matrixTransform(inv);
  return { x: p.x, y: p.y };
}
function freezeCTM() { const g = document.getElementById('plan-group'); const m = g && g.getScreenCTM(); if (drag && m) drag.inv = m.inverse(); }
const wallById = (id) => (app.state.partitions || []).find((p) => p.id === id);
const labelById = (id) => (app.state.roomLabels || []).find((l) => l.id === id);
const siteById = (id) => (app.state.siteObjects || []).find((o) => o.id === id);
function clampWall(p) {
  const W = app.state.width, D = app.state.depth, wt = 150;
  if (p.dir === 'h') { p.x = Math.max(wt, Math.min(p.x, W - wt - 300)); p.y = Math.max(wt, Math.min(p.y, D - wt)); p.len = Math.max(300, Math.min(p.len, W - wt - p.x)); }
  else { p.x = Math.max(wt, Math.min(p.x, W - wt)); p.y = Math.max(wt, Math.min(p.y, D - wt - 300)); p.len = Math.max(300, Math.min(p.len, D - wt - p.y)); }
}
function select(sel) { app.planSelection = sel; }

function onDown(e) {
  if (!app || !app.state) return;
  const tool = app.planTool || 'select';
  // pan: middle button, space held, or the Pan tool
  if (e.button === 1 || spaceHeld || tool === 'pan') { drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: app.planZoom.x, oy: app.planZoom.y }; e.preventDefault(); return; }
  if (e.button !== 0) return;
  const pt = planPoint(e); if (!pt) return;
  const inPlan = !!e.target.closest('#plan-group');
  const handle = e.target.closest('.pw-handle'), wallEl = e.target.closest('.plan-wall'), doorEl = e.target.closest('.plan-door'), labelEl = e.target.closest('.plan-room-label');
  const siteHandle = e.target.closest('.site-handle'), sitePt = e.target.closest('.site-pt'), siteEl = e.target.closest('.site-obj');

  if (tool === 'select') {
    if (handle) { const p = wallById(handle.dataset.pwId); if (!p) return; drag = { kind: 'handle', p, end: handle.dataset.end, start: pt, o: { x: p.x, y: p.y, len: p.len } }; select({ type: 'wall', id: p.id }); }
    else if (doorEl) { const p = wallById(doorEl.dataset.pwId); const j = Number(doorEl.dataset.door); if (!p || !p.doors || !p.doors[j]) return; drag = { kind: 'door', p, j, start: pt }; select({ type: 'door', id: p.id, j }); }
    else if (wallEl) { const p = wallById(wallEl.dataset.pwId); if (!p) return; drag = { kind: 'wall', p, start: pt, o: { x: p.x, y: p.y } }; select({ type: 'wall', id: p.id }); }
    else if (labelEl) { const l = labelById(labelEl.dataset.rlId); if (!l) return; drag = { kind: 'label', l, start: pt, o: { x: l.x, y: l.y } }; select({ type: 'label', id: l.id }); }
    else if (siteHandle) { const o = siteById(siteHandle.dataset.soId); if (!o) return; drag = { kind: 'site-resize', o, start: pt, o0: { ...o } }; select({ type: 'site', id: o.id }); }
    else if (sitePt) { const o = siteById(sitePt.dataset.soId); const i = Number(sitePt.dataset.i); if (!o || !o.pts || !o.pts[i]) return; drag = { kind: 'site-pt', o, i, start: pt, o0: { ...o.pts[i] } }; select({ type: 'site', id: o.id }); }
    else if (siteEl) { const o = siteById(siteEl.dataset.soId); if (!o) return; drag = { kind: 'site-move', o, start: pt, o0: JSON.parse(JSON.stringify(o)) }; select({ type: 'site', id: o.id }); }
    else if (inPlan) { select(null); return; }
    else return;
    freezeCTM(); e.preventDefault(); return;
  }
  if (!inPlan) return;
  if (tool === 'wall-v' || tool === 'wall-h') {
    const p = { id: uid('pw'), dir: tool === 'wall-v' ? 'v' : 'h', x: snap(pt.x), y: snap(pt.y), len: 300, label: '', doors: [], loadBearing: false };
    clampWall(p); app.state.partitions.push(p); drag = { kind: 'draw', p, start: { x: p.x, y: p.y } }; freezeCTM(); select({ type: 'wall', id: p.id }); e.preventDefault(); return;
  }
  if (tool === 'door') {
    if (!wallEl) return; const p = wallById(wallEl.dataset.pwId); if (!p) return;
    const along = p.dir === 'h' ? (pt.x - p.x) / p.len : (pt.y - p.y) / p.len;
    if (!Array.isArray(p.doors)) p.doors = [];
    p.doors.push({ pos: Math.max(0, Math.min(1, Math.round(along * 20) / 20)), swing: 'a', flipped: false });
    select({ type: 'door', id: p.id, j: p.doors.length - 1 }); e.preventDefault(); return;
  }
  if (tool === 'label') {
    const l = { id: uid('rl'), text: 'Room', x: snap(pt.x), y: snap(pt.y), kind: 'office' };
    app.state.roomLabels.push(l); select({ type: 'label', id: l.id }); app.planTool = 'select'; e.preventDefault(); return;
  }
  // ── site tools ──
  if (!Array.isArray(app.state.siteObjects)) app.state.siteObjects = [];
  if (tool === 'site-building' || tool === 'site-parking') {
    const o = { id: uid('so'), kind: tool === 'site-building' ? 'building' : 'parking', x: snap(pt.x), y: snap(pt.y), w: 1000, h: 1000, rot: 0, label: tool === 'site-building' ? 'Existing building' : '' };
    app.state.siteObjects.push(o); drag = { kind: 'site-draw', o, start: { x: o.x, y: o.y } }; freezeCTM(); select({ type: 'site', id: o.id }); e.preventDefault(); return;
  }
  if (tool === 'site-tree') { const o = { id: uid('so'), kind: 'tree', x: snap(pt.x), y: snap(pt.y), r: 1500, label: '' }; app.state.siteObjects.push(o); select({ type: 'site', id: o.id }); e.preventDefault(); return; }
  if (tool === 'site-text') { const o = { id: uid('so'), kind: 'text', x: snap(pt.x), y: snap(pt.y), label: 'Text' }; app.state.siteObjects.push(o); select({ type: 'site', id: o.id }); app.planTool = 'select'; e.preventDefault(); return; }
  if (tool === 'site-north') { const o = { id: uid('so'), kind: 'north', x: snap(pt.x), y: snap(pt.y), rot: 0 }; app.state.siteObjects.push(o); select({ type: 'site', id: o.id }); app.planTool = 'select'; e.preventDefault(); return; }
  if (tool === 'site-path' || tool === 'site-fence') {
    const p = { x: snap(pt.x), y: snap(pt.y) };
    if (app.siteDraft && app.siteDraft.kind === (tool === 'site-path' ? 'path' : 'fence')) { app.siteDraft.pts.push(p); }
    else { app.siteDraft = { id: uid('so'), kind: tool === 'site-path' ? 'path' : 'fence', pts: [p], width: 1200, label: '' }; app.state.siteObjects.push(app.siteDraft); }
    select({ type: 'site', id: app.siteDraft.id }); e.preventDefault(); return;
  }
  if (tool === 'calibrate') {
    if (!app.calib) app.calib = { pts: [], distance: '' };
    if (app.calib.pts.length >= 2) app.calib.pts = [];
    app.calib.pts.push({ x: pt.x, y: pt.y });
    e.preventDefault(); return;
  }
}
function onDblClick(e) { if (app && app.siteDraft) { finishDraft(); e.preventDefault(); } }
export function finishDraft() {
  if (!app || !app.siteDraft) return;
  if ((app.siteDraft.pts || []).length < 2) app.state.siteObjects = app.state.siteObjects.filter((o) => o !== app.siteDraft);
  app.siteDraft = null; app.planTool = 'select';
}

function onMove(e) {
  if (!drag) return;
  if (drag.kind === 'pan') { app.planZoom.x = drag.ox + (e.clientX - drag.sx); app.planZoom.y = drag.oy + (e.clientY - drag.sy); return; }
  const pt = planPoint(e); if (!pt) return;
  const dx = pt.x - drag.start.x, dy = pt.y - drag.start.y;
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0; const d = drag; if (!d) return;
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
    else if (d.kind === 'site-draw') { d.o.w = snap(Math.max(500, pt.x - d.o.x)); d.o.h = snap(Math.max(500, pt.y - d.o.y)); }
    else if (d.kind === 'site-resize') { const o = d.o; if (o.kind === 'tree') o.r = snap(Math.max(300, Math.hypot(pt.x - o.x, pt.y - o.y))); else { o.w = snap(Math.max(500, d.o0.w + dx)); o.h = snap(Math.max(500, d.o0.h + dy)); } }
    else if (d.kind === 'site-pt') { d.o.pts[d.i].x = snap(d.o0.x + dx); d.o.pts[d.i].y = snap(d.o0.y + dy); }
    else if (d.kind === 'site-move') {
      const o = d.o, o0 = d.o0;
      if (o.pts) o.pts = o0.pts.map((p) => ({ x: snap(p.x + dx), y: snap(p.y + dy) }));
      else { o.x = snap(o0.x + dx); o.y = snap(o0.y + dy); }
    }
  });
}
function onUp() {
  if (!drag) return;
  if (drag.kind === 'draw' && drag.p.len < 300) app.state.partitions = app.state.partitions.filter((p) => p !== drag.p);
  drag = null;
}
function onWheel(e) {
  if (!app || !(e.ctrlKey || e.metaKey)) return; // plain wheel scrolls the page as usual
  e.preventDefault();
  const canvas = document.getElementById('drawing-canvas'); const r = canvas.getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;
  app.zoomAt(px, py, e.deltaY < 0 ? 1.15 : 1 / 1.15);
}
function onKey(e) {
  if (!app || !app.state) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
  if (e.key === ' ') { spaceHeld = true; e.preventDefault(); return; }
  if (e.key === 'Enter' && app.siteDraft) { finishDraft(); e.preventDefault(); return; } // preventDefault: a focused toolbar button would otherwise re-fire its click
  if (e.key === 'Escape') { if (app.siteDraft) finishDraft(); app.planTool = 'select'; app.planSelection = null; return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && app.planSelection) { app.deletePlanSelection(); e.preventDefault(); }
}
