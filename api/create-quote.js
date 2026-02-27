/**
 * GOB Configurator — Google Sheets Quote Generator v3
 * Vercel Serverless Function.
 * Exact replica of the original GOB quote layout.
 * 11-column structure with Century Gothic font and cell merges.
 */

const { google } = require('googleapis');

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

const QUOTES_FOLDER_ID = '18dfAzGwqwqT-zI0yUBO60MrIFkvInULP';

// ─── Helpers ───

function fmtDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtCurrency(amount) {
  if (!amount && amount !== 0) return '';
  const n = Number(amount);
  if (isNaN(n)) return '';
  if (n < 0) return '-\u00a3' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '\u00a3' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// ─── Brand colours (exact match to original quote) ───
const TEAL = { red: 0.161, green: 0.663, blue: 0.725 };       // rgb(41,169,185)
const WHITE = { red: 1, green: 1, blue: 1 };
const BLACK = { red: 0, green: 0, blue: 0 };
const NEAR_BLACK = { red: 0.067, green: 0.067, blue: 0.067 };
const GREY_BG = { red: 0.953, green: 0.953, blue: 0.953 };
const LIGHT_BLUE = { red: 0.812, green: 0.886, blue: 0.953 };
const LIGHT_RED = { red: 0.957, green: 0.800, blue: 0.800 };
const GREEN = { red: 0.1, green: 0.6, blue: 0.2 };

const FONT = 'Century Gothic';

// ─── 11-column layout ───
const NUM_COLS = 11;
const COL_WIDTHS = [29, 132, 117, 117, 572, 76, 2, 220, 2, 208, 28];

// ─── Logo lookup (cached across warm invocations) ───
let cachedLogoFileId = null;

async function findLogoFileId(driveApi) {
  if (cachedLogoFileId) return cachedLogoFileId;
  const searchRes = await driveApi.files.list({
    q: `name='GOB-Logo-Text.png' and '${QUOTES_FOLDER_ID}' in parents and trashed=false`,
    fields: 'files(id)',
  });
  if (searchRes.data.files && searchRes.data.files.length > 0) {
    cachedLogoFileId = searchRes.data.files[0].id;
  }
  return cachedLogoFileId;
}

// ─── Sheet Builder ───

function buildQuoteData(q, logoFileId) {
  const isSig = q.tier === 'signature';
  const { intW, intD, intH } = getInternalDims(q);
  const w = (q.width / 1000).toFixed(1);
  const d = (q.depth / 1000).toFixed(1);
  const h = (q.height / 1000).toFixed(1);
  const numDownlights = getDownlights(q);
  const numSpotlights = getSpotlights(q);

  const rows = [];
  let logoRow = -1;

  function tealFrame(height = 28) {
    rows.push({ cells: [], height, fullBg: TEAL });
  }

  function spacer(height = 21) {
    rows.push({ cells: [], height });
  }

  function heading(text, height = 22, fontSize = 25) {
    rows.push({
      cells: [{ col: 1, value: text, fontSize, bold: true, align: 'CENTER', vAlign: 'MIDDLE' }],
      height,
      merges: [[1, 10]],
    });
  }

  function custRow(label, value, height = 30) {
    rows.push({
      cells: [
        { col: 1, value: label, fontSize: 12, bold: true, fg: WHITE, bg: TEAL, align: 'LEFT', vAlign: 'BOTTOM' },
        { col: 4, value: value, fontSize: 12, align: 'LEFT', vAlign: 'BOTTOM' },
      ],
      height,
      merges: [[1, 4], [4, 10]],
    });
  }

  function sectionBar(text, opts = {}) {
    const cells = [
      { col: 1, value: text, fontSize: 13, bold: true, fg: WHITE, bg: TEAL, align: 'LEFT', vAlign: 'BOTTOM' },
      { col: 5, value: opts.detailLabel || '', fontSize: 12, bold: true, fg: WHITE, bg: TEAL, align: 'CENTER', vAlign: 'BOTTOM' },
      { col: 9, value: opts.amountLabel || '', fontSize: 12, bold: true, fg: WHITE, bg: TEAL, align: 'CENTER', vAlign: 'BOTTOM' },
    ];
    rows.push({
      cells,
      height: opts.height || 37,
      merges: [[1, 5], [5, 9]],
      sectionBar: true,
    });
  }

  function contentRow(text, opts = {}) {
    const cells = [
      { col: 1, value: text, fontSize: opts.fontSize || 11, bold: opts.bold, fg: opts.fg, align: 'LEFT', vAlign: 'BOTTOM' },
    ];
    if (opts.detail) {
      cells.push({ col: 5, value: opts.detail, fontSize: 10, align: 'CENTER', vAlign: 'BOTTOM' });
    }
    if (opts.price !== undefined && opts.price !== null) {
      const priceStr = typeof opts.price === 'string' ? opts.price : fmtCurrency(opts.price);
      cells.push({ col: 9, value: priceStr, fontSize: 10, fg: opts.priceFg, align: 'CENTER', vAlign: 'BOTTOM' });
    }
    rows.push({
      cells,
      height: opts.height || 32,
      merges: [[1, 5], [5, 9]],
      greyContent: opts.greyBg !== false,
    });
  }

  function summaryRow(label, price, opts = {}) {
    rows.push({
      cells: [
        { col: 7, value: label, fontSize: 13, bold: true, fg: opts.fg || TEAL, bg: opts.bg, align: 'LEFT', vAlign: 'BOTTOM' },
        { col: 9, value: typeof price === 'string' ? price : fmtCurrency(price), fontSize: 13, bold: true, fg: opts.fg || TEAL, bg: opts.bg, align: 'CENTER', vAlign: 'BOTTOM' },
      ],
      height: opts.height || 29,
      merges: [[7, 9]],
    });
  }

  function paymentRow(desc, amount, opts = {}) {
    const cells = [
      { col: 1, value: desc, fontSize: 11, bold: opts.bold, fg: opts.fg || NEAR_BLACK, align: 'LEFT', vAlign: 'BOTTOM' },
    ];
    if (amount !== undefined && amount !== null) {
      cells.push({
        col: 8, value: typeof amount === 'string' ? amount : fmtCurrency(amount),
        fontSize: 12, bold: opts.bold, fg: opts.fg || NEAR_BLACK, bg: opts.amountBg, align: 'CENTER', vAlign: 'BOTTOM',
      });
    }
    rows.push({
      cells,
      height: opts.height || 28,
      merges: [[1, 8], [8, 10]],
    });
  }

  function termsRow(text, opts = {}) {
    rows.push({
      cells: [{ col: 1, value: text, fontSize: opts.fontSize || 11, bold: opts.bold, fg: NEAR_BLACK, align: 'LEFT', vAlign: 'BOTTOM' }],
      height: opts.height || 33,
      merges: [[1, 10]],
    });
  }

  // ═══════════════════════════════════════
  // BUILD THE QUOTE
  // ═══════════════════════════════════════

  tealFrame(28);

  logoRow = rows.length;
  const logoFormula = logoFileId
    ? `=IMAGE("https://lh3.googleusercontent.com/d/${logoFileId}")`
    : 'Garden Office Buildings';
  rows.push({
    cells: [
      { col: 1, value: logoFormula, fontSize: 10, vAlign: 'MIDDLE' },
      { col: 4, value: 'Quote', fontSize: 30, bold: true, align: 'CENTER', vAlign: 'MIDDLE' },
    ],
    height: 101,
    merges: [[1, 4], [4, 10]],
  });

  spacer(22);

  heading('Customer Information', 50, 25);
  spacer(22);

  if (q.customerName) custRow('Name', q.customerName);
  if (q.customerNumber) custRow('Customer #', q.customerNumber);
  custRow('Date', fmtDate(q.date || new Date()));
  if (q.address) custRow('Address', q.address, 74);

  spacer(22);

  heading('Building Specification', 59, 25);
  spacer(21);

  const extDimNote = isSig ? ' (excl. canopy \u2013 overall depth incl. 400mm canopy)' : '';

  sectionBar(
    `Your Building: ${w}m x ${d}m x ${h}m ${q.buildingType || 'Garden Office Building'}`,
    { detailLabel: 'Base Price', amountLabel: fmtCurrency(q.basePrice) }
  );

  contentRow(`External Dimensions \u2013 (W) ${q.width}mm x (D) ${q.depth}mm x (H) ${q.height}mm${extDimNote}`, { height: 31 });
  contentRow(`Internal Dimensions \u2013 (W) ${intW}mm x (D) ${intD}mm x (H) ${intH}mm (approx)`, { height: 31 });

  const tierDesc = isSig
    ? 'Signature range with integrated canopy and decking on front of building'
    : 'Classic range with clean, minimalist design';
  contentRow(tierDesc, { height: 29 });
  contentRow('Configuration as per drawing (TBC). All internal sizes are approximates and subject to final drawing.', { height: 31 });

  spacer(28);

  sectionBar(`Standard Features (${isSig ? 'Signature' : 'Classic'})`);

  contentRow('Insulated timber/panel construction with 100mm PIR walls, 75mm PIR floor and ceiling');
  if (isSig) {
    contentRow('To include 400mm canopy with down lights');
  }
  contentRow('Plaster-boarded, skimmed and decorated internal finish');

  const foundationLabels = {
    'ground-screw': 'Ground screw foundation system',
    'concrete-base': 'Concrete base foundation',
    'concrete-pile': 'Concrete pile foundation system'
  };
  contentRow(foundationLabels[q.foundationType] || 'Ground screw foundation system');

  spacer(28);

  sectionBar('External Finish', { detailLabel: 'Details/Quantity', amountLabel: 'Amount (\u00a3)' });

  const claddingRows = [
    { side: 'Front', value: q.frontCladding },
    { side: 'Right', value: q.rightCladding, price: q.rightCladdingPrice },
    { side: 'Left', value: q.leftCladding, price: q.leftCladdingPrice },
    { side: 'Rear', value: q.rearCladding },
  ];
  for (const cl of claddingRows) {
    contentRow(
      `${cl.side} cladding: ${cl.value || 'anthracite grey steel cladding'}`,
      { price: (cl.price && cl.price > 0) ? cl.price : undefined }
    );
  }
  contentRow('Fascia, soffit and cappings: anthracite');
  contentRow('Roof: EPDM rubber roof');
  contentRow('Guttering: rear');
  if (isSig && q.hasDecking !== false) {
    contentRow('Integrated composite decking: dark grey');
  }

  spacer(28);

  sectionBar('Internal Finish');

  contentRow('Flooring: TBC (Natural Oak or Light Grey)');
  contentRow('Internal wall finish: plasterboarded, plastered and decorated white');
  contentRow('Skirting board: white');

  spacer(28);

  sectionBar('Doors, Windows, Partitions', { detailLabel: 'Details/Quantity', amountLabel: 'Amount (\u00a3)' });

  if (q.components && q.components.length > 0) {
    for (const comp of q.components) {
      contentRow(formatComponentDesc(comp), {
        detail: comp.elevation ? `${comp.elevation} elevation` : '',
        price: (comp.price && comp.price > 0) ? comp.price : undefined,
      });
    }
  }
  contentRow('4mm double glazed toughened glass throughout');

  if (q.componentUpgrades && q.componentUpgrades.length > 0) {
    for (const u of q.componentUpgrades) {
      contentRow(u.label, { price: u.price });
    }
  }
  if (q.heightUpgrade && q.heightUpgrade.price > 0) {
    contentRow(q.heightUpgrade.label, { price: q.heightUpgrade.price });
  }

  spacer(28);

  sectionBar('Standard Electrical Features');

  contentRow(`${numDownlights} x dimmable LED downlights`);
  contentRow('Configuration/Quantity TBC on 1st fix electrician visit approx. 1 week into project', { fontSize: 10 });
  if (numSpotlights > 0) {
    contentRow(`${numSpotlights} x external down lights in canopy soffit`);
  }
  const sheetSocketCount = getSocketCount(q);
  contentRow(`${sheetSocketCount} x double power sockets in brushed steel finish (1 w/ USB ports)`);

  let lightingZones = 1;
  if (q.straightPartition?.enabled) lightingZones++;
  if (q.partitionRoom?.enabled) lightingZones++;
  if (lightingZones > 1) {
    contentRow(`${lightingZones} x internal lighting zones on separate switches`);
  }
  contentRow('1 x single dimmable light switch in brushed steel');
  contentRow('1 x network connection port for WiFi connectivity');
  contentRow('Consumer unit');

  spacer(28);

  const hasExtras = (q.extras && q.extras.length > 0) || (q.deductions && q.deductions.length > 0);
  if (hasExtras) {
    sectionBar('Selected Extras & Upgrades', { detailLabel: 'Details/Quantity', amountLabel: 'Amount (\u00a3)' });
    if (q.extras && q.extras.length > 0) {
      for (const extra of q.extras) {
        contentRow(extra.label, { price: extra.price });
        if (extra.description) {
          contentRow(extra.description, { fontSize: 10 });
        }
      }
    }
    if (q.deductions && q.deductions.length > 0) {
      for (const ded of q.deductions) {
        contentRow(ded.label, { fg: GREEN, price: fmtCurrency(ded.price), priceFg: GREEN });
      }
    }
    spacer(28);
  }

  sectionBar('Optional Extras');

  const optionalExtras = [
    ['External double plug socket', '\u00a3235.00'],
    ['External up/down light', '\u00a395.00'],
    ['Oil filled electric wall panel radiator', '\u00a3495.00'],
    ['Additional double plug socket', '\u00a365.00', '\u00a385.00 w/ USB ports'],
    ['Additional lighting zone on separate switch', '\u00a3125.00'],
    ['Wireless double quinetic switch system', '\u00a3265.00', 'wireless switch to turn on/off external lights from house'],
    ['Standard air conditioning unit, heating and cooling', '\u00a31,750.00', 'to be paid directly to air con specialist'],
    ['Premium air conditioning unit with programming and mobile app, heating and cooling', '\u00a32,500.00', 'to be paid directly to air con specialist'],
    ['Additional composite cladding for sides of building', '\u00a3115 per sqm'],
    ['Additional decking', '\u00a3300 per sqm', 'incl. foundations, framing, fixings'],
  ];
  for (const extra of optionalExtras) {
    const priceText = `(+ ${extra.slice(1).join(') (+ ')})`;
    contentRow(`${extra[0]} ${priceText}`);
  }

  spacer(28);

  sectionBar('Main Building Installation & Groundworks', { amountLabel: 'Amount (\u00a3)' });
  contentRow('To be conducted by our team', { price: q.installationPrice });

  spacer(28);

  sectionBar('Electrical Connection');
  contentRow('To be arranged by electrician');
  if (q.bathroom && q.bathroom.enabled) {
    sectionBar('Utility Connections (Water, Waste)');
    contentRow('To be arranged separately with our plumber/landscaper');
  }

  spacer(28);

  if (q.quoteNotes && q.quoteNotes.trim()) {
    sectionBar('Additional Notes');
    for (const line of q.quoteNotes.trim().split('\n')) {
      contentRow(line);
    }
    spacer(28);
  }

  // ═══ PRICING SUMMARY ═══

  const borderEndRow = rows.length;

  spacer(21);
  summaryRow('SUB TOTAL (inc. VAT)', q.subtotal, { height: 29 });

  if (q.discount && q.discount > 0) {
    summaryRow(q.discountLabel || 'DISCOUNT', q.discount, { height: 29 });
  }

  summaryRow('TOTAL (inc. VAT)', q.total, { fg: WHITE, bg: TEAL, height: 29 });

  spacer(21);

  // ═══ PAYMENT SCHEDULE ═══

  heading('Total & Payment Schedule as per Order', 60, 20);
  spacer(21);

  paymentRow('Payment Schedule', 'Amount (inc. VAT)', { bold: true, height: 42 });

  if (q.paymentSchedule && q.paymentSchedule.length > 0) {
    for (let i = 0; i < q.paymentSchedule.length; i++) {
      const ps = q.paymentSchedule[i];
      paymentRow(ps.label, ps.amount, {
        amountBg: i === 0 ? LIGHT_BLUE : LIGHT_RED,
        height: 28,
      });
    }
  }

  spacer(21);

  paymentRow('Total', q.total, { bold: true, height: 33 });

  spacer(21);

  // ═══ TERMS ═══

  termsRow('Terms', { bold: true, height: 42 });

  const terms = [];
  terms.push('Quote is based on our standard specification. Any upgrades or changes may affect the final price.');
  terms.push('Quote is based on normal ground conditions. In the unlikely event of unforeseen ground issues, additional costs may apply.');
  if (q.bathroom && q.bathroom.enabled) {
    terms.push('Customer to provide a mini skip for duration of build.');
  } else {
    terms.push('Customer to provide toilet facility and mini skip for duration of build.');
  }
  terms.push('While Garden Office Buildings will clear and prepare the construction area, the customer is responsible for ensuring the site is accessible and clear of obstructions prior to commencement.');

  for (const term of terms) {
    termsRow(term);
  }

  spacer(21);

  rows.push({
    cells: [{ col: 1, value: 'Garden Office Buildings  |  01689 818 400  |  info@gardenofficebuildings.co.uk', fontSize: 11, fg: TEAL, align: 'LEFT', vAlign: 'MIDDLE' }],
    height: 28,
    merges: [[1, 10]],
  });

  tealFrame(28);

  return { rows, logoRow, borderEndRow };
}

// ─── Convert row data into Sheets API calls ───

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

function buildFormatRequests(rows, sheetId, borderEndRow) {
  const requests = [];

  for (let i = 0; i < COL_WIDTHS.length; i++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: COL_WIDTHS[i] },
        fields: 'pixelSize',
      }
    });
  }

  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: NUM_COLS },
      cell: {
        userEnteredFormat: {
          textFormat: { fontFamily: FONT, fontSize: 11, foregroundColorStyle: { rgbColor: BLACK } },
          verticalAlignment: 'BOTTOM',
          wrapStrategy: 'WRAP',
        }
      },
      fields: 'userEnteredFormat(textFormat,verticalAlignment,wrapStrategy)',
    }
  });

  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: 1 },
      cell: { userEnteredFormat: { backgroundColor: TEAL } },
      fields: 'userEnteredFormat.backgroundColor',
    }
  });

  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: rows.length, startColumnIndex: NUM_COLS - 1, endColumnIndex: NUM_COLS },
      cell: { userEnteredFormat: { backgroundColor: TEAL } },
      fields: 'userEnteredFormat.backgroundColor',
    }
  });

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];

    if (row.height) {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'ROWS', startIndex: r, endIndex: r + 1 },
          properties: { pixelSize: row.height },
          fields: 'pixelSize',
        }
      });
    }

    if (row.fullBg) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 0, endColumnIndex: NUM_COLS },
          cell: { userEnteredFormat: { backgroundColor: row.fullBg } },
          fields: 'userEnteredFormat.backgroundColor',
        }
      });
    }

    if (row.sectionBar) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 1, endColumnIndex: 10 },
          cell: { userEnteredFormat: { backgroundColor: TEAL } },
          fields: 'userEnteredFormat.backgroundColor',
        }
      });
    }

    if (row.greyContent) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 1, endColumnIndex: 5 },
          cell: { userEnteredFormat: { backgroundColor: GREY_BG } },
          fields: 'userEnteredFormat.backgroundColor',
        }
      });
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 5, endColumnIndex: 9 },
          cell: { userEnteredFormat: { backgroundColor: GREY_BG } },
          fields: 'userEnteredFormat.backgroundColor',
        }
      });
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 9, endColumnIndex: 10 },
          cell: { userEnteredFormat: { backgroundColor: GREY_BG } },
          fields: 'userEnteredFormat.backgroundColor',
        }
      });
    }

    for (const cell of (row.cells || [])) {
      const format = {};
      const fields = [];

      if (cell.bold !== undefined || cell.fontSize || cell.fg) {
        format.textFormat = { fontFamily: FONT };
        if (cell.bold) { format.textFormat.bold = true; }
        if (cell.fontSize) { format.textFormat.fontSize = cell.fontSize; }
        if (cell.fg) { format.textFormat.foregroundColorStyle = { rgbColor: cell.fg }; }
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

      if (cell.vAlign) {
        format.verticalAlignment = cell.vAlign;
        fields.push('userEnteredFormat.verticalAlignment');
      }

      if (fields.length > 0) {
        requests.push({
          repeatCell: {
            range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: cell.col, endColumnIndex: cell.col + 1 },
            cell: { userEnteredFormat: format },
            fields: fields.join(','),
          }
        });
      }
    }

    if (row.merges) {
      for (const [startCol, endCol] of row.merges) {
        requests.push({
          mergeCells: {
            range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: startCol, endColumnIndex: endCol },
            mergeType: 'MERGE_ALL',
          }
        });
      }
    }
  }

  // ─── Borders ───
  const bs = { style: 'SOLID', colorStyle: { rgbColor: { red: 0, green: 0, blue: 0 } } };

  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: 1 },
      left: bs,
    }
  });
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: rows.length, startColumnIndex: 10, endColumnIndex: 11 },
      right: bs,
    }
  });
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 11 },
      top: bs,
    }
  });
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: rows.length - 1, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: 11 },
      bottom: bs,
    }
  });

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row.fullBg) continue;

    if (row.merges && row.merges.length > 0) {
      for (const [startCol, endCol] of row.merges) {
        requests.push({
          updateBorders: {
            range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: startCol, endColumnIndex: endCol },
            top: bs, bottom: bs, left: bs, right: bs,
          }
        });
      }
      if (row.greyContent || row.sectionBar) {
        const jCovered = row.merges.some(([s, e]) => s <= 9 && e > 9);
        if (!jCovered) {
          requests.push({
            updateBorders: {
              range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 9, endColumnIndex: 10 },
              top: bs, bottom: bs, left: bs, right: bs,
            }
          });
        }
      }
    }
  }

  return requests;
}

// ─── Vercel Handler ───

module.exports = async (req, res) => {
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

    const q = req.body;
    const customerName = q.customerName || 'Unknown';
    const date = fmtDate(q.date || new Date()).replace(/\//g, '-');
    const title = `GOB Quote - ${customerName} - ${date}`;

    // Find logo on Drive
    const logoFileId = await findLogoFileId(driveApi);

    // 1. Create spreadsheet
    const createRes = await sheetsApi.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [{ properties: { title: 'Quote', sheetId: 0, gridProperties: { hideGridlines: true } } }],
      },
    });
    const spreadsheetId = createRes.data.spreadsheetId;
    const sheetId = 0;

    // 2. Build quote data
    const { rows, borderEndRow } = buildQuoteData(q, logoFileId);
    const grid = buildSheetValues(rows);
    const formatRequests = buildFormatRequests(rows, sheetId, borderEndRow);

    // 3. Write values
    const lastCol = String.fromCharCode(64 + NUM_COLS);
    await sheetsApi.spreadsheets.values.update({
      spreadsheetId,
      range: `Quote!A1:${lastCol}${grid.length}`,
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
    const fileInfo = await driveApi.files.get({ fileId: spreadsheetId, fields: 'parents' });
    await driveApi.files.update({
      fileId: spreadsheetId,
      addParents: QUOTES_FOLDER_ID,
      removeParents: (fileInfo.data.parents || []).join(','),
      fields: 'id, parents',
    });

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    res.json({ success: true, spreadsheetId, url: sheetUrl, title });

  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
