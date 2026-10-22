// GOB Drawing Engine v2 — Ported from samples.html
// All coordinates in mm. viewBox handles scaling.

// Format date string (YYYY-MM-DD) to dd/mm/yy UK format
function fmtDateUK(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

// Format useCase value to readable label
function formatUseCase(value) {
  if (!value) return null;
  const labels = {
    'home-office': 'Home Office (WFH)',
    'gym': 'Home Gym',
    'studio': 'Art/Music Studio',
    'therapy': 'Therapy/Treatment Room',
    'guest-room': 'Guest Accommodation',
    'annexe': 'Dependent Relative Annexe',
    'multi-purpose': 'Multi-Purpose',
    'rental': 'Airbnb/Rental',
    'other': 'Other'
  };
  return labels[value] || value;
}
//
// Building structure (from top to bottom, within overall height H):
//   y=0          : top of building
//   y=0..75      : top trim (anthracite)
//   y=75..375    : fascia (300mm, anthracite)
//   y=375        : bottom of fascia -> gutter hangs here
//   y=375..H     : wall cladding area
//   Doors: 2110mm tall, base at y=H (ground level)
//   Overall height dimension: y=0 to y=H

const COL = {
  anthracite:    '#383E42',
  anthraciteLt:  '#4A5054',
  anthraciteDk:  '#2C3134',
  cedar:         '#B87A4B',
  cedarLight:    '#D4995F',
  cedarDark:     '#8B5E30',
  cedarPlank:    '#C4874E',
  composite:     '#8B7355', // coffee slats - the original brown-tea colour (Liam 20 Sep 2026)
  compositeLt:   '#A08060',
  compositeDk:   '#5C4A3F', // grooves between slats
  latte:         '#A3A6A9', // latte = a soft mid grey
  latteLt:       '#BDBFC2',
  latteDk:       '#5F6367',
  glass:         '#6B9AAD',
  glassDark:     '#5888A0',
  glassReflect:  '#B0D0DD',
  decking:       '#606365',
  deckingLine:   '#505355',
  roofEdge:      '#2C2C2C',
  handle:        '#555',
  handleDk:      '#333',
  soffit:        '#E8E4DF',
  white:         '#FAFAFA',
  wallFill:      '#A0A0A0',
};

const FASCIA_H = 300;
const TOP_TRIM = 75;
const ROOF_ZONE = FASCIA_H + TOP_TRIM; // 375mm from top
const GUTTER_H = 30;
// oh removed - now uses overhang value from state

function svgDefs() {
  return `<defs>
    <linearGradient id="glass" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="#D9E8EF" stop-opacity="0.92"/>
      <stop offset="28%" stop-color="#93B8C8" stop-opacity="0.9"/>
      <stop offset="55%" stop-color="#6A9AB0" stop-opacity="0.92"/>
      <stop offset="80%" stop-color="#84ADBF" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#C3D9E3" stop-opacity="0.85"/>
    </linearGradient>
    <linearGradient id="shadowDown" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="groundShadow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="roofPlane" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6E7276"/>
      <stop offset="100%" stop-color="#4A4F53"/>
    </linearGradient>
    <pattern id="overlayHatch" x="0" y="0" width="300" height="300" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="300" stroke="#b45309" stroke-width="8" opacity="0.35"/>
    </pattern>
    <pattern id="wallHatch" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
      <rect width="80" height="80" fill="#C9C9C9"/>
      <line x1="0" y1="80" x2="80" y2="0" stroke="#7A7A7A" stroke-width="4"/>
      <line x1="-20" y1="20" x2="20" y2="-20" stroke="#7A7A7A" stroke-width="4"/>
      <line x1="60" y1="100" x2="100" y2="60" stroke="#7A7A7A" stroke-width="4"/>
    </pattern>
    <linearGradient id="frameGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${COL.anthraciteDk}"/>
      <stop offset="12%" stop-color="${COL.anthracite}"/>
      <stop offset="50%" stop-color="${COL.anthraciteLt}"/>
      <stop offset="88%" stop-color="${COL.anthracite}"/>
      <stop offset="100%" stop-color="${COL.anthraciteDk}"/>
    </linearGradient>
    <linearGradient id="frameGradV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COL.anthraciteDk}"/>
      <stop offset="12%" stop-color="${COL.anthracite}"/>
      <stop offset="50%" stop-color="${COL.anthraciteLt}"/>
      <stop offset="88%" stop-color="${COL.anthracite}"/>
      <stop offset="100%" stop-color="${COL.anthraciteDk}"/>
    </linearGradient>
    <linearGradient id="aluFrame" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3A3A3A"/>
      <stop offset="20%" stop-color="#555"/>
      <stop offset="50%" stop-color="#666"/>
      <stop offset="80%" stop-color="#555"/>
      <stop offset="100%" stop-color="#3A3A3A"/>
    </linearGradient>
    <linearGradient id="gutterGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COL.anthraciteLt}"/>
      <stop offset="40%" stop-color="${COL.anthracite}"/>
      <stop offset="100%" stop-color="${COL.anthraciteDk}"/>
    </linearGradient>
    <linearGradient id="fasciaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COL.anthraciteLt}"/>
      <stop offset="50%" stop-color="${COL.anthracite}"/>
      <stop offset="100%" stop-color="${COL.anthraciteDk}"/>
    </linearGradient>
    <linearGradient id="soffitGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D0CCC6"/>
      <stop offset="100%" stop-color="${COL.soffit}"/>
    </linearGradient>
    <linearGradient id="chromeH" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#888C90"/>
      <stop offset="20%" stop-color="#B8BCC0"/>
      <stop offset="50%" stop-color="#D8DCE0"/>
      <stop offset="80%" stop-color="#B8BCC0"/>
      <stop offset="100%" stop-color="#888C90"/>
    </linearGradient>
    <linearGradient id="chromeV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#888C90"/>
      <stop offset="20%" stop-color="#B8BCC0"/>
      <stop offset="50%" stop-color="#D8DCE0"/>
      <stop offset="80%" stop-color="#B8BCC0"/>
      <stop offset="100%" stop-color="#888C90"/>
    </linearGradient>
    <pattern id="cedarClad" x="0" y="0" width="150" height="150" patternUnits="userSpaceOnUse">
      <rect width="150" height="150" fill="${COL.cedar}"/>
      <line x1="0" y1="0" x2="0" y2="150" stroke="${COL.cedarDark}" stroke-width="3"/>
      <line x1="1" y1="0" x2="1" y2="150" stroke="${COL.cedarLight}" stroke-width="1" opacity="0.4"/>
      <line x1="149" y1="0" x2="149" y2="150" stroke="${COL.cedarDark}" stroke-width="1.5"/>
      <line x1="50" y1="0" x2="48" y2="150" stroke="${COL.cedarLight}" stroke-width="0.6" opacity="0.2"/>
      <line x1="100" y1="0" x2="102" y2="150" stroke="${COL.cedarLight}" stroke-width="0.5" opacity="0.18"/>
      <rect x="5" y="0" width="70" height="150" fill="${COL.cedarPlank}" opacity="0.12"/>
      <rect x="85" y="0" width="50" height="150" fill="${COL.cedarLight}" opacity="0.08"/>
    </pattern>
    <pattern id="steelClad" x="0" y="0" width="35" height="200" patternUnits="userSpaceOnUse">
      <rect width="35" height="200" fill="${COL.anthracite}"/>
      <rect x="0" y="0" width="1.5" height="200" fill="${COL.anthraciteLt}" opacity="0.5"/>
      <rect x="28" y="0" width="2" height="200" fill="${COL.anthraciteDk}" opacity="0.6"/>
      <rect x="33" y="0" width="2" height="200" fill="${COL.anthraciteDk}" opacity="0.35"/>
      <rect x="15" y="0" width="1" height="200" fill="${COL.anthraciteLt}" opacity="0.12"/>
    </pattern>
    <pattern id="compositeClad" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
      <rect width="200" height="200" fill="${COL.compositeDk}"/>
      <rect x="6" y="0" width="52" height="200" fill="${COL.composite}"/>
      <rect x="72" y="0" width="52" height="200" fill="${COL.composite}"/>
      <rect x="138" y="0" width="52" height="200" fill="${COL.composite}"/>
      <rect x="6" y="0" width="6" height="200" fill="${COL.compositeLt}" opacity="0.55"/>
      <rect x="72" y="0" width="6" height="200" fill="${COL.compositeLt}" opacity="0.55"/>
      <rect x="138" y="0" width="6" height="200" fill="${COL.compositeLt}" opacity="0.55"/>
      <rect x="52" y="0" width="6" height="200" fill="${COL.compositeDk}" opacity="0.35"/>
      <rect x="118" y="0" width="6" height="200" fill="${COL.compositeDk}" opacity="0.35"/>
      <rect x="184" y="0" width="6" height="200" fill="${COL.compositeDk}" opacity="0.35"/>
    </pattern>
    <pattern id="compositeLatteClad" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
      <rect width="200" height="200" fill="${COL.latteDk}"/>
      <rect x="6" y="0" width="52" height="200" fill="${COL.latte}"/>
      <rect x="72" y="0" width="52" height="200" fill="${COL.latte}"/>
      <rect x="138" y="0" width="52" height="200" fill="${COL.latte}"/>
      <rect x="6" y="0" width="6" height="200" fill="${COL.latteLt}" opacity="0.55"/>
      <rect x="72" y="0" width="6" height="200" fill="${COL.latteLt}" opacity="0.55"/>
      <rect x="138" y="0" width="6" height="200" fill="${COL.latteLt}" opacity="0.55"/>
      <rect x="52" y="0" width="6" height="200" fill="${COL.latteDk}" opacity="0.35"/>
      <rect x="118" y="0" width="6" height="200" fill="${COL.latteDk}" opacity="0.35"/>
      <rect x="184" y="0" width="6" height="200" fill="${COL.latteDk}" opacity="0.35"/>
    </pattern>
    <pattern id="deckPat" x="0" y="0" width="130" height="400" patternUnits="userSpaceOnUse">
      <rect width="130" height="400" fill="${COL.decking}"/>
      <line x1="0" y1="0" x2="0" y2="400" stroke="${COL.deckingLine}" stroke-width="2"/>
      <line x1="129" y1="0" x2="129" y2="400" stroke="${COL.deckingLine}" stroke-width="1.5"/>
      <rect x="40" y="0" width="30" height="400" fill="#808385" opacity="0.08"/>
    </pattern>
  </defs>`;
}

// ── Helpers ──────────────────────────────────────────────────

function tag(n, a, c) {
  const s = Object.entries(a).filter(([k,v]) => v !== undefined && v !== null).map(([k,v]) => `${k}="${v}"`).join(' ');
  return c != null ? `<${n} ${s}>${c}</${n}>` : `<${n} ${s}/>`;
}
function ln(x1,y1,x2,y2,sw,col,ex) { return tag('line',{x1,y1,x2,y2,stroke:col||'#000','stroke-width':sw,...(ex||{})}); }
function rc(x,y,w,h,o) { o=o||{}; return tag('rect',{x,y,width:w,height:h,fill:o.fill||'none',stroke:o.stroke||(o.sw?'#000':'none'),'stroke-width':o.sw||0,rx:o.rx||0,opacity:o.opacity,'clip-path':o.clip}); }
let TS = 1; // text scale: grows with the building so labels stay legible on a 20m plan (set in compose)
const esc = (v) => String(v ?? '').replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function tx(x,y,str,sz,o) { o=o||{}; str = esc(str); return tag('text',{x,y,'font-family':'Arial,Helvetica,sans-serif','font-size':sz*TS,fill:o.color||'#222','text-anchor':o.anchor||'middle','font-weight':o.bold?'bold':undefined,'font-style':o.italic?'italic':undefined,'text-decoration':o.underline?'underline':undefined,'letter-spacing':o.spacing,transform:o.transform},str); }
function grp(c,a) { return tag('g',a||{},c); }

// ── Glass ────────────────────────────────────────────────────

function glassFill(x, y, w, h) {
  let s = '';
  s += rc(x, y, w, h, { fill: 'url(#glass)' });
  const rw = w * 0.12, rx1 = x + w * 0.3;
  s += tag('polygon', { points: `${x},${y} ${x + w * 0.42},${y} ${x + w * 0.12},${y + h} ${x},${y + h * 0.7}`, fill: 'white', opacity: 0.13 });
  s += tag('polygon', { points: `${rx1},${y} ${rx1+rw},${y} ${rx1+rw*0.6+w*0.08},${y+h} ${rx1+w*0.08-rw*0.4},${y+h}`, fill: 'white', opacity: 0.1 });
  const rx2 = rx1 + rw + w*0.06;
  s += tag('polygon', { points: `${rx2},${y} ${rx2+rw*0.4},${y} ${rx2+rw*0.2+w*0.05},${y+h} ${rx2+w*0.05-rw*0.2},${y+h}`, fill: 'white', opacity: 0.06 });
  s += rc(x, y, w, h*0.02, { fill: 'white', opacity: 0.08 });
  return s;
}

// ── Stepped UPVC Frame Profile ──────────────────────────────

function frameProfile(x, y, w, h, t) {
  const outerT = Math.round(t * 0.55);
  const innerT = t - outerT;
  let s = '';
  // OUTER FRAME
  s += rc(x, y, w, h, { fill: '#2A2E32' });
  s += rc(x+3, y+3, w-6, h-6, { fill: '#3D4347' });
  s += ln(x+4, y+4, x+w-4, y+4, 1.5, '#565C60', { opacity: 0.4 });
  s += ln(x+4, y+6, x+4, y+h-4, 1, '#565C60', { opacity: 0.3 });
  s += ln(x+4, y+h-3, x+w-4, y+h-3, 1.5, '#1E2226', { opacity: 0.5 });
  s += ln(x+w-3, y+6, x+w-3, y+h-4, 1, '#1E2226', { opacity: 0.4 });
  s += rc(x+outerT-3, y+outerT-3, w-outerT*2+6, h-outerT*2+6, { fill: '#222629' });
  s += rc(x+outerT-1, y+outerT-1, w-outerT*2+2, h-outerT*2+2, { fill: '#3A3F43' });
  // INNER GLAZING BEAD
  const ix = x+outerT, iy = y+outerT, iw = w-outerT*2, ih = h-outerT*2;
  s += rc(ix, iy, iw, ih, { fill: '#2A2E32' });
  s += rc(ix+2, iy+2, iw-4, ih-4, { fill: '#3D4347' });
  s += ln(ix+3, iy+3, ix+iw-3, iy+3, 1, '#565C60', { opacity: 0.3 });
  s += ln(ix+3, iy+5, ix+3, iy+ih-3, 0.8, '#565C60', { opacity: 0.2 });
  s += ln(ix+3, iy+ih-2, ix+iw-3, iy+ih-2, 1, '#1E2226', { opacity: 0.35 });
  s += ln(ix+iw-2, iy+5, ix+iw-2, iy+ih-3, 0.8, '#1E2226', { opacity: 0.3 });
  s += rc(ix+innerT-2, iy+innerT-2, iw-innerT*2+4, ih-innerT*2+4, { fill: '#222629' });
  s += rc(ix+innerT-1, iy+innerT-1, iw-innerT*2+2, ih-innerT*2+2, { fill: '#3A3F43' });
  return s;
}

// ── Sliding Door ────────────────────────────────────────────

function slidingDoor(x, y, w, h, handleSide) {
  handleSide = handleSide || 'right'; // default handle on right
  const outerT = Math.max(35, w * 0.028);
  const sashT = Math.max(22, w * 0.018);
  const interlockW = Math.max(14, w * 0.012);
  let s = '';
  // OUTER FRAME
  s += rc(x, y, w, h, { fill: '#2A2E32' });
  s += rc(x+3, y+3, w-6, h-6, { fill: '#3D4347' });
  s += ln(x+4, y+4, x+w-4, y+4, 1.5, '#565C60', { opacity: 0.4 });
  s += ln(x+4, y+6, x+4, y+h-4, 1, '#565C60', { opacity: 0.3 });
  s += ln(x+4, y+h-3, x+w-4, y+h-3, 1.5, '#1E2226', { opacity: 0.5 });
  s += ln(x+w-3, y+6, x+w-3, y+h-4, 1, '#1E2226', { opacity: 0.4 });
  s += rc(x+outerT-3, y+outerT-3, w-outerT*2+6, h-outerT*2+6, { fill: '#222629' });
  s += rc(x+outerT-1, y+outerT-1, w-outerT*2+2, h-outerT*2+2, { fill: '#3A3F43' });
  const ox = x + outerT, oy = y + outerT;
  const ow = w - outerT * 2, oh = h - outerT * 2;
  s += rc(ox, oy, ow, oh, { fill: '#1E2226' });
  // LEFT SASH
  const lpw = (ow - interlockW) / 2;
  s += rc(ox, oy, lpw, oh, { fill: '#2A2E32' });
  s += rc(ox+2, oy+2, lpw-4, oh-4, { fill: '#3D4347' });
  s += ln(ox+3, oy+3, ox+lpw-3, oy+3, 1, '#565C60', { opacity: 0.3 });
  s += ln(ox+3, oy+5, ox+3, oy+oh-3, 0.8, '#565C60', { opacity: 0.2 });
  s += ln(ox+3, oy+oh-2, ox+lpw-3, oy+oh-2, 1, '#1E2226', { opacity: 0.35 });
  s += ln(ox+lpw-2, oy+5, ox+lpw-2, oy+oh-3, 0.8, '#1E2226', { opacity: 0.3 });
  s += rc(ox+sashT-2, oy+sashT-2, lpw-sashT*2+4, oh-sashT*2+4, { fill: '#222629' });
  s += rc(ox+sashT-1, oy+sashT-1, lpw-sashT*2+2, oh-sashT*2+2, { fill: '#3A3F43' });
  s += glassFill(ox+sashT, oy+sashT, lpw-sashT*2, oh-sashT*2);
  s += rc(ox+sashT, oy+sashT, lpw-sashT*2, oh-sashT*2, { sw: 0.5, stroke: '#252A2E' });
  // RIGHT SASH
  const rpx = ox + lpw + interlockW;
  s += rc(rpx, oy, lpw, oh, { fill: '#2A2E32' });
  s += rc(rpx+2, oy+2, lpw-4, oh-4, { fill: '#3D4347' });
  s += ln(rpx+3, oy+3, rpx+lpw-3, oy+3, 1, '#565C60', { opacity: 0.3 });
  s += ln(rpx+3, oy+5, rpx+3, oy+oh-3, 0.8, '#565C60', { opacity: 0.2 });
  s += ln(rpx+3, oy+oh-2, rpx+lpw-3, oy+oh-2, 1, '#1E2226', { opacity: 0.35 });
  s += ln(rpx+lpw-2, oy+5, rpx+lpw-2, oy+oh-3, 0.8, '#1E2226', { opacity: 0.3 });
  s += rc(rpx+sashT-2, oy+sashT-2, lpw-sashT*2+4, oh-sashT*2+4, { fill: '#222629' });
  s += rc(rpx+sashT-1, oy+sashT-1, lpw-sashT*2+2, oh-sashT*2+2, { fill: '#3A3F43' });
  s += glassFill(rpx+sashT, oy+sashT, lpw-sashT*2, oh-sashT*2);
  s += rc(rpx+sashT, oy+sashT, lpw-sashT*2, oh-sashT*2, { sw: 0.5, stroke: '#252A2E' });
  // INTERLOCK
  const ix = ox + lpw;
  s += rc(ix, oy, interlockW, oh, { fill: '#2A2E32' });
  s += rc(ix+2, oy+1, interlockW-4, oh-2, { fill: '#3D4347' });
  s += ln(ix+interlockW/2, oy, ix+interlockW/2, oy+oh, 0.8, '#252A2E');
  // HANDLE - satin silver rectangle on frame (centred in frame)
  const handleW = 24, handleH = 120;
  const handleY = oy + (oh / 2) - (handleH / 2);
  let handleX;
  if (handleSide === 'left') {
    // Handle on left sash, centred in the frame between outer edge and glass
    handleX = ox + (sashT / 2) - (handleW / 2);
  } else {
    // Handle on right sash, centred in the frame between glass and outer edge
    handleX = rpx + lpw - (sashT / 2) - (handleW / 2);
  }
  s += rc(handleX, handleY, handleW, handleH, { fill: '#C0C0C0', rx: 3 });
  s += rc(handleX+2, handleY+2, handleW-4, handleH-4, { fill: '#D8D8D8', rx: 2 });
  s += ln(handleX+handleW/2, handleY+10, handleX+handleW/2, handleY+handleH-10, 2, '#A0A0A0');
  // BOTTOM TRACK
  const trackH = Math.max(5, outerT * 0.1);
  s += rc(ox, oy+oh-trackH, ow, trackH, { fill: '#2A2E32' });
  s += ln(ox, oy+oh-trackH, ox+ow, oy+oh-trackH, 0.5, '#4E5458', { opacity: 0.4 });
  return grp(s);
}

// ── Bifold Door ─────────────────────────────────────────────

function bifoldDoor(x, y, w, h, leaves) {
  leaves = leaves || 3;
  const outerT = Math.max(30, w * 0.022);
  const divW = Math.max(12, w * 0.010);
  const leafW = (w - outerT*2 - divW*(leaves-1)) / leaves;
  const leafT = Math.max(18, leafW * 0.04);
  let s = '';
  s += rc(x, y, w, h, { fill: '#2A2E32' });
  s += rc(x+3, y+3, w-6, h-6, { fill: '#3D4347' });
  s += ln(x+4, y+4, x+w-4, y+4, 1.5, '#565C60', { opacity: 0.4 });
  s += ln(x+4, y+6, x+4, y+h-4, 1, '#565C60', { opacity: 0.3 });
  s += ln(x+4, y+h-3, x+w-4, y+h-3, 1.5, '#1E2226', { opacity: 0.5 });
  s += ln(x+w-3, y+6, x+w-3, y+h-4, 1, '#1E2226', { opacity: 0.4 });
  s += rc(x+outerT-3, y+outerT-3, w-outerT*2+6, h-outerT*2+6, { fill: '#222629' });
  s += rc(x+outerT-1, y+outerT-1, w-outerT*2+2, h-outerT*2+2, { fill: '#3A3F43' });
  s += rc(x+outerT, y+outerT, w-outerT*2, h-outerT*2, { fill: '#1E2226' });
  const ly = y + outerT, lh = h - outerT*2;
  for (let i = 0; i < leaves; i++) {
    const lx = x + outerT + i * (leafW + divW);
    s += rc(lx, ly, leafW, lh, { fill: '#2A2E32' });
    s += rc(lx+2, ly+2, leafW-4, lh-4, { fill: '#3D4347' });
    s += rc(lx+leafT-2, ly+leafT-2, leafW-leafT*2+4, lh-leafT*2+4, { fill: '#222629' });
    s += rc(lx+leafT-1, ly+leafT-1, leafW-leafT*2+2, lh-leafT*2+2, { fill: '#3A3F43' });
    s += glassFill(lx+leafT, ly+leafT, leafW-leafT*2, lh-leafT*2);
    s += rc(lx+leafT, ly+leafT, leafW-leafT*2, lh-leafT*2, { sw: 0.8, stroke: '#252A2E' });
    if (i < leaves-1) {
      const dx = lx + leafW;
      s += rc(dx, ly, divW, lh, { fill: '#2A2E32' });
      s += rc(dx+2, ly+2, divW-4, lh-4, { fill: '#3D4347' });
    }
  }
  const fY = y+h-Math.max(60, h*0.035), mX = x+w/2, fS = Math.max(18, w*0.015);
  s += tag('polyline',{points:`${mX-fS*3},${fY} ${mX-fS},${fY-fS} ${mX-fS},${fY+fS}`,fill:'none',stroke:'#AAA','stroke-width':2});
  s += tag('polyline',{points:`${mX+fS*3},${fY} ${mX+fS},${fY-fS} ${mX+fS},${fY+fS}`,fill:'none',stroke:'#AAA','stroke-width':2});
  return grp(s);
}

// ── Single Glazed Door ──────────────────────────────────────

function singleDoor(x, y, w, h, handleSide) {
  handleSide = handleSide || 'right'; // default handle on right
  const frameT = Math.max(70, w * 0.10);
  const pi = Math.max(3, w*0.005);
  let s = '';
  s += frameProfile(x, y, w, h, frameT);
  const gx=x+frameT+pi, gy=y+frameT+pi, gw=w-(frameT+pi)*2, gh=h-(frameT+pi)*2;
  s += glassFill(gx,gy,gw,gh);
  s += rc(gx,gy,gw,gh, { sw: 0.5, stroke: '#252A2E' });
  // HANDLE - satin silver rectangle on frame
  const handleW = 26, handleH = 130;
  const handleY = y + (h / 2) - (handleH / 2);
  let handleX;
  if (handleSide === 'left') {
    handleX = x + frameT/2 - handleW/2; // Centred on left frame
  } else {
    handleX = x + w - frameT/2 - handleW/2; // Centred on right frame
  }
  s += rc(handleX, handleY, handleW, handleH, { fill: '#C0C0C0', rx: 3 });
  s += rc(handleX+2, handleY+2, handleW-4, handleH-4, { fill: '#D8D8D8', rx: 2 });
  s += ln(handleX+handleW/2, handleY+12, handleX+handleW/2, handleY+handleH-12, 2, '#A0A0A0');
  return grp(s);
}

function secretCladdedDoor(x, y, w, h, claddingType, handleSide) {
  // A door that blends into the cladding - just a faint outline
  let s = '';
  // Fill with cladding pattern (or neutral if not specified)
  s += rc(x, y, w, h, { fill: cladFill(claddingType || 'steel') });
  // Faint door outline - dashed to show it's a hidden door
  s += rc(x+10, y+10, w-20, h-20, { fill: 'none', sw: 3, stroke: '#555', 'stroke-dasharray': '15,8' });
  // Handle position based on handleSide
  const handleY = y + h * 0.45;
  const handleX = handleSide === 'left' ? x + 30 : x + w - 60;
  s += rc(handleX, handleY, 30, 80, { fill: '#444', sw: 1, stroke: '#333', rx: 4 });
  return grp(s);
}

// ── Windows ─────────────────────────────────────────────────

function windowFixed(x, y, w, h) {
  const t = Math.max(55, Math.min(85, w * 0.09));
  let s = frameProfile(x,y,w,h,t);
  s += glassFill(x+t, y+t, w-t*2, h-t*2);
  s += rc(x+t, y+t, w-t*2, h-t*2, { sw: 0.5, stroke: '#252A2E' });
  return grp(s);
}

function windowOpener(x, y, w, h) {
  const t = Math.max(55, Math.min(85, w * 0.09)); // Main frame thickness (capped so wide windows keep a slim frame)
  const tTop = Math.max(70, t * 1.3); // Thicker frame for top opener section
  const innerH = h - t - tTop; // Total inner height (bottom frame t, top frame tTop)
  const opH = innerH * 0.18; // Top opener is 18% of inner height (smaller)
  const transH = Math.max(20, t * 0.6); // Transom bar thickness
  
  let s = '';
  // Outer frame
  s += frameProfile(x, y, w, h, t);
  
  // Top opener section - with thicker frame
  const topInnerX = x + tTop;
  const topInnerY = y + tTop;
  const topInnerW = w - tTop * 2;
  s += glassFill(topInnerX, topInnerY, topInnerW, opH);
  // Inner frame around top opener glass
  s += rc(topInnerX, topInnerY, topInnerW, opH, { fill: 'none', sw: 2, stroke: '#252A2E' });
  
  // Transom bar between opener and main glass
  const ty = y + tTop + opH;
  s += rc(x + t - 4, ty, w - t * 2 + 8, transH, { fill: '#2A2E32' });
  s += rc(x + t - 2, ty + 2, w - t * 2 + 4, transH - 4, { fill: '#3D4347' });
  s += ln(x + t - 1, ty + 3, x + w - t + 1, ty + 3, 1, '#4E5458', { opacity: 0.3 });
  
  // Main glass below transom
  const mainGlassY = ty + transH;
  const mainGlassH = h - tTop - opH - transH - t;
  s += glassFill(x + t, mainGlassY, w - t * 2, mainGlassH);
  s += rc(x + t, mainGlassY, w - t * 2, mainGlassH, { fill: 'none', sw: 0.5, stroke: '#252A2E' });
  
  return grp(s);
}

function slotWindow(x, y, w, h) {
  const t = Math.max(45, w * 0.08);
  let s = frameProfile(x,y,w,h,t);
  s += glassFill(x+t, y+t, w-t*2, h-t*2);
  return grp(s);
}

// ── External Features ───────────────────────────────────────

function renderUpDownLight(x, y) {
  // Wall-mounted cylindrical up/down light - anthracite with warm light cones
  const w = 70, h = 180;
  const cx = x + w/2;
  const cy = y + h/2;
  const lightSpread = 120; // How far light spreads (reduced)
  const lightWidth = 100; // Width of light cone at furthest point (reduced)
  let s = '';
  
  // Light cone going UP (warm glow on wall)
  s += tag('path', {
    d: `M ${cx - 20} ${y} L ${cx - lightWidth/2} ${y - lightSpread} L ${cx + lightWidth/2} ${y - lightSpread} L ${cx + 20} ${y} Z`,
    fill: '#FFF3D4',
    opacity: 0.4
  });
  // Inner brighter cone up
  s += tag('path', {
    d: `M ${cx - 12} ${y} L ${cx - 50} ${y - lightSpread * 0.6} L ${cx + 50} ${y - lightSpread * 0.6} L ${cx + 12} ${y} Z`,
    fill: '#FFECB3',
    opacity: 0.5
  });
  
  // Light cone going DOWN (warm glow on wall)
  s += tag('path', {
    d: `M ${cx - 20} ${y + h} L ${cx - lightWidth/2} ${y + h + lightSpread} L ${cx + lightWidth/2} ${y + h + lightSpread} L ${cx + 20} ${y + h} Z`,
    fill: '#FFF3D4',
    opacity: 0.4
  });
  // Inner brighter cone down
  s += tag('path', {
    d: `M ${cx - 12} ${y + h} L ${cx - 50} ${y + h + lightSpread * 0.6} L ${cx + 50} ${y + h + lightSpread * 0.6} L ${cx + 12} ${y + h} Z`,
    fill: '#FFECB3',
    opacity: 0.5
  });
  
  // Cylindrical body (anthracite) - drawn as rounded rectangle
  s += rc(x, y, w, h, { fill: COL.anthracite, sw: 2, stroke: COL.anthraciteDk, rx: w/2 });
  
  // Subtle highlight on cylinder (3D effect)
  s += rc(x + w*0.15, y + 10, w*0.25, h - 20, { fill: COL.anthraciteLt, opacity: 0.3, rx: 8 });
  
  // Top lens (chrome/glass ring)
  s += tag('ellipse', { cx: cx, cy: y + 8, rx: w/2 - 5, ry: 8, fill: '#888', stroke: '#666', 'stroke-width': 1 });
  
  // Bottom lens (chrome/glass ring)
  s += tag('ellipse', { cx: cx, cy: y + h - 8, rx: w/2 - 5, ry: 8, fill: '#888', stroke: '#666', 'stroke-width': 1 });
  
  return s;
}

function renderExternalSocket(x, y) {
  // Weatherproof outdoor double socket box
  const w = 220, h = 150;
  let s = '';
  // Weatherproof box (grey)
  s += rc(x, y, w, h, { fill: '#D0D0D0', sw: 2, stroke: '#888', rx: 6 });
  // Outer rim (weatherproof seal)
  s += rc(x+10, y+10, w-20, h-20, { fill: '#C0C0C0', sw: 1.5, stroke: '#999', rx: 4 });
  // Two socket faces side by side
  const socketSize = 55;
  const gap = 16;
  const totalW = socketSize * 2 + gap;
  const startX = x + (w - totalW) / 2;
  const socketY = y + (h - socketSize) / 2;
  const pinW = 7, pinH = 16;
  for (let i = 0; i < 2; i++) {
    const sx = startX + i * (socketSize + gap);
    s += rc(sx, socketY, socketSize, socketSize, { fill: '#E8E8E8', sw: 1, stroke: '#777', rx: 2 });
    // UK 3-pin layout
    s += rc(sx+socketSize/2-pinW/2, socketY+8, pinW, pinH, { fill: '#555' }); // Earth (top)
    s += rc(sx+12, socketY+30, pinW, pinH, { fill: '#555' }); // Live (left)
    s += rc(sx+socketSize-12-pinW, socketY+30, pinW, pinH, { fill: '#555' }); // Neutral (right)
  }
  return s;
}

// ── Dispatcher ──────────────────────────────────────────────

function renderComp(type, x, y, w, h, compId, claddingType, handleSide) {
  let inner;
  if (type.includes('sliding')) inner = slidingDoor(x,y,w,h, handleSide);
  else if (type.includes('bifold-27')||type.includes('bifold-26')) inner = bifoldDoor(x,y,w,h,3);
  else if (type.includes('bifold-35')||type.includes('bifold-36')) inner = bifoldDoor(x,y,w,h,4);
  else if (type.includes('bifold-45')) inner = bifoldDoor(x,y,w,h,5);
  else if (type.includes('bifold')) inner = bifoldDoor(x,y,w,h,3);
  else if (type.includes('cladded')) inner = secretCladdedDoor(x,y,w,h, claddingType, handleSide);
  else if (type.includes('single')) inner = singleDoor(x,y,w,h, handleSide);
  else if (type.includes('slot')) inner = slotWindow(x,y,w,h);
  else if (type.includes('opener')) inner = windowOpener(x,y,w,h);
  else inner = windowFixed(x,y,w,h);
  
  if (TS > 1.4) inner = rc(x + 30 * TS, y + 30 * TS, w, h, { fill: 'black', opacity: 0.18 }) + inner; // drop shadow so small openings read on a big elevation
  // Wrap in group with data attributes for drag-drop
  if (compId) {
    return `<g class="component draggable" data-comp-id="${compId}" data-x="${x}" data-w="${w}" style="cursor:move">${inner}</g>`;
  }
  return inner;
}

function renderExternalFeature(type, x, y, featureId) {
  let inner;
  if (type === 'upDownLight') {
    inner = renderUpDownLight(x, y);
  } else if (type === 'socket') {
    inner = renderExternalSocket(x, y);
  } else {
    return '';
  }
  
  // Wrap in group with data attributes for drag-drop
  if (featureId) {
    return `<g class="external-feature draggable" data-feature-id="${featureId}" data-x="${x}" data-type="${type}" style="cursor:move">${inner}</g>`;
  }
  return inner;
}

// ── AC Unit (Plan View) ─────────────────────────────────────

function renderAcUnit(unit) {
  const baseW = unit.w || 800, baseH = unit.h || 400;
  const rotated = unit.rotated || false;
  const w = rotated ? baseH : baseW;
  const h = rotated ? baseW : baseH;
  const { x, y, type, id } = unit;
  const isInternal = type === 'internal';
  let s = '';

  // Background rectangle
  s += rc(x, y, w, h, { fill: isInternal ? '#D0D0D0' : '#A0A0A0', sw: 3, stroke: '#444', rx: 8 });

  if (isInternal) {
    // Internal unit: vent grille lines (always run along the longer axis)
    const lineGap = 40;
    if (w >= h) {
      for (let lx = x + 60; lx < x + w - 60; lx += lineGap) {
        s += ln(lx, y + 60, lx, y + h - 60, 2, '#888');
      }
    } else {
      for (let ly = y + 60; ly < y + h - 60; ly += lineGap) {
        s += ln(x + 60, ly, x + w - 60, ly, 2, '#888');
      }
    }
  } else {
    // External unit: fan circle
    const cx = x + w / 2, cy = y + h / 2;
    const r = Math.min(w, h) * 0.35;
    s += tag('circle', { cx, cy, r, fill: 'none', stroke: '#555', 'stroke-width': 3 });
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 4;
      s += ln(cx - r * 0.7 * Math.cos(angle), cy - r * 0.7 * Math.sin(angle),
              cx + r * 0.7 * Math.cos(angle), cy + r * 0.7 * Math.sin(angle), 2, '#555');
    }
  }

  // Label text below the unit
  const label = isInternal ? 'AC (Int)' : 'AC (Ext)';
  s += tx(x + w / 2, y + h + 130, label, 110, { color: '#333', bold: true });

  return `<g class="ac-unit draggable" data-ac-id="${id}" style="cursor:move">${s}</g>`;
}

// ── Drawing Label with Optional Arrow ────────────────────────

function renderDrawingLabel(label) {
  const { id, text, x, y, arrowEnabled, arrowX, arrowY } = label;
  let s = '';
  const fontSize = label.fontSize || 150;
  const color = label.color || '#000000';
  const padX = 60, padY = 30;
  const textW = text.length * fontSize * 0.55;
  const textH = fontSize + padY * 2;
  const boxX = x - textW / 2 - padX;
  const boxY = y - fontSize / 2 - padY;

  // Arrow line + arrowhead if enabled
  if (arrowEnabled && arrowX !== undefined && arrowY !== undefined) {
    const dx = arrowX - x, dy = arrowY - y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 10) {
      // Line from label centre to arrow tip
      s += ln(x, y, arrowX, arrowY, 3, color);
      // Arrowhead
      const headLen = 80, headW = 40;
      const ux = dx / len, uy = dy / len;
      const px = -uy, py = ux;
      const tipX = arrowX, tipY = arrowY;
      const baseX = tipX - ux * headLen, baseY = tipY - uy * headLen;
      s += tag('polygon', {
        points: `${tipX},${tipY} ${baseX + px * headW},${baseY + py * headW} ${baseX - px * headW},${baseY - py * headW}`,
        fill: color
      });
    }
    // Arrow tip drag handle (invisible hit circle)
    s += `<g class="label-arrow draggable" data-label-id="${id}" style="cursor:move">`;
    s += tag('circle', { cx: arrowX, cy: arrowY, r: 60, fill: color, opacity: 0.3 });
    s += tag('circle', { cx: arrowX, cy: arrowY, r: 20, fill: color });
    s += '</g>';
  }

  // Label text with background box
  s += `<g class="label-text draggable" data-label-id="${id}" style="cursor:move">`;
  s += rc(boxX, boxY, textW + padX * 2, textH, { fill: '#FFFFFF', sw: 2.5, stroke: color, rx: 6 });
  s += tx(x, y + fontSize * 0.35, text, fontSize, { color, bold: true });
  s += '</g>';

  return s;
}

function cladFill(t) {
  if (!t) return 'url(#steelClad)';
  // Cedar/timber types
  if (t==='western-red-cedar'||t==='cedar'||t==='diagonal') return 'url(#cedarClad)';
  // Composite types (latte is the light silver one)
  if (t==='composite-latte') return 'url(#compositeLatteClad)';
  if (t.startsWith('composite')||t==='horizontal') return 'url(#compositeClad)';
  // Steel types (anthracite, grey, etc.)
  return 'url(#steelClad)';
}

// ── Gutter ──────────────────────────────────────────────────

function gutterBar(x, y, w, opts) {
  const o = opts || {};
  let s = '';
  const gutterStroke = o.noStroke ? 0 : 1.2;
  s += rc(x, y, w, GUTTER_H, { fill: 'url(#gutterGrad)', sw: gutterStroke, stroke: gutterStroke ? COL.anthraciteDk : 'none' });
  if (!o.noStroke) s += ln(x, y, x+w, y, 0.8, COL.anthraciteLt, { opacity: 0.4 });
  const dpW = 18;
  if (o.dpLeft !== false) {
    const dpH = o.dpH || 200, dpX = x+20;
    s += rc(dpX, y+GUTTER_H, dpW, dpH, { fill: 'url(#gutterGrad)', sw: 0.8, stroke: COL.anthraciteDk });
    // Straight downpipe - no curved flick
  }
  if (o.dpRight !== false) {
    const dpH = o.dpH || 200, dpX = x+w-38;
    s += rc(dpX, y+GUTTER_H, dpW, dpH, { fill: 'url(#gutterGrad)', sw: 0.8, stroke: COL.anthraciteDk });
    // Straight downpipe - no curved flick
  }
  return s;
}

// ── Front Elevation ─────────────────────────────────────────

function renderFront(cfg) {
  const { width, height, overhang, components, claddingType, tier, cornerLeft, cornerRight, externalFeatures, hasCanopy, hasDecking } = cfg;
  const cid = 'fc'+Math.random().toString(36).substr(2,5);
  const wallTop = ROOF_ZONE;
  const wallH = height - wallTop;
  const isSig = tier === 'signature';
  const deckH = 100;
  const sideOverhang = 25; // 25mm fascia overhang on each side
  let s = '';
  s += `<defs><clipPath id="${cid}"><rect x="0" y="${wallTop}" width="${width}" height="${wallH}"/></clipPath></defs>`;
  s += renderRoofAbove(cfg.roofProfile, width, claddingType);
  
  // FASCIA - extends 25mm past each side, SEAMLESS (no stroke on inner edge)
  // Top trim (darkest)
  s += rc(-sideOverhang, 0, width + sideOverhang*2, TOP_TRIM, { fill: COL.anthraciteDk, sw: 0 });
  s += ln(-sideOverhang, TOP_TRIM, width + sideOverhang, TOP_TRIM, 1, COL.anthraciteLt, { opacity: 0.3 });
  // Main fascia
  s += rc(-sideOverhang, TOP_TRIM, width + sideOverhang*2, FASCIA_H, { fill: 'url(#fasciaGrad)' });
  // Bottom line of fascia - full width including overhangs
  s += ln(-sideOverhang, ROOF_ZONE, width + sideOverhang, ROOF_ZONE, 1.5, COL.anthraciteDk);
  // Outer border around ENTIRE fascia (including 25mm sides)
  s += rc(-sideOverhang, 0, width + sideOverhang*2, ROOF_ZONE, { sw: 3, stroke: '#222' });
  
  // Gutter - full width (no stroke to avoid visible lines at overhang)
  s += gutterBar(-sideOverhang, ROOF_ZONE, width + sideOverhang*2, { dpH: wallH * 0.12, noStroke: true });
  
  // 25mm side end caps - fill behind the gutter overhang with anthracite (fascia return)
  const gutterBottom = ROOF_ZONE + GUTTER_H;
  s += rc(-sideOverhang, gutterBottom, sideOverhang, wallH - GUTTER_H, { fill: COL.anthracite });
  s += rc(width, gutterBottom, sideOverhang, wallH - GUTTER_H, { fill: COL.anthracite });
  
  // Wall cladding (main building only)
  s += rc(0, wallTop, width, wallH, { fill: cladFill(claddingType), clip: `url(#${cid})` });
  s += rc(0, gutterBottom, width, 260 * TS, { fill: 'url(#shadowDown)', clip: `url(#${cid})` }); // shade under the fascia (scales with the sheet)
  // Building outline - walls only (not fascia area)
  s += ln(0, ROOF_ZONE, 0, height, 5, '#222'); // left wall
  s += ln(width, ROOF_ZONE, width, height, 5, '#222'); // right wall
  s += ln(0, height, width, height, 5, '#222'); // bottom
  for (const comp of components) {
    const cy = comp.y !== undefined ? comp.y : (height - comp.h);
    s += renderComp(comp.type, comp.x, cy, comp.w, comp.h, comp.id, claddingType, comp.handleSide);
  }
  for (const st of [].concat(cfg.stepAt || [])) if (st > 0 && st < width) s += ln(st, ROOF_ZONE, st, height, 5, '#222'); // wall steps back here (L-shaped plan)

  // Base trim at bottom of building - ALWAYS present on all tiers
  const trimH = deckH;
  s += rc(-sideOverhang - 200 * TS, height + trimH, width + sideOverhang * 2 + 400 * TS, 110 * TS, { fill: 'url(#groundShadow)' }); // ground shadow
  s += ln(-sideOverhang - 350 * TS, height + trimH, width + sideOverhang + 350 * TS, height + trimH, 3 * TS, '#444'); // ground line
  s += rc(-sideOverhang, height, width + sideOverhang*2, trimH, { fill: COL.anthracite });
  s += ln(-sideOverhang, height, width + sideOverhang, height, 1.5, COL.anthraciteDk);
  s += ln(-sideOverhang, height + trimH, width + sideOverhang, height + trimH, 1, COL.anthraciteDk);

  if (isSig) {
    // SIGNATURE: Corners at front
    s += rc(0, ROOF_ZONE, 180, wallH, { fill: COL.anthracite, sw: 0 });
    s += rc(width - 180, ROOF_ZONE, 180, wallH, { fill: COL.anthracite, sw: 0 });
    if (hasDecking !== false) {
      // Decking on front - drawn on top of base trim
      s += rc(-sideOverhang, height, width + sideOverhang*2, trimH, { fill: COL.decking });
      s += ln(-sideOverhang, height, width + sideOverhang, height, 1.5, COL.deckingLine);
      s += ln(-sideOverhang, height + trimH, width + sideOverhang, height + trimH, 1, COL.deckingLine);
    }
  } else {
    // CLASSIC: 150mm anthracite L-shape corner trims
    s += rc(0, ROOF_ZONE, 150, wallH, { fill: COL.anthracite, sw: 0 });
    s += rc(width - 150, ROOF_ZONE, 150, wallH, { fill: COL.anthracite, sw: 0 });
  }
  
  // External features (lights and sockets on front wall) - rendered LAST so they appear on top
  if (externalFeatures && externalFeatures.length > 0) {
    for (const feat of externalFeatures) {
      // Use custom Y position if provided, otherwise use defaults
      // Y is mm from ground, convert to drawing Y coordinate (from top)
      let featY;
      if (feat.y !== undefined && feat.y !== null && feat.y > 0) {
        featY = height - feat.y - (feat.type === 'upDownLight' ? 180 : 150); // Subtract feature height
      } else {
        // Defaults: lights near top, sockets near bottom
        featY = feat.type === 'upDownLight' ? (ROOF_ZONE + 250) : (height - 800);
      }
      s += renderExternalFeature(feat.type, feat.x, featY, feat.id);
    }
  }

  return s;
}

// ── Roof above the eaves (dual / mono pitch) ────────────────
// profile: { kind:'band', rise }                  roof plane seen face-on, sloping away to the ridge
//          { kind:'gable', rise, peakX }           gable end, ridge at peakX
//          { kind:'wedge', leftRise, rightRise }   mono-pitch gable (one end high)
// Drawn BEFORE the fascia so the fascia band sits over its foot. x runs 0..len.
function renderRoofAbove(profile, len, claddingType) {
  if (!profile || profile.kind === 'none') return '';
  const so = 25; let s = '';
  if (profile.kind === 'band') {
    const r = profile.rise;
    s += rc(-so, -r, len + so * 2, r, { fill: 'url(#roofPlane)' });
    s += ln(-so, -r, len + so, -r, 4, '#222'); // ridge / high edge
    s += ln(-so, -r, -so, 0, 2, '#222'); s += ln(len + so, -r, len + so, 0, 2, '#222');
    return s;
  }
  const lr = profile.kind === 'gable' ? 0 : profile.leftRise, rr = profile.kind === 'gable' ? 0 : profile.rightRise;
  const pts = profile.kind === 'gable' ? [[0, 0], [profile.peakX, -profile.rise], [len, 0]] : [[0, -lr], [len, -rr]];
  const poly = pts.map((p) => p.join(',')).join(' ') + ` ${len},${TOP_TRIM} 0,${TOP_TRIM}`;
  s += tag('polygon', { points: poly, fill: cladFill(claddingType || 'steel') });
  s += tag('polygon', { points: poly, fill: 'black', opacity: 0.06 }); // gable sits in the shade of the barge board
  // barge board following the slope (120mm deep) + thin top line
  const edge = pts.map((p) => p.join(',')).join(' ');
  s += tag('polyline', { points: edge, fill: 'none', stroke: '#2C2F32', 'stroke-width': 120, 'stroke-linejoin': 'miter', 'stroke-linecap': 'butt', transform: 'translate(0,60)' });
  s += tag('polyline', { points: edge, fill: 'none', stroke: '#222', 'stroke-width': 4, 'stroke-linejoin': 'miter' });
  return s;
}

// ── Side Elevation ──────────────────────────────────────────

function renderSide(cfg) {
  const { depth, height, components, side, tier, overhang, corner, claddingType, hasCanopy, hasDecking, deckingDepth, externalFeatures } = cfg;
  const cid = 'sc'+side+Math.random().toString(36).substr(2,5);
  const wallTop = ROOF_ZONE;
  const wallH = height - wallTop;
  const isSig = tier === 'signature';
  const deckH = 100;
  const sideOverhang = 25; // 25mm fascia overhang at rear (matches front elevation sides)
  const showCanopy = isSig && hasCanopy !== false;
  const showDecking = isSig && hasDecking !== false;
  const canopyProj = showCanopy && overhang > 0 ? overhang : 0;
  const deckingSideProj = showDecking ? (deckingDepth || 400) : 0;
  const frontProj = canopyProj > 0 ? canopyProj : 50; // fascia only extends for canopy, not decking
  const rearProj = sideOverhang; // 25mm rear overhang for seamless fascia wrap
  const frontRight = side === 'left';
  // Fascia extends from rear overhang to front overhang - SEAMLESS with front elevation
  const fasciaX = frontRight ? -rearProj : -frontProj;
  const fasciaW = depth + frontProj + rearProj;
  let s = '';
  // Clip for wall cladding (main building only, not the overhangs)
  s += `<defs><clipPath id="${cid}"><rect x="0" y="${wallTop}" width="${depth}" height="${wallH}"/></clipPath></defs>`;
  s += grp(renderRoofAbove(cfg.roofProfile, fasciaW - 50, claddingType), { transform: `translate(${fasciaX + 25},0)` });
  // FASCIA AND ROOF - continuous seamless piece including the 25mm end caps
  // Top trim (darkest)
  s += rc(fasciaX, 0, fasciaW, TOP_TRIM, { fill: COL.anthraciteDk });
  s += ln(fasciaX, TOP_TRIM, fasciaX+fasciaW, TOP_TRIM, 1, COL.anthraciteLt, { opacity: 0.3 });
  // Main fascia
  s += rc(fasciaX, TOP_TRIM, fasciaW, FASCIA_H, { fill: 'url(#fasciaGrad)' });
  s += ln(fasciaX, ROOF_ZONE, fasciaX+fasciaW, ROOF_ZONE, 1.5, COL.anthraciteDk);
  // Outer border - seamless box around entire fascia
  s += rc(fasciaX, 0, fasciaW, ROOF_ZONE, { sw: 3, stroke: '#222' });
  // Front gutter only (no rear gutter)
  s += gutterBar(0, ROOF_ZONE, depth, { dpRight: false, dpLeft: false, dpH: wallH*0.12 });
  // Wall cladding
  s += rc(0, wallTop, depth, wallH, { fill: cladFill(claddingType || 'steel'), clip: `url(#${cid})` });
  s += rc(0, ROOF_ZONE + GUTTER_H, depth, 260 * TS, { fill: 'url(#shadowDown)', clip: `url(#${cid})` }); // shade under the fascia
  s += rc(fasciaX - 200 * TS, height + deckH, fasciaW + 400 * TS, 110 * TS, { fill: 'url(#groundShadow)' }); // ground shadow
  s += ln(fasciaX - 350 * TS, height + deckH, fasciaX + fasciaW + 350 * TS, height + deckH, 3 * TS, '#444'); // ground line
  
  // Wall outline - but skip the front edge line if closed corner (it continues into screen)
  const hasClosedCorner = isSig && frontProj > 50 && corner === 'closed';
  if (frontRight) {
    // Left side view: front is at x=depth, rear is at x=0
    s += ln(0, ROOF_ZONE, 0, height, 4, '#222'); // rear edge (always draw)
    s += ln(0, height, depth, height, 4, '#222'); // bottom (always draw)
    if (!hasClosedCorner) {
      s += ln(depth, height, depth, ROOF_ZONE, 4, '#222'); // front edge (skip if closed corner)
    }
  } else {
    // Right side view: front is at x=0, rear is at x=depth
    if (!hasClosedCorner) {
      s += ln(0, ROOF_ZONE, 0, height, 4, '#222'); // front edge (skip if closed corner)
    }
    s += ln(0, height, depth, height, 4, '#222'); // bottom (always draw)
    s += ln(depth, height, depth, ROOF_ZONE, 4, '#222'); // rear edge (always draw)
  }
  
  for (const comp of (components || [])) {
    const cy = comp.y !== undefined ? comp.y : (height - comp.h);
    s += renderComp(comp.type, comp.x, cy, comp.w, comp.h, comp.id, claddingType, comp.handleSide);
  }
  for (const st of [].concat(cfg.stepAt || [])) if (st > 0 && st < depth) s += ln(st, ROOF_ZONE, st, height, 5, '#222') + rc(st, ROOF_ZONE + GUTTER_H, side === 'left' ? -1 : 1, 0, {}); // wall steps back here (L-shaped plan)
  const trimH = deckH;

  if (isSig && (canopyProj > 0 || deckingSideProj > 0)) {
    // SIGNATURE with canopy and/or decking
    const canopyStart = frontRight ? depth : -canopyProj;
    const canopyEnd = frontRight ? depth + canopyProj : 0;
    const bldgEdge = frontRight ? depth : 0;

    // Base trim on main building only (not projections)
    s += rc(0, height, depth, trimH, { fill: COL.anthracite });
    s += ln(0, height, depth, height, 1.5, COL.anthraciteDk);
    s += ln(0, height + trimH, depth, height + trimH, 1, COL.anthraciteDk);

    // Canopy screen walls (closed corners)
    if (canopyProj > 0 && corner === 'closed') {
      const scCid = 'ssc'+Math.random().toString(36).substr(2,5);
      const feStart = canopyStart;
      const feEnd = canopyEnd;
      // Overlap the main wall by 12mm so the two clipped fills meet with no hairline (Liam 19 Sep 2026)
      const ovStart = frontRight ? feStart - 12 : feStart, ovW = canopyProj + 12;
      s += `<defs><clipPath id="${scCid}"><rect x="${ovStart}" y="${wallTop}" width="${ovW}" height="${wallH}"/></clipPath></defs>`;
      s += rc(ovStart, wallTop, ovW, wallH, { fill: cladFill(claddingType || 'steel'), clip: `url(#${scCid})`, sw: 0 });
      s += ln(feEnd, ROOF_ZONE, feEnd, height, 3, '#222');
      s += ln(feStart, height, feEnd, height, 3, '#222');
      const uX = frontRight ? feEnd - 180 : feStart;
      s += rc(uX, ROOF_ZONE, 180, wallH, { fill: COL.anthracite, sw: 0 });
    } else if (canopyProj > 0) {
      // Open corner with canopy
      const trimX = frontRight ? bldgEdge - 180 : bldgEdge;
      s += rc(trimX, ROOF_ZONE, 180, wallH, { fill: COL.anthracite, sw: 0 });
    }

    // Decking - independent of canopy, uses its own depth
    if (showDecking && deckingSideProj > 0) {
      const deckStartX = frontRight ? depth : -deckingSideProj;
      const deckEndX = frontRight ? depth + deckingSideProj : 0;
      const deckFullX = frontRight ? -rearProj : -deckingSideProj;
      const deckFullW = depth + deckingSideProj + rearProj;
      if (corner === 'closed') {
        // Decking covers full width including building + decking projection
        s += rc(deckFullX, height, deckFullW, trimH, { fill: COL.decking });
        s += ln(deckFullX, height + trimH, deckFullX + deckFullW, height + trimH, 1, COL.deckingLine);
      } else {
        // Decking only on the projection area in front of building
        s += rc(deckStartX, height, deckingSideProj, trimH, { fill: COL.decking });
        s += ln(deckEndX, height, deckEndX, height + trimH, 1, COL.deckingLine);
      }
    }

    // Canopy dimension at the top (near fascia)
    if (canopyProj > 0) {
      const x1 = frontRight ? depth : -canopyProj;
      const x2 = frontRight ? depth + canopyProj : 0;
      const rp = cfg.roofProfile; const roofTop = rp ? (rp.kind === 'wedge' ? Math.max(rp.leftRise || 0, rp.rightRise || 0) : rp.rise || 0) : 0;
      s += dimH_comp(x1, x2, -15 - roofTop, `Canopy ${canopyProj}mm`, -90);
    }
    // Decking dimension at the bottom (below base trim)
    if (showDecking && deckingSideProj > 0) {
      const x1 = frontRight ? depth : -deckingSideProj;
      const x2 = frontRight ? depth + deckingSideProj : 0;
      s += dimH_comp(x1, x2, height + trimH + 15, `Decking ${deckingSideProj}mm`, 60);
    }
  } else {
    // Classic or Signature without canopy - base trim full fascia width
    s += rc(fasciaX, height, fasciaW, trimH, { fill: COL.anthracite });
    s += ln(fasciaX, height, fasciaX + fasciaW, height, 1.5, COL.anthraciteDk);
    s += ln(fasciaX, height + trimH, fasciaX + fasciaW, height + trimH, 1, COL.anthraciteDk);

    if (!isSig) {
      // CLASSIC: 150mm anthracite L-shape corner trims at front and rear edges
      s += rc(0, ROOF_ZONE, 150, wallH, { fill: COL.anthracite, sw: 0 });
      s += rc(depth - 150, ROOF_ZONE, 150, wallH, { fill: COL.anthracite, sw: 0 });
    }
  }

  // External features (lights and sockets on side wall)
  if (externalFeatures && externalFeatures.length > 0) {
    for (const feat of externalFeatures) {
      let featY;
      if (feat.y !== undefined && feat.y !== null && feat.y > 0) {
        featY = height - feat.y - (feat.type === 'upDownLight' ? 180 : 150);
      } else {
        featY = feat.type === 'upDownLight' ? (ROOF_ZONE + 250) : (height - 800);
      }
      s += renderExternalFeature(feat.type, feat.x, featY, feat.id);
    }
  }

  return s;
}

// ── Partition Room (for Plan View) ──────────────────────────

// Draw a door with swing arc - architectural plan style
// Shows: white opening in wall, door leaf perpendicular to wall, 90° arc
function drawDoor(x, y, width, wallThickness, direction, swingDir, flipped) {
  // direction: 'horizontal' or 'vertical' (which way the wall runs)
  // swingDir: 'left', 'right', 'up', 'down' (which way door swings into)
  // flipped: if true, hinge moves to the opposite end of the opening
  let s = '';
  const doorW = width;
  const arcR = doorW * 0.95;

  if (direction === 'horizontal') {
    // Door in a horizontal wall (wall runs left-right)
    s += rc(x, y, doorW, wallThickness, { fill: COL.white });

    if (swingDir === 'down') {
      if (!flipped) {
        // Hinge at left, swings down
        const hx = x, hy = y + wallThickness;
        s += ln(hx, hy, hx, hy + arcR, 3, '#222');
        s += tag('path', { d: `M ${hx + arcR} ${hy} A ${arcR} ${arcR} 0 0 1 ${hx} ${hy + arcR}`, fill: 'none', stroke: '#222', 'stroke-width': 2 });
      } else {
        // Hinge at right, swings down
        const hx = x + doorW, hy = y + wallThickness;
        s += ln(hx, hy, hx, hy + arcR, 3, '#222');
        s += tag('path', { d: `M ${hx - arcR} ${hy} A ${arcR} ${arcR} 0 0 0 ${hx} ${hy + arcR}`, fill: 'none', stroke: '#222', 'stroke-width': 2 });
      }
    } else {
      if (!flipped) {
        // Hinge at left, swings up
        const hx = x, hy = y;
        s += ln(hx, hy, hx, hy - arcR, 3, '#222');
        s += tag('path', { d: `M ${hx + arcR} ${hy} A ${arcR} ${arcR} 0 0 0 ${hx} ${hy - arcR}`, fill: 'none', stroke: '#222', 'stroke-width': 2 });
      } else {
        // Hinge at right, swings up
        const hx = x + doorW, hy = y;
        s += ln(hx, hy, hx, hy - arcR, 3, '#222');
        s += tag('path', { d: `M ${hx - arcR} ${hy} A ${arcR} ${arcR} 0 0 1 ${hx} ${hy - arcR}`, fill: 'none', stroke: '#222', 'stroke-width': 2 });
      }
    }
  } else {
    // Door in a vertical wall (wall runs up-down)
    s += rc(x, y, wallThickness, doorW, { fill: COL.white });

    if (swingDir === 'right') {
      if (!flipped) {
        // Hinge at top, swings right
        const hx = x + wallThickness, hy = y;
        s += ln(hx, hy, hx + arcR, hy, 3, '#222');
        s += tag('path', { d: `M ${hx} ${hy + arcR} A ${arcR} ${arcR} 0 0 0 ${hx + arcR} ${hy}`, fill: 'none', stroke: '#222', 'stroke-width': 2 });
      } else {
        // Hinge at bottom, swings right
        const hx = x + wallThickness, hy = y + doorW;
        s += ln(hx, hy, hx + arcR, hy, 3, '#222');
        s += tag('path', { d: `M ${hx} ${hy - arcR} A ${arcR} ${arcR} 0 0 1 ${hx + arcR} ${hy}`, fill: 'none', stroke: '#222', 'stroke-width': 2 });
      }
    } else {
      if (!flipped) {
        // Hinge at top, swings left
        const hx = x, hy = y;
        s += ln(hx, hy, hx - arcR, hy, 3, '#222');
        s += tag('path', { d: `M ${hx} ${hy + arcR} A ${arcR} ${arcR} 0 0 1 ${hx - arcR} ${hy}`, fill: 'none', stroke: '#222', 'stroke-width': 2 });
      } else {
        // Hinge at bottom, swings left
        const hx = x, hy = y + doorW;
        s += ln(hx, hy, hx - arcR, hy, 3, '#222');
        s += tag('path', { d: `M ${hx} ${hy - arcR} A ${arcR} ${arcR} 0 0 0 ${hx - arcR} ${hy}`, fill: 'none', stroke: '#222', 'stroke-width': 2 });
      }
    }
  }
  return s;
}

// Straight partition wall (back to front)
function renderStraightPartition(sp, buildingWidth, buildingDepth, wt) {
  if (!sp || !sp.enabled) return '';
  
  const partWt = 150; // Same as external walls
  const pos = sp.position || buildingWidth / 2;
  const doorW = 720;
  let s = '';
  
  // Wall from back to front (inside the building)
  const wallX = pos - partWt / 2;
  const wallY = wt;
  const wallH = buildingDepth - wt * 2;
  
  s += rc(wallX, wallY, partWt, wallH, { fill: COL.wallFill, sw: 2, stroke: '#444' });
  
  // Door if enabled
  if (sp.hasDoor) {
    const doorPos = sp.doorPosition || 0.5;
    const doorY = wallY + (wallH - doorW) * doorPos;
    const swingDir = sp.doorDirection === 'left' ? 'left' : 'right';
    s += drawDoor(wallX, doorY, doorW, partWt, 'vertical', swingDir, sp.doorFlipped);
  }
  
  // Labels for each room
  const leftLabelX = wt + (pos - partWt/2 - wt) / 2;
  const rightLabelX = pos + partWt/2 + (buildingWidth - wt - pos - partWt/2) / 2;
  const labelY = buildingDepth / 2 + 40;
  
  if (sp.leftLabel) {
    s += tx(leftLabelX, labelY, sp.leftLabel, 180, { color: '#444', bold: true });
  }
  if (sp.rightLabel) {
    s += tx(rightLabelX, labelY, sp.rightLabel, 180, { color: '#444', bold: true });
  }
  
  return s;
}

// Internal walls drawn on the plan (any number). Each wall: { dir:'v'|'h', x, y, len, label, doors:[{pos 0..1, w, swing:'a'|'b', flipped}], loadBearing }
// x,y = start of the wall centreline in building coordinates (mm, rear-left origin). 'v' runs front-to-back from (x,y); 'h' runs left-to-right.
function renderPartitions(parts, buildingWidth, buildingDepth, wt, ui) {
  let s = '';
  const partWt = 150;
  const sel = (ui && ui.selection) || null;
  const HIT = 120; // extra hit padding so thin walls are easy to grab
  for (const p of (parts || [])) {
    if (!p || !(p.len > 0)) continue;
    const doorW = 826;
    const isSel = sel && sel.type === 'wall' && sel.id === p.id;
    const fill = p.glazed ? '#d6f0f7' : p.loadBearing ? '#b8c4d6' : COL.wallFill, stroke = isSel ? '#0f766e' : (p.glazed ? '#2a8fb0' : p.loadBearing ? '#1f3b63' : '#444'), sw = isSel ? 6 : 2;
    if (p.dir === 'h') {
      const x = Math.max(wt, Math.min(p.x, buildingWidth - wt)), y = Math.max(wt, Math.min(p.y, buildingDepth - wt));
      const len = Math.min(p.len, buildingWidth - wt - x);
      let g = rc(x, y - partWt / 2 - HIT, len, partWt + HIT * 2, { fill: 'transparent' });
      g += rc(x, y - partWt / 2, len, partWt, { fill, sw, stroke });
      (p.doors || []).forEach((dr, di) => {
        const dx = x + Math.max(30, Math.min((len - doorW) * (dr.pos ?? 0.5), len - doorW - 30));
        const dsel = sel && sel.type === 'door' && sel.id === p.id && sel.j === di;
        g += tag('g', { class: 'plan-door' + (dsel ? ' selected' : ''), 'data-pw-id': p.id, 'data-door': di, style: 'cursor:ew-resize' },
          rc(dx, y - partWt / 2 - HIT, doorW, partWt + HIT * 2, { fill: 'transparent' }) + drawDoor(dx, y - partWt / 2, doorW, partWt, 'horizontal', dr.swing === 'b' ? 'up' : 'down', !!dr.flipped) + (dsel ? rc(dx, y - partWt / 2, doorW, partWt, { fill: 'none', sw: 6, stroke: '#0f766e' }) : ''));
      });
      g += tag('circle', { class: 'pw-handle', 'data-pw-id': p.id, 'data-end': 'a', cx: x, cy: y, r: 110 });
      g += tag('circle', { class: 'pw-handle', 'data-pw-id': p.id, 'data-end': 'b', cx: x + len, cy: y, r: 110 });
      if (p.label) g += tx(x + len / 2, y - partWt / 2 - 60, p.label, 110, { color: '#555' });
      s += tag('g', { class: 'plan-wall' + (isSel ? ' selected' : ''), 'data-pw-id': p.id, 'data-dir': 'h', style: 'cursor:move' }, g);
    } else {
      const x = Math.max(wt, Math.min(p.x, buildingWidth - wt)), y = Math.max(wt, Math.min(p.y, buildingDepth - wt));
      const len = Math.min(p.len, buildingDepth - wt - y);
      let g = rc(x - partWt / 2 - HIT, y, partWt + HIT * 2, len, { fill: 'transparent' });
      g += rc(x - partWt / 2, y, partWt, len, { fill, sw, stroke });
      (p.doors || []).forEach((dr, di) => {
        const dy = y + Math.max(30, Math.min((len - doorW) * (dr.pos ?? 0.5), len - doorW - 30));
        const dsel = sel && sel.type === 'door' && sel.id === p.id && sel.j === di;
        g += tag('g', { class: 'plan-door' + (dsel ? ' selected' : ''), 'data-pw-id': p.id, 'data-door': di, style: 'cursor:ns-resize' },
          rc(x - partWt / 2 - HIT, dy, partWt + HIT * 2, doorW, { fill: 'transparent' }) + drawDoor(x - partWt / 2, dy, doorW, partWt, 'vertical', dr.swing === 'b' ? 'left' : 'right', !!dr.flipped) + (dsel ? rc(x - partWt / 2, dy, partWt, doorW, { fill: 'none', sw: 6, stroke: '#0f766e' }) : ''));
      });
      g += tag('circle', { class: 'pw-handle', 'data-pw-id': p.id, 'data-end': 'a', cx: x, cy: y, r: 110 });
      g += tag('circle', { class: 'pw-handle', 'data-pw-id': p.id, 'data-end': 'b', cx: x, cy: y + len, r: 110 });
      if (p.label) g += tx(x + partWt / 2 + 60, y + len / 2, p.label, 110, { color: '#555', anchor: 'start' });
      s += tag('g', { class: 'plan-wall' + (isSel ? ' selected' : ''), 'data-pw-id': p.id, 'data-dir': 'v', style: 'cursor:move' }, g);
    }
  }
  return s;
}
// Free room labels for multi-room layouts: [{ text, x, y }]
function renderRoomLabels(labels, ui) {
  let s = '';
  const sel = (ui && ui.selection) || null;
  for (const l of (labels || [])) {
    if (!l || !l.text) continue;
    const isSel = sel && sel.type === 'label' && sel.id === l.id;
    const sub = { wc: 'WC', shower: 'Shower room', kitchenette: 'Kitchenette', meeting: 'Meeting room', reception: 'Reception', store: 'Store', corridor: 'Corridor' }[l.kind] || '';
    const showSub = sub && l.text.toLowerCase().indexOf(sub.toLowerCase().split(' ')[0]) < 0;
    const LS = Math.min(TS, 1.3) / TS; // room labels grow less than the rest of the text on big plans (rooms stay small)
    const w = Math.max(600, Math.max(l.text.length, showSub ? sub.length * 0.7 : 0) * 120 * TS * LS), h = (showSub ? 420 : 260) * TS * LS;
    const tint = { wc: '#dbeafe', shower: '#dbeafe', kitchenette: '#fef3c7' }[l.kind];
    s += tag('g', { class: 'plan-room-label' + (isSel ? ' selected' : ''), 'data-rl-id': l.id, style: 'cursor:move' },
      rc(l.x - w / 2, l.y - h * 0.6, w, h, { fill: tint || '#ffffff', rx: 60, opacity: tint ? 1 : 0.85 }) + (isSel ? rc(l.x - w / 2, l.y - h * 0.6, w, h, { fill: 'none', sw: 4, stroke: '#0f766e' }) : '') + tx(l.x, l.y, l.text, 200 * LS, { color: '#444', bold: true }) + (showSub ? tx(l.x, l.y + 150 * TS * LS, sub, 120 * LS, { color: '#666' }) : ''));
  }
  return s;
}


// ── Site layer: things around the building, not priced ───────────────────────
// kinds: image (background map), building, parking, path, fence, tree, text, north
export function siteBounds(objs, img) {
  let minX = 0, minY = 0, maxX = 0, maxY = 0, any = false;
  const add = (x, y) => { if (!Number.isFinite(x) || !Number.isFinite(y)) return; any = true; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  if (img && img.w > 0) { add(img.x, img.y); add(img.x + img.w, img.y + img.h); }
  for (const o of (objs || [])) {
    if (!o || isFurniture(o)) continue;
    if (o.kind === 'building' || o.kind === 'parking' || o.kind === 'area' || o.kind === 'overlay') { const r = Math.max(o.w, o.h); add(o.x - (o.rot ? r : 0), o.y - (o.rot ? r : 0)); add(o.x + o.w + (o.rot ? r : 0), o.y + o.h + (o.rot ? r : 0)); }
    else if (o.kind === 'tree') { add(o.x - o.r, o.y - o.r); add(o.x + o.r, o.y + o.r); }
    else if (o.kind === 'path' || o.kind === 'fence') { // exact extent of each segment (square ends): widen across the segment only, not along it
      const hw = Math.max(300, (o.width || 0) / 2 + 100); const pts = o.pts || [];
      if (pts.length === 1) { add(pts[0].x - hw, pts[0].y - hw); add(pts[0].x + hw, pts[0].y + hw); }
      for (let i = 0; i + 1 < pts.length; i++) { const p = pts[i], q = pts[i + 1]; const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1; const nx = -dy / len * hw, ny = dx / len * hw; for (const [x, y] of [[p.x + nx, p.y + ny], [p.x - nx, p.y - ny], [q.x + nx, q.y + ny], [q.x - nx, q.y - ny]]) add(x, y); }
    }
    else if (o.kind === 'text' || o.kind === 'north') { add(o.x - 1200, o.y - 600); add(o.x + 1200, o.y + 600); }
  }
  return { minX, minY, maxX, maxY, any };
}
function renderSiteImage(img) {
  if (!img || !img.dataUrl || !(img.w > 0)) return '';
  return tag('g', { class: 'site-image' }, tag('image', { href: img.dataUrl, x: img.x, y: img.y, width: img.w, height: img.h, opacity: img.opacity ?? 0.6, preserveAspectRatio: 'none' }));
}
const FURNITURE_KINDS = ['desk', 'chair', 'sofa', 'table', 'kitchen', 'wc', 'basin', 'reception-desk'];
export const isFurniture = (o) => !!o && FURNITURE_KINDS.includes(o.kind);
function renderFurniture(objs, ui) {
  let s = '';
  const sel = (ui && ui.selection) || null;
  const LN = '#5b6470', FILL = '#ffffff';
  for (const o of (objs || [])) {
    if (!isFurniture(o) || !o.id) continue;
    const isSel = sel && sel.type === 'site' && sel.id === o.id;
    const stroke = isSel ? '#0f766e' : LN, sw = isSel ? 8 : 4;
    const w = o.w || 1600, h = o.h || 800; const cx = o.x + w / 2, cy = o.y + h / 2;
    let g = `<g transform="rotate(${o.rot || 0} ${cx} ${cy})">`;
    if (o.kind === 'desk') { // desk with a chair on the long side facing the room
      g += rc(o.x, o.y, w, h, { fill: FILL, sw, stroke });
      g += ln(o.x + 120, o.y + h - 60, o.x + w - 120, o.y + h - 60, 2, stroke); // desk edge
      g += tag('rect', { x: cx - 260, y: o.y + h + 80, width: 520, height: 480, rx: 150, fill: FILL, stroke, 'stroke-width': sw }); // seat
      g += tag('path', { d: `M ${cx - 300} ${o.y + h + 500} Q ${cx} ${o.y + h + 700} ${cx + 300} ${o.y + h + 500}`, fill: 'none', stroke, 'stroke-width': sw }); // back rest
    } else if (o.kind === 'chair') {
      g += tag('rect', { x: o.x, y: o.y, width: w, height: h, rx: 120, fill: FILL, stroke, 'stroke-width': sw });
      g += tag('rect', { x: o.x - 50, y: o.y + h - 110, width: w + 100, height: 110, rx: 50, fill: FILL, stroke, 'stroke-width': sw });
    } else if (o.kind === 'sofa') {
      g += tag('rect', { x: o.x, y: o.y, width: w, height: h, rx: 140, fill: FILL, stroke, 'stroke-width': sw });
      g += tag('rect', { x: o.x, y: o.y, width: w, height: 220, rx: 100, fill: '#eef0f3', stroke, 'stroke-width': sw }); // back
      g += ln(cx, o.y + 220, cx, o.y + h, 3, stroke); // two seats
    } else if (o.kind === 'table') { // meeting table with chairs all round (seats = o.seats || 8)
      g += tag('rect', { x: o.x, y: o.y, width: w, height: h, rx: 120, fill: FILL, stroke, 'stroke-width': sw });
      const seats = o.seats || 8, perSide = Math.max(1, Math.floor((seats - 2) / 2));
      for (let i = 0; i < perSide; i++) { const sx = o.x + (w / (perSide + 1)) * (i + 1); for (const side of [-1, 1]) g += tag('rect', { x: sx - 230, y: side < 0 ? o.y - 560 : o.y + h + 80, width: 460, height: 480, rx: 120, fill: FILL, stroke, 'stroke-width': sw }); }
      for (const side of [-1, 1]) g += tag('rect', { x: side < 0 ? o.x - 560 : o.x + w + 80, y: cy - 230, width: 480, height: 460, rx: 120, fill: FILL, stroke, 'stroke-width': sw });
    } else if (o.kind === 'kitchen') { // run of units (600 deep) with a sink
      g += rc(o.x, o.y, w, h, { fill: '#f3f0ea', sw, stroke });
      for (let ux = o.x + 600; ux < o.x + w - 10; ux += 600) g += ln(ux, o.y, ux, o.y + h, 2, '#9aa0a8'); // 600mm unit modules
      g += ln(o.x, o.y + h - 60, o.x + w, o.y + h - 60, 2, stroke);
      if (!o.plain) { // a second run of units carries no sink or hob
      g += tag('rect', { x: o.x + w * 0.25, y: o.y + 90, width: 500, height: h - 180, rx: 60, fill: FILL, stroke, 'stroke-width': 3 });
      g += tag('circle', { cx: o.x + w * 0.25 + 250, cy: o.y + 60, r: 40, fill: stroke });
      g += tag('rect', { x: o.x + w * 0.65, y: o.y + 90, width: 580, height: h - 180, fill: 'none', stroke, 'stroke-width': 3 });
      for (const [dx, dy] of [[150, 150], [430, 150], [150, 410], [430, 410]]) g += tag('circle', { cx: o.x + w * 0.65 + dx, cy: o.y + dy, r: 70, fill: 'none', stroke, 'stroke-width': 3 }); // hob rings
      }
    } else if (o.kind === 'wc') { // pan + cistern, facing away from the wall it backs onto
      g += rc(o.x, o.y, w, 180, { fill: '#eef0f3', sw: 3, stroke }); // cistern
      g += tag('ellipse', { cx: cx, cy: o.y + 180 + (h - 180) / 2 + 40, rx: w * 0.42, ry: (h - 180) / 2, fill: FILL, stroke, 'stroke-width': sw });
    } else if (o.kind === 'basin') {
      g += tag('rect', { x: o.x, y: o.y, width: w, height: h, rx: 80, fill: FILL, stroke, 'stroke-width': sw });
      g += tag('ellipse', { cx, cy: cy + 20, rx: w * 0.32, ry: h * 0.3, fill: 'none', stroke, 'stroke-width': 3 });
    } else if (o.kind === 'reception-desk') { // counter with a chair behind
      g += rc(o.x, o.y, w, h, { fill: '#f3f0ea', sw, stroke });
      g += ln(o.x, o.y + 120, o.x + w, o.y + 120, 2, stroke);
      g += tag('rect', { x: cx - 250, y: o.y + h + 60, width: 500, height: 450, rx: 120, fill: FILL, stroke, 'stroke-width': sw });
    }
    if (o.label) g += tx(cx, o.y + h + 650 * Math.min(TS, 1.3) * 0.5, o.label, 90 * Math.min(TS, 1.3) / TS, { color: '#667' });
    g += '</g>';
    g += tag('circle', { class: 'site-handle', 'data-so-id': o.id, cx: o.x + w, cy: o.y + h, r: 110 });
    s += tag('g', { class: 'site-obj furniture' + (isSel ? ' selected' : ''), 'data-so-id': o.id, 'data-kind': o.kind, style: 'cursor:move' }, g);
  }
  return s;
}
function renderOverlays(objs, ui) {
  let s = ''; const sel = (ui && ui.selection) || null; const LS = Math.min(TS, 1.3) / TS;
  for (const o of (objs || [])) {
    if (!o || o.kind !== 'overlay' || !o.id) continue;
    const isSel = sel && sel.type === 'site' && sel.id === o.id;
    const w = o.w || 1000, h = o.h || 1000; const cx = o.x + w / 2, cy = o.y + h / 2;
    let g = `<g transform="rotate(${o.rot || 0} ${cx} ${cy})">`;
    g += tag('rect', { x: o.x, y: o.y, width: w, height: h, fill: 'url(#overlayHatch)', stroke: 'none' });
    g += tag('rect', { x: o.x, y: o.y, width: w, height: h, fill: 'none', stroke: isSel ? '#0f766e' : '#b45309', 'stroke-width': isSel ? 70 : 50, 'stroke-dasharray': '320,160', 'stroke-linejoin': 'round' });
    if (o.label) { const fs = 150 * TS * LS; const tw = o.label.length * fs * 0.56 + 300; g += tag('rect', { x: cx - tw / 2, y: cy - fs * 0.8, width: tw, height: fs * 1.5, rx: 80, fill: '#ffffff', opacity: 0.9 }) + tx(cx, cy + fs * 0.3, o.label, 150 * LS, { color: '#92400e', bold: true, italic: true }); }
    g += '</g>';
    g += tag('circle', { class: 'site-handle', 'data-so-id': o.id, cx: o.x + w, cy: o.y + h, r: 110 });
    s += tag('g', { class: 'site-obj overlay' + (isSel ? ' selected' : ''), 'data-so-id': o.id, 'data-kind': o.kind, style: 'cursor:move' }, g);
  }
  return s;
}
function renderSiteObjects(objs, ui, opts) {
  let s = '';
  const sel = (ui && ui.selection) || null;
  const big = opts && opts.big; // site-plan sheet: heavier text
  const fs = big ? 260 : 150;
  for (const o of (objs || [])) {
    if (!o || !o.id || isFurniture(o) || o.kind === 'overlay') continue;
    const isSel = sel && sel.type === 'site' && sel.id === o.id;
    const hl = isSel ? { stroke: '#0f766e', sw: 6 } : null;
    let g = '';
    const cx = (o.x || 0) + (o.w || 0) / 2, cy = (o.y || 0) + (o.h || 0) / 2;
    const rot = o.rot ? ` transform="rotate(${o.rot} ${cx} ${cy})"` : '';
    if (o.kind === 'building') {
      g += `<g${rot}>` + rc(o.x, o.y, o.w, o.h, { fill: '#e6e6e6', sw: hl ? 6 : 3, stroke: hl ? hl.stroke : '#666' })
        + tag('line', { x1: o.x, y1: o.y, x2: o.x + o.w, y2: o.y + o.h, stroke: '#bbb', 'stroke-width': 2 }) + tag('line', { x1: o.x + o.w, y1: o.y, x2: o.x, y2: o.y + o.h, stroke: '#bbb', 'stroke-width': 2 })
        + tx(cx, cy + fs * 0.35, o.label || 'Existing building', fs, { color: '#555' }) + '</g>';
      g += tag('circle', { class: 'site-handle', 'data-so-id': o.id, cx: o.x + o.w, cy: o.y + o.h, r: 110 });
    } else if (o.kind === 'parking') {
      const along = o.w >= o.h ? 'w' : 'h'; const bayW = 2500; const n = Math.max(1, Math.round((along === 'w' ? o.w : o.h) / bayW));
      g += `<g${rot}>` + rc(o.x, o.y, o.w, o.h, { fill: '#f1f1f1', sw: hl ? 6 : 2, stroke: hl ? hl.stroke : '#777' });
      for (let i = 1; i < n; i++) g += along === 'w' ? ln(o.x + (o.w / n) * i, o.y, o.x + (o.w / n) * i, o.y + o.h, 2, '#888') : ln(o.x, o.y + (o.h / n) * i, o.x + o.w, o.y + (o.h / n) * i, 2, '#888');
      g += tx(cx, cy + fs * 0.35, o.label || `Parking (${n} bays)`, fs * 0.9, { color: '#555' }) + '</g>';
      g += tag('circle', { class: 'site-handle', 'data-so-id': o.id, cx: o.x + o.w, cy: o.y + o.h, r: 110 });
    } else if (o.kind === 'path' || o.kind === 'fence') {
      const pts = (o.pts || []).map((p) => `${p.x},${p.y}`).join(' ');
      if (o.kind === 'path') { const road = (o.width || 1200) > 2500; g += tag('polyline', { points: pts, fill: 'none', stroke: hl ? hl.stroke : (road ? '#e4e4e4' : '#ddd8cd'), 'stroke-width': o.width || 1200, 'stroke-linejoin': 'round', 'stroke-linecap': 'butt', opacity: 0.9 }); /* square ends (Liam 21 Oct 2026) */ if (road) g += tag('polyline', { points: pts, fill: 'none', stroke: '#ffffff', 'stroke-width': 60, 'stroke-dasharray': '600,400' }); }
      else g += tag('polyline', { points: pts, fill: 'none', stroke: 'transparent', 'stroke-width': 500 }) + tag('polyline', { points: pts, fill: 'none', stroke: hl ? hl.stroke : '#6b4f2a', 'stroke-width': hl ? 60 : 40, 'stroke-dasharray': '300,150' });
      (o.pts || []).forEach((p, pi) => { g += tag('circle', { class: 'site-pt', 'data-so-id': o.id, 'data-i': pi, cx: p.x, cy: p.y, r: 90 }); });
      const pts0 = o.pts || []; const first = pts0[0], second = pts0[1];
      if (first && o.label) { const vert = second && Math.abs(second.y - first.y) > Math.abs(second.x - first.x); const mx = second ? (first.x + second.x) / 2 : first.x, my = second ? (first.y + second.y) / 2 : first.y - 200; g += tx(mx, my, o.label, fs * 0.9, { color: '#555', transform: vert ? `rotate(-90 ${mx} ${my})` : undefined }); }
    } else if (o.kind === 'tree') {
      g += tag('circle', { cx: o.x, cy: o.y, r: o.r || 1500, fill: '#cfe3cf', stroke: hl ? hl.stroke : '#5f8f5f', 'stroke-width': hl ? 6 : 3 }) + tag('circle', { cx: o.x, cy: o.y, r: 150, fill: '#6b4f2a' });
      if (o.label) g += tx(o.x, o.y + (o.r || 1500) + fs, o.label, fs * 0.9, { color: '#4f6f4f' });
      g += tag('circle', { class: 'site-handle', 'data-so-id': o.id, cx: o.x + (o.r || 1500), cy: o.y, r: 110 });
    } else if (o.kind === 'area') {
      g += `<g${rot}>` + tag('rect', { x: o.x, y: o.y, width: o.w, height: o.h, fill: '#eef3f7', stroke: hl ? hl.stroke : '#5b7a99', 'stroke-width': hl ? 6 : 3, 'stroke-dasharray': '220,120', opacity: 0.9 })
        + tx(cx, cy + fs * 0.35, o.label || 'Area', fs * 0.9, { color: '#4a6684', italic: true }) + '</g>';
      g += tag('circle', { class: 'site-handle', 'data-so-id': o.id, cx: o.x + o.w, cy: o.y + o.h, r: 110 });
    } else if (o.kind === 'text') {
      g += rc(o.x - 1200, o.y - fs, 2400, fs * 1.6, { fill: 'transparent' }) + tx(o.x, o.y, o.label || 'Text', fs, { color: hl ? hl.stroke : '#333', bold: true });
    } else if (o.kind === 'north') {
      const r = 600;
      g += `<g transform="rotate(${o.rot || 0} ${o.x} ${o.y})">` + tag('circle', { cx: o.x, cy: o.y, r, fill: 'white', stroke: '#333', 'stroke-width': 3 })
        + tag('polygon', { points: `${o.x},${o.y - r * 0.85} ${o.x - r * 0.3},${o.y + r * 0.3} ${o.x},${o.y} ${o.x + r * 0.3},${o.y + r * 0.3}`, fill: '#333' }) + tx(o.x, o.y + r * 0.8, 'N', r * 0.5, { bold: true }) + '</g>';
    }
    s += tag('g', { class: 'site-obj' + (isSel ? ' selected' : ''), 'data-so-id': o.id, 'data-kind': o.kind, style: 'cursor:move' }, g);
  }
  return s;
}

// Corner partition room
function renderPartitionRoom(pr, buildingWidth, buildingDepth, wt) {
  if (!pr || !pr.enabled) return '';
  
  const roomW = pr.width;
  const roomD = pr.depth;
  const doorW = 720;
  const partWt = 150; // Same thickness as external walls
  const doorPos = pr.doorPosition || 0.5;
  const doorWall = pr.doorWall || 'horizontal';
  const doorDir = pr.doorDirection || 'outward';
  let s = '';
  
  // Calculate room and wall positions based on corner
  let rx, ry; // Room interior top-left
  let hWallX, hWallY, hWallLen; // Horizontal wall
  let vWallX, vWallY, vWallLen; // Vertical wall
  let hDoorSwing, vDoorSwing; // Door swing directions
  
  switch (pr.corner) {
    case 'rear-left':
      rx = wt; ry = wt;
      vWallX = wt + roomW; vWallY = wt; vWallLen = roomD + partWt;
      hWallX = wt; hWallY = wt + roomD; hWallLen = roomW + partWt;
      hDoorSwing = doorDir === 'outward' ? 'down' : 'up';
      vDoorSwing = doorDir === 'outward' ? 'right' : 'left';
      break;
    case 'rear-right':
      rx = buildingWidth - wt - roomW; ry = wt;
      vWallX = buildingWidth - wt - roomW - partWt; vWallY = wt; vWallLen = roomD + partWt;
      hWallX = buildingWidth - wt - roomW - partWt; hWallY = wt + roomD; hWallLen = roomW + partWt;
      hDoorSwing = doorDir === 'outward' ? 'down' : 'up';
      vDoorSwing = doorDir === 'outward' ? 'left' : 'right';
      break;
    case 'front-left':
      rx = wt; ry = buildingDepth - wt - roomD;
      vWallX = wt + roomW; vWallY = buildingDepth - wt - roomD - partWt; vWallLen = roomD + partWt;
      hWallX = wt; hWallY = buildingDepth - wt - roomD - partWt; hWallLen = roomW + partWt;
      hDoorSwing = doorDir === 'outward' ? 'up' : 'down';
      vDoorSwing = doorDir === 'outward' ? 'right' : 'left';
      break;
    case 'front-right':
      rx = buildingWidth - wt - roomW; ry = buildingDepth - wt - roomD;
      vWallX = buildingWidth - wt - roomW - partWt; vWallY = buildingDepth - wt - roomD - partWt; vWallLen = roomD + partWt;
      hWallX = buildingWidth - wt - roomW - partWt; hWallY = buildingDepth - wt - roomD - partWt; hWallLen = roomW + partWt;
      hDoorSwing = doorDir === 'outward' ? 'up' : 'down';
      vDoorSwing = doorDir === 'outward' ? 'left' : 'right';
      break;
    default:
      return '';
  }
  
  // Draw walls
  s += rc(vWallX, vWallY, partWt, vWallLen, { fill: COL.wallFill, sw: 2, stroke: '#444' });
  s += rc(hWallX, hWallY, hWallLen, partWt, { fill: COL.wallFill, sw: 2, stroke: '#444' });
  
  // Draw door on selected wall
  if (doorWall === 'horizontal') {
    const doorOffset = (hWallLen - partWt - doorW) * doorPos;
    const doorX = hWallX + Math.max(30, Math.min(doorOffset, hWallLen - partWt - doorW - 30));
    s += drawDoor(doorX, hWallY, doorW, partWt, 'horizontal', hDoorSwing, pr.doorFlipped);
  } else {
    const doorOffset = (vWallLen - partWt - doorW) * doorPos;
    const doorY = vWallY + Math.max(30, Math.min(doorOffset, vWallLen - partWt - doorW - 30));
    s += drawDoor(vWallX, doorY, doorW, partWt, 'vertical', vDoorSwing, pr.doorFlipped);
  }
  
  // Room label
  const labelX = rx + roomW / 2 + (pr.labelOffsetX || 0);
  const labelY = ry + roomD / 2 + 50 + (pr.labelOffsetY || 0);
  s += tx(labelX, labelY, pr.label || 'Room', 180, { color: '#444', bold: true });

  // Dimension labels for partition room (internal dimensions)
  const intColor = '#2288CC';
  const dimOff = 200;
  const wLabel = `${roomW}mm`;
  const dLabel = `${roomD}mm`;

  switch (pr.corner) {
    case 'rear-left':
      // Width dim along bottom partition wall, offset up into room
      s += dimH_comp(rx, rx + roomW, ry + roomD, wLabel, -dimOff, intColor);
      // Depth dim along right partition wall, offset left into room
      s += dimV_comp(ry, ry + roomD, rx + roomW, dLabel, -dimOff, intColor);
      break;
    case 'rear-right':
      // Width dim along bottom partition wall, offset up into room
      s += dimH_comp(rx, rx + roomW, ry + roomD, wLabel, -dimOff, intColor);
      // Depth dim along left partition wall, offset right into room
      s += dimV_comp(ry, ry + roomD, rx, dLabel, dimOff, intColor);
      break;
    case 'front-left':
      // Width dim along top partition wall, offset down into room
      s += dimH_comp(rx, rx + roomW, ry, wLabel, dimOff, intColor);
      // Depth dim along right partition wall, offset left into room
      s += dimV_comp(ry, ry + roomD, rx + roomW, dLabel, -dimOff, intColor);
      break;
    case 'front-right':
      // Width dim along top partition wall, offset down into room
      s += dimH_comp(rx, rx + roomW, ry, wLabel, dimOff, intColor);
      // Depth dim along left partition wall, offset right into room
      s += dimV_comp(ry, ry + roomD, rx, dLabel, dimOff, intColor);
      break;
  }

  return s;
}

// ── Plan View ───────────────────────────────────────────────

/** Outer wall band + inner floor for a rectangle, or an L-shape when the rear-right corner is notched away. */
function buildingOutline(width, depth, wt, notch) {
  if (!notch || !(notch.w > 0) || !(notch.len > 0)) return rc(0, 0, width, depth, { fill: 'url(#wallHatch)', sw: 6, stroke: '#222' }) + rc(wt, wt, width-wt*2, depth-wt*2, { fill: COL.white, sw: 3, stroke: '#333' });
  const nx = width - notch.w, ny = notch.len, pod = notch.pod;
  // pod = a small infill (e.g. a WC block) in the inside corner of the L: x from nx to nx+pod.w, y from ny-pod.len to ny
  const outer = pod
    ? `0,0 ${nx},0 ${nx},${ny - pod.len} ${nx + pod.w},${ny - pod.len} ${nx + pod.w},${ny} ${width},${ny} ${width},${depth} 0,${depth}`
    : `0,0 ${nx},0 ${nx},${ny} ${width},${ny} ${width},${depth} 0,${depth}`;
  const inner = pod
    ? `${wt},${wt} ${nx - wt},${wt} ${nx - wt},${ny - pod.len + wt} ${nx + pod.w - wt},${ny - pod.len + wt} ${nx + pod.w - wt},${ny + wt} ${width - wt},${ny + wt} ${width - wt},${depth - wt} ${wt},${depth - wt}`
    : `${wt},${wt} ${nx - wt},${wt} ${nx - wt},${ny + wt} ${width - wt},${ny + wt} ${width - wt},${depth - wt} ${wt},${depth - wt}`;
  return tag('polygon', { points: outer, fill: 'url(#wallHatch)', stroke: '#222', 'stroke-width': 6, 'stroke-linejoin': 'miter' }) + tag('polygon', { points: inner, fill: COL.white, stroke: '#333', 'stroke-width': 3, 'stroke-linejoin': 'miter' });
}
function renderPlan(cfg) {
  const { width, depth, wallThickness, overhang, tier, components, rooms, cornerLeft, cornerRight, hasCanopy, hasDecking, deckingDepth } = cfg;
  const wt = wallThickness || 150;
  const isSig = tier === 'signature';
  const showCanopy = isSig && hasCanopy !== false;
  const showDecking = isSig && hasDecking !== false;
  const canopyProj = overhang || 400;
  const deckProj = deckingDepth || 400;
  let s = '';
  // Site layer under everything: background map image, then the objects around the building
  s += renderSiteImage(cfg.siteImage);
  s += renderSiteObjects(cfg.siteObjects, cfg.ui);

  // For Classic: depth includes canopy area, so internal floor is larger (no external canopy projection)
  // For Signature: depth is building only, canopy projects in front, decking may extend further

  // Render decking that extends beyond canopy
  if (showDecking && deckProj > 0) {
    const deckStart = showCanopy && overhang > 0 ? canopyProj : 0;
    const deckVisible = deckProj - deckStart;
    if (deckVisible > 0) {
      s += rc(0, depth + deckStart, width, deckVisible, { fill: COL.wallFill, sw: 2, stroke: '#999' });
      // Decking plank lines
      const plankW = 130;
      for (let px = 0; px < width; px += plankW) {
        s += ln(px, depth + deckStart, px, depth + deckProj, 1, '#B0B0B0');
      }
    }
  }

  if (showCanopy && overhang > 0) {
    // SIGNATURE: Show canopy as external projection - always solid white
    s += rc(0, depth, width, canopyProj, { fill: COL.white, sw: 4, stroke: '#222' });
    if (cornerLeft === 'closed') {
      s += rc(0, depth, wt, canopyProj, { fill: COL.wallFill, sw: 3, stroke: '#222' });
    }
    if (cornerRight === 'closed') {
      s += rc(width-wt, depth, wt, canopyProj, { fill: COL.wallFill, sw: 3, stroke: '#222' });
    }
    // Dashed line to indicate canopy projection above
    s += tag('rect', { x: 0, y: depth, width: width, height: canopyProj,
      fill: 'none', stroke: '#888', 'stroke-width': 1, 'stroke-dasharray': '15,10' });

    // Spotlights in canopy - 1 per metre of width, rounded down
    const numSpotlights = Math.floor(width / 1000);
    if (numSpotlights > 0) {
      const spotSpacing = width / (numSpotlights + 1);
      const spotY = depth + canopyProj / 2;
      for (let i = 1; i <= numSpotlights; i++) {
        const spotX = spotSpacing * i;
        s += tag('circle', { cx: spotX, cy: spotY, r: 42, fill: '#D0D0D0', stroke: '#555', 'stroke-width': 2.5 });
        s += tag('circle', { cx: spotX, cy: spotY, r: 24, fill: '#FFFDE8', stroke: '#999', 'stroke-width': 1.5 });
      }
    }
    // Main building outline
    s += buildingOutline(width, depth, wt, cfg.notch);
  } else if (!isSig && overhang > 0) {
    // CLASSIC with overhang: depth includes canopy, so internal floor is full depth
    // No external canopy projection - it's part of the stated depth
    s += buildingOutline(width, depth, wt, cfg.notch);
  } else {
    // No overhang - just the building
    s += buildingOutline(width, depth, wt, cfg.notch);
  }
  const hitPad = 80; // extra padding for click targets on thin wall elements
  const showCompDims = (components || []).length <= 8; // many windows (offices): the per-opening labels only clutter the plan
  for (const c of (components || [])) {
    const dimLabel = `${c.w}mm (w) x ${c.h || ''}mm (h)`;
    const dimFontSize = 100;
    const dimColor = '#444';
    const dimOff = 200; // offset from wall for label

    if (c.wall === 'front') {
      const fy = depth - wt;
      s += `<g class="plan-component" data-comp-id="${c.id}" data-elevation="front" style="cursor:grab">`;
      s += rc(c.x, fy - hitPad, c.w, wt + hitPad * 2, { fill: 'transparent' });
      s += rc(c.x, fy, c.w, wt, { fill: COL.white });
      if (c.type.includes('sliding')||c.type.includes('bifold')) {
        s += ln(c.x, fy+wt*0.3, c.x+c.w, fy+wt*0.3, 2.5, COL.anthracite);
        s += ln(c.x, fy+wt*0.7, c.x+c.w, fy+wt*0.7, 2.5, COL.anthracite);
        s += ln(c.x+c.w/2, fy+wt*0.15, c.x+c.w/2, fy+wt*0.85, 1.5, COL.anthraciteLt);
      } else {
        s += ln(c.x, fy+wt*0.3, c.x+c.w, fy+wt*0.3, 1.5, COL.anthracite);
        s += ln(c.x, fy+wt*0.7, c.x+c.w, fy+wt*0.7, 1.5, COL.anthracite);
      }
      s += '</g>';
      // Dimension label inside building (above front wall inner edge)
      if (showCompDims) s += dimH_comp(c.x, c.x + c.w, depth - wt, dimLabel, -dimOff);
    } else if (c.wall === 'left') {
      s += `<g class="plan-component" data-comp-id="${c.id}" data-elevation="left" style="cursor:grab">`;
      s += rc(-hitPad, c.x, wt + hitPad * 2, c.w, { fill: 'transparent' });
      s += rc(0, c.x, wt, c.w, { fill: COL.white });
      s += ln(wt*0.3, c.x, wt*0.3, c.x+c.w, 1.5, COL.anthracite);
      s += ln(wt*0.7, c.x, wt*0.7, c.x+c.w, 1.5, COL.anthracite);
      s += '</g>';
      // Dimension label inside building (right of left wall inner edge)
      if (showCompDims) s += dimV_comp(c.x, c.x + c.w, wt, dimLabel, dimOff);
    } else if (c.wall === 'right') {
      const nt = cfg.notch, pd = nt && nt.pod;
      const rx = !nt || c.x >= nt.len ? 0 : (pd && c.x >= nt.len - pd.len) ? -(nt.w - pd.w) : -nt.w; // wing / pod right wall is set in by the notch (L-shaped plan)
      s += `<g class="plan-component" data-comp-id="${c.id}" data-elevation="right" style="cursor:grab" transform="translate(${rx},0)">`;
      s += rc(width - wt - hitPad, c.x, wt + hitPad * 2, c.w, { fill: 'transparent' });
      s += rc(width-wt, c.x, wt, c.w, { fill: COL.white });
      s += ln(width-wt*0.3, c.x, width-wt*0.3, c.x+c.w, 1.5, COL.anthracite);
      s += ln(width-wt*0.7, c.x, width-wt*0.7, c.x+c.w, 1.5, COL.anthracite);
      s += '</g>';
      // Dimension label inside building (left of right wall inner edge)
      if (showCompDims) s += dimV_comp(c.x, c.x + c.w, width + rx - wt, dimLabel, -dimOff);
    } else if (c.wall === 'rear') {
      const nt = cfg.notch, pd = nt && nt.pod;
      const ry = !nt || c.x < width - nt.w ? 0 : (pd && c.x < width - nt.w + pd.w) ? nt.len - pd.len : nt.len; // main-block / pod rear wall is set back by the notch
      s += `<g class="plan-component" data-comp-id="${c.id}" data-elevation="rear" style="cursor:grab" transform="translate(0,${ry})">`;
      s += rc(c.x, -hitPad, c.w, wt + hitPad * 2, { fill: 'transparent' });
      s += rc(c.x, 0, c.w, wt, { fill: COL.white });
      if (c.type.includes('sliding')||c.type.includes('bifold')) {
        s += ln(c.x, wt*0.3, c.x+c.w, wt*0.3, 2.5, COL.anthracite);
        s += ln(c.x, wt*0.7, c.x+c.w, wt*0.7, 2.5, COL.anthracite);
        s += ln(c.x+c.w/2, wt*0.15, c.x+c.w/2, wt*0.85, 1.5, COL.anthraciteLt);
      } else {
        s += ln(c.x, wt*0.3, c.x+c.w, wt*0.3, 1.5, COL.anthracite);
        s += ln(c.x, wt*0.7, c.x+c.w, wt*0.7, 1.5, COL.anthracite);
      }
      s += '</g>';
      // Dimension label inside building (below rear wall inner edge)
      if (showCompDims) s += dimH_comp(c.x, c.x + c.w, wt, dimLabel, dimOff);
    }
  }
  if (rooms && rooms.length > 1) {
    let acc = 0;
    for (let i=0; i<rooms.length-1; i++) {
      acc += rooms[i].width;
      s += rc(acc, wt, wt, depth-wt*2, { fill: COL.wallFill, sw: 2, stroke: '#555' });
      const dY = depth*0.45, dW = 800;
      s += rc(acc, dY, wt, dW, { fill: COL.white });
      s += tag('path',{d:`M ${acc+wt} ${dY} A ${dW} ${dW} 0 0 1 ${acc+wt+dW*0.71} ${dY+dW*0.71}`,fill:'none',stroke:'#888','stroke-width':1,'stroke-dasharray':'10,6'});
    }
  }
  if (rooms) {
    let acc = 0;
    for (const r of rooms) {
      const offsetX = r.labelOffsetX || 0;
      const offsetY = r.labelOffsetY || 0;
      s += tx(acc + r.width/2 + offsetX, depth/2 + 40 + offsetY, r.label, 200, { color: '#444', bold: true });
      acc += r.width + wt;
    }
  }
  
  // Render straight partition (back to front wall)
  if (cfg.straightPartition && cfg.straightPartition.enabled) {
    s += renderStraightPartition(cfg.straightPartition, width, depth, wt);
  }

  // Render corner partition room
  if (cfg.partitionRoom && cfg.partitionRoom.enabled) {
    s += renderPartitionRoom(cfg.partitionRoom, width, depth, wt);
  }
  // Internal walls + free room labels (multi-room / commercial layouts)
  s += tag('rect', { class: 'plan-floor', x: wt, y: wt, width: width - wt * 2, height: depth - wt * 2, fill: 'transparent' });
  s += renderFurniture(cfg.siteObjects, cfg.ui); // desks, sofas, kitchen, sanitaryware (drawn inside the rooms)
  s += renderRoomLabels(cfg.roomLabels, cfg.ui); // labels over the furniture (white backing), under the walls so doors stay clickable
  s += renderPartitions(cfg.partitions, width, depth, wt, cfg.ui);
  s += renderOverlays(cfg.siteObjects, cfg.ui); // existing-building footprints etc., sketched over the plan

  // Internal dimensions (left off multi-room plans: the room sizes go in the specification instead - Liam 21 Oct 2026)
  const intColor = '#2288CC';
  const multiRoom = Array.isArray(cfg.partitions) && cfg.partitions.length > 0;
  // External depth EXCLUDES the canopy (Liam 2026-09-05), so the internal
  // depth is simply the building depth less two walls - no canopy deduction.
  const intDepthMeasure = depth - wt * 2;
  const intDepthLine = depth - wt * 2; // line spans full building interior
  const intDimW = cfg.intDimWidthOffset || depth * 0.15;
  const intDimD = cfg.intDimDepthOffset || width * 0.15;
  const sp = cfg.straightPartition;
  if (multiRoom) {
    // no internal dimension lines on a multi-room plan
  } else if (rooms && rooms.length > 1) {
    // Multiple rooms (left/right partition via rooms)
    let acc = 0;
    for (let i = 0; i < rooms.length; i++) {
      const intW = rooms[i].width - (i === 0 ? wt : 0) - (i === rooms.length - 1 ? wt : 0);
      const x1 = (i === 0 ? wt : acc + wt);
      const x2 = x1 + intW;
      s += dimH_comp(x1, x2, wt, `${Math.round(intW)}mm`, intDimW, intColor);
      acc += rooms[i].width + wt;
    }
    // Internal depth (same for all rooms)
    s += dimV_comp(wt, wt + intDepthLine, wt, `${Math.round(intDepthMeasure)}mm`, intDimD, intColor);
  } else if (sp && sp.enabled) {
    // Straight partition (back to front)
    const partWt = 150;
    const pos = sp.position || width / 2;
    const leftIntW = pos - partWt / 2 - wt;
    const rightIntW = width - pos - partWt / 2 - wt;
    // Left room width
    s += dimH_comp(wt, pos - partWt / 2, wt, `${Math.round(leftIntW)}mm`, intDimW, intColor);
    // Right room width
    s += dimH_comp(pos + partWt / 2, width - wt, wt, `${Math.round(rightIntW)}mm`, intDimW, intColor);
    // Internal depth
    s += dimV_comp(wt, wt + intDepthLine, wt, `${Math.round(intDepthMeasure)}mm`, intDimD, intColor);
  } else {
    // No partition - single room
    const intW = width - wt * 2;
    s += dimH_comp(wt, wt + intW, wt, `${Math.round(intW)}mm`, intDimW, intColor);
    s += dimV_comp(wt, wt + intDepthLine, wt, `${Math.round(intDepthMeasure)}mm`, intDimD, intColor);
  }

  // Render boundary lines if enabled
  if (cfg.boundaries && cfg.boundaries.show) {
    s += renderBoundaries(cfg.boundaries, width, depth, isSig ? Math.max(showCanopy ? canopyProj : 0, showDecking ? deckProj : 0) : 0);
  }

  if (cfg.notch && cfg.notch.w > 0) {
    const nx = width - cfg.notch.w, ny = cfg.notch.len;
    s += dimH_comp(0, nx, 0, `${nx}mm`, -260);                       // wing width, above its rear wall
    const pd = cfg.notch.pod;
    if (pd) {
      s += dimH_comp(nx, nx + pd.w, ny - pd.len, `${pd.w}mm x ${pd.len}mm`, -260); // pod size on one dim above its rear wall (a vertical dim's extension line poked out of the corner, Liam 22 Oct 2026)
      s += dimH_comp(nx + pd.w, width, ny, `${cfg.notch.w - pd.w}mm`, -260); // set-back rear wall beyond the pod
    } else s += dimH_comp(nx, width, ny, `${cfg.notch.w}mm`, -260);   // set-back rear wall
    s += dimV_comp(0, ny, width, `${ny}mm`, 260);                    // notch depth, outside the right-hand line
  }
  // Pitched roof: ridge line (dashed) and fall arrows on the plan
  if (cfg.roof && cfg.roof.type !== 'flat') {
    const r = cfg.roof; const dash = { fill: 'none', stroke: '#1f3b63', 'stroke-width': 6, 'stroke-dasharray': '220,120' };
    const arrow = (x1, y1, x2, y2) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 180; return ln(x1, y1, x2, y2, 5, '#1f3b63') + tag('polygon', { points: `${x2},${y2} ${x2 - h * Math.cos(a - 0.45)},${y2 - h * Math.sin(a - 0.45)} ${x2 - h * Math.cos(a + 0.45)},${y2 - h * Math.sin(a + 0.45)}`, fill: '#1f3b63' }); };
    const lbl = (x, y, t, rot) => tx(x, y, t, 110, { color: '#1f3b63', bold: true, transform: rot ? `rotate(${rot} ${x} ${y})` : undefined });
    if (r.type === 'dual' && r.ridge === 'y') { // ridge front-to-back, falls to both sides
      s += tag('line', { x1: width / 2, y1: wt, x2: width / 2, y2: depth - wt, ...dash });
      s += lbl(width / 2, wt + 300, 'RIDGE', 0);
      s += arrow(width / 2 - 300, depth * 0.93, width * 0.12, depth * 0.93) + arrow(width / 2 + 300, depth * 0.93, width * 0.88, depth * 0.93);
      s += lbl(width * 0.3, depth * 0.93 - 120, 'FALL', 0) + lbl(width * 0.7, depth * 0.93 - 120, 'FALL', 0);
    } else if (r.type === 'dual') { // ridge left-to-right, falls front and rear
      s += tag('line', { x1: wt, y1: depth / 2, x2: width - wt, y2: depth / 2, ...dash });
      s += lbl(width * 0.08 + 300, depth / 2 - 100, 'RIDGE', 0);
      s += arrow(width * 0.72, depth / 2 - 300, width * 0.72, depth * 0.12) + arrow(width * 0.72, depth / 2 + 300, width * 0.72, depth * 0.88);
      s += lbl(width * 0.72 + 160, depth * 0.3, 'FALL', 90) + lbl(width * 0.72 + 160, depth * 0.7, 'FALL', 90);
    } else { // mono: one arrow from the high side to the low side
      const hs = r.highSide || 'rear';
      const from = { rear: [width * 0.72, wt + 400], front: [width * 0.72, depth - wt - 400], left: [wt + 400, depth * 0.72], right: [width - wt - 400, depth * 0.72] }[hs];
      const to = { rear: [width * 0.72, depth - wt - 400], front: [width * 0.72, wt + 400], left: [width - wt - 400, depth * 0.72], right: [wt + 400, depth * 0.72] }[hs];
      s += arrow(from[0], from[1], to[0], to[1]);
      s += lbl((from[0] + to[0]) / 2 + (hs === 'left' || hs === 'right' ? 0 : 200), (from[1] + to[1]) / 2 + (hs === 'left' || hs === 'right' ? -140 : 0), `FALL ${r.rise}mm`, hs === 'left' || hs === 'right' ? 0 : 90);
    }
  }

  // Render AC units
  if (cfg.acUnits && cfg.acUnits.length > 0) {
    for (const unit of cfg.acUnits) {
      s += renderAcUnit(unit);
    }
  }

  // Corner labels (open/closed) - outside building, near front/decking edge
  if (!(showCanopy && overhang > 0)) return s; // no canopy: open/closed corner labels are meaningless
  const cornerFontSize = 100;
  const cornerColor = '#555';
  const leftCornerLabel = (cornerLeft === 'closed') ? 'CLOSED CORNER' : 'OPEN CORNER';
  const rightCornerLabel = (cornerRight === 'closed') ? 'CLOSED CORNER' : 'OPEN CORNER';
  const cLabelY = depth - 150; // near front edge, close to decking
  // Left: just outside the left wall
  s += `<text x="${-60}" y="${cLabelY}" font-family="Arial, sans-serif" font-size="${cornerFontSize}" fill="${cornerColor}" font-weight="bold" text-anchor="middle" transform="rotate(-90 ${-60} ${cLabelY})">${leftCornerLabel}</text>`;
  // Right: just outside the right wall
  s += `<text x="${width + 60}" y="${cLabelY}" font-family="Arial, sans-serif" font-size="${cornerFontSize}" fill="${cornerColor}" font-weight="bold" text-anchor="middle" transform="rotate(90 ${width + 60} ${cLabelY})">${rightCornerLabel}</text>`;

  return s;
}

// ── Boundary Lines ───────────────────────────────────────────

function renderBoundaries(boundaries, buildingWidth, buildingDepth, canopyProj) {
  const { left, right, rear } = boundaries;
  let s = '';
  
  const dashStyle = { 
    fill: 'none', 
    stroke: '#555', 
    'stroke-width': 3.5, 
    'stroke-dasharray': '20,12' 
  };
  
  const frontY = buildingDepth + canopyProj; // Front line of building (including canopy)
  const rearY = rear ? -rear : 0; // Rear boundary Y position
  
  // Left boundary - extends from rear boundary to front of building
  if (left && left > 0) {
    const lx = -left;
    const startY = rear ? rearY : 0; // Start from rear boundary if exists, else building rear
    s += tag('line', { x1: lx, y1: startY, x2: lx, y2: frontY, ...dashStyle });
    // "Approximate boundary" label at top
    s += tx(lx, startY - 60, 'Approximate boundary', 110, { color: '#555', anchor: 'middle', bold: true });
    // Distance label - just below the front edge, clear of the vertical depth
    // dimension that runs down the side of the building (was at mid-depth and
    // sat on top of it - Liam 19 Sep 2026)
    const midY = frontY + 260;
    s += tx(lx / 2, midY, `${left}mm`, 120, { color: '#333', anchor: 'middle', bold: true });
    // Dimension lines
    s += ln(lx + 30, midY - 80, -30, midY - 80, 2, '#777');
    s += ln(lx, midY - 95, lx, midY - 65, 2, '#777');
    s += ln(0, midY - 95, 0, midY - 65, 2, '#777');
  }
  
  // Right boundary - extends from rear boundary to front of building
  if (right && right > 0) {
    const rx = buildingWidth + right;
    const startY = rear ? rearY : 0; // Start from rear boundary if exists, else building rear
    s += tag('line', { x1: rx, y1: startY, x2: rx, y2: frontY, ...dashStyle });
    // "Approximate boundary" label at top
    s += tx(rx, startY - 60, 'Approximate boundary', 110, { color: '#555', anchor: 'middle', bold: true });
    // Distance label (below the front edge, see the left boundary note)
    const midY = frontY + 260;
    s += tx(buildingWidth + right / 2, midY, `${right}mm`, 120, { color: '#333', anchor: 'middle', bold: true });
    // Dimension lines
    s += ln(buildingWidth + 30, midY - 80, rx - 30, midY - 80, 2, '#777');
    s += ln(buildingWidth, midY - 95, buildingWidth, midY - 65, 2, '#777');
    s += ln(rx, midY - 95, rx, midY - 65, 2, '#777');
  }
  
  // Rear boundary - horizontal line across the back
  if (rear && rear > 0) {
    const ry = -rear;
    // Horizontal line from left boundary to right boundary (continuous)
    const lineLeft = left ? -left : 0;
    const lineRight = right ? buildingWidth + right : buildingWidth;
    s += tag('line', { x1: lineLeft, y1: ry, x2: lineRight, y2: ry, ...dashStyle });
    // "Approximate boundary" label - only show if no side boundaries (otherwise it's redundant)
    if (!left && !right) {
      s += tx(buildingWidth / 2, ry - 60, 'Approximate boundary', 110, { color: '#555', anchor: 'middle', bold: true });
    }
    // Distance label
    const midX = buildingWidth / 2;
    s += tx(midX + 200, ry / 2, `${rear}mm`, 120, { color: '#333', anchor: 'middle', bold: true });
    // Dimension lines (vertical)
    s += ln(midX + 140, ry + 30, midX + 140, -30, 2, '#777');
    s += ln(midX + 125, ry, midX + 155, ry, 2, '#777');
    s += ln(midX + 125, 0, midX + 155, 0, 2, '#777');
  }
  
  return s;
}

// ── Title Block (Template-based) ─────────────────────────────────────────────

// Title block template - loaded once
let titleBlockTemplate = null;

function loadTitleBlockTemplate() {
  // This will be populated by the app on load
  return titleBlockTemplate;
}

function renderTitle(cfg) {
  const { title, customer, address, date, spec, w, h } = cfg;
  
  // Use embedded SVG template with placeholders replaced
  // Template is 800x500, scale to fit w x h
  const scaleX = w / 800;
  const scaleY = h / 500;
  const scale = Math.min(scaleX, scaleY);
  
  // Build the title block SVG content
  let svg = `
    <rect width="${w}" height="${h}" fill="#ffffff" stroke="#222222" stroke-width="4"/>
    
    <!-- Header bar -->
    <rect width="${w}" height="${h*0.16}" fill="#f5f5f5"/>
    <line x1="0" y1="${h*0.16}" x2="${w}" y2="${h*0.16}" stroke="#222222" stroke-width="3"/>
    
    <!-- Logo -->
    <image href="assets/logo.png" x="${w*0.025}" y="${h*0.03}" width="${w*0.35}" height="${h*0.10}" preserveAspectRatio="xMinYMid meet"/>
    
    <!-- Design Drawing label -->
    <text x="${w*0.975}" y="${h*0.105}" font-family="Arial, sans-serif" font-size="${h*0.05}" font-weight="bold" fill="#3BA8A8" text-anchor="end">DESIGN DRAWING</text>
    
    <!-- Project -->
    <text x="${w*0.03}" y="${h*0.225}" font-family="Arial, sans-serif" font-size="${h*0.032}" fill="#888888">Project</text>
    <text x="${w*0.03}" y="${h*0.29}" font-family="Arial, sans-serif" font-size="${h*0.042}" fill="#222222">${title || 'Proposed Garden Office Building for:'}</text>
    
    <!-- Use Case (top right) -->
    <text x="${w*0.97}" y="${h*0.225}" font-family="Arial, sans-serif" font-size="${h*0.032}" fill="#888888" text-anchor="end">Primary Use</text>
    <text x="${w*0.97}" y="${h*0.29}" font-family="Arial, sans-serif" font-size="${h*0.042}" font-weight="bold" fill="#3BA8A8" text-anchor="end">${cfg.useCase || 'Garden Office'}</text>
    
    <!-- Client -->
    <text x="${w*0.03}" y="${h*0.36}" font-family="Arial, sans-serif" font-size="${h*0.032}" fill="#888888">Client</text>
    <text x="${w*0.03}" y="${h*0.43}" font-family="Arial, sans-serif" font-size="${h*0.048}" font-weight="bold" fill="#000000">${customer || '—'}</text>
    
    <!-- Site -->
    <text x="${w*0.03}" y="${h*0.505}" font-family="Arial, sans-serif" font-size="${h*0.032}" fill="#888888">Site Address</text>
    <text x="${w*0.03}" y="${h*0.565}" font-family="Arial, sans-serif" font-size="${h*0.038}" fill="#333333">${address || '—'}</text>
    
    <!-- Divider -->
    <line x1="${w*0.03}" y1="${h*0.605}" x2="${w*0.97}" y2="${h*0.605}" stroke="#dddddd" stroke-width="2"/>
    
    <!-- Specification -->
    <text x="${w*0.03}" y="${h*0.655}" font-family="Arial, sans-serif" font-size="${h*0.032}" fill="#888888">Specification</text>
    <text x="${w*0.03}" y="${h*0.715}" font-family="Arial, sans-serif" font-size="${h*0.034}" fill="#444444">${spec || '—'}</text>
    
    <!-- Divider -->
    <line x1="${w*0.03}" y1="${h*0.755}" x2="${w*0.97}" y2="${h*0.755}" stroke="#dddddd" stroke-width="2"/>
    
    <!-- Quote Date -->
    <text x="${w*0.03}" y="${h*0.805}" font-family="Arial, sans-serif" font-size="${h*0.028}" fill="#888888">Quote Date</text>
    <text x="${w*0.03}" y="${h*0.86}" font-family="Arial, sans-serif" font-size="${h*0.042}" font-weight="bold" fill="#222222">${date || '—'}</text>
    
    <!-- Scale -->
    <text x="${w*0.37}" y="${h*0.805}" font-family="Arial, sans-serif" font-size="${h*0.028}" fill="#888888">Scale</text>
    <text x="${w*0.37}" y="${h*0.86}" font-family="Arial, sans-serif" font-size="${h*0.042}" font-weight="bold" fill="#222222">${cfg.scaleLabel || '1:50 @ A3'}</text>
    
    <!-- Drawing Number -->
    <text x="${w*0.68}" y="${h*0.805}" font-family="Arial, sans-serif" font-size="${h*0.028}" fill="#888888">Drawing No.</text>
    <text x="${w*0.68}" y="${h*0.86}" font-family="Arial, sans-serif" font-size="${h*0.042}" font-weight="bold" fill="#222222">${cfg.drawingNumber || 'GOB-001'}</text>
    
    <!-- Footer bar - GOB blue background, single line -->
    <rect y="${h*0.90}" width="${w}" height="${h*0.10}" fill="#3BA8A8"/>
    
    <!-- Footer: Phone | Address -->
    <text x="${w*0.03}" y="${h*0.96}" font-family="Arial, sans-serif" font-size="${h*0.036}" font-weight="bold" fill="#ffffff">01689 818 400</text>
    <text x="${w*0.97}" y="${h*0.96}" font-family="Arial, sans-serif" font-size="${h*0.036}" fill="#ffffff" text-anchor="end">Rear of 158 Main Road, Biggin Hill, Kent TN16 3BA</text>
  `;
  
  return svg;
}

// ── Component Dimension Labels (Plan View) ─────────────────

// Horizontal component dimension (for front/rear wall components)
function dimH_comp(x1, x2, y, label, off, customColor) {
  const color = customColor || '#444';
  const yl = y + (off || 200);
  const cw = Math.min(60, (x2 - x1) * 0.05);
  const ch = cw * 0.5;
  const sign = off < 0 ? -1 : 1;
  let s = '';
  // Extension lines
  s += ln(x1, y, x1, yl, 1, color, { opacity: 0.5 });
  s += ln(x2, y, x2, yl, 1, color, { opacity: 0.5 });
  // Dimension line
  s += ln(x1, yl, x2, yl, 2, color);
  // Chevron arrowheads
  s += tag('polyline', { points: `${x1 + cw},${yl - ch} ${x1},${yl} ${x1 + cw},${yl + ch}`, fill: 'none', stroke: color, 'stroke-width': 2 });
  s += tag('polyline', { points: `${x2 - cw},${yl - ch} ${x2},${yl} ${x2 - cw},${yl + ch}`, fill: 'none', stroke: color, 'stroke-width': 2 });
  // Text: on the far side of dim line (closer to building centre)
  const textY = off < 0 ? yl - 70 : yl + 140;
  s += tx((x1 + x2) / 2, textY, label, 120, { color });
  return s;
}

// Vertical component dimension (for left/right wall components)
function dimV_comp(y1, y2, x, label, off, customColor) {
  const color = customColor || '#444';
  const xl = x + (off || 200);
  const ch = Math.min(60, (y2 - y1) * 0.05);
  const cw = ch * 0.5;
  let s = '';
  // Extension lines
  s += ln(x, y1, xl, y1, 1, color, { opacity: 0.5 });
  s += ln(x, y2, xl, y2, 1, color, { opacity: 0.5 });
  // Dimension line
  s += ln(xl, y1, xl, y2, 2, color);
  // Chevron arrowheads
  s += tag('polyline', { points: `${xl - cw},${y1 + ch} ${xl},${y1} ${xl + cw},${y1 + ch}`, fill: 'none', stroke: color, 'stroke-width': 2 });
  s += tag('polyline', { points: `${xl - cw},${y2 - ch} ${xl},${y2} ${xl + cw},${y2 - ch}`, fill: 'none', stroke: color, 'stroke-width': 2 });
  // Text (rotated): on the far side of dim line (closer to building centre)
  const cy = (y1 + y2) / 2;
  const textX = off < 0 ? xl - 140 : xl + 140;
  s += tx(textX, cy, label, 120, { color, transform: `rotate(-90 ${textX} ${cy})` });
  return s;
}

// ── Dimension Lines ─────────────────────────────────────────

function dimH(x1, x2, y, label, off, labelBelow) {
  const yl = y+(off||250), cw = Math.min(100,(x2-x1)*0.05), ch = cw*0.5;
  let s = '';
  s += ln(x1,y+15,x1,yl+12,1.2,'#777');
  s += ln(x2,y+15,x2,yl+12,1.2,'#777');
  s += ln(x1,yl,x2,yl,2.2,'#333');
  s += tag('polyline',{points:`${x1+cw},${yl-ch} ${x1},${yl} ${x1+cw},${yl+ch}`,fill:'none',stroke:'#333','stroke-width':2.2});
  s += tag('polyline',{points:`${x2-cw},${yl-ch} ${x2},${yl} ${x2-cw},${yl+ch}`,fill:'none',stroke:'#333','stroke-width':2.2});
  // Label above or below the line
  const labelY = labelBelow ? yl + 140 : yl - 55;
  s += tx((x1+x2)/2, labelY, label, 150, { color: '#333' });
  return s;
}

function dimV(y1, y2, x, label, off) {
  const xl = x+(off||-350);
  const ch = Math.max(60, Math.min(100,(y2-y1)*0.05));
  const cw = ch*0.5;
  let s = '';
  // Tick lines from building to dimension line
  s += ln(x-15,y1,xl-12,y1,1.2,'#777');
  s += ln(x-15,y2,xl-12,y2,1.2,'#777');
  // Main dimension line
  s += ln(xl,y1,xl,y2,2.2,'#333');
  // Top arrow (pointing up)
  s += tag('polyline',{points:`${xl-cw},${y1+ch} ${xl},${y1} ${xl+cw},${y1+ch}`,fill:'none',stroke:'#333','stroke-width':2.2,'stroke-linejoin':'miter'});
  // Bottom arrow (pointing down)
  s += tag('polyline',{points:`${xl-cw},${y2-ch} ${xl},${y2} ${xl+cw},${y2-ch}`,fill:'none',stroke:'#333','stroke-width':2.2,'stroke-linejoin':'miter'});
  const cx = xl-70, cy = (y1+y2)/2;
  s += tx(cx, cy, label, 150, { transform: `rotate(-90 ${cx} ${cy})`, color: '#333' });
  return s;
}

// ── Full Drawing Composer ───────────────────────────────────

function compose(b) {
  // Deep, narrow buildings (depth >= 1.4 x width, e.g. an 18m x 10m office block) get the 'deep' sheet:
  // plan down the left, four elevations stacked on the right. Overridable per design with state.sheetLayout.
  if (b.sheetLayout === 'deep' || (b.sheetLayout !== 'standard' && (b.depth || 0) >= (b.width || 0) * 1.4)) return composeDeep(b);
  TS = Math.max(1, Math.min(2, Math.max(b.width || 0, b.depth || 0) / 8000)); // 8m building = 1x, 16m+ = 2x
  const W=b.width, D=b.depth, H=b.height;
  const oh = b.overhang || 0;
  const isSig = b.tier === 'signature';
  const hasCanopy = b.hasCanopy !== false;
  const hasDecking = b.hasDecking !== false;
  // Liam 2026-09-09: the MAIN depth dimension is the selected external depth
  // (building only, EXCLUDING canopy/decking). A second, outer dimension line
  // shows the overall depth including the canopy and/or decking projection.
  const depthLabel = D;
  const deckingDepth = b.deckingDepth || 400;
  // Only Signature with canopy shows external canopy projection
  const proj = (isSig && oh > 0 && hasCanopy) ? oh : 0;
  const deckProj = (isSig && hasDecking) ? deckingDepth : 0;
  const frontProj = Math.max(proj, deckProj); // largest front projection for layout
  const margin=700*TS, dim=(b.roof && b.roof.type !== 'flat' ? 1050 : 600)*TS, labH=350*TS;
  const deckH = oh > 0 ? 100 : 0;
  const cL = b.cornerLeft || 'open';
  const cR = b.cornerRight || 'open';
  const gap = 600*TS;

  // Roof profiles per view (pitched roofs rise above the eaves line, so row 1 moves down by the rise)
  const roof = b.roof && b.roof.type !== 'flat' ? b.roof : null; const rise = roof ? roof.rise : 0;
  const prof = { front: null, left: null, right: null }; const tall = { front: 0, left: 0, right: 0 }; // tall = the whole wall is higher (mono high side)
  if (roof && roof.type === 'dual') {
    if (roof.ridge === 'y') { prof.front = { kind: 'gable', rise, peakX: W / 2 }; prof.left = prof.right = { kind: 'band', rise }; }
    else { prof.front = { kind: 'band', rise }; prof.left = prof.right = { kind: 'gable', rise, peakX: D / 2 }; }
  } else if (roof) {
    const hs = roof.highSide || 'rear';
    if (hs === 'rear') { prof.front = { kind: 'band', rise }; prof.left = { kind: 'wedge', leftRise: rise, rightRise: 0 }; prof.right = { kind: 'wedge', leftRise: 0, rightRise: rise }; }
    else if (hs === 'front') { tall.front = rise; prof.left = { kind: 'wedge', leftRise: 0, rightRise: rise }; prof.right = { kind: 'wedge', leftRise: rise, rightRise: 0 }; }
    else if (hs === 'left') { tall.left = rise; prof.front = { kind: 'wedge', leftRise: rise, rightRise: 0 }; prof.right = { kind: 'band', rise }; }
    else { tall.right = rise; prof.front = { kind: 'wedge', leftRise: 0, rightRise: rise }; prof.left = { kind: 'band', rise }; }
  }
  const liftComps = (list, by) => (by ? (list || []).map((c) => (c.y !== undefined && c.y !== null ? { ...c, y: c.y + by } : c)) : (list || []));
  const row1Y = margin + labH + rise;
  const lX = margin + dim;
  const sideExtra = frontProj; // space needed for side elevation projections (canopy or decking)
  const fX = lX + D + sideExtra + gap;
  const rX = fX + W + gap + sideExtra;
  const row1Right = rX + D + sideExtra + dim;
  const row1Bottom = row1Y + H + deckH + 650*TS;

  // Calculate boundary offsets for plan view
  const boundaryLeft = (b.boundaries?.show && b.boundaries?.left) ? b.boundaries.left + 300 : 0;
  const boundaryRight = (b.boundaries?.show && b.boundaries?.right) ? b.boundaries.right + 300 : 0;
  const boundaryRear = (b.boundaries?.show && b.boundaries?.rear) ? b.boundaries.rear + 200 : 0;

  // Site layer around the building (existing buildings, paths, trees, map image): grow the plan area to fit it
  const sb = siteBounds(b.siteObjects, b.siteImage); const LIM = 60000;
  const siteL = Math.min(LIM, Math.max(0, -sb.minX)), siteT = Math.min(LIM, Math.max(0, -sb.minY)), siteR = Math.min(LIM, Math.max(0, sb.maxX - W)), siteB = Math.min(LIM, Math.max(0, sb.maxY - D));
  const row2Y = row1Bottom + 250 + labH + boundaryRear + siteT;
  const pX = margin + dim + boundaryLeft + siteL;
  // Add extra plan space for canopy and/or decking projection
  const planExtra = frontProj > 0 ? frontProj + 300 : 0;

  // Title block: grows with the plan but is capped so a deep building does not get a giant block (keeps the 1.8:1 template ratio)
  const tiH = Math.min(Math.max(D + planExtra + 600, 2800), 6600);
  let tiW = Math.min(Math.max(4000, D*2 + 1000), Math.round(tiH * 1.85));
  const tiX = pX + W + boundaryRight + siteR + 500;
  const tiY = row2Y;

  // a deep, narrow building leaves the elevations row much wider than the plan: let the title block use that width (up to 3:1)
  tiW = Math.max(tiW, Math.min(row1Right - tiX, Math.round(tiH * 3)));
  const totW = Math.max(row1Right + margin, tiX + tiW + margin, pX + W + boundaryRight + dim + margin);
  const totH = row2Y + Math.max(D + planExtra + siteB, tiH) + dim + 500 + margin;

  let s = svgDefs();
  s += rc(0,0,totW,totH,{fill:'white'});
  s += rc(margin*0.4, margin*0.4, totW-margin*0.8, totH-margin*0.8, { sw: 4, stroke: '#333' });

  // LEFT ELEVATION
  const overallLabel = (extra) => `${D + extra}mm overall incl. ${hasCanopy && proj > 0 && hasDecking && deckProj > 0 ? 'canopy/decking' : hasCanopy && proj > 0 ? 'canopy' : 'decking'}`;
  const titleOpts = { bold:true, color:'#333', spacing: 28 };
  const titleY = row1Y - rise - 160*TS;
  s += tx(lX+D/2, titleY, 'LEFT ELEVATION', 150, titleOpts);
  s += grp(renderSide({ depth:D, height:H + tall.left, side:'left', tier:b.tier, overhang:oh, components:liftComps(b.leftComponents, tall.left), corner:cL, claddingType:b.leftCladding, hasCanopy, hasDecking, deckingDepth, externalFeatures:b.leftExternalFeatures||[], roofProfile: prof.left }), { transform:`translate(${lX},${row1Y - tall.left})` });
  s += dimH(lX, lX+D, row1Y+H+deckH+30, `${depthLabel}mm`, 250*TS);
  if (frontProj > 0) s += dimH(lX, lX+D+frontProj, row1Y+H+deckH+30, overallLabel(frontProj), 620*TS);
  // Height dimension on left side of left elevation (eaves), plus the ridge height on a pitched roof
  s += dimV(row1Y, row1Y+H+deckH, lX, roof ? `${H}mm eaves` : `${H}mm`, -450*TS);
  if (roof) s += dimV(row1Y - rise, row1Y+H+deckH, lX, `${H + rise}mm ridge`, -900*TS);

  // FRONT ELEVATION
  s += tx(fX+W/2, titleY, 'FRONT ELEVATION', 150, titleOpts);
  s += grp(renderFront({ width:W, height:H + tall.front, overhang:oh, tier:b.tier, claddingType:b.frontCladding, components:liftComps(b.frontComponents, tall.front), cornerLeft:cL, cornerRight:cR, externalFeatures:b.externalFeatures||[], hasCanopy, hasDecking, roofProfile: prof.front }), { transform:`translate(${fX},${row1Y - tall.front})` });
  s += dimH(fX, fX+W, row1Y+H+deckH+30, `${W}mm`, 250*TS);

  // RIGHT ELEVATION
  // For right side, canopy extends LEFT (negative x), so dimension starts earlier
  s += tx(rX+D/2, titleY, 'RIGHT ELEVATION', 150, titleOpts);
  s += grp(renderSide({ depth:D, height:H + tall.right, side:'right', tier:b.tier, overhang:oh, components:liftComps(b.rightComponents, tall.right), corner:cR, claddingType:b.rightCladding, hasCanopy, hasDecking, deckingDepth, externalFeatures:b.rightExternalFeatures||[], roofProfile: prof.right }), { transform:`translate(${rX},${row1Y - tall.right})` });
  s += dimH(rX, rX+D, row1Y+H+deckH+30, `${depthLabel}mm`, 250*TS);
  if (frontProj > 0) s += dimH(rX-frontProj, rX+D, row1Y+H+deckH+30, overallLabel(frontProj), 620*TS);

  // PLAN VIEW
  const planLabelY = row2Y - boundaryRear - siteT - 160;
  s += tx(pX+W/2, planLabelY, 'PLAN VIEW', 150, titleOpts);
  s += grp(renderPlan({ width:W, depth:D, wallThickness:150, overhang:oh, tier:b.tier, components:b.planComponents||[], rooms:b.rooms, cornerLeft:cL, cornerRight:cR, straightPartition:b.straightPartition, partitionRoom:b.partitionRoom, partitions:b.partitions, roomLabels:b.roomLabels, siteObjects:b.siteObjects, siteImage:b.siteImage, ui:b.ui, boundaries:b.boundaries, roof, hasCanopy, hasDecking, deckingDepth, acUnits:b.acUnits||[], intDimWidthOffset:b.intDimWidthOffset, intDimDepthOffset:b.intDimDepthOffset }), { transform:`translate(${pX},${row2Y})`, id: 'plan-group' });
  // Add canopy/decking space to dimension line
  const planDimY = frontProj > 0 ? row2Y+D+frontProj+80 : row2Y+D+80;
  // Width dimension - offset 450 to match depth dimension distance, label below line
  s += dimH(pX, pX+W, planDimY, `${W}mm`, 450*TS, false);
  // Depth: building only on the inner line, overall incl. canopy/decking on the outer line
  s += dimV(row2Y, row2Y+D, pX, `${depthLabel}mm`, -450*TS);
  if (frontProj > 0) s += dimV(row2Y, row2Y+D+frontProj, pX, overallLabel(frontProj), -900*TS);

  // Canopy/decking text below the plan view (only for Signature with overhang)
  if (isSig && (hasCanopy || hasDecking)) {
    const numSpotlights = hasCanopy ? Math.floor(W / 1000) : 0;
    const parts = [];
    if (hasCanopy && oh > 0) parts.push(`canopy (${oh}mm) with ${numSpotlights} spotlight${numSpotlights !== 1 ? 's' : ''}`);
    if (hasDecking) parts.push(`decking (${deckingDepth}mm)`);
    if (parts.length > 0) {
      const featureText = `Integrated ${parts.join(' and ')}`;
      s += tx(pX+W/2, planDimY+900, featureText, 120, { italic:true, color:'#666' });
    }
  }

  // TITLE BLOCK
  s += grp(renderTitle({ w:tiW, h:tiH, title:b.title, customer:b.customer, address:b.address, date:b.date, spec:b.spec, useCase:b.useCase, drawingNumber:b.drawingNumber, scaleLabel: `1:${totW / 400 <= 50 ? 50 : totW / 400 <= 100 ? 100 : 200} @ A3` }), { transform:`translate(${tiX},${tiY})` });

  // DRAWING NOTES (if any)
  if (b.drawingNotes && b.drawingNotes.trim()) {
    const notesX = tiX;
    const notesY = tiY + tiH + 120;
    const notesW = tiW;
    const notesFontSize = 160; // tx() scales it by TS, so the wrap and line height must scale too
    const notesLineHeight = 220 * TS;
    const maxCharsPerLine = Math.floor(notesW / (notesFontSize * TS * 0.5));
    
    // Word wrap the notes text
    const words = b.drawingNotes.trim().split(/\s+/);
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (testLine.length > maxCharsPerLine) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Render notes label and text
    s += tx(notesX, notesY, 'Notes:', notesFontSize, { anchor: 'start', bold: true, color: '#444' });
    let noteY = notesY + notesLineHeight;
    for (const line of lines) {
      s += tx(notesX, noteY, line, notesFontSize, { anchor: 'start', color: '#555' });
      noteY += notesLineHeight;
    }
  }

  // DRAWING LABELS — rendered at top level with absolute coordinates
  if (b.drawingLabels && b.drawingLabels.length > 0) {
    for (const label of b.drawingLabels) {
      s += renderDrawingLabel(label);
    }
  }

  return fastOpacity(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totW} ${totH}" style="background:white;width:100%;height:100%;">${s}</svg>`);
}

// ── Deep-building sheet: plan left, elevations stacked right ─
/** PDF viewers treat `opacity` on a shape as a transparency group, and a sheet with ~400 of them opens
 *  slowly and paints in pieces (Liam 21 Oct 2026). fill-opacity/stroke-opacity give the same look as a
 *  plain constant alpha, which renders instantly. Applied to every finished sheet. */
function fastOpacity(svg) {
  return svg.replace(/<(line|rect|polygon|polyline|path|circle|ellipse|text)\b([^>]*?) opacity="([^"]+)"/g, '<$1$2 fill-opacity="$3" stroke-opacity="$3"');
}
function composeDeep(b) {
  TS = Math.max(1, Math.min(2, Math.max(b.width || 0, b.depth || 0) / 8000));
  const W=b.width, D=b.depth, H=b.height, oh=b.overhang||0, isSig=b.tier==='signature';
  const hasCanopy=b.hasCanopy!==false, hasDecking=b.hasDecking!==false, deckingDepth=b.deckingDepth||400;
  const proj=(isSig&&oh>0&&hasCanopy)?oh:0, deckProj=(isSig&&hasDecking)?deckingDepth:0, frontProj=Math.max(proj,deckProj);
  const deckH = oh > 0 ? 100 : 0, cL=b.cornerLeft||'open', cR=b.cornerRight||'open';
  const roof = b.roof && b.roof.type !== 'flat' ? b.roof : null; const rise = roof ? roof.rise : 0;
  const prof = { front: null, rear: null, left: null, right: null };
  if (roof && roof.type === 'dual') {
    if (roof.ridge === 'y') { prof.front = prof.rear = { kind: 'gable', rise, peakX: W / 2 }; prof.left = prof.right = { kind: 'band', rise }; }
    else { prof.front = prof.rear = { kind: 'band', rise }; prof.left = prof.right = { kind: 'gable', rise, peakX: D / 2 }; }
  }
  const margin=700*TS, dim=(roof?1050:600)*TS, labH=350*TS, gap=700*TS;
  const boundaryLeft = (b.boundaries?.show && b.boundaries?.left) ? b.boundaries.left + 300 : 0;
  const boundaryRight = (b.boundaries?.show && b.boundaries?.right) ? b.boundaries.right + 300 : 0;
  const boundaryRear = (b.boundaries?.show && b.boundaries?.rear) ? b.boundaries.rear + 200 : 0;
  const sb = siteBounds(b.siteObjects, b.siteImage); const LIM = 60000;
  const siteL=Math.min(LIM,Math.max(0,-sb.minX)), siteT=Math.min(LIM,Math.max(0,-sb.minY)), siteR=Math.min(LIM,Math.max(0,sb.maxX-W)), siteB=Math.min(LIM,Math.max(0,sb.maxY-D));
  const planExtra = frontProj > 0 ? frontProj + 300 : 0;
  const titleOpts = { bold:true, color:'#333', spacing: 28 };
  let s = svgDefs();
  // ── PLAN (left) ──
  const pX = margin + dim + boundaryLeft + siteL, pY = margin + labH + boundaryRear + siteT;
  const planBottom = pY + D + planExtra + siteB + dim + 500*TS;
  const planRight = pX + W + boundaryRight + siteR;
  // ── ELEVATIONS (right column) ──
  const cX = planRight + dim + gap;
  const sideW = D + frontProj, colW = Math.max(sideW, W * 2 + gap);
  const rowH = labH + rise + H + deckH + (frontProj > 0 ? 900 : 600) * TS + 300 * TS;
  const overallLabel = (extra) => `${D + extra}mm overall incl. ${hasCanopy && proj > 0 && hasDecking && deckProj > 0 ? 'canopy/decking' : hasCanopy && proj > 0 ? 'canopy' : 'decking'}`;
  const tiH = 6600;
  const colTop = Math.max(margin, pY - siteT - boundaryRear - labH - rise);
  const colH = rowH * 3 + 200*TS + tiH;
  // right column centred on the plan content's vertical extent so the sheet has no empty bottom-right corner (Liam 21 Oct 2026)
  let y = Math.max(colTop, colTop + (planBottom - colTop - colH) / 2);
  // row 1: left elevation
  let ey = y + labH + rise;
  s += tx(cX + sideW/2, ey - rise - 160*TS, 'LEFT ELEVATION', 150, titleOpts);
  s += grp(renderSide({ depth:D, height:H, side:'left', tier:b.tier, overhang:oh, components:b.leftComponents||[], corner:cL, claddingType:b.leftCladding, hasCanopy, hasDecking, deckingDepth, externalFeatures:b.leftExternalFeatures||[], roofProfile: prof.left }), { transform:`translate(${cX},${ey})` });
  s += dimH(cX, cX+D, ey+H+deckH+30, `${D}mm`, 250*TS);
  if (frontProj > 0) s += dimH(cX, cX+D+frontProj, ey+H+deckH+30, overallLabel(frontProj), 620*TS);
  s += dimV(ey, ey+H+deckH, cX, roof ? `${H}mm eaves` : `${H}mm`, -450*TS);
  if (roof) s += dimV(ey - rise, ey+H+deckH, cX, `${H + rise}mm ridge`, -900*TS);
  y += rowH;
  // row 2: right elevation (front at the left edge, so canopy projects left)
  ey = y + labH + rise;
  const rX = cX + frontProj;
  s += tx(rX + D/2, ey - rise - 160*TS, 'RIGHT ELEVATION', 150, titleOpts);
  s += grp(renderSide({ depth:D, height:H, side:'right', tier:b.tier, overhang:oh, components:b.rightComponents||[], corner:cR, claddingType:b.rightCladding, hasCanopy, hasDecking, deckingDepth, externalFeatures:b.rightExternalFeatures||[], roofProfile: prof.right, stepAt: b.notch ? (b.notch.pod ? [D - b.notch.len, D - b.notch.len + b.notch.pod.len] : D - b.notch.len) : 0 }), { transform:`translate(${rX},${ey})` });
  s += dimH(rX, rX+D, ey+H+deckH+30, `${D}mm`, 250*TS);
  if (frontProj > 0) s += dimH(rX-frontProj, rX+D, ey+H+deckH+30, overallLabel(frontProj), 620*TS);
  y += rowH;
  // row 3: front + rear side by side
  ey = y + labH + rise;
  const fX = cX, bX = cX + W + gap;
  s += tx(fX + W/2, ey - rise - 160*TS, 'FRONT ELEVATION', 150, titleOpts);
  s += grp(renderFront({ width:W, height:H, overhang:oh, tier:b.tier, claddingType:b.frontCladding, components:b.frontComponents||[], cornerLeft:cL, cornerRight:cR, externalFeatures:b.externalFeatures||[], hasCanopy, hasDecking, roofProfile: prof.front }), { transform:`translate(${fX},${ey})` });
  s += dimH(fX, fX+W, ey+H+deckH+30, `${W}mm`, 250*TS);
  s += tx(bX + W/2, ey - rise - 160*TS, 'REAR ELEVATION', 150, titleOpts);
  s += grp(renderFront({ width:W, height:H, overhang:0, tier:b.tier, claddingType:b.rearCladding, components:b.rearComponents||[], cornerLeft:'closed', cornerRight:'closed', externalFeatures:b.rearExternalFeatures||[], hasCanopy:false, hasDecking:false, roofProfile: prof.rear, stepAt: b.notch ? (b.notch.pod ? [b.notch.w - b.notch.pod.w, b.notch.w] : b.notch.w) : 0 }), { transform:`translate(${bX},${ey})` });
  s += dimH(bX, bX+W, ey+H+deckH+30, `${W}mm`, 250*TS);
  y += rowH;
  // row 4: title block + notes
  const tiW = Math.min(colW, Math.round(tiH * 1.85)); const tiX = cX, tiY = y + 200*TS;
  s += grp(renderTitle({ w:tiW, h:tiH, title:b.title, customer:b.customer, address:b.address, date:b.date, spec:b.spec, useCase:b.useCase, drawingNumber:b.drawingNumber, scaleLabel: `1:${100} @ A3` }), { transform:`translate(${tiX},${tiY})` });
  let colBottom = tiY + tiH;
  if (b.drawingNotes && b.drawingNotes.trim()) {
    const notesX = tiX + tiW + 500*TS, notesW = Math.max(4000, cX + colW - notesX), below = notesW < 7000;
    const nx = below ? tiX : notesX, ny = below ? tiY + tiH + 300*TS : tiY + 250*TS, nw = below ? tiW : notesW;
    const fs = 150, lh = 220 * TS, maxChars = Math.floor(nw / (fs * TS * 0.5));
    const words = b.drawingNotes.trim().split(/\s+/); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (t.length > maxChars) { if (cur) lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    s += tx(nx, ny, 'Notes:', fs, { anchor: 'start', bold: true, color: '#444' });
    let ly = ny + lh; for (const line of lines) { s += tx(nx, ly, line, fs, { anchor: 'start', color: '#555' }); ly += lh; }
    colBottom = Math.max(colBottom, ly);
  }
  // plan last so its group id is unique and it sits above nothing else
  s += tx(pX+W/2, pY - boundaryRear - siteT - 160*TS, 'PLAN VIEW', 150, titleOpts); // above the site objects too
  s += grp(renderPlan({ width:W, depth:D, wallThickness:150, overhang:oh, tier:b.tier, components:b.planComponents||[], rooms:b.rooms, cornerLeft:cL, cornerRight:cR, straightPartition:b.straightPartition, partitionRoom:b.partitionRoom, partitions:b.partitions, roomLabels:b.roomLabels, siteObjects:b.siteObjects, siteImage:b.siteImage, ui:b.ui, boundaries:b.boundaries, roof, notch:b.notch, hasCanopy, hasDecking, deckingDepth, acUnits:b.acUnits||[], intDimWidthOffset:b.intDimWidthOffset, intDimDepthOffset:b.intDimDepthOffset }), { transform:`translate(${pX},${pY})`, id: 'plan-group' });
  const planDimY = pY + D + Math.max(frontProj, siteB) + 80;
  s += dimH(pX, pX+W, planDimY, `${W}mm`, 450*TS, false);
  const dimX = pX - boundaryLeft - siteL; // left of the boundary / path / site objects
  s += dimV(pY, pY+D, dimX, `${D}mm`, -450*TS);
  if (frontProj > 0) s += dimV(pY, pY+D+frontProj, dimX, overallLabel(frontProj), -900*TS);
  if (isSig && (hasCanopy || hasDecking)) {
    const numSpot = hasCanopy ? Math.floor(W / 1000) : 0; const parts = [];
    if (hasCanopy && oh > 0) parts.push(`canopy (${oh}mm) with ${numSpot} spotlight${numSpot !== 1 ? 's' : ''}`);
    if (hasDecking) parts.push(`decking (${deckingDepth}mm)`);
    if (parts.length) s += tx(pX+W/2, planDimY+900, `Integrated ${parts.join(' and ')}`, 120, { italic:true, color:'#666' });
  }
  if (b.drawingLabels && b.drawingLabels.length) for (const label of b.drawingLabels) s += renderDrawingLabel(label);
  const totW = cX + colW + margin, totH = Math.max(planBottom, colBottom) + margin;
  const sheet = rc(0,0,totW,totH,{fill:'white'}) + rc(margin*0.4, margin*0.4, totW-margin*0.8, totH-margin*0.8, { sw: 4, stroke: '#333' });
  return fastOpacity(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totW} ${totH}" style="background:white;width:100%;height:100%;">${svgDefs()}${sheet}${s.slice(svgDefs().length)}</svg>`);
}

// ── Public API ──────────────────────────────────────────────

export function generateDrawing(state, componentsData, claddingData, ui) {
  if (!state || !componentsData) return '';

  const allComps = { ...componentsData.doors, ...componentsData.windows };

  const frontComponents = [];
  const leftComponents = [];
  const rightComponents = [];
  const planComponents = [];
  const rearComponents = [];

  for (const comp of (state.components || [])) {
    const def = allComps[comp.type];
    if (!def) continue;
    const w = def.width;
    const h = comp.customHeight && comp.customHeight > 0 ? comp.customHeight : def.height;
    const x = comp.positionX || 0;

    // Calculate y position based on component category and custom position
    let y;
    if (def.category === 'slot' || def.category === 'standard') {
      // These can be moved vertically - check for custom position
      if (comp.positionY !== undefined && comp.positionY !== null) {
        // positionY is mm from ground, convert to y coordinate (from top)
        y = state.height - comp.positionY - h;
      } else if (def.category === 'slot') {
        // Default: slot windows with the cill 1400mm off the ground (Liam 19 Sep 2026)
        y = state.height - 1400 - h;
      } else {
        // Default: standard windows at desk height (centred)
        const wallTop = ROOF_ZONE;
        const wallH = state.height - wallTop;
        y = wallTop + (wallH - h) / 2;
      }
    }
    // else: full-height doors/windows default to ground level (y undefined → height - h)

    const elevEntry = { type: comp.type, x, w, h, y, id: comp.id, handleSide: comp.handleSide || 'right' };
    // Plan Y on the side walls runs rear -> front. The RIGHT elevation measures
    // positionX from the FRONT, so convert unless the plan has its own position.
    const compW = comp.customWidth && comp.customWidth > 0 ? comp.customWidth : w;
    const planX = comp.planPositionX ?? (comp.elevation === 'right' ? Math.max(0, state.depth - x - compW) : x);
    const planEntry = { wall: comp.elevation, type: comp.type, x: planX, w, h, id: comp.id };

    // Use custom width if specified
    if (comp.customWidth && comp.customWidth > 0) {
      elevEntry.w = comp.customWidth;
      planEntry.w = comp.customWidth;
    }

    if (comp.elevation === 'front') {
      frontComponents.push(elevEntry);
      planComponents.push(planEntry);
    } else if (comp.elevation === 'left') {
      leftComponents.push(elevEntry);
      planComponents.push(planEntry);
    } else if (comp.elevation === 'right') {
      rightComponents.push(elevEntry);
      planComponents.push(planEntry);
    } else if (comp.elevation === 'rear') {
      // Plan + the rear elevation (deep sheet): seen from behind, so x is mirrored
      planComponents.push(planEntry);
      rearComponents.push({ ...elevEntry, x: state.width - planEntry.x - planEntry.w });
    }
  }

  // Map cladding type
  const compositeKey = (key) => (key === 'composite-latte' ? 'composite-latte' : 'composite');
  const frontClad = claddingData?.types?.[state.cladding?.front];
  let frontCladding = 'cedar';
  if (frontClad?.category === 'steel') frontCladding = 'steel';
  else if (frontClad?.category === 'composite') frontCladding = compositeKey(state.cladding?.front);

  const leftClad = claddingData?.types?.[state.cladding?.left];
  let leftCladding = 'steel';
  if (leftClad?.category === 'timber') leftCladding = 'cedar';
  else if (leftClad?.category === 'composite') leftCladding = compositeKey(state.cladding?.left);

  const rearCladT = claddingData?.types?.[state.cladding?.rear];
  let rearCladding = 'steel';
  if (rearCladT?.category === 'timber') rearCladding = 'cedar';
  else if (rearCladT?.category === 'composite') rearCladding = compositeKey(state.cladding?.rear);
  const rightClad = claddingData?.types?.[state.cladding?.right];
  let rightCladding = 'steel';
  if (rightClad?.category === 'timber') rightCladding = 'cedar';
  else if (rightClad?.category === 'composite') rightCladding = compositeKey(state.cladding?.right);

  // Rooms
  const rooms = (state.rooms || [{ label: 'Office', widthMm: state.width }]).map(r => ({
    label: r.label,
    width: r.widthMm,
    labelOffsetX: r.labelOffsetX || 0,
    labelOffsetY: r.labelOffsetY || 0,
  }));

  const tierLabel = state.tier === 'signature' ? 'Signature' : 'Classic';
  const rf = state.roof || {}; const roofType = rf.type === 'dual' || rf.type === 'mono' ? rf.type : 'flat';
  const roof = { type: roofType, rise: roofType === 'flat' ? 0 : Math.max(100, Math.min(2000, Number(rf.rise) || 500)), ridge: rf.ridge === 'x' ? 'x' : 'y', highSide: ['front', 'rear', 'left', 'right'].includes(rf.highSide) ? rf.highSide : 'rear' };
  const roofSpec = roofType === 'flat' ? '' : roofType === 'dual' ? ` | dual pitch ${roof.rise}mm, ridge ${roof.ridge === 'y' ? 'front-to-back' : 'left-to-right'}` : ` | mono pitch ${roof.rise}mm, high at ${roof.highSide}`;
  const dims = `${(state.width/1000).toFixed(1)}m x ${(state.depth/1000).toFixed(1)}m x ${(state.height/1000).toFixed(2).replace(/0$/, '')}m${roofType !== 'flat' ? ' eaves' : ''}${state.notch && state.notch.w > 0 ? ' (L-shaped)' : ''}`;
  const frontCladLabel = frontClad?.label || 'Cedar';

  return compose({
    width: state.width,
    depth: state.depth,
    height: state.height,
    tier: state.tier,
    overhang: state.overhangDepth || 0,
    frontCladding,
    leftCladding,
    rightCladding,
    rearCladding,
    rearComponents,
    sheetLayout: state.sheetLayout || 'auto',
    notch: (state.notch && state.notch.w > 0 && state.notch.len > 0 && state.notch.w < state.width && state.notch.len < state.depth) ? { w: Number(state.notch.w), len: Number(state.notch.len), pod: (state.notch.pod && state.notch.pod.w > 0 && state.notch.pod.len > 0 && state.notch.pod.w < state.notch.w && state.notch.pod.len < state.notch.len) ? { w: Number(state.notch.pod.w), len: Number(state.notch.pod.len) } : null } : null,
    cornerLeft: state.cornerLeft || 'open',
    cornerRight: state.cornerRight || 'open',
    hasCanopy: state.tier === 'signature' ? (state.hasCanopy !== false) : false,
    hasDecking: state.tier === 'signature' ? (state.hasDecking !== false) : false,
    deckingDepth: state.deckingDepth || 400,
    frontComponents,
    leftComponents,
    rightComponents,
    planComponents,
    rooms,
    straightPartition: state.straightPartition,
    partitionRoom: state.partitionRoom,
    partitions: state.partitions || [],
    roomLabels: state.roomLabels || [],
    siteObjects: state.siteObjects || [],
    siteImage: state.siteImage || null,
    ui: ui || null,
    externalFeatures: (state.externalFeatures || []).filter(f => (f.elevation || 'front') === 'front'),
    leftExternalFeatures: (state.externalFeatures || []).filter(f => f.elevation === 'left'),
    rightExternalFeatures: (state.externalFeatures || []).filter(f => f.elevation === 'right'),
    rearExternalFeatures: (state.externalFeatures || []).filter(f => f.elevation === 'rear').map(f => ({ ...f, x: state.width - (f.x || 0) - 150 })),
    acUnits: state.acUnits || [],
    drawingLabels: state.drawingLabels || [],
    intDimWidthOffset: state.intDimWidthOffset || 0,
    intDimDepthOffset: state.intDimDepthOffset || 0,
    boundaries: {
      show: state.showBoundaries || false,
      left: parseInt(state.site?.boundaryLeft) || 0,
      right: parseInt(state.site?.boundaryRight) || 0,
      rear: parseInt(state.site?.boundaryRear) || 0,
    },
    title: `Proposed ${state.buildingType || 'Garden Office Building'} for:`,
    useCase: (state.primaryUse === 'custom' ? state.primaryUseCustom : formatUseCase(state.primaryUse)) || (state.survey?.useCase === 'custom' ? state.survey?.useCaseCustom : formatUseCase(state.survey?.useCase)) || state.buildingType || 'Garden Office',
    customer: state.customer?.name || '',
    address: state.customer?.address ? `@ ${state.customer.address}` : '',
    date: fmtDateUK(state.customer?.date) || '',
    spec: `${dims} | ${tierLabel}${roofSpec}`,
    roof,
    drawingNumber: state.customNotes?.drawingNumber || '',
    drawingNotes: state.customNotes?.drawing || '',
  });
}


/** SITE PLAN sheet: the building footprint in its surroundings (site objects, background map,
 *  boundaries), auto-scaled to A3 with a scale bar and north arrow. Same #plan-group so the
 *  editor works on it. */
export function generateSitePlan(state, componentsData, claddingData, ui) {
  const W = state.width, D = state.depth;
  const isSig = state.tier !== 'classic';
  const proj = isSig ? Math.max(state.hasCanopy !== false ? (state.overhangDepth || 400) : 0, state.hasDecking !== false ? (state.deckingDepth || 400) : 0) : 0;
  const objs = state.siteObjects || [], img = state.siteImage || null;
  const sb = siteBounds(objs, img);
  const bnd = { show: state.showBoundaries || false, left: parseInt(state.site?.boundaryLeft) || 0, right: parseInt(state.site?.boundaryRight) || 0, rear: parseInt(state.site?.boundaryRear) || 0 };
  const pad = 2500;
  const minX = Math.min(0, sb.minX, -(bnd.show ? bnd.left + 300 : 0)) - pad, minY = Math.min(0, sb.minY, -(bnd.show ? bnd.rear + 200 : 0)) - pad;
  const maxX = Math.max(W, sb.maxX, W + (bnd.show ? bnd.right + 300 : 0)) + pad, maxY = Math.max(D + proj, sb.maxY) + pad;
  const bw = maxX - minX, bh = maxY - minY;
  TS = Math.max(1, Math.min(3, Math.max(bw, bh) / 9000));
  const margin = 700 * TS, dim = 700 * TS, labH = 400 * TS;
  const pX = margin + dim, pY = margin + labH;
  const tiH = Math.max(2800 * TS, Math.min(bh, Math.max(bw, bh) * 0.4)), tiW = tiH * 1.8; // keep the title block's 1.8:1 template ratio
  const tiX = pX + bw + 600 * TS, tiY = pY;
  const totW = tiX + tiW + margin, totH = Math.max(pY + bh, tiY + tiH) + dim + 500 * TS + margin;
  let s = svgDefs();
  s += rc(0, 0, totW, totH, { fill: 'white' });
  s += rc(margin * 0.4, margin * 0.4, totW - margin * 0.8, totH - margin * 0.8, { sw: 4, stroke: '#333' });
  s += tx(pX + bw / 2, pY - 160 * TS, 'Site Plan', 180, { bold: true, color: '#222' });
  // plan content, building origin at (pX - minX, pY - minY)
  let g = '';
  g += renderSiteImage(img);
  g += renderSiteObjects(objs, ui, { big: true });
  g += rc(0, 0, W, D, { fill: '#cfd8e3', sw: 5, stroke: '#1f3b63' });
  if (proj > 0) g += rc(0, D, W, proj, { fill: '#e8edf3', sw: 2, stroke: '#1f3b63' });
  g += tx(W / 2, D / 2 + 60 * TS, `Proposed ${(W / 1000).toFixed(1)}m x ${(D / 1000).toFixed(1)}m ${state.buildingType || 'building'}`, 200, { bold: true, color: '#1f3b63' });
  g += tx(W / 2, D + proj + 1000 * TS, 'FRONT', 130, { color: '#1f3b63' });
  if (bnd.show) g += renderBoundaries(bnd, W, D, proj);
  // calibration markers (two clicks on the map)
  const cal = ui && ui.calib; if (cal && cal.pts && cal.pts.length) {
    cal.pts.forEach((p, i) => { g += tag('circle', { cx: p.x, cy: p.y, r: 120 * TS, fill: '#d97706', stroke: 'white', 'stroke-width': 20 }); });
    if (cal.pts.length === 2) g += ln(cal.pts[0].x, cal.pts[0].y, cal.pts[1].x, cal.pts[1].y, 30, '#d97706');
  }
  g += tag('rect', { class: 'plan-floor', x: minX, y: minY, width: bw, height: bh, fill: 'transparent' });
  // the floor pad must be UNDER the objects so they stay clickable: rebuild with it first
  g = tag('rect', { class: 'plan-floor', x: minX, y: minY, width: bw, height: bh, fill: 'transparent' }) + g.replace(tag('rect', { class: 'plan-floor', x: minX, y: minY, width: bw, height: bh, fill: 'transparent' }), '');
  // dims for the building (inside the group so clicks on them still count as plan clicks)
  g += dimH(0, W, D + proj + 80, `${W}mm`, 450 * TS, false);
  g += dimV(0, D, 0, `${D}mm`, -450 * TS);
  s += grp(g, { transform: `translate(${pX - minX},${pY - minY})`, id: 'plan-group' });
  // north arrow (unless the user placed one) + scale bar
  if (!objs.some((o) => o && o.kind === 'north')) {
    const nx = pX + bw - 900 * TS, ny = pY + 900 * TS, r = 500 * TS;
    s += tag('circle', { cx: nx, cy: ny, r, fill: 'white', stroke: '#333', 'stroke-width': 3 }) + tag('polygon', { points: `${nx},${ny - r * 0.85} ${nx - r * 0.3},${ny + r * 0.3} ${nx},${ny} ${nx + r * 0.3},${ny + r * 0.3}`, fill: '#333' }) + tx(nx, ny + r * 0.8, 'N', r * 0.5, { bold: true });
  }
  const barM = bw > 40000 ? 10000 : 5000; const bx = pX, by = pY + bh + 350 * TS;
  for (let i = 0; i < 5; i++) s += rc(bx + i * barM / 5, by, barM / 5, 120 * TS, { fill: i % 2 ? 'white' : '#333', sw: 2, stroke: '#333' });
  s += tx(bx, by - 60 * TS, '0', 110, { anchor: 'start' }); s += tx(bx + barM, by - 60 * TS, `${barM / 1000}m`, 110);
  const scaleLabel = `1:${totW / 400 <= 50 ? 50 : totW / 400 <= 100 ? 100 : totW / 400 <= 200 ? 200 : 500} @ A3`;
  s += grp(renderTitle({ w: tiW, h: tiH, title: `Site plan: proposed ${state.buildingType || 'building'} for:`, customer: state.customer?.name, address: state.customer?.address, date: state.customer?.date, spec: `${(W / 1000).toFixed(1)}m x ${(D / 1000).toFixed(1)}m x ${(state.height / 1000).toFixed(2).replace(/0$/, '')}m`, useCase: 'Site plan', drawingNumber: (state.customNotes?.drawingNumber || 'GOB-001') + '-S', scaleLabel }), { transform: `translate(${tiX},${tiY})` });
  return fastOpacity(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totW} ${totH}" style="background:white;width:100%;height:100%;">${s}</svg>`);
}
