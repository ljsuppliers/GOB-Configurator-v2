// Cladding hatching patterns for GOB drawings
// Side/rear: vertical lines ~27-30px apart
// Front: diagonal hatching pairs at 30-45 degree angle

export function verticalCladding(x, y, w, h, options = {}) {
  const spacing = options.spacing || 8;
  const strokeWidth = options.strokeWidth || 0.8;

  let svg = '';
  for (let cx = x + spacing; cx < x + w; cx += spacing) {
    svg += `<line x1="${cx}" y1="${y}" x2="${cx}" y2="${y + h}" stroke="#000" stroke-width="${strokeWidth}" opacity="0.5"/>`;
  }
  return svg;
}

export function diagonalCladding(x, y, w, h, options = {}) {
  const spacing = options.spacing || 16;
  const strokeWidth = options.strokeWidth || 0.8;
  const angle = 40; // degrees

  let svg = '';
  // Diagonal lines going top-left to bottom-right
  const dx = h * Math.tan((angle * Math.PI) / 180);

  // Clip to the rect area — unique ID per instance
  const clipId = `clad-${Math.round(x)}-${Math.round(y)}-${Math.round(Math.random()*9999)}`;
  svg += `<defs><clipPath id="${clipId}">`;
  svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  svg += `</clipPath></defs>`;

  svg += `<g clip-path="url(#${clipId})" opacity="0.45">`;

  for (let startX = x - h; startX < x + w + h; startX += spacing) {
    svg += `<line x1="${startX}" y1="${y}" x2="${startX + dx}" y2="${y + h}" stroke="#000" stroke-width="${strokeWidth}"/>`;
  }

  svg += '</g>';
  return svg;
}

export function horizontalCladding(x, y, w, h, options = {}) {
  const spacing = options.spacing || 10;
  const strokeWidth = options.strokeWidth || 0.8;

  let svg = '';
  for (let cy = y + spacing; cy < y + h; cy += spacing) {
    svg += `<line x1="${x}" y1="${cy}" x2="${x + w}" y2="${cy}" stroke="#000" stroke-width="${strokeWidth}" opacity="0.5"/>`;
  }
  return svg;
}

export function renderCladding(type, x, y, w, h, elevation = 'side') {
  // Front elevations use diagonal for timber/cedar, horizontal for composite
  if (elevation === 'front') {
    if (type === 'western-red-cedar' || type === 'larch') {
      return diagonalCladding(x, y, w, h);
    } else if (type && type.startsWith('composite-')) {
      return horizontalCladding(x, y, w, h);
    }
    return verticalCladding(x, y, w, h);
  }

  // Side/rear elevations always use vertical lines
  return verticalCladding(x, y, w, h);
}
