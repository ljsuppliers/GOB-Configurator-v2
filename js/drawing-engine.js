// GOB Drawing Engine v2 — Ported from samples.html
// All coordinates in mm. viewBox handles scaling.

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
  composite:     '#8B7355',
  compositeLt:   '#A08060',
  compositeDk:   '#6B5545',
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
const CANOPY_DEPTH = 400; // front projection only

function svgDefs() {
  return `<defs>
    <linearGradient id="glass" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="${COL.glassReflect}" stop-opacity="0.8"/>
      <stop offset="25%" stop-color="${COL.glass}" stop-opacity="0.85"/>
      <stop offset="60%" stop-color="${COL.glassDark}" stop-opacity="0.88"/>
      <stop offset="85%" stop-color="${COL.glass}" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="${COL.glassReflect}" stop-opacity="0.75"/>
    </linearGradient>
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
    <pattern id="compositeClad" x="0" y="0" width="40" height="200" patternUnits="userSpaceOnUse">
      <rect width="40" height="200" fill="${COL.composite}"/>
      <line x1="0" y1="0" x2="0" y2="200" stroke="${COL.compositeDk}" stroke-width="2.5"/>
      <line x1="1.5" y1="0" x2="1.5" y2="200" stroke="${COL.compositeLt}" stroke-width="0.8" opacity="0.4"/>
      <line x1="39" y1="0" x2="39" y2="200" stroke="${COL.compositeDk}" stroke-width="1.2"/>
      <rect x="6" y="0" width="16" height="200" fill="${COL.compositeLt}" opacity="0.07"/>
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
function tx(x,y,str,sz,o) { o=o||{}; return tag('text',{x,y,'font-family':'Arial,Helvetica,sans-serif','font-size':sz,fill:o.color||'#222','text-anchor':o.anchor||'middle','font-weight':o.bold?'bold':undefined,'font-style':o.italic?'italic':undefined,'text-decoration':o.underline?'underline':undefined,'letter-spacing':o.spacing,transform:o.transform},str); }
function grp(c,a) { return tag('g',a||{},c); }

// ── Glass ────────────────────────────────────────────────────

function glassFill(x, y, w, h) {
  let s = '';
  s += rc(x, y, w, h, { fill: 'url(#glass)' });
  const rw = w * 0.12, rx1 = x + w * 0.3;
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

function secretCladdedDoor(x, y, w, h, claddingType) {
  // A door that blends into the cladding - just a faint outline
  let s = '';
  // Fill with cladding pattern (or neutral if not specified)
  s += rc(x, y, w, h, { fill: cladFill(claddingType || 'steel') });
  // Faint door outline - dashed to show it's a hidden door
  s += rc(x+10, y+10, w-20, h-20, { fill: 'none', sw: 3, stroke: '#555', 'stroke-dasharray': '15,8' });
  // Small handle indication on the right side
  const handleY = y + h * 0.45;
  s += rc(x + w - 60, handleY, 30, 80, { fill: '#444', sw: 1, stroke: '#333', rx: 4 });
  return grp(s);
}

// ── Windows ─────────────────────────────────────────────────

function windowFixed(x, y, w, h) {
  const t = Math.max(55, w * 0.09);
  let s = frameProfile(x,y,w,h,t);
  s += glassFill(x+t, y+t, w-t*2, h-t*2);
  s += rc(x+t, y+t, w-t*2, h-t*2, { sw: 0.5, stroke: '#252A2E' });
  return grp(s);
}

function windowOpener(x, y, w, h) {
  const t = Math.max(55, w * 0.09); // Main frame thickness
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
  // Weatherproof outdoor socket box
  const w = 150, h = 150;
  let s = '';
  // Weatherproof box
  s += rc(x, y, w, h, { fill: COL.white, sw: 2, stroke: '#999', rx: 6 });
  // Outer rim (weatherproof seal)
  s += rc(x+10, y+10, w-20, h-20, { fill: '#E8E8E8', sw: 1.5, stroke: '#AAA', rx: 4 });
  // Socket face
  const socketSize = 60;
  const socketX = x + (w-socketSize)/2;
  const socketY = y + (h-socketSize)/2;
  s += rc(socketX, socketY, socketSize, socketSize, { fill: COL.white, sw: 1, stroke: '#777', rx: 2 });
  // Socket pins (UK 3-pin)
  const pinW = 8, pinH = 18;
  s += rc(socketX+socketSize/2-pinW/2, socketY+10, pinW, pinH, { fill: '#333' }); // Top (earth)
  s += rc(socketX+15, socketY+35, pinW, pinH, { fill: '#333' }); // Left (live)
  s += rc(socketX+socketSize-15-pinW, socketY+35, pinW, pinH, { fill: '#333' }); // Right (neutral)
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
  else if (type.includes('cladded')) inner = secretCladdedDoor(x,y,w,h, claddingType);
  else if (type.includes('single')) inner = singleDoor(x,y,w,h, handleSide);
  else if (type.includes('slot')) inner = slotWindow(x,y,w,h);
  else if (type.includes('opener')) inner = windowOpener(x,y,w,h);
  else inner = windowFixed(x,y,w,h);
  
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
  const fontSize = label.fontSize || 140;
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
      s += ln(x, y, arrowX, arrowY, 3, '#D32F2F');
      // Arrowhead
      const headLen = 80, headW = 40;
      const ux = dx / len, uy = dy / len;
      const px = -uy, py = ux;
      const tipX = arrowX, tipY = arrowY;
      const baseX = tipX - ux * headLen, baseY = tipY - uy * headLen;
      s += tag('polygon', {
        points: `${tipX},${tipY} ${baseX + px * headW},${baseY + py * headW} ${baseX - px * headW},${baseY - py * headW}`,
        fill: '#D32F2F'
      });
    }
    // Arrow tip drag handle (invisible hit circle)
    s += `<g class="label-arrow draggable" data-label-id="${id}" style="cursor:move">`;
    s += tag('circle', { cx: arrowX, cy: arrowY, r: 60, fill: '#D32F2F', opacity: 0.3 });
    s += tag('circle', { cx: arrowX, cy: arrowY, r: 20, fill: '#D32F2F' });
    s += '</g>';
  }

  // Label text with background box
  s += `<g class="label-text draggable" data-label-id="${id}" style="cursor:move">`;
  s += rc(boxX, boxY, textW + padX * 2, textH, { fill: '#FFFFFF', sw: 2.5, stroke: '#D32F2F', rx: 6 });
  s += tx(x, y + fontSize * 0.35, text, fontSize, { color: '#D32F2F', bold: true });
  s += '</g>';

  return s;
}

function cladFill(t) {
  if (!t) return 'url(#steelClad)';
  // Cedar/timber types
  if (t==='western-red-cedar'||t==='cedar'||t==='diagonal'||t==='thermowood'||t==='larch') return 'url(#cedarClad)';
  // Composite types
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
  // Building outline - walls only (not fascia area)
  s += ln(0, ROOF_ZONE, 0, height, 5, '#222'); // left wall
  s += ln(width, ROOF_ZONE, width, height, 5, '#222'); // right wall
  s += ln(0, height, width, height, 5, '#222'); // bottom
  for (const comp of components) {
    const cy = comp.y !== undefined ? comp.y : (height - comp.h);
    s += renderComp(comp.type, comp.x, cy, comp.w, comp.h, comp.id, claddingType, comp.handleSide);
  }
  
  // Base trim at bottom of building - ALWAYS present on all tiers
  const trimH = deckH;
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

// ── Side Elevation ──────────────────────────────────────────

function renderSide(cfg) {
  const { depth, height, components, side, tier, overhang, corner, claddingType, hasCanopy, hasDecking } = cfg;
  const cid = 'sc'+side+Math.random().toString(36).substr(2,5);
  const wallTop = ROOF_ZONE;
  const wallH = height - wallTop;
  const isSig = tier === 'signature';
  const deckH = 100;
  const sideOverhang = 25; // 25mm fascia overhang at rear (matches front elevation sides)
  const showCanopy = isSig && hasCanopy !== false;
  const frontProj = showCanopy && overhang > 0 ? CANOPY_DEPTH : 50; // Signature w/ canopy: 400mm, otherwise: 50mm front overhang
  const rearProj = sideOverhang; // 25mm rear overhang for seamless fascia wrap
  const frontRight = side === 'left';
  // Fascia extends from rear overhang to front overhang - SEAMLESS with front elevation
  const fasciaX = frontRight ? -rearProj : -frontProj;
  const fasciaW = depth + frontProj + rearProj;
  let s = '';
  // Clip for wall cladding (main building only, not the overhangs)
  s += `<defs><clipPath id="${cid}"><rect x="0" y="${wallTop}" width="${depth}" height="${wallH}"/></clipPath></defs>`;
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
  const trimH = deckH;

  if (isSig && frontProj > 50) {
    // SIGNATURE with canopy (400mm front)
    const feStart = frontRight ? depth : -frontProj;
    const feEnd = frontRight ? depth + frontProj : 0;
    const proj = frontProj;
    const bldgEdge = frontRight ? depth : 0;

    // Base trim on main building only (not canopy projection)
    s += rc(0, height, depth, trimH, { fill: COL.anthracite });
    s += ln(0, height, depth, height, 1.5, COL.anthraciteDk);
    s += ln(0, height + trimH, depth, height + trimH, 1, COL.anthraciteDk);

    if (corner === 'closed') {
      // Closed corner - side screen is continuous with main building (no vertical break)
      const scCid = 'ssc'+Math.random().toString(36).substr(2,5);
      s += `<defs><clipPath id="${scCid}"><rect x="${feStart}" y="${wallTop}" width="${proj}" height="${wallH}"/></clipPath></defs>`;
      s += rc(feStart, wallTop, proj, wallH, { fill: cladFill(claddingType || 'steel'), clip: `url(#${scCid})` });
      // Only outer edge and bottom - NO vertical line at junction with main building
      s += ln(feEnd, ROOF_ZONE, feEnd, height, 3, '#222'); // outer edge only (far end)
      s += ln(feStart, height, feEnd, height, 3, '#222'); // bottom of screen
      const uX = frontRight ? feEnd - 180 : feStart;
      s += rc(uX, ROOF_ZONE, 180, wallH, { fill: COL.anthracite, sw: 0 });
      if (hasDecking !== false) {
        // Decking covers full width including canopy (drawn on top of base trim)
        s += rc(fasciaX, height, fasciaW, trimH, { fill: COL.decking });
        s += ln(fasciaX, height + trimH, fasciaX + fasciaW, height + trimH, 1, COL.deckingLine);
      }
    } else {
      // Open corner
      const trimX = frontRight ? bldgEdge - 50 : bldgEdge;
      s += rc(trimX, ROOF_ZONE, 50, wallH, { fill: COL.anthracite, sw: 0 });
      if (hasDecking !== false) {
        // Decking only on the 400mm canopy projection (drawn on top of base trim)
        s += rc(feStart, height, proj, trimH, { fill: COL.decking });
        const deckEdge = frontRight ? feEnd : feStart;
        s += ln(deckEdge, height, deckEdge, height + trimH, 1, COL.deckingLine);
      }
    }
  } else {
    // Classic or Signature without canopy - base trim full fascia width
    s += rc(fasciaX, height, fasciaW, trimH, { fill: COL.anthracite });
    s += ln(fasciaX, height, fasciaX + fasciaW, height, 1.5, COL.anthraciteDk);
    s += ln(fasciaX, height + trimH, fasciaX + fasciaW, height + trimH, 1, COL.anthraciteDk);
  }

  return s;
}

// ── Partition Room (for Plan View) ──────────────────────────

// Draw a door with swing arc - architectural plan style
// Shows: white opening in wall, door leaf perpendicular to wall, 90° arc
function drawDoor(x, y, width, wallThickness, direction, swingDir) {
  // direction: 'horizontal' or 'vertical' (which way the wall runs)
  // swingDir: 'left', 'right', 'up', 'down' (which way door swings into)
  let s = '';
  const doorW = width;
  const arcR = doorW * 0.95;
  
  if (direction === 'horizontal') {
    // Door in a horizontal wall (wall runs left-right)
    // Opening spans x to x+doorW
    s += rc(x, y, doorW, wallThickness, { fill: COL.white });
    
    if (swingDir === 'down') {
      // Hinge at left, swings down into room below
      const hx = x;
      const hy = y + wallThickness;
      // Door leaf: straight line from hinge, perpendicular to wall (pointing down)
      s += ln(hx, hy, hx, hy + arcR, 3, '#222');
      // Arc: from closed position (along wall) to open position (perpendicular)
      s += tag('path', { d: `M ${hx + arcR} ${hy} A ${arcR} ${arcR} 0 0 1 ${hx} ${hy + arcR}`, fill: 'none', stroke: '#222', 'stroke-width': 2 });
    } else {
      // Hinge at left, swings up into room above
      const hx = x;
      const hy = y;
      s += ln(hx, hy, hx, hy - arcR, 3, '#222');
      s += tag('path', { d: `M ${hx + arcR} ${hy} A ${arcR} ${arcR} 0 0 0 ${hx} ${hy - arcR}`, fill: 'none', stroke: '#222', 'stroke-width': 2 });
    }
  } else {
    // Door in a vertical wall (wall runs up-down)
    // Opening spans y to y+doorW
    s += rc(x, y, wallThickness, doorW, { fill: COL.white });
    
    if (swingDir === 'right') {
      // Hinge at top of opening, swings right into room
      const hx = x + wallThickness;
      const hy = y;
      // Door leaf: straight line from hinge, perpendicular to wall (pointing right)
      s += ln(hx, hy, hx + arcR, hy, 3, '#222');
      // Arc: from closed (along wall, pointing down) to open (pointing right)
      s += tag('path', { d: `M ${hx} ${hy + arcR} A ${arcR} ${arcR} 0 0 0 ${hx + arcR} ${hy}`, fill: 'none', stroke: '#222', 'stroke-width': 2 });
    } else {
      // Hinge at top of opening, swings left into room
      const hx = x;
      const hy = y;
      // Door leaf: straight line from hinge pointing left
      s += ln(hx, hy, hx - arcR, hy, 3, '#222');
      // Arc: from closed (along wall, pointing down) to open (pointing left)
      s += tag('path', { d: `M ${hx} ${hy + arcR} A ${arcR} ${arcR} 0 0 1 ${hx - arcR} ${hy}`, fill: 'none', stroke: '#222', 'stroke-width': 2 });
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
    s += drawDoor(wallX, doorY, doorW, partWt, 'vertical', swingDir);
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
    s += drawDoor(doorX, hWallY, doorW, partWt, 'horizontal', hDoorSwing);
  } else {
    const doorOffset = (vWallLen - partWt - doorW) * doorPos;
    const doorY = vWallY + Math.max(30, Math.min(doorOffset, vWallLen - partWt - doorW - 30));
    s += drawDoor(vWallX, doorY, doorW, partWt, 'vertical', vDoorSwing);
  }
  
  // Room label
  const labelX = rx + roomW / 2 + (pr.labelOffsetX || 0);
  const labelY = ry + roomD / 2 + 50 + (pr.labelOffsetY || 0);
  s += tx(labelX, labelY, pr.label || 'Room', 180, { color: '#444', bold: true });
  
  return s;
}

// ── Plan View ───────────────────────────────────────────────

function renderPlan(cfg) {
  const { width, depth, wallThickness, overhang, tier, components, rooms, cornerLeft, cornerRight, hasCanopy } = cfg;
  const wt = wallThickness || 150;
  const isSig = tier === 'signature';
  const showCanopy = isSig && hasCanopy !== false;
  const proj = CANOPY_DEPTH;
  let s = '';

  // For Classic: depth includes canopy area, so internal floor is larger (no external canopy projection)
  // For Signature: depth is building only, canopy projects additional 400mm in front

  if (showCanopy && overhang > 0) {
    // SIGNATURE: Show canopy as external projection
    s += rc(0, depth, width, proj, { fill: COL.white, sw: 4, stroke: '#222' });
    if (cornerLeft === 'closed') {
      s += rc(0, depth, wt, proj, { fill: COL.wallFill, sw: 3, stroke: '#222' });
    }
    if (cornerRight === 'closed') {
      s += rc(width-wt, depth, wt, proj, { fill: COL.wallFill, sw: 3, stroke: '#222' });
    }
    // Dashed line to indicate canopy projection above
    s += tag('rect', { x: 0, y: depth, width: width, height: proj,
      fill: 'none', stroke: '#888', 'stroke-width': 1, 'stroke-dasharray': '15,10' });
    
    // Spotlights in canopy - 1 per metre of width, rounded down
    const numSpotlights = Math.floor(width / 1000);
    if (numSpotlights > 0) {
      const spotSpacing = width / (numSpotlights + 1);
      const spotY = depth + proj / 2;
      for (let i = 1; i <= numSpotlights; i++) {
        const spotX = spotSpacing * i;
        // Draw spotlight as small circle with inner highlight
        s += tag('circle', { cx: spotX, cy: spotY, r: 42, fill: '#D0D0D0', stroke: '#555', 'stroke-width': 2.5 });
        s += tag('circle', { cx: spotX, cy: spotY, r: 24, fill: '#FFFDE8', stroke: '#999', 'stroke-width': 1.5 });
      }
    }
    // Main building outline
    s += rc(0, 0, width, depth, { fill: COL.wallFill, sw: 6, stroke: '#222' });
    s += rc(wt, wt, width-wt*2, depth-wt*2, { fill: COL.white, sw: 3, stroke: '#333' });
  } else if (!isSig && overhang > 0) {
    // CLASSIC with overhang: depth includes canopy, so internal floor is full depth
    // No external canopy projection - it's part of the stated depth
    s += rc(0, 0, width, depth, { fill: COL.wallFill, sw: 6, stroke: '#222' });
    // Internal floor area is depth - no canopy deduction (canopy is built into the depth measurement)
    s += rc(wt, wt, width-wt*2, depth-wt*2, { fill: COL.white, sw: 3, stroke: '#333' });
  } else {
    // No overhang - just the building
    s += rc(0, 0, width, depth, { fill: COL.wallFill, sw: 6, stroke: '#222' });
    s += rc(wt, wt, width-wt*2, depth-wt*2, { fill: COL.white, sw: 3, stroke: '#333' });
  }
  const hitPad = 80; // extra padding for click targets on thin wall elements
  for (const c of (components || [])) {
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
    } else if (c.wall === 'left') {
      s += `<g class="plan-component" data-comp-id="${c.id}" data-elevation="left" style="cursor:grab">`;
      s += rc(-hitPad, c.x, wt + hitPad * 2, c.w, { fill: 'transparent' });
      s += rc(0, c.x, wt, c.w, { fill: COL.white });
      s += ln(wt*0.3, c.x, wt*0.3, c.x+c.w, 1.5, COL.anthracite);
      s += ln(wt*0.7, c.x, wt*0.7, c.x+c.w, 1.5, COL.anthracite);
      s += '</g>';
    } else if (c.wall === 'right') {
      s += `<g class="plan-component" data-comp-id="${c.id}" data-elevation="right" style="cursor:grab">`;
      s += rc(width - wt - hitPad, c.x, wt + hitPad * 2, c.w, { fill: 'transparent' });
      s += rc(width-wt, c.x, wt, c.w, { fill: COL.white });
      s += ln(width-wt*0.3, c.x, width-wt*0.3, c.x+c.w, 1.5, COL.anthracite);
      s += ln(width-wt*0.7, c.x, width-wt*0.7, c.x+c.w, 1.5, COL.anthracite);
      s += '</g>';
    } else if (c.wall === 'rear') {
      s += `<g class="plan-component" data-comp-id="${c.id}" data-elevation="rear" style="cursor:grab">`;
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
  
  // Render boundary lines if enabled
  if (cfg.boundaries && cfg.boundaries.show) {
    s += renderBoundaries(cfg.boundaries, width, depth, isSig ? proj : 0);
  }

  // Render AC units
  if (cfg.acUnits && cfg.acUnits.length > 0) {
    for (const unit of cfg.acUnits) {
      s += renderAcUnit(unit);
    }
  }

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
    // Distance label - centred between boundary and building
    const midY = (startY + frontY) / 2;
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
    // Distance label
    const midY = (startY + frontY) / 2;
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
    
    <!-- Date -->
    <text x="${w*0.03}" y="${h*0.805}" font-family="Arial, sans-serif" font-size="${h*0.028}" fill="#888888">Date</text>
    <text x="${w*0.03}" y="${h*0.86}" font-family="Arial, sans-serif" font-size="${h*0.042}" font-weight="bold" fill="#222222">${date || '—'}</text>
    
    <!-- Scale -->
    <text x="${w*0.37}" y="${h*0.805}" font-family="Arial, sans-serif" font-size="${h*0.028}" fill="#888888">Scale</text>
    <text x="${w*0.37}" y="${h*0.86}" font-family="Arial, sans-serif" font-size="${h*0.042}" font-weight="bold" fill="#222222">1:50 @ A3</text>
    
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

// ── Dimension Lines ─────────────────────────────────────────

function dimH(x1, x2, y, label, off, labelBelow) {
  const yl = y+(off||250), cw = Math.min(100,(x2-x1)*0.05), ch = cw*0.5;
  let s = '';
  s += ln(x1,y+15,x1,yl+12,1.5,'#444');
  s += ln(x2,y+15,x2,yl+12,1.5,'#444');
  s += ln(x1,yl,x2,yl,3,'#111');
  s += tag('polyline',{points:`${x1+cw},${yl-ch} ${x1},${yl} ${x1+cw},${yl+ch}`,fill:'none',stroke:'#111','stroke-width':3});
  s += tag('polyline',{points:`${x2-cw},${yl-ch} ${x2},${yl} ${x2-cw},${yl+ch}`,fill:'none',stroke:'#111','stroke-width':3});
  // Label above or below the line
  const labelY = labelBelow ? yl + 140 : yl - 55;
  s += tx((x1+x2)/2, labelY, label, 170, { color: '#111' });
  return s;
}

function dimV(y1, y2, x, label, off) {
  const xl = x+(off||-350);
  const ch = Math.max(60, Math.min(100,(y2-y1)*0.05));
  const cw = ch*0.5;
  let s = '';
  // Tick lines from building to dimension line
  s += ln(x-15,y1,xl-12,y1,1.5,'#444');
  s += ln(x-15,y2,xl-12,y2,1.5,'#444');
  // Main dimension line
  s += ln(xl,y1,xl,y2,3,'#111');
  // Top arrow (pointing up)
  s += tag('polyline',{points:`${xl-cw},${y1+ch} ${xl},${y1} ${xl+cw},${y1+ch}`,fill:'none',stroke:'#111','stroke-width':3,'stroke-linejoin':'miter'});
  // Bottom arrow (pointing down)
  s += tag('polyline',{points:`${xl-cw},${y2-ch} ${xl},${y2} ${xl+cw},${y2-ch}`,fill:'none',stroke:'#111','stroke-width':3,'stroke-linejoin':'miter'});
  const cx = xl-70, cy = (y1+y2)/2;
  s += tx(cx, cy, label, 170, { transform: `rotate(-90 ${cx} ${cy})`, color: '#111' });
  return s;
}

// ── Full Drawing Composer ───────────────────────────────────

function compose(b) {
  const W=b.width, D=b.depth, H=b.height;
  const oh = b.overhang || 0;
  const isSig = b.tier === 'signature';
  const hasCanopy = b.hasCanopy !== false;
  const hasDecking = b.hasDecking !== false;
  // Only Signature with canopy shows external canopy projection
  const proj = (isSig && oh > 0 && hasCanopy) ? CANOPY_DEPTH : 0;
  const margin=700, dim=600, labH=350;
  const deckH = oh > 0 ? 100 : 0;
  const cL = b.cornerLeft || 'open';
  const cR = b.cornerRight || 'open';
  const gap = 600;

  const row1Y = margin + labH;
  const lX = margin + dim;
  const fX = lX + D + proj + gap;
  const rX = fX + W + gap + proj;
  const row1Right = rX + D + proj + dim;
  const row1Bottom = row1Y + H + deckH + 650;

  // Calculate boundary offsets for plan view
  const boundaryLeft = (b.boundaries?.show && b.boundaries?.left) ? b.boundaries.left + 300 : 0;
  const boundaryRight = (b.boundaries?.show && b.boundaries?.right) ? b.boundaries.right + 300 : 0;
  const boundaryRear = (b.boundaries?.show && b.boundaries?.rear) ? b.boundaries.rear + 200 : 0;

  const row2Y = row1Bottom + 250 + labH + boundaryRear;
  const pX = margin + dim + boundaryLeft;
  // Only add extra plan space for Signature canopy (when canopy is enabled)
  const planExtra = (isSig && oh > 0 && hasCanopy) ? CANOPY_DEPTH + 300 : 0;

  const tiW = Math.max(4000, D*2 + 1000);
  const tiH = Math.max(D + planExtra + 600, 2800);
  const tiX = pX + W + boundaryRight + 500;
  const tiY = row2Y;

  const totW = Math.max(row1Right + margin, tiX + tiW + margin, pX + W + boundaryRight + dim + margin);
  const totH = row2Y + Math.max(D + planExtra, tiH) + dim + 500 + margin;

  let s = svgDefs();
  s += rc(0,0,totW,totH,{fill:'white'});
  s += rc(margin*0.4, margin*0.4, totW-margin*0.8, totH-margin*0.8, { sw: 4, stroke: '#333' });

  // LEFT ELEVATION
  const sideDepthDim = (isSig && oh > 0 && hasCanopy) ? D + CANOPY_DEPTH : D;
  s += tx(lX+D/2, row1Y-160, 'Left Elevation', 180, { bold:true, color:'#222' });
  s += grp(renderSide({ depth:D, height:H, side:'left', tier:b.tier, overhang:oh, components:b.leftComponents||[], corner:cL, claddingType:b.leftCladding, hasCanopy, hasDecking }), { transform:`translate(${lX},${row1Y})` });
  s += dimH(lX, lX+sideDepthDim, row1Y+H+deckH+30, `${D}mm`, 250);
  // Height dimension on left side of left elevation
  s += dimV(row1Y, row1Y+H+deckH, lX, `${H}mm`, -450);

  // FRONT ELEVATION
  s += tx(fX+W/2, row1Y-160, 'Front Elevation', 180, { bold:true, color:'#222' });
  s += grp(renderFront({ width:W, height:H, overhang:oh, tier:b.tier, claddingType:b.frontCladding, components:b.frontComponents||[], cornerLeft:cL, cornerRight:cR, externalFeatures:b.externalFeatures||[], hasCanopy, hasDecking }), { transform:`translate(${fX},${row1Y})` });
  s += dimH(fX, fX+W, row1Y+H+deckH+30, `${W}mm`, 250);

  // RIGHT ELEVATION
  // For right side, canopy extends LEFT (negative x), so dimension starts earlier
  const rX_dimStart = (isSig && oh > 0 && hasCanopy) ? rX - CANOPY_DEPTH : rX;
  s += tx(rX+D/2, row1Y-160, 'Right Elevation', 180, { bold:true, color:'#222' });
  s += grp(renderSide({ depth:D, height:H, side:'right', tier:b.tier, overhang:oh, components:b.rightComponents||[], corner:cR, claddingType:b.rightCladding, hasCanopy, hasDecking }), { transform:`translate(${rX},${row1Y})` });
  s += dimH(rX_dimStart, rX+D, row1Y+H+deckH+30, `${D}mm`, 250);

  // PLAN VIEW
  const planLabelY = boundaryRear ? row2Y - boundaryRear - 160 : row2Y - 160;
  s += tx(pX+W/2, planLabelY, 'Plan View', 180, { bold:true, color:'#222' });
  s += grp(renderPlan({ width:W, depth:D, wallThickness:150, overhang:oh, tier:b.tier, components:b.planComponents||[], rooms:b.rooms, cornerLeft:cL, cornerRight:cR, straightPartition:b.straightPartition, partitionRoom:b.partitionRoom, boundaries:b.boundaries, hasCanopy, hasDecking, acUnits:b.acUnits||[] }), { transform:`translate(${pX},${row2Y})` });
  // Only add canopy space to dimension line for Signature
  const planDimY = (isSig && oh > 0 && hasCanopy) ? row2Y+D+CANOPY_DEPTH+80 : row2Y+D+80;
  // Width dimension - offset 450 to match depth dimension distance, label below line
  s += dimH(pX, pX+W, planDimY, `${W}mm`, 450, false);
  // Depth dimension - for Signature, stated depth includes canopy so measure to end of canopy
  const planDepthEnd = (isSig && oh > 0 && hasCanopy) ? row2Y+D+CANOPY_DEPTH : row2Y+D;
  s += dimV(row2Y, planDepthEnd, pX, `${D}mm`, -450);

  // Canopy/decking text below the plan view (only for Signature with overhang)
  if (isSig && oh > 0 && (hasCanopy || hasDecking)) {
    const numSpotlights = hasCanopy ? Math.floor(W / 1000) : 0;
    const features = [];
    if (hasCanopy) features.push('canopy');
    if (hasDecking) features.push('decking');
    let featureText = `Integrated ${features.join(' and ')} feature`;
    if (hasCanopy) featureText += ` (400mm) with ${numSpotlights} spotlight${numSpotlights !== 1 ? 's' : ''}`;
    s += tx(pX+W/2, planDimY+900, featureText, 120, { italic:true, color:'#666' });
  }

  // TITLE BLOCK
  s += grp(renderTitle({ w:tiW, h:tiH, title:b.title, customer:b.customer, address:b.address, date:b.date, spec:b.spec, useCase:b.useCase, drawingNumber:b.drawingNumber }), { transform:`translate(${tiX},${tiY})` });

  // DRAWING NOTES (if any)
  if (b.drawingNotes && b.drawingNotes.trim()) {
    const notesX = tiX;
    const notesY = tiY + tiH + 120;
    const notesW = tiW;
    const notesFontSize = 120;
    const notesLineHeight = 150;
    const maxCharsPerLine = Math.floor(notesW / (notesFontSize * 0.5));
    
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

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totW} ${totH}" style="background:white;width:100%;height:100%;">${s}</svg>`;
}

// ── Public API ──────────────────────────────────────────────

export function generateDrawing(state, componentsData, claddingData) {
  if (!state || !componentsData) return '';

  const allComps = { ...componentsData.doors, ...componentsData.windows };

  const frontComponents = [];
  const leftComponents = [];
  const rightComponents = [];
  const planComponents = [];

  for (const comp of (state.components || [])) {
    const def = allComps[comp.type];
    if (!def) continue;
    const w = def.width;
    const h = def.height;
    const x = comp.positionX || 0;

    // Calculate y position based on component category and custom position
    let y;
    if (def.category === 'slot' || def.category === 'standard') {
      // These can be moved vertically - check for custom position
      if (comp.positionY !== undefined && comp.positionY !== null) {
        // positionY is mm from ground, convert to y coordinate (from top)
        y = state.height - comp.positionY - h;
      } else if (def.category === 'slot') {
        // Default: slot windows near top of wall
        y = ROOF_ZONE + 100;
      } else {
        // Default: standard windows at desk height (centred)
        const wallTop = ROOF_ZONE;
        const wallH = state.height - wallTop;
        y = wallTop + (wallH - h) / 2;
      }
    }
    // else: full-height doors/windows default to ground level (y undefined → height - h)

    const elevEntry = { type: comp.type, x, w, h, y, id: comp.id, handleSide: comp.handleSide };
    const planX = comp.planPositionX ?? x;
    const planEntry = { wall: comp.elevation, type: comp.type, x: planX, w, id: comp.id };

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
      // Rear components only show on plan view (no rear elevation drawing)
      planComponents.push(planEntry);
    }
  }

  // Map cladding type
  const frontClad = claddingData?.types?.[state.cladding?.front];
  let frontCladding = 'cedar';
  if (frontClad?.category === 'steel') frontCladding = 'steel';
  else if (frontClad?.category === 'composite') frontCladding = 'composite';

  const leftClad = claddingData?.types?.[state.cladding?.left];
  let leftCladding = 'steel';
  if (leftClad?.category === 'timber') leftCladding = 'cedar';
  else if (leftClad?.category === 'composite') leftCladding = 'composite';

  const rightClad = claddingData?.types?.[state.cladding?.right];
  let rightCladding = 'steel';
  if (rightClad?.category === 'timber') rightCladding = 'cedar';
  else if (rightClad?.category === 'composite') rightCladding = 'composite';

  // Rooms
  const rooms = (state.rooms || [{ label: 'Office', widthMm: state.width }]).map(r => ({
    label: r.label,
    width: r.widthMm,
  }));

  const tierLabel = state.tier === 'signature' ? 'Signature' : 'Classic';
  const dims = `${(state.width/1000).toFixed(1)}m x ${(state.depth/1000).toFixed(1)}m x ${(state.height/1000).toFixed(1)}m`;
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
    cornerLeft: state.cornerLeft || 'open',
    cornerRight: state.cornerRight || 'open',
    hasCanopy: state.tier === 'signature' ? (state.hasCanopy !== false) : false,
    hasDecking: state.tier === 'signature' ? (state.hasDecking !== false) : false,
    frontComponents,
    leftComponents,
    rightComponents,
    planComponents,
    rooms,
    straightPartition: state.straightPartition,
    partitionRoom: state.partitionRoom,
    externalFeatures: state.externalFeatures || [],
    acUnits: state.acUnits || [],
    drawingLabels: state.drawingLabels || [],
    boundaries: {
      show: state.showBoundaries || false,
      left: parseInt(state.site?.boundaryLeft) || 0,
      right: parseInt(state.site?.boundaryRight) || 0,
      rear: parseInt(state.site?.boundaryRear) || 0,
    },
    title: `Proposed ${state.buildingType || 'Garden Office Building'} for:`,
    useCase: (state.survey?.useCase === 'custom' ? state.survey?.useCaseCustom : formatUseCase(state.survey?.useCase)) || state.buildingType || 'Garden Office',
    customer: state.customer?.name || '',
    address: state.customer?.address ? `@ ${state.customer.address}` : '',
    date: state.customer?.date || '',
    spec: `${dims} | ${tierLabel}`,
    drawingNumber: state.customNotes?.drawingNumber || '',
    drawingNotes: state.customNotes?.drawing || '',
  });
}
