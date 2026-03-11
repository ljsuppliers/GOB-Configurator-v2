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

// Compact dimension label for individual components (doors/windows)
// Renders a small width dimension line below the component with "W x H" label
export function componentDimensions(compX, compY, compW, compH, widthMm, heightMm) {
  let svg = '';
  const textSize = 9;
  const color = '#555';
  const cs = 3; // chevron size

  // Position just below component
  const gap = 1;
  const offset = 8;
  const lineY = compY + compH + gap + offset;

  // Extension lines
  svg += `<line x1="${compX}" y1="${compY + compH + gap}" x2="${compX}" y2="${lineY + 2}" stroke="${color}" stroke-width="0.75" opacity="0.5"/>`;
  svg += `<line x1="${compX + compW}" y1="${compY + compH + gap}" x2="${compX + compW}" y2="${lineY + 2}" stroke="${color}" stroke-width="0.75" opacity="0.5"/>`;

  // Dimension line
  svg += `<line x1="${compX}" y1="${lineY}" x2="${compX + compW}" y2="${lineY}" stroke="${color}" stroke-width="1"/>`;

  // Chevron arrowheads
  svg += `<polyline points="${compX + cs},${lineY - cs / 2} ${compX},${lineY} ${compX + cs},${lineY + cs / 2}" fill="none" stroke="${color}" stroke-width="1"/>`;
  svg += `<polyline points="${compX + compW - cs},${lineY - cs / 2} ${compX + compW},${lineY} ${compX + compW - cs},${lineY + cs / 2}" fill="none" stroke="${color}" stroke-width="1"/>`;

  // Label text: "WIDTH x HEIGHT"
  const label = `${widthMm} x ${heightMm}`;
  const approxTextWidth = label.length * 5;

  if (compW >= approxTextWidth + 8) {
    // Text fits above the dimension line
    svg += `<text x="${compX + compW / 2}" y="${lineY - 3}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${textSize}" fill="${color}">${label}</text>`;
  } else {
    // Component too narrow; text below the dimension line
    svg += `<text x="${compX + compW / 2}" y="${lineY + textSize + 1}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${textSize}" fill="${color}">${label}</text>`;
  }

  return svg;
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
