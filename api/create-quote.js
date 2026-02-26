/**
 * GOB Configurator — Google Sheets Quote Generator
 * Vercel Serverless Function — no local server needed.
 * Generates a professional, branded quote sheet from scratch.
 */

const { google } = require('googleapis');

// ─── Brand Palette ───
const TEAL       = { red: 0.231, green: 0.659, blue: 0.659 };  // #3BA8A8
const TEAL_DARK  = { red: 0.180, green: 0.520, blue: 0.520 };  // #2E8585
const TEAL_PALE  = { red: 0.922, green: 0.965, blue: 0.965 };  // #EBF6F6
const WHITE      = { red: 1, green: 1, blue: 1 };
const OFF_WHITE  = { red: 0.976, green: 0.980, blue: 0.984 };   // #F9FAFB
const CHARCOAL   = { red: 0.173, green: 0.192, blue: 0.212 };   // #2C3136
const DARK_GREY  = { red: 0.30, green: 0.32, blue: 0.34 };
const MID_GREY   = { red: 0.55, green: 0.57, blue: 0.59 };
const LIGHT_GREY = { red: 0.94, green: 0.945, blue: 0.95 };     // #F0F1F2
const GREEN_TEXT  = { red: 0.09, green: 0.55, blue: 0.25 };
const BORDER_COL = { red: 0.82, green: 0.84, blue: 0.85 };

const QUOTES_FOLDER_ID = '18dfAzGwqwqT-zI0yUBO60MrIFkvInULP';

// ─── Logo Upload ───
let logoFileId = null;

async function ensureLogoUploaded(driveApi) {
  if (logoFileId) return;

  try {
    // Check for existing logo in quotes folder
    const searchRes = await driveApi.files.list({
      q: `name = 'GOB-Logo-Text.png' and '${QUOTES_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id)',
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      logoFileId = searchRes.data.files[0].id;
      console.log('Found existing logo on Drive:', logoFileId);
      return;
    }

    // Upload logo from bundled assets
    const fs = require('fs');
    const path = require('path');
    const logoPath = path.join(__dirname, '..', 'assets', 'logo-text.png');

    const fileMetadata = {
      name: 'GOB-Logo-Text.png',
      parents: [QUOTES_FOLDER_ID],
    };
    const media = {
      mimeType: 'image/png',
      body: fs.createReadStream(logoPath),
    };

    const uploadRes = await driveApi.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id',
    });

    logoFileId = uploadRes.data.id;

    // Make publicly readable so =IMAGE() formula works
    await driveApi.permissions.create({
      fileId: logoFileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    console.log('Uploaded logo to Drive:', logoFileId);
  } catch (err) {
    console.warn('Logo upload failed (non-fatal):', err.message);
  }
}

// ─── Auth ───
function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return oauth2Client;
}

// ─── Helpers ───
function fmtDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtCurrency(amount) {
  if (!amount && amount !== 0) return '';
  const n = Number(amount);
  if (isNaN(n)) return '';
  if (n < 0) return '-\u00A3' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '\u00A3' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getInternalDims(q) {
  const isSig = q.tier === 'signature';
  const intW = q.width - 300;
  const intD = q.depth - (isSig ? 700 : 300);
  let hReduction = 350;
  if (q.height > 2750) hReduction = 550;
  else if (q.height > 2500) hReduction = 450;
  const intH = q.height - hReduction;
  return { intW, intD, intH };
}

function getDownlights(q) {
  const sqm = (q.width / 1000) * (q.depth / 1000);
  if (sqm <= 9) return 4;
  if (sqm <= 15) return 6;
  if (sqm <= 24) return 8;
  if (sqm <= 32) return 10;
  return 12;
}

function getSpotlights(q) {
  if (q.tier !== 'signature') return 0;
  return Math.floor(q.width / 1000);
}

function getSocketCount(q) {
  const sqm = (q.width / 1000) * (q.depth / 1000);
  if (sqm <= 10) return 4;
  if (sqm <= 25) return 5;
  return 7;
}

function formatComponentDesc(comp) {
  const widthM = comp.width ? (comp.width / 1000).toFixed(1) : '2.5';
  let typeDesc = 'window';
  const t = comp.type || '';
  if (t.includes('sliding')) typeDesc = 'sliding door';
  else if (t.includes('bifold')) typeDesc = 'bi-fold door';
  else if (t.includes('single') && !t.includes('window')) typeDesc = 'single opening door';
  else if (t.includes('cladded') || t.includes('secret')) typeDesc = 'secret cladded door';
  else if (t.includes('opener')) typeDesc = 'window with top opener';
  else if (t.includes('slot')) typeDesc = 'slot window';
  else if (t.includes('fixed') || t.includes('window')) typeDesc = 'fixed window';

  let handleDesc = '';
  if (t.includes('sliding') || t.includes('single')) {
    handleDesc = comp.handleSide === 'left' ? ' (opening left to right)' : ' (opening right to left)';
  }
  const elev = comp.elevation ? ` \u2014 ${comp.elevation} elevation` : '';
  return `1 x full height ${widthM}m wide ${typeDesc}: smooth anthracite grey outside, white inside${handleDesc}${elev}`;
}

// ═══════════════════════════════════════════════════
// SHEET BUILDER — builds rows, merges, borders
// ═══════════════════════════════════════════════════
//
// Layout: 8 columns (A-H)
//   A (col 0): left gutter — 18px
//   B (col 1): main content — 520px (merges B:F for descriptions)
//   C (col 2): 80px
//   D (col 3): 80px
//   E (col 4): 80px
//   F (col 5): 80px
//   G (col 6): price — 110px
//   H (col 7): right gutter — 18px

const NUM_COLS = 8;
const COL_WIDTHS = [18, 520, 80, 80, 80, 80, 110, 18];
const DESC_START = 1; // column B
const DESC_END   = 6; // merge B:F (cols 1-5)
const PRICE_COL  = 6; // column G

function buildQuoteSheet(q) {
  const isSig = q.tier === 'signature';
  const { intW, intD, intH } = getInternalDims(q);
  const w = (q.width / 1000).toFixed(1);
  const d = (q.depth / 1000).toFixed(1);
  const h = (q.height / 1000).toFixed(1);
  const numDownlights = getDownlights(q);
  const numSpotlights = getSpotlights(q);

  const rows = [];     // [{cells, height}]
  const merges = [];   // [{startRow, endRow, startCol, endCol}]
  const borders = [];  // [{row, startCol, endCol, side, color, style}]

  // Row builders
  function blank(count = 1, height) {
    for (let i = 0; i < count; i++) rows.push({ cells: [], height });
  }

  function descRow(text, opts = {}) {
    const r = rows.length;
    const cells = [{ col: DESC_START, value: text, ...opts }];
    if (opts.price !== undefined) {
      cells.push({ col: PRICE_COL, value: fmtCurrency(opts.price), fontSize: opts.priceFontSize || 10, align: 'RIGHT', bold: opts.priceBold });
    }
    rows.push({ cells, height: opts.height });
    // Merge description across B:F
    merges.push({ startRow: r, endRow: r + 1, startCol: DESC_START, endCol: DESC_END });
    return r;
  }

  function sectionBar(text, opts = {}) {
    const r = rows.length;
    const cells = [];
    for (let c = 0; c < NUM_COLS; c++) {
      if (c === DESC_START) {
        cells.push({ col: c, value: text, bold: true, fontSize: opts.fontSize || 11, fg: WHITE, bg: TEAL });
      } else if (c === PRICE_COL && opts.showPrice) {
        cells.push({ col: c, value: 'Price', bold: true, fontSize: 10, fg: WHITE, bg: TEAL, align: 'RIGHT' });
      } else {
        cells.push({ col: c, value: '', bg: TEAL });
      }
    }
    rows.push({ cells, height: opts.height || 28 });
    merges.push({ startRow: r, endRow: r + 1, startCol: DESC_START, endCol: DESC_END });
    return r;
  }

  function subHeader(text) {
    const r = rows.length;
    rows.push({
      cells: [{ col: DESC_START, value: text, bold: true, fontSize: 11, fg: TEAL }],
      height: 24,
    });
    merges.push({ startRow: r, endRow: r + 1, startCol: DESC_START, endCol: DESC_END });
    // Bottom border line
    borders.push({ row: r, startCol: DESC_START, endCol: PRICE_COL + 1, side: 'bottom', color: TEAL, style: 'SOLID' });
    return r;
  }

  function detailRow(text, opts = {}) {
    return descRow(text, { fontSize: 9, fg: MID_GREY, ...opts });
  }

  function lineItemRow(label, price, opts = {}) {
    const r = rows.length;
    const cells = [
      { col: DESC_START, value: label, fontSize: opts.fontSize || 10, fg: opts.fg || CHARCOAL, bold: opts.bold },
      { col: PRICE_COL, value: price != null ? fmtCurrency(price) : '', fontSize: opts.fontSize || 10, fg: opts.priceFg || CHARCOAL, align: 'RIGHT', bold: opts.bold },
    ];
    if (opts.bg) {
      for (let c = 0; c < NUM_COLS; c++) {
        if (c !== DESC_START && c !== PRICE_COL) cells.push({ col: c, value: '', bg: opts.bg });
        else {
          const existing = cells.find(cell => cell.col === c);
          if (existing) existing.bg = opts.bg;
        }
      }
    }
    rows.push({ cells, height: opts.height });
    merges.push({ startRow: r, endRow: r + 1, startCol: DESC_START, endCol: DESC_END });
    // Light bottom border for readability
    borders.push({ row: r, startCol: DESC_START, endCol: PRICE_COL + 1, side: 'bottom', color: BORDER_COL, style: 'SOLID' });
    return r;
  }

  // ════════════════════════════════════════
  // HEADER
  // ════════════════════════════════════════
  blank(1);

  // Company logo / name
  const companyRow = rows.length;
  if (logoFileId) {
    rows.push({
      cells: [{ col: DESC_START, value: `=IMAGE("https://drive.google.com/uc?id=${logoFileId}", 4, 37, 200)` }],
      height: 42,
    });
  } else {
    rows.push({
      cells: [{ col: DESC_START, value: 'Garden Office Buildings', bold: true, fontSize: 22, fg: TEAL }],
      height: 38,
    });
  }
  merges.push({ startRow: companyRow, endRow: companyRow + 1, startCol: DESC_START, endCol: PRICE_COL + 1 });

  // Address
  descRow('Rear of 158 Main Road, Biggin Hill, Kent, TN16 3BA', { fontSize: 9, fg: MID_GREY });

  // Contact
  descRow('01689 818 400  \u2022  info@gardenofficebuildings.co.uk  \u2022  gardenofficebuildings.co.uk', { fontSize: 9, fg: MID_GREY });

  // Teal accent line under header
  const lineRow = rows.length;
  blank(1, 4);
  borders.push({ row: lineRow, startCol: DESC_START, endCol: PRICE_COL + 1, side: 'bottom', color: TEAL, style: 'SOLID_MEDIUM' });

  blank(1);

  // QUOTATION title + date
  const titleRow = rows.length;
  const dateStr = fmtDate(q.date || new Date());
  rows.push({
    cells: [
      { col: DESC_START, value: 'QUOTATION', bold: true, fontSize: 18, fg: CHARCOAL },
      { col: PRICE_COL, value: dateStr, fontSize: 10, fg: MID_GREY, align: 'RIGHT' },
    ],
    height: 32,
  });
  merges.push({ startRow: titleRow, endRow: titleRow + 1, startCol: DESC_START, endCol: DESC_END });

  blank(1);

  // ════════════════════════════════════════
  // CUSTOMER INFO
  // ════════════════════════════════════════
  const custLines = [
    q.customerName ? `Customer:   ${q.customerName}` : null,
    q.customerNumber ? `Customer No:   ${q.customerNumber}` : null,
    q.address ? `Address:   ${q.address}` : null,
    q.email ? `Email:   ${q.email}` : null,
    q.phone ? `Phone:   ${q.phone}` : null,
  ].filter(Boolean);

  for (const field of custLines) {
    descRow(field, { fontSize: 10, fg: CHARCOAL, height: 20 });
  }

  blank(1);

  // ════════════════════════════════════════
  // BUILDING SPECIFICATION
  // ════════════════════════════════════════
  sectionBar('BUILDING SPECIFICATION', { showPrice: true });
  blank(1, 6);

  // Building summary line
  const buildingType = q.buildingType || 'Garden Office Building';
  lineItemRow(
    `Your Building: ${w}M x ${d}M x ${h}m ${buildingType}`,
    q.basePrice,
    { bold: true, fontSize: 11 }
  );

  // Dimension details
  const extNote = isSig ? ' (incl. 400mm canopy/decking)' : '';
  detailRow(`External Dimensions \u2013 (W) ${q.width}mm (D) x ${q.depth}mm x (H) ${q.height}mm${extNote}`);
  detailRow(`Internal Dimensions \u2013 (W) ${intW}mm x (D) ${intD}mm x (H) ${intH}mm (approx)`);

  blank(1, 6);

  // ════════════════════════════════════════
  // STANDARD FEATURES
  // ════════════════════════════════════════
  subHeader(`Standard Features (${isSig ? 'Signature' : 'Classic'})`);

  descRow('Configuration as per drawing (TBC)', { fontSize: 10 });
  if (isSig) {
    descRow('Signature range with integrated canopy and decking on front of building', { fontSize: 10 });
  } else {
    descRow('Classic range with clean, minimalist design', { fontSize: 10 });
  }
  descRow('Insulated timber/panel construction with 100mm PIR walls, 75mm PIR floor and ceiling', { fontSize: 10 });
  if (isSig) {
    descRow('To include 400mm overhang/decking', { fontSize: 10 });
  }
  descRow('Plaster-boarded, skimmed and decorated internal finish', { fontSize: 10 });

  // Foundation (if non-standard, e.g. existing base)
  const foundationLabels = {
    'ground-screw': 'Ground screw foundation system',
    'concrete-base': 'Concrete base foundation',
    'concrete-pile': 'Concrete pile foundation system',
  };
  descRow(foundationLabels[q.foundationType] || 'Ground screw foundation system', { fontSize: 10 });

  // Corners
  descRow(`Front-left corner design (open/closed): ${q.cornerLeft || 'Open'}`, { fontSize: 10 });
  descRow(`Front-right corner design (open/closed): ${q.cornerRight || 'Open'}`, { fontSize: 10 });

  blank(1, 6);

  // ════════════════════════════════════════
  // EXTERNAL FINISH
  // ════════════════════════════════════════
  subHeader('External Finish');

  const claddingItems = [
    { side: 'Front', value: q.frontCladding },
    { side: 'Right', value: q.rightCladding, price: q.rightCladdingPrice },
    { side: 'Left', value: q.leftCladding, price: q.leftCladdingPrice },
    { side: 'Rear', value: q.rearCladding },
  ];
  for (const cl of claddingItems) {
    const label = `${cl.side} cladding: ${cl.value || 'anthracite grey steel'}`;
    if (cl.price && cl.price > 0) {
      lineItemRow(label, cl.price);
    } else {
      descRow(label, { fontSize: 10 });
    }
  }

  descRow('Fascia, soffit and cappings: grey', { fontSize: 10 });
  descRow('Roof: EPDM rubber roof', { fontSize: 10 });
  descRow('Guttering: rear', { fontSize: 10 });

  if (isSig && q.hasDecking !== false) {
    descRow('Integrated composite decking: dark grey', { fontSize: 10 });
  }

  blank(1, 6);

  // ════════════════════════════════════════
  // INTERNAL FINISH
  // ════════════════════════════════════════
  subHeader('Internal Finish');

  descRow('Flooring: TBC (Natural Oak or Light Grey)', { fontSize: 10 });
  descRow('Internal wall finish: plasterboarded, skimmed and decorated white', { fontSize: 10 });
  descRow('Skirting board: white', { fontSize: 10 });

  blank(1, 6);

  // ════════════════════════════════════════
  // DOORS & WINDOWS
  // ════════════════════════════════════════
  subHeader('Doors, Windows, Partitions');

  if (q.components && q.components.length > 0) {
    for (const comp of q.components) {
      const desc = formatComponentDesc(comp);
      if (comp.price && comp.price > 0) {
        lineItemRow(desc, comp.price);
      } else {
        descRow(desc, { fontSize: 10 });
      }
    }
  }

  descRow('4mm double glazed toughened glass throughout', { fontSize: 10 });

  // Component upgrades
  if (q.componentUpgrades && q.componentUpgrades.length > 0) {
    for (const u of q.componentUpgrades) {
      lineItemRow(u.label, u.price);
    }
  }

  // Height upgrade
  if (q.heightUpgrade && q.heightUpgrade.price > 0) {
    lineItemRow(q.heightUpgrade.label, q.heightUpgrade.price);
  }

  blank(1, 6);

  // ════════════════════════════════════════
  // ELECTRICAL INSTALLATION
  // ════════════════════════════════════════
  subHeader('Standard Electrical Features');

  descRow(`${numDownlights} x dimmable LED downlights`, { fontSize: 10 });
  detailRow('Configuration/Quantity TBC on 1st fix electrician visit approximately 1 week into project');

  if (numSpotlights > 0) {
    descRow(`${numSpotlights} x external downlights in canopy soffit`, { fontSize: 10 });
  }

  const apiSocketCount = getSocketCount(q);
  descRow(`${apiSocketCount} x double power sockets in brushed steel finish (1 with USB ports)`, { fontSize: 10 });

  let lightingZones = 1;
  if (q.straightPartition?.enabled) lightingZones++;
  if (q.partitionRoom?.enabled) lightingZones++;
  if (lightingZones > 1) {
    descRow(`${lightingZones} x internal lighting zones on separate switches`, { fontSize: 10 });
  }

  descRow('1 x single dimmable light switch in brushed steel', { fontSize: 10 });
  descRow('1 x network connection port', { fontSize: 10 });
  descRow('Consumer unit', { fontSize: 10 });

  blank(1, 6);

  // ════════════════════════════════════════
  // SELECTED EXTRAS & UPGRADES
  // ════════════════════════════════════════
  const hasExtras = (q.extras && q.extras.length > 0) || (q.deductions && q.deductions.length > 0);

  if (hasExtras) {
    subHeader('Selected Extras & Upgrades');

    let altBg = false;
    if (q.extras && q.extras.length > 0) {
      for (const extra of q.extras) {
        lineItemRow(extra.label, extra.price, { bg: altBg ? LIGHT_GREY : undefined });
        if (extra.description) {
          detailRow(extra.description);
        }
        altBg = !altBg;
      }
    }

    if (q.deductions && q.deductions.length > 0) {
      for (const ded of q.deductions) {
        lineItemRow(ded.label, ded.price, { priceFg: GREEN_TEXT, bg: altBg ? LIGHT_GREY : undefined });
        altBg = !altBg;
      }
    }

    blank(1, 6);
  }

  // ════════════════════════════════════════
  // OPTIONAL EXTRAS
  // ════════════════════════════════════════
  subHeader('Optional extras available');

  const optionalExtras = [
    ['External double plug socket', '£235.00'],
    ['External up/down light', '£95.00'],
    ['Oil filled electric wall panel radiator', '£495.00'],
    ['Additional double plug socket', '£60.00', '£85.00 w/ USB ports'],
    ['Additional lighting zone on separate switch', '£125.00'],
    ['Wireless double quinetic switch system', '£265.00', 'wireless switch to turn on/off external lights from house'],
    ['Standard air conditioning unit, heating and cooling', '£1,750.00', 'to be paid directly to air con specialist', 'Model: Mitsubishi MSZ-HR R32 Classic Inverter Heat Pump'],
    ['Premium air conditioning unit with programming and mobile app, heating and cooling', '£2,500.00', 'to be paid directly to air con specialist', 'Model: Mitsubishi MSZ-LN R32 Inverter Heat Pump'],
    ['Additional composite slatted cladding for sides of building', '£115 per sqm'],
    ['Additional decking', '£250 per sqm', 'incl. foundations, framing, fixings. Subject to survey'],
  ];

  for (const extra of optionalExtras) {
    const label = extra[0];
    const parts = extra.slice(1);
    const priceText = `(+ ${parts.join(') (')})`;
    descRow(`${label} ${priceText}`, { fontSize: 10 });
  }

  blank(1, 6);

  // ════════════════════════════════════════
  // INSTALLATION
  // ════════════════════════════════════════
  subHeader('Installation');

  lineItemRow('To be conducted by our team', q.installationPrice);

  blank(1, 4);

  descRow('Electrical Connection', { fontSize: 10, bold: true });
  descRow('To be arranged by electrician', { fontSize: 10 });

  if (q.bathroom && q.bathroom.enabled) {
    blank(1, 2);
    descRow('Utility Connections (Water, Waste)', { fontSize: 10, bold: true });
    descRow('To be arranged separately with our plumber/landscaper', { fontSize: 10 });
  }

  blank(1, 6);

  // ════════════════════════════════════════
  // CUSTOM NOTES
  // ════════════════════════════════════════
  if (q.quoteNotes && q.quoteNotes.trim()) {
    subHeader('Additional Notes');
    const lines = q.quoteNotes.trim().split('\n');
    for (const line of lines) {
      descRow(line, { fontSize: 10 });
    }
    blank(1, 6);
  }

  // ════════════════════════════════════════
  // PRICING SUMMARY
  // ════════════════════════════════════════
  // Thin top border
  const summaryStartRow = rows.length;
  borders.push({ row: summaryStartRow, startCol: DESC_START, endCol: PRICE_COL + 1, side: 'top', color: BORDER_COL, style: 'SOLID' });

  // Subtotal
  lineItemRow('Subtotal', q.subtotal, { bg: LIGHT_GREY, bold: true, fontSize: 11, height: 28 });

  // Discount
  if (q.discount && q.discount > 0) {
    lineItemRow(q.discountLabel || 'Discount', -q.discount, { priceFg: GREEN_TEXT, fontSize: 11 });
  }

  // TOTAL bar
  const totalRow = rows.length;
  const totalCells = [];
  for (let c = 0; c < NUM_COLS; c++) {
    if (c === DESC_START) {
      totalCells.push({ col: c, value: 'TOTAL (inc. VAT)', bold: true, fontSize: 14, fg: WHITE, bg: TEAL });
    } else if (c === PRICE_COL) {
      totalCells.push({ col: c, value: fmtCurrency(q.total), bold: true, fontSize: 14, fg: WHITE, bg: TEAL, align: 'RIGHT' });
    } else {
      totalCells.push({ col: c, value: '', bg: TEAL });
    }
  }
  rows.push({ cells: totalCells, height: 36 });
  merges.push({ startRow: totalRow, endRow: totalRow + 1, startCol: DESC_START, endCol: DESC_END });

  detailRow('All prices include VAT at 20%');

  blank(2);

  // ════════════════════════════════════════
  // PAYMENT SCHEDULE
  // ════════════════════════════════════════
  sectionBar('PAYMENT SCHEDULE', { fontSize: 12 });
  blank(1, 6);

  if (q.paymentSchedule && q.paymentSchedule.length > 0) {
    // Payment schedule header row
    const psHeaderRow = rows.length;
    rows.push({
      cells: [
        { col: DESC_START, value: 'Stage', bold: true, fontSize: 10, fg: TEAL, bg: TEAL_PALE },
        { col: PRICE_COL, value: 'Amount', bold: true, fontSize: 10, fg: TEAL, bg: TEAL_PALE, align: 'RIGHT' },
      ],
      height: 24,
    });
    for (let c = 2; c < PRICE_COL; c++) {
      rows[psHeaderRow].cells.push({ col: c, value: '', bg: TEAL_PALE });
    }
    merges.push({ startRow: psHeaderRow, endRow: psHeaderRow + 1, startCol: DESC_START, endCol: DESC_END });
    borders.push({ row: psHeaderRow, startCol: DESC_START, endCol: PRICE_COL + 1, side: 'bottom', color: TEAL, style: 'SOLID' });

    let psAlt = false;
    for (let i = 0; i < q.paymentSchedule.length; i++) {
      const ps = q.paymentSchedule[i];
      const bg = psAlt ? LIGHT_GREY : undefined;
      lineItemRow(`${i + 1}.  ${ps.label}`, ps.amount, { bg, height: 26 });
      psAlt = !psAlt;
    }

    // Payment total
    const psTotalRow = rows.length;
    lineItemRow('Total', q.total, { bold: true, bg: LIGHT_GREY, fontSize: 11, height: 28 });
    borders.push({ row: psTotalRow, startCol: DESC_START, endCol: PRICE_COL + 1, side: 'top', color: BORDER_COL, style: 'SOLID' });
  }

  blank(1, 4);
  detailRow('* Groundworks & Installation schedule may be adjusted based on project timeline');

  blank(2);

  // ════════════════════════════════════════
  // TERMS & CONDITIONS
  // ════════════════════════════════════════
  subHeader('Terms');

  descRow('*Groundworks, installation & other labour to be paid directly to installation team', { fontSize: 9, fg: MID_GREY });
  descRow('Customer to provide toilet facility and 6-yard skip for waste', { fontSize: 9, fg: MID_GREY });
  descRow('Customer to be responsible for levelling and clearance of site prior to commencement of works', { fontSize: 9, fg: MID_GREY });

  blank(2);

  // Footer
  const footerRow = rows.length;
  rows.push({
    cells: [{ col: DESC_START, value: 'Garden Office Buildings  \u2022  01689 818 400  \u2022  info@gardenofficebuildings.co.uk  \u2022  gardenofficebuildings.co.uk', fontSize: 9, fg: TEAL }],
  });
  merges.push({ startRow: footerRow, endRow: footerRow + 1, startCol: DESC_START, endCol: PRICE_COL + 1 });
  borders.push({ row: footerRow, startCol: DESC_START, endCol: PRICE_COL + 1, side: 'top', color: TEAL, style: 'SOLID_MEDIUM' });

  blank(1);

  return { rows, merges, borders };
}

// ─── Convert to Sheets API calls ───

function buildSheetValues(rows) {
  const grid = [];
  for (const row of rows) {
    const r = new Array(NUM_COLS).fill('');
    for (const cell of (row.cells || [])) {
      r[cell.col] = cell.value !== undefined && cell.value !== null ? cell.value : '';
    }
    grid.push(r);
  }
  return grid;
}

function buildFormatRequests(rows, merges, borderDefs, sheetId) {
  const requests = [];

  // Column widths
  for (let i = 0; i < COL_WIDTHS.length; i++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: COL_WIDTHS[i] },
        fields: 'pixelSize',
      },
    });
  }

  // Default font for entire sheet
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: NUM_COLS },
      cell: {
        userEnteredFormat: {
          textFormat: { fontFamily: 'Inter', fontSize: 10, foregroundColorStyle: { rgbColor: CHARCOAL } },
          verticalAlignment: 'MIDDLE',
          wrapStrategy: 'WRAP',
        },
      },
      fields: 'userEnteredFormat(textFormat,verticalAlignment,wrapStrategy)',
    },
  });

  // Row heights + cell formatting
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];

    if (row.height) {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'ROWS', startIndex: r, endIndex: r + 1 },
          properties: { pixelSize: row.height },
          fields: 'pixelSize',
        },
      });
    }

    for (const cell of (row.cells || [])) {
      const format = {};
      const fields = [];

      if (cell.bold !== undefined || cell.fontSize || cell.fg) {
        format.textFormat = {};
        if (cell.bold) format.textFormat.bold = true;
        if (cell.fontSize) format.textFormat.fontSize = cell.fontSize;
        if (cell.fg) format.textFormat.foregroundColorStyle = { rgbColor: cell.fg };
        fields.push('userEnteredFormat.textFormat');
      }

      if (cell.bg) {
        format.backgroundColor = cell.bg;
        fields.push('userEnteredFormat.backgroundColor');
      }

      if (cell.align) {
        format.horizontalAlignment = cell.align;
        fields.push('userEnteredFormat.horizontalAlignment');
      }

      if (cell.numberFormat) {
        format.numberFormat = cell.numberFormat;
        fields.push('userEnteredFormat.numberFormat');
      }

      if (fields.length > 0) {
        requests.push({
          repeatCell: {
            range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: cell.col, endColumnIndex: cell.col + 1 },
            cell: { userEnteredFormat: format },
            fields: fields.join(','),
          },
        });
      }
    }
  }

  // Merge cells
  for (const m of merges) {
    requests.push({
      mergeCells: {
        range: { sheetId, startRowIndex: m.startRow, endRowIndex: m.endRow, startColumnIndex: m.startCol, endColumnIndex: m.endCol },
        mergeType: 'MERGE_ALL',
      },
    });
  }

  // Borders
  for (const b of borderDefs) {
    const border = {
      style: b.style || 'SOLID',
      colorStyle: { rgbColor: b.color || BORDER_COL },
    };
    const range = {
      sheetId,
      startRowIndex: b.row,
      endRowIndex: b.row + 1,
      startColumnIndex: b.startCol,
      endColumnIndex: b.endCol,
    };

    if (b.box) {
      requests.push({
        updateBorders: { range, top: border, bottom: border, left: border, right: border },
      });
    } else {
      const borderObj = {};
      borderObj[b.side] = border;
      requests.push({
        updateBorders: { range, ...borderObj },
      });
    }
  }

  // Teal border around entire quote
  requests.push({
    updateBorders: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: rows.length,
        startColumnIndex: 0,
        endColumnIndex: NUM_COLS,
      },
      top: { style: 'SOLID_MEDIUM', colorStyle: { rgbColor: TEAL } },
      bottom: { style: 'SOLID_MEDIUM', colorStyle: { rgbColor: TEAL } },
      left: { style: 'SOLID_MEDIUM', colorStyle: { rgbColor: TEAL } },
      right: { style: 'SOLID_MEDIUM', colorStyle: { rgbColor: TEAL } },
    },
  });

  // Hide gridlines for a cleaner look
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { hideGridlines: true } },
      fields: 'gridProperties.hideGridlines',
    },
  });

  return requests;
}

// ─── Vercel Handler ───

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = getAuthClient();
    const sheetsApi = google.sheets({ version: 'v4', auth });
    const driveApi = google.drive({ version: 'v3', auth });

    // Ensure logo is uploaded to Drive (cached after first call)
    await ensureLogoUploaded(driveApi);

    const q = req.body;
    const customerName = q.customerName || 'Unknown';
    const dateStr = fmtDate(q.date || new Date()).replace(/\//g, '-');
    const title = `GOB Quote \u2014 ${customerName} \u2014 ${dateStr}`;

    console.log('Creating quote for:', customerName);

    // 1. Create blank spreadsheet
    const createRes = await sheetsApi.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [{ properties: { title: 'Quote', sheetId: 0 } }],
      },
    });

    const spreadsheetId = createRes.data.spreadsheetId;

    // 2. Build sheet data
    const { rows, merges, borders } = buildQuoteSheet(q);
    const grid = buildSheetValues(rows);
    const formatRequests = buildFormatRequests(rows, merges, borders, 0);

    // 3. Write values
    await sheetsApi.spreadsheets.values.update({
      spreadsheetId,
      range: `Quote!A1:H${grid.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: grid },
    });

    // 4. Apply formatting
    if (formatRequests.length > 0) {
      await sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: formatRequests },
      });
    }

    // 5. Move to quotes folder
    try {
      await driveApi.files.update({
        fileId: spreadsheetId,
        addParents: QUOTES_FOLDER_ID,
        fields: 'id, parents',
      });
    } catch (moveErr) {
      console.warn('Could not move to folder (non-fatal):', moveErr.message);
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    console.log('Quote created:', title, sheetUrl);

    res.json({ success: true, spreadsheetId, url: sheetUrl, title });
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
