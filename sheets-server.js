/**
 * GOB Configurator - Google Sheets Quote Generator v3
 * Exact replica of the original GOB quote layout.
 * 11-column structure with Century Gothic font and cell merges.
 */

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Auth ───
const credentialsPath = path.join(__dirname, 'oauth-credentials.json');
const tokenPath = path.join(__dirname, 'oauth-token.json');
const versionsPath = path.join(__dirname, 'quote-versions.json');
let oauth2Client;

function initAuth() {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath));
  const token = JSON.parse(fs.readFileSync(tokenPath));
  const { client_id, client_secret } = credentials.installed || credentials.web;
  oauth2Client = new google.auth.OAuth2(client_id, client_secret);
  oauth2Client.setCredentials(token);
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      const t = JSON.parse(fs.readFileSync(tokenPath));
      t.refresh_token = tokens.refresh_token;
      fs.writeFileSync(tokenPath, JSON.stringify(t, null, 2));
    }
  });
}

initAuth();

const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

const QUOTES_FOLDER_ID = '18dfAzGwqwqT-zI0yUBO60MrIFkvInULP';
const TEMPLATE_ID = '132UEM5c0yP79ec8KA_x_AxdInCpwCsDtLc3JGm3iyuo';

// ─── Helpers ───

function getNextVersion(customerName) {
  if (!customerName) return 1;
  let versions = {};
  if (fs.existsSync(versionsPath)) {
    versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));
  }
  const key = customerName.toLowerCase().replace(/\s+/g, '-');
  const v = (versions[key] || 0) + 1;
  versions[key] = v;
  fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2));
  return v;
}

function formatTitle(customerName, date) {
  const v = getNextVersion(customerName);
  const d = date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  if (!customerName) return 'GOB Quote';
  return v > 1 ? `GOB Quote - ${customerName} - ${d} v${v}` : `GOB Quote - ${customerName} - ${d}`;
}

function fmtDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtCurrency(amount) {
  if (!amount && amount !== 0) return '';
  const n = Number(amount);
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
  return `1 x full height ${widthM}m wide ${typeDesc}: smooth anthracite grey outside, white inside${handleDesc}`;
}

// Internal dimensions (matching pricing.js logic)
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

// Downlight count (matching pricing.js logic)
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
const TEAL = { red: 0.161, green: 0.663, blue: 0.725 };       // rgb(41,169,185) #29A9B9
const WHITE = { red: 1, green: 1, blue: 1 };
const BLACK = { red: 0, green: 0, blue: 0 };
const NEAR_BLACK = { red: 0.067, green: 0.067, blue: 0.067 };  // rgb(17,17,17)
const GREY_BG = { red: 0.953, green: 0.953, blue: 0.953 };     // rgb(243,243,243)
const LIGHT_BLUE = { red: 0.812, green: 0.886, blue: 0.953 };  // rgb(207,226,243) deposit bg
const LIGHT_RED = { red: 0.957, green: 0.800, blue: 0.800 };   // rgb(244,204,204) payment bg
const GREEN = { red: 0.1, green: 0.6, blue: 0.2 };

const FONT = 'Century Gothic';

// ─── 11-column layout (exact match to original) ───
// A=border | B-D=label area | E=content | F=qty | G=sep | H=price label | I=sep | J=amount | K=border
const NUM_COLS = 11;
const COL_WIDTHS = [29, 132, 117, 117, 572, 76, 2, 220, 2, 208, 28];

// ─── Sheet Builder ───
// Exact replica of original GOB quote layout.
// Each row: { cells[], height, merges?[[startCol,endCol]], fullBg?, greyContent?, sectionBar?, borderCols? }
// Each cell: { col, value, fontSize?, bold?, fg?, bg?, align?, vAlign? }

function buildQuoteData(q) {
  const isSig = q.tier === 'signature';
  const { intW, intD, intH } = getInternalDims(q);
  const w = (q.width / 1000).toFixed(1);
  const d = (q.depth / 1000).toFixed(1);
  const h = (q.height / 1000).toFixed(1);
  const numDownlights = getDownlights(q);
  const numSpotlights = getSpotlights(q);

  const rows = [];
  let logoRow = -1; // unused but kept for API compat

  // ── Row helpers (matching original exactly) ──

  function tealFrame(height = 28) {
    rows.push({ cells: [], height, fullBg: TEAL });
  }

  function spacer(height = 21) {
    rows.push({ cells: [], height });
  }

  // Grey spacer — matches content row bg, used between sections within the content area
  function greySpacer(height = 28) {
    rows.push({
      cells: [],
      height,
      merges: [[1, 5], [5, 9]], // B-E, F-I (same as content rows)
      greyContent: true,
    });
  }

  // Large centered heading (e.g. "Customer Information"), merged B-J
  function heading(text, height = 22, fontSize = 25) {
    rows.push({
      cells: [{ col: 1, value: text, fontSize, bold: true, align: 'CENTER', vAlign: 'MIDDLE' }],
      height,
      merges: [[1, 10]], // B-J
    });
  }

  // Customer info row: teal label in B-D, white value in E-J
  function custRow(label, value, height = 30) {
    rows.push({
      cells: [
        { col: 1, value: label, fontSize: 12, bold: true, fg: WHITE, bg: TEAL, align: 'LEFT', vAlign: 'BOTTOM' },
        { col: 4, value: value, fontSize: 12, align: 'LEFT', vAlign: 'BOTTOM' },
      ],
      height,
      merges: [[1, 4], [4, 10]], // B-D, E-J
    });
  }

  // Teal section bar with optional Qty/Amount column labels
  function sectionBar(text, opts = {}) {
    const cells = [
      { col: 1, value: text, fontSize: 13, bold: true, fg: WHITE, bg: TEAL, align: 'LEFT', vAlign: 'BOTTOM' },
      { col: 5, value: opts.detailLabel || '', fontSize: 12, bold: true, fg: WHITE, bg: TEAL, align: 'CENTER', vAlign: 'BOTTOM' },
      { col: 9, value: opts.amountLabel || '', fontSize: 12, bold: true, fg: WHITE, bg: TEAL, align: 'CENTER', vAlign: 'BOTTOM' },
    ];
    rows.push({
      cells,
      height: opts.height || 37,
      merges: [[1, 5], [5, 9]], // B-E, F-I
      sectionBar: true,
    });
  }

  // Content row with grey bg, text in B-E, optional detail in F-I, optional price in J
  function contentRow(text, opts = {}) {
    const cells = [
      { col: 1, value: text, fontSize: opts.fontSize || 11, bold: opts.bold, fg: opts.fg, align: 'LEFT', vAlign: 'BOTTOM' },
    ];
    if (opts.detail) {
      cells.push({ col: 5, value: opts.detail, fontSize: 11, align: 'CENTER', vAlign: 'BOTTOM' });
    }
    if (opts.price !== undefined && opts.price !== null) {
      const priceStr = typeof opts.price === 'string' ? opts.price : fmtCurrency(opts.price);
      cells.push({ col: 9, value: priceStr, fontSize: 11, fg: opts.priceFg, align: 'CENTER', vAlign: 'BOTTOM' });
    }
    rows.push({
      cells,
      height: opts.height || 32,
      merges: [[1, 5], [5, 9]], // B-E, F-I
      greyContent: opts.greyBg !== false,
    });
  }

  // Subtotal/discount row — label in H-I, price in J, teal text on white
  function summaryRow(label, price, opts = {}) {
    rows.push({
      cells: [
        { col: 7, value: label, fontSize: 13, bold: true, fg: opts.fg || TEAL, bg: opts.bg, align: 'LEFT', vAlign: 'BOTTOM' },
        { col: 9, value: typeof price === 'string' ? price : fmtCurrency(price), fontSize: 13, bold: true, fg: opts.fg || TEAL, bg: opts.bg, align: 'CENTER', vAlign: 'BOTTOM' },
      ],
      height: opts.height || 29,
      merges: [[7, 9]], // H-I
      isSummary: true,
    });
  }

  // Payment schedule row — desc in B-H, amount in I-J
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
      merges: [[1, 8], [8, 10]], // B-H, I-J
    });
  }

  // Terms/footer row — text in B-J merge
  function termsRow(text, opts = {}) {
    rows.push({
      cells: [{ col: 1, value: text, fontSize: opts.fontSize || 11, bold: opts.bold, fg: NEAR_BLACK, align: 'LEFT', vAlign: 'BOTTOM' }],
      height: opts.height || 33,
      merges: [[1, 10]], // B-J
    });
  }

  // ════════════════════════════════════════════════════
  // BUILD THE QUOTE
  // ════════════════════════════════════════════════════

  // ── HEADER ──
  // Logo is inherited as a floating image from the template spreadsheet.
  tealFrame(28);

  // Header: "Quote" text centered across B-J (logo comes from template as overlay)
  logoRow = rows.length;
  rows.push({
    cells: [
      { col: 1, value: 'Quote', fontSize: 30, bold: true, align: 'CENTER', vAlign: 'MIDDLE' },
    ],
    height: 101,
    merges: [[1, 10]], // B-J
  });

  // Spacer after header
  spacer(22);

  // ── CUSTOMER INFORMATION ──
  heading('Customer Information', 50, 25);
  spacer(22);

  if (q.customerName) custRow('Name', q.customerName);
  if (q.customerNumber) custRow('Customer #', q.customerNumber);
  custRow('Date', fmtDate(q.date || new Date()));
  if (q.address) custRow('Address', q.address, 74);

  spacer(22);

  // ── BUILDING SPECIFICATION ──
  heading('Building Specification', 59, 25);
  spacer(21);

  const extDimNote = isSig ? ' (incl. integrated 400mm canopy/decking)' : '';

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

  greySpacer(28);

  // ── STANDARD FEATURES ──
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

  greySpacer(28);

  // ── EXTERNAL FINISH ──
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

  greySpacer(28);

  // ── INTERNAL FINISH ──
  sectionBar('Internal Finish');

  contentRow('Flooring: TBC (Natural Oak or Light Grey)');
  contentRow('Internal wall finish: plasterboarded, plastered and decorated white');
  contentRow('Skirting board: white');

  greySpacer(28);

  // ── DOORS, WINDOWS & PARTITIONS ──
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

  greySpacer(28);

  // ── ELECTRICAL ──
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

  greySpacer(28);

  // ── BATHROOM / WC SUITE ──
  // Pull bathroom extras out of the extras list into their own dedicated section
  const bathroomExtras = (q.extras || []).filter(e =>
    e.label && (e.label.toLowerCase().includes('wc suite') || e.label.toLowerCase().includes('bathroom suite'))
  );
  const nonBathroomExtras = (q.extras || []).filter(e =>
    !e.label || (!e.label.toLowerCase().includes('wc suite') && !e.label.toLowerCase().includes('bathroom suite'))
  );

  if (q.bathroom && q.bathroom.enabled && bathroomExtras.length > 0) {
    sectionBar('Bathroom / WC Suite', { amountLabel: 'Amount (\u00a3)' });
    for (const be of bathroomExtras) {
      contentRow(be.label, { price: be.price });
      if (be.description) {
        contentRow(be.description, { fontSize: 10 });
      }
    }
    contentRow('Utility connections (water supply, waste) to be arranged separately \u2014 see below');
    greySpacer(28);
  }

  // ── SELECTED EXTRAS & UPGRADES ──
  const hasExtras = (nonBathroomExtras.length > 0) || (q.deductions && q.deductions.length > 0);
  if (hasExtras) {
    sectionBar('Selected Extras & Upgrades', { detailLabel: 'Details/Quantity', amountLabel: 'Amount (\u00a3)' });
    if (nonBathroomExtras.length > 0) {
      for (const extra of nonBathroomExtras) {
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
    greySpacer(28);
  }

  // ── OPTIONAL EXTRAS ──
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

  greySpacer(28);

  // ── INSTALLATION ──
  sectionBar('Main Building Installation & Groundworks', { amountLabel: 'Amount (\u00a3)' });
  contentRow('To be conducted by our team', { price: q.installationPrice });

  greySpacer(28);

  // Electrical/plumbing notes
  sectionBar('Electrical Connection');
  contentRow('To be arranged by electrician');
  if (q.bathroom && q.bathroom.enabled) {
    sectionBar('Utility Connections (Water, Waste)');
    contentRow('To be arranged separately with our plumber/landscaper');
  }

  greySpacer(28);

  // ── CUSTOM NOTES ──
  if (q.quoteNotes && q.quoteNotes.trim()) {
    sectionBar('Additional Notes');
    for (const line of q.quoteNotes.trim().split('\n')) {
      contentRow(line);
    }
    greySpacer(28);
  }

  // ════════════════════════════════════════════════════
  // PRICING SUMMARY
  // ════════════════════════════════════════════════════

  // Mark where content borders should end (before summary area)
  const borderEndRow = rows.length;

  spacer(21);

  if (q.discount && q.discount > 0) {
    summaryRow('SUB TOTAL (inc. VAT)', q.subtotal, { height: 29 });
    summaryRow(q.discountLabel || 'DISCOUNT', q.discount, { height: 29 });
  }

  // TOTAL bar (teal bg, white text)
  summaryRow('TOTAL (inc. VAT)', q.total, { fg: WHITE, bg: TEAL, height: 29 });

  spacer(21);

  // ════════════════════════════════════════════════════
  // PAYMENT SCHEDULE
  // ════════════════════════════════════════════════════

  heading('Total & Payment Schedule as per Order', 60, 20);
  spacer(21);

  // Payment schedule header (bold labels, matching reference ~42px)
  paymentRow('Payment Schedule', 'Amount (inc. VAT)', { bold: true, height: 42 });

  // Calculate payment schedule dynamically from actual quote amounts
  const holdingDeposit = 250;
  const buildingAmount = q.total - (q.installationPrice || 0);
  const halfBuilding = Math.round(buildingAmount / 2);
  const installHalf = Math.round((q.installationPrice || 0) / 2);

  const schedule = [
    { label: 'Holding deposit reserves your delivery & install date (deductible from 1st payment)', amount: holdingDeposit },
    { label: '50% of Garden Office Building due 4 weeks before delivery (less holding deposit)', amount: halfBuilding - holdingDeposit },
    { label: '50% of Garden Office Building due on delivery of all materials (approx 1 week into project)', amount: buildingAmount - halfBuilding },
    { label: '50% of Groundworks & Installation due halfway through project*', amount: installHalf },
    { label: '50% of Groundworks & Installation due on completion*', amount: (q.installationPrice || 0) - installHalf },
  ];

  const paymentStartRow = rows.length + 1; // +1 for 1-based Sheets row refs
  for (let i = 0; i < schedule.length; i++) {
    paymentRow(schedule[i].label, schedule[i].amount, {
      amountBg: i === 0 ? LIGHT_BLUE : LIGHT_RED,
      height: 28,
    });
  }
  const paymentEndRow = rows.length; // current row count = last payment row (1-based)

  spacer(21);

  // Payment total — SUM formula referencing the payment amount cells (col I)
  paymentRow('Total', `=SUM(I${paymentStartRow}:I${paymentEndRow})`, { bold: true, height: 33 });

  spacer(21);

  // ════════════════════════════════════════════════════
  // TERMS
  // ════════════════════════════════════════════════════

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

  // ── FOOTER ──
  rows.push({
    cells: [{ col: 1, value: 'Garden Office Buildings  |  01689 818 400  |  info@gardenofficebuildings.co.uk', fontSize: 11, fg: TEAL, align: 'LEFT', vAlign: 'MIDDLE' }],
    height: 28,
    merges: [[1, 10]],
  });

  // Bottom border
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

  // Column widths
  for (let i = 0; i < COL_WIDTHS.length; i++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: COL_WIDTHS[i] },
        fields: 'pixelSize',
      }
    });
  }

  // Default font for entire sheet: Century Gothic 11pt
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

  // Left teal border (col A)
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: 1 },
      cell: { userEnteredFormat: { backgroundColor: TEAL } },
      fields: 'userEnteredFormat.backgroundColor',
    }
  });

  // Right teal border (col K)
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: rows.length, startColumnIndex: NUM_COLS - 1, endColumnIndex: NUM_COLS },
      cell: { userEnteredFormat: { backgroundColor: TEAL } },
      fields: 'userEnteredFormat.backgroundColor',
    }
  });

  // Row-by-row formatting
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];

    // Row height
    if (row.height) {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'ROWS', startIndex: r, endIndex: r + 1 },
          properties: { pixelSize: row.height },
          fields: 'pixelSize',
        }
      });
    }

    // Full teal background row (border frame)
    if (row.fullBg) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 0, endColumnIndex: NUM_COLS },
          cell: { userEnteredFormat: { backgroundColor: row.fullBg } },
          fields: 'userEnteredFormat.backgroundColor',
        }
      });
    }

    // Section bar: teal bg across B through J (cols 1-9)
    if (row.sectionBar) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 1, endColumnIndex: 10 },
          cell: { userEnteredFormat: { backgroundColor: TEAL } },
          fields: 'userEnteredFormat.backgroundColor',
        }
      });
    }

    // Grey content rows: grey bg on merge anchor cells (B, F, J)
    if (row.greyContent) {
      // B-E area (cols 1-5)
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 1, endColumnIndex: 5 },
          cell: { userEnteredFormat: { backgroundColor: GREY_BG } },
          fields: 'userEnteredFormat.backgroundColor',
        }
      });
      // F-I area (cols 5-9)
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 5, endColumnIndex: 9 },
          cell: { userEnteredFormat: { backgroundColor: GREY_BG } },
          fields: 'userEnteredFormat.backgroundColor',
        }
      });
      // J (col 9)
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 9, endColumnIndex: 10 },
          cell: { userEnteredFormat: { backgroundColor: GREY_BG } },
          fields: 'userEnteredFormat.backgroundColor',
        }
      });
    }

    // Cell-specific formatting
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

    // Merges
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

  // ─── Borders (matching reference exactly) ───
  // Pattern: outer frame on A(left)/K(right), box borders on each merged section per row
  const bs = { style: 'SOLID', colorStyle: { rgbColor: { red: 0, green: 0, blue: 0 } } };

  // Outer frame: left border on col A, right border on col K, top on first row, bottom on last
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

  // Per-row: box borders on each merged section (and standalone J for content/section rows)
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row.fullBg) continue; // Skip teal frame rows — they're just the coloured border

    if (row.merges && row.merges.length > 0) {
      for (const [startCol, endCol] of row.merges) {
        requests.push({
          updateBorders: {
            range: { sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: startCol, endColumnIndex: endCol },
            top: bs, bottom: bs, left: bs, right: bs,
          }
        });
      }
      // J (col 9) is standalone in content/section/summary rows — needs its own box
      if (row.greyContent || row.sectionBar || row.isSummary) {
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

// ─── API Route ───

app.post('/api/create-quote', async (req, res) => {
  try {
    const q = req.body;
    console.log('Received quote data for:', q.customerName);

    const customerName = q.customerName || 'Unknown';
    const date = fmtDate(q.date || new Date()).replace(/\//g, '-');
    const title = formatTitle(customerName, date);

    // 1. Copy from template (which has the logo as a floating image)
    const copyRes = await drive.files.copy({
      fileId: TEMPLATE_ID,
      requestBody: { name: title, parents: [QUOTES_FOLDER_ID] },
    });
    const spreadsheetId = copyRes.data.id;
    console.log('Created spreadsheet from template:', spreadsheetId);

    // Get the sheet ID from the copied spreadsheet
    const ssInfo = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
    const sheetId = ssInfo.data.sheets[0].properties.sheetId;

    // Ensure gridlines are hidden
    const initRequests = [{
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { hideGridlines: true } },
        fields: 'gridProperties.hideGridlines',
      }
    }];
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: initRequests },
    });

    // 2. Build quote data
    const { rows, borderEndRow } = buildQuoteData(q);
    const grid = buildSheetValues(rows);
    const formatRequests = buildFormatRequests(rows, sheetId, borderEndRow);

    // 3. Write all values
    const lastCol = String.fromCharCode(64 + NUM_COLS); // 'K'
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Quote!A1:${lastCol}${grid.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: grid },
    });

    // 4. Apply formatting (column widths, row heights, cell formats, merges)
    if (formatRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: formatRequests },
      });
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    console.log(`Created quote: ${title}`);
    console.log(`URL: ${sheetUrl}`);

    res.json({ success: true, spreadsheetId, url: sheetUrl, title });

  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`GOB Sheets Server v3 running on http://localhost:${PORT}`);
});
