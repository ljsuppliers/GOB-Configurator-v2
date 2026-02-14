// Dimension lines and annotations for GOB drawings
// Matches the convention: line with chevron arrowheads, text labels

export function horizontalDimension(x, y, length, label, options = {}) {
  const offset = options.offset || 40;
  const textSize = options.textSize || 14;
  const dy = y + offset;

  // Extension lines
  let svg = '';
  svg += `<line x1="${x}" y1="${y + 5}" x2="${x}" y2="${dy + 5}" stroke="#000" stroke-width="1" opacity="0.5"/>`;
  svg += `<line x1="${x + length}" y1="${y + 5}" x2="${x + length}" y2="${dy + 5}" stroke="#000" stroke-width="1" opacity="0.5"/>`;

  // Main dimension line
  svg += `<line x1="${x}" y1="${dy}" x2="${x + length}" y2="${dy}" stroke="#000" stroke-width="1.5"/>`;

  // Chevron arrowheads
  const chevSize = 6;
  svg += `<polyline points="${x + chevSize},${dy - chevSize / 2} ${x},${dy} ${x + chevSize},${dy + chevSize / 2}" fill="none" stroke="#000" stroke-width="1.5"/>`;
  svg += `<polyline points="${x + length - chevSize},${dy - chevSize / 2} ${x + length},${dy} ${x + length - chevSize},${dy + chevSize / 2}" fill="none" stroke="#000" stroke-width="1.5"/>`;

  // Text
  const tx = x + length / 2;
  svg += `<text x="${tx}" y="${dy - 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${textSize}" fill="#000">${label}</text>`;

  return svg;
}

export function verticalDimension(x, y, length, label, options = {}) {
  const offset = options.offset || -40;
  const textSize = options.textSize || 14;
  const dx = x + offset;

  // Extension lines
  let svg = '';
  svg += `<line x1="${x - 5}" y1="${y}" x2="${dx - 5}" y2="${y}" stroke="#000" stroke-width="1" opacity="0.5"/>`;
  svg += `<line x1="${x - 5}" y1="${y + length}" x2="${dx - 5}" y2="${y + length}" stroke="#000" stroke-width="1" opacity="0.5"/>`;

  // Main dimension line
  svg += `<line x1="${dx}" y1="${y}" x2="${dx}" y2="${y + length}" stroke="#000" stroke-width="1.5"/>`;

  // Chevron arrowheads
  const chevSize = 6;
  svg += `<polyline points="${dx - chevSize / 2},${y + chevSize} ${dx},${y} ${dx + chevSize / 2},${y + chevSize}" fill="none" stroke="#000" stroke-width="1.5"/>`;
  svg += `<polyline points="${dx - chevSize / 2},${y + length - chevSize} ${dx},${y + length} ${dx + chevSize / 2},${y + length - chevSize}" fill="none" stroke="#000" stroke-width="1.5"/>`;

  // Text (rotated 90deg)
  const ty = y + length / 2;
  svg += `<text x="${dx - 5}" y="${ty}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${textSize}" fill="#000" transform="rotate(-90 ${dx - 5} ${ty})">${label}</text>`;

  return svg;
}

export function overallWidthDimension(x, y, width, depthForOffset) {
  return horizontalDimension(x, y, width, `${Math.round(width * (1000 / 1))}mm overall width`.replace(/NaN/, ''), {
    offset: 45,
    textSize: 13
  });
}

// Format mm value with label
export function formatMm(valueMm) {
  return `${Math.round(valueMm)}mm`;
}

// Boundary annotation
export function boundaryAnnotation(x, y, distance, side) {
  let svg = '';
  const label = `(Approximate boundary) ${distance}`;

  if (side === 'left' || side === 'right') {
    svg += `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-style="italic" fill="#000" transform="rotate(-90 ${x} ${y})">${label}</text>`;
  } else {
    svg += `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-style="italic" fill="#000">${label}</text>`;
  }

  return svg;
}
