// Gutter, downpipes, trim, fascia, soffit rendering
// Gutter bar: filled #5D5E5E, height ~16.7px
// Downpipes: polyline filled #5D5E5E, stroke-width 4, ~14px wide
// Gutter outlet: path semicircle arc, stroke-width 6, ~52px diameter

export function gutterBar(x, y, w, options = {}) {
  const h = options.height || 5;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#5D5E5E" stroke="none"/>`;
}

export function downpipe(x, y, h, options = {}) {
  const w = options.width || 4;
  const hw = w / 2;
  return `<g class="downpipe">
    <rect x="${x - hw}" y="${y}" width="${w}" height="${h}" fill="#5D5E5E" stroke="none"/>
  </g>`;
}

export function gutterOutlet(cx, cy, options = {}) {
  const r = options.radius || 8;
  // Semicircle arc facing down
  return `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}" fill="none" stroke="#5D5E5E" stroke-width="2"/>`;
}

export function fascia(x, y, w, options = {}) {
  const h = options.height || 3;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#000" stroke-width="2"/>`;
}

// Render complete gutter system for an elevation
export function renderGutterSystem(x, y, w, h, options = {}) {
  const gutterH = 5;
  const fasciaH = 3;
  const showDownpipes = options.showDownpipes !== false;

  let svg = '';

  // Gutter at bottom of elevation
  svg += gutterBar(x, y + h, w, { height: gutterH });

  // Downpipes at corners (if side elevation or specified)
  if (showDownpipes) {
    const dpHeight = h * 0.2;
    if (options.downpipeLeft !== false) {
      svg += downpipe(x + 6, y + h + gutterH, dpHeight);
      svg += gutterOutlet(x + 6, y + h + gutterH);
    }
    if (options.downpipeRight !== false) {
      svg += downpipe(x + w - 6, y + h + gutterH, dpHeight);
      svg += gutterOutlet(x + w - 6, y + h + gutterH);
    }
  }

  return svg;
}

// Overhang/soffit rendering for front elevation
export function renderOverhang(x, y, w, depth, options = {}) {
  if (depth <= 0) return '';

  const overhangScale = depth / 400 * 12; // scale visual depth

  let svg = '';
  // Soffit area (hatched rectangle above wall)
  svg += `<rect x="${x - overhangScale}" y="${y - overhangScale}" width="${w + overhangScale * 2}" height="${overhangScale}" fill="none" stroke="#000" stroke-width="1.5" stroke-dasharray="4,2"/>`;

  // Soffit lights (dots)
  if (options.softitLights) {
    const count = Math.max(3, Math.round(w / 40));
    const spacing = w / (count + 1);
    for (let i = 1; i <= count; i++) {
      svg += `<circle cx="${x + spacing * i}" cy="${y - overhangScale / 2}" r="2" fill="#666"/>`;
    }
  }

  return svg;
}
