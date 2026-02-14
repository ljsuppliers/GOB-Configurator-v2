// Title block renderer
// Positioned lower-right: logo, customer info, building description, disclaimer

export function renderTitleBlock(state, layout) {
  const { x, y, width, height } = layout;

  let svg = '';

  // Border
  svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white" stroke="#000" stroke-width="2"/>`;

  const pad = 12;
  const lineH = 18;
  let cy = y + pad + 10;

  // GOB Logo placeholder (will be replaced with actual image if available)
  svg += `<text x="${x + width / 2}" y="${cy}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#2c5530">GARDEN OFFICE BUILDINGS</text>`;
  cy += lineH + 5;

  svg += `<line x1="${x + pad}" y1="${cy - 5}" x2="${x + width - pad}" y2="${cy - 5}" stroke="#ccc" stroke-width="1"/>`;
  cy += 8;

  // Building type (bold header)
  const buildingType = state.buildingType || 'Garden Office Building';
  const titleText = `Proposed ${buildingType} for:`;
  svg += `<text x="${x + width / 2}" y="${cy}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#000">${titleText}</text>`;
  cy += lineH;

  // Customer name
  const name = state.customer?.name || '[Customer Name]';
  svg += `<text x="${x + width / 2}" y="${cy}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#000">${escapeXml(name)}</text>`;
  cy += lineH;

  // Address with @ symbol
  const address = state.customer?.address || '[Address]';
  svg += `<text x="${x + width / 2}" y="${cy}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#000">@ ${escapeXml(address)}</text>`;
  cy += lineH;

  // Date
  const date = state.customer?.date || formatDate(new Date());
  svg += `<text x="${x + width / 2}" y="${cy}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#000">${escapeXml(date)}</text>`;
  cy += lineH + 5;

  // Separator
  svg += `<line x1="${x + pad}" y1="${cy - 5}" x2="${x + width - pad}" y2="${cy - 5}" stroke="#ccc" stroke-width="1"/>`;
  cy += 8;

  // Building specs summary
  const specs = [
    `${(state.width / 1000).toFixed(1)}m x ${(state.depth / 1000).toFixed(1)}m x ${(state.height / 1000).toFixed(1)}m`,
    `${state.tier === 'signature' ? 'Signature' : 'Classic'} Range`,
    `${formatCladding(state.cladding?.front)} front cladding`
  ];

  for (const spec of specs) {
    svg += `<text x="${x + width / 2}" y="${cy}" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#444">${spec}</text>`;
    cy += 14;
  }

  cy += 5;

  // Disclaimer
  svg += `<text x="${x + width / 2}" y="${cy}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-style="italic" fill="#888">To scale. Drawing not 100% accurate</text>`;

  return `<g class="title-block">${svg}</g>`;
}

function formatDate(d) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatCladding(type) {
  if (!type) return 'Cedar';
  return type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    .replace('Western Red Cedar', 'Cedar')
    .replace('Anthracite Steel', 'Anthracite steel');
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
