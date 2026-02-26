/**
 * GOB Configurator - Google Sheets Quote Generator v2
 * Generates entire quote sheet from scratch — no template dependency.
 * All rows are dynamic, all formatting is applied programmatically.
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
  if (n < 0) return '-£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const elev = comp.elevation ? ` — ${comp.elevation} elevation` : '';
  return `1 x full height ${widthM}m wide ${typeDesc}: smooth anthracite grey outside, white inside${handleDesc}${elev}`;
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

// ─── Brand colours ───
const TEAL = { red: 0.231, green: 0.659, blue: 0.659 };       // #3BA8A8
const TEAL_LIGHT = { red: 0.878, green: 0.949, blue: 0.949 };  // #E0F2F2
const WHITE = { red: 1, green: 1, blue: 1 };
const BLACK = { red: 0, green: 0, blue: 0 };
const DARK_GREY = { red: 0.2, green: 0.2, blue: 0.2 };
const LIGHT_GREY = { red: 0.95, green: 0.95, blue: 0.95 };
const MID_GREY = { red: 0.6, green: 0.6, blue: 0.6 };

// ─── Sheet Builder ───
// Builds rows of data + formatting requests, row by row, so everything is dynamic.

function buildQuoteData(q) {
  const isSig = q.tier === 'signature';
  const { intW, intD, intH } = getInternalDims(q);
  const w = (q.width / 1000).toFixed(1);
  const d = (q.depth / 1000).toFixed(1);
  const h = (q.height / 1000).toFixed(1);
  const numDownlights = getDownlights(q);
  const numSpotlights = getSpotlights(q);

  // We'll build an array of row objects. Each row object:
  // { cells: [{ col, value, bold, fontSize, bg, fg, align, merge }], height }
  // Col indices: A=0, B=1, ... J=9
  // We use 10 columns (A-J). Price values go in col J (index 9).

  const rows = [];
  const sectionFormats = []; // track formatting requests

  function addBlank(count = 1) {
    for (let i = 0; i < count; i++) rows.push({ cells: [] });
  }

  function addRow(cells, height) {
    rows.push({ cells, height });
  }

  // ════════════════════════════════════════════
  // HEADER
  // ════════════════════════════════════════════
  addBlank(1); // Row 1 (spacer)

  // Row 2: Company Name
  addRow([{ col: 1, value: 'Garden Office Buildings', bold: true, fontSize: 18, fg: TEAL }], 30);

  // Row 3: Address line 1
  addRow([{ col: 1, value: 'Unit 5B, Biggin Hill Airport, Churchill Way, Westerham TN16 3BN', fontSize: 9, fg: MID_GREY }]);

  // Row 4: Contact
  addRow([{ col: 1, value: '020 3488 2828  |  info@gardenofficebuildings.co.uk  |  www.gardenofficebuildings.co.uk', fontSize: 9, fg: MID_GREY }]);

  addBlank(1); // Row 5

  // ════════════════════════════════════════════
  // QUOTATION TITLE
  // ════════════════════════════════════════════
  addRow([{ col: 1, value: 'QUOTATION', bold: true, fontSize: 16, fg: TEAL }], 28);

  addBlank(1);

  // ════════════════════════════════════════════
  // CUSTOMER INFO
  // ════════════════════════════════════════════
  const dateStr = fmtDate(q.date || new Date());
  addRow([
    { col: 1, value: 'Customer:', bold: true, fontSize: 10 },
    { col: 4, value: q.customerName || '', fontSize: 10 },
  ]);
  addRow([
    { col: 1, value: 'Date:', bold: true, fontSize: 10 },
    { col: 4, value: dateStr, fontSize: 10 },
  ]);
  addRow([
    { col: 1, value: 'Address:', bold: true, fontSize: 10 },
    { col: 4, value: q.address || '', fontSize: 10 },
  ]);

  addBlank(1);

  // ════════════════════════════════════════════
  // BUILDING SPECIFICATION
  // ════════════════════════════════════════════
  addRow([
    { col: 1, value: 'BUILDING SPECIFICATION', bold: true, fontSize: 12, fg: WHITE, bg: TEAL },
    { col: 2, value: '', bg: TEAL }, { col: 3, value: '', bg: TEAL }, { col: 4, value: '', bg: TEAL },
    { col: 5, value: '', bg: TEAL }, { col: 6, value: '', bg: TEAL }, { col: 7, value: '', bg: TEAL },
    { col: 8, value: '', bg: TEAL },
    { col: 9, value: 'Price', bold: true, fontSize: 10, fg: WHITE, bg: TEAL, align: 'RIGHT' },
  ], 26);

  addBlank(1);

  // Building summary
  addRow([
    { col: 1, value: `Your Building: ${w}m x ${d}m x ${h}m ${q.buildingType || 'Garden Office Building'}`, bold: true, fontSize: 11 },
    { col: 9, value: fmtCurrency(q.basePrice), bold: true, fontSize: 11, align: 'RIGHT' },
  ]);

  // Dimensions
  const extDimNote = isSig ? ' (incl. 400mm canopy/decking)' : '';
  addRow([{ col: 1, value: `External Dimensions: ${q.width}mm (W) x ${q.depth}mm (D) x ${q.height}mm (H)${extDimNote}`, fontSize: 9, fg: MID_GREY }]);
  addRow([{ col: 1, value: `Internal Dimensions: ${intW}mm (W) x ${intD}mm (D) x ${intH}mm (H) (approx)`, fontSize: 9, fg: MID_GREY }]);

  // Range
  const tierDesc = isSig
    ? 'Signature range — integrated canopy and composite decking on front of building'
    : 'Classic range — clean, minimalist design';
  addRow([{ col: 1, value: tierDesc, fontSize: 10 }]);

  addBlank(1);

  // ════════════════════════════════════════════
  // STANDARD FEATURES
  // ════════════════════════════════════════════
  addRow([
    { col: 1, value: `STANDARD FEATURES (${isSig ? 'Signature' : 'Classic'})`, bold: true, fontSize: 11, fg: TEAL },
  ], 22);

  // Insulation
  addRow([{ col: 1, value: 'Full insulation: 100mm Celotex floor, 50mm Celotex walls, 100mm Celotex roof', fontSize: 10 }]);

  // Canopy/Decking (Signature)
  if (isSig) {
    const hasCanopy = q.hasCanopy !== false;
    const hasDecking = q.hasDecking !== false;
    if (hasCanopy && hasDecking) {
      addRow([{ col: 1, value: '400mm integrated canopy with composite decking on front of building', fontSize: 10 }]);
    } else if (hasCanopy) {
      addRow([{ col: 1, value: '400mm integrated canopy on front of building', fontSize: 10 }]);
    } else if (hasDecking) {
      addRow([{ col: 1, value: 'Integrated composite decking on front of building', fontSize: 10 }]);
    }
  }

  // Foundation
  const foundationLabels = {
    'ground-screw': 'Ground screw foundation system',
    'concrete-base': 'Concrete base foundation',
    'concrete-pile': 'Concrete pile foundation system'
  };
  addRow([{ col: 1, value: foundationLabels[q.foundationType] || 'Ground screw foundation system', fontSize: 10 }]);

  // Corners (Signature)
  if (isSig) {
    addRow([{ col: 1, value: `Front-left corner: ${q.cornerLeft || 'Open'}  |  Front-right corner: ${q.cornerRight || 'Open'}`, fontSize: 10 }]);
  }

  addBlank(1);

  // ════════════════════════════════════════════
  // EXTERNAL FINISH
  // ════════════════════════════════════════════
  addRow([
    { col: 1, value: 'EXTERNAL FINISH', bold: true, fontSize: 11, fg: TEAL },
  ], 22);

  // Cladding per side
  const claddingRows = [
    { side: 'Front', value: q.frontCladding },
    { side: 'Right', value: q.rightCladding, price: q.rightCladdingPrice },
    { side: 'Left', value: q.leftCladding, price: q.leftCladdingPrice },
    { side: 'Rear', value: q.rearCladding },
  ];
  for (const cl of claddingRows) {
    const cells = [{ col: 1, value: `${cl.side} cladding: ${cl.value || 'anthracite grey steel'}`, fontSize: 10 }];
    if (cl.price && cl.price > 0) {
      cells.push({ col: 9, value: fmtCurrency(cl.price), fontSize: 10, align: 'RIGHT' });
    }
    addRow(cells);
  }

  // Additional external features
  addRow([{ col: 1, value: 'Anthracite grey aluminium fascia boards & trims', fontSize: 10 }]);
  addRow([{ col: 1, value: 'EPDM rubber roof membrane with 25-year guarantee', fontSize: 10 }]);
  addRow([{ col: 1, value: 'Anthracite grey aluminium guttering & downpipe', fontSize: 10 }]);

  if (isSig) {
    const hasDecking = q.hasDecking !== false;
    if (hasDecking) {
      addRow([{ col: 1, value: 'Integrated composite decking: dark grey', fontSize: 10 }]);
    }
  }

  addBlank(1);

  // ════════════════════════════════════════════
  // INTERNAL FINISH
  // ════════════════════════════════════════════
  addRow([
    { col: 1, value: 'INTERNAL FINISH', bold: true, fontSize: 11, fg: TEAL },
  ], 22);

  if (isSig) {
    addRow([{ col: 1, value: 'Plastered and painted internal walls (white)', fontSize: 10 }]);
  } else {
    addRow([{ col: 1, value: 'White melamine faced internal wall panels', fontSize: 10 }]);
  }
  addRow([{ col: 1, value: 'Heavy-duty vinyl flooring throughout', fontSize: 10 }]);
  addRow([{ col: 1, value: 'White UPVC skirting board', fontSize: 10 }]);
  addRow([{ col: 1, value: 'White UPVC internal window sills', fontSize: 10 }]);

  addBlank(1);

  // ════════════════════════════════════════════
  // DOORS & WINDOWS
  // ════════════════════════════════════════════
  addRow([
    { col: 1, value: 'DOORS & WINDOWS', bold: true, fontSize: 11, fg: TEAL },
  ], 22);

  if (q.components && q.components.length > 0) {
    for (const comp of q.components) {
      const desc = formatComponentDesc(comp);
      const cells = [{ col: 1, value: desc, fontSize: 10 }];
      if (comp.price && comp.price > 0) {
        cells.push({ col: 9, value: fmtCurrency(comp.price), fontSize: 10, align: 'RIGHT' });
      }
      addRow(cells);
    }
  }

  addRow([{ col: 1, value: '4mm double glazed toughened glass throughout', fontSize: 10 }]);

  // Component upgrades
  if (q.componentUpgrades && q.componentUpgrades.length > 0) {
    for (const u of q.componentUpgrades) {
      addRow([
        { col: 1, value: u.label, fontSize: 10 },
        { col: 9, value: fmtCurrency(u.price), fontSize: 10, align: 'RIGHT' },
      ]);
    }
  }

  // Height upgrade
  if (q.heightUpgrade && q.heightUpgrade.price > 0) {
    addRow([
      { col: 1, value: q.heightUpgrade.label, fontSize: 10 },
      { col: 9, value: fmtCurrency(q.heightUpgrade.price), fontSize: 10, align: 'RIGHT' },
    ]);
  }

  addBlank(1);

  // ════════════════════════════════════════════
  // ELECTRICAL INSTALLATION
  // ════════════════════════════════════════════
  addRow([
    { col: 1, value: 'ELECTRICAL INSTALLATION', bold: true, fontSize: 11, fg: TEAL },
  ], 22);

  addRow([{ col: 1, value: `${numDownlights} x dimmable LED downlights`, fontSize: 10 }]);
  addRow([{ col: 1, value: 'Configuration/Quantity TBC on 1st fix electrician visit approximately 1 week into project', fontSize: 9, fg: MID_GREY }]);

  if (numSpotlights > 0) {
    addRow([{ col: 1, value: `${numSpotlights} x external spotlights in canopy soffit`, fontSize: 10 }]);
  }

  addRow([{ col: 1, value: '5 x double power sockets in brushed steel finish (1 w/ USB ports)', fontSize: 10 }]);

  // Lighting zones
  let lightingZones = 1;
  if (q.straightPartition?.enabled) lightingZones++;
  if (q.partitionRoom?.enabled) lightingZones++;
  if (lightingZones > 1) {
    addRow([{ col: 1, value: `${lightingZones} x internal lighting zones on separate switches`, fontSize: 10 }]);
  }

  addRow([{ col: 1, value: '1 x double light switch in brushed steel', fontSize: 10 }]);
  addRow([{ col: 1, value: '1 x network connection port', fontSize: 10 }]);
  addRow([{ col: 1, value: 'Consumer unit', fontSize: 10 }]);

  addBlank(1);

  // ════════════════════════════════════════════
  // OPTIONAL EXTRAS (selected)
  // ════════════════════════════════════════════
  const hasExtras = (q.extras && q.extras.length > 0) ||
                    (q.deductions && q.deductions.length > 0);

  if (hasExtras) {
    addRow([
      { col: 1, value: 'SELECTED EXTRAS & UPGRADES', bold: true, fontSize: 11, fg: TEAL },
    ], 22);

    if (q.extras && q.extras.length > 0) {
      for (const extra of q.extras) {
        addRow([
          { col: 1, value: extra.label, fontSize: 10 },
          { col: 9, value: fmtCurrency(extra.price), fontSize: 10, align: 'RIGHT' },
        ]);
      }
    }

    // Deductions
    if (q.deductions && q.deductions.length > 0) {
      for (const ded of q.deductions) {
        addRow([
          { col: 1, value: ded.label, fontSize: 10 },
          { col: 9, value: fmtCurrency(ded.price), fontSize: 10, fg: { red: 0.1, green: 0.6, blue: 0.2 }, align: 'RIGHT' },
        ]);
      }
    }

    addBlank(1);
  }

  // ════════════════════════════════════════════
  // OPTIONAL EXTRAS REFERENCE LIST
  // ════════════════════════════════════════════
  addRow([
    { col: 1, value: 'OPTIONAL EXTRAS (available to add)', bold: true, fontSize: 10, fg: MID_GREY },
  ], 20);

  const optionalExtras = [
    ['External double plug socket', '£235.00'],
    ['External up/down light', '£95.00'],
    ['Electric wall panel heater', '£495.00'],
    ['Additional double plug socket', '£60.00'],
    ['Additional double plug socket w/ USB', '£85.00'],
    ['Additional lighting zone', '£125.00'],
    ['Wireless quinetic switch system', '£265.00'],
    ['Air conditioning (standard)', '£1,750.00'],
    ['Air conditioning (premium w/ app)', '£2,250.00'],
    ['CAT6 network point', '£45.00'],
    ['HDMI cables + brush plates for TV', '£30.00'],
    ['Flood light cabling', '£50.00'],
    ['TV mounting preparation', '£95.00'],
  ];

  for (const [label, price] of optionalExtras) {
    addRow([
      { col: 1, value: label, fontSize: 9, fg: MID_GREY },
      { col: 9, value: price, fontSize: 9, fg: MID_GREY, align: 'RIGHT' },
    ]);
  }

  addBlank(1);

  // ════════════════════════════════════════════
  // INSTALLATION & GROUNDWORKS
  // ════════════════════════════════════════════
  addRow([
    { col: 1, value: 'INSTALLATION & GROUNDWORKS', bold: true, fontSize: 11, fg: TEAL },
  ], 22);

  addRow([
    { col: 1, value: 'Installation & Groundworks', fontSize: 10 },
    { col: 9, value: fmtCurrency(q.installationPrice), bold: true, fontSize: 10, align: 'RIGHT' },
  ]);

  addRow([{ col: 1, value: 'Includes site preparation, delivery, assembly, and all groundworks', fontSize: 9, fg: MID_GREY }]);

  addBlank(1);

  // Electrical connection note
  addRow([{ col: 1, value: 'Electrical Connection', bold: true, fontSize: 10 }]);
  addRow([{ col: 1, value: 'To be arranged separately with our approved electrician — quoted directly to customer', fontSize: 9, fg: MID_GREY }]);

  // Plumbing note if bathroom
  if (q.bathroom && q.bathroom.enabled) {
    addRow([{ col: 1, value: 'Utility Connections (Water, Waste)', bold: true, fontSize: 10 }]);
    addRow([{ col: 1, value: 'To be arranged separately with our plumber/landscaper — quoted directly to customer', fontSize: 9, fg: MID_GREY }]);
  }

  addBlank(1);

  // ════════════════════════════════════════════
  // CUSTOM NOTES
  // ════════════════════════════════════════════
  if (q.quoteNotes && q.quoteNotes.trim()) {
    addRow([
      { col: 1, value: 'ADDITIONAL NOTES', bold: true, fontSize: 11, fg: TEAL },
    ], 22);
    // Split notes by newlines for cleaner display
    const lines = q.quoteNotes.trim().split('\n');
    for (const line of lines) {
      addRow([{ col: 1, value: line, fontSize: 10 }]);
    }
    addBlank(1);
  }

  // ════════════════════════════════════════════
  // PRICING SUMMARY
  // ════════════════════════════════════════════
  const subtotalRow = rows.length;
  addRow([
    { col: 1, value: '', bg: LIGHT_GREY }, { col: 2, value: '', bg: LIGHT_GREY }, { col: 3, value: '', bg: LIGHT_GREY },
    { col: 4, value: '', bg: LIGHT_GREY }, { col: 5, value: '', bg: LIGHT_GREY }, { col: 6, value: '', bg: LIGHT_GREY },
    { col: 7, value: 'Subtotal', bold: true, fontSize: 11, bg: LIGHT_GREY, align: 'RIGHT' },
    { col: 8, value: '', bg: LIGHT_GREY },
    { col: 9, value: fmtCurrency(q.subtotal), bold: true, fontSize: 11, bg: LIGHT_GREY, align: 'RIGHT' },
  ], 24);

  // Discount
  if (q.discount && q.discount > 0) {
    addRow([
      { col: 7, value: q.discountLabel || 'Discount', fontSize: 10, fg: { red: 0.1, green: 0.6, blue: 0.2 }, align: 'RIGHT' },
      { col: 8, value: '' },
      { col: 9, value: '-' + fmtCurrency(q.discount), fontSize: 10, fg: { red: 0.1, green: 0.6, blue: 0.2 }, align: 'RIGHT' },
    ]);
  }

  // Total
  addRow([
    { col: 1, value: '', bg: TEAL }, { col: 2, value: '', bg: TEAL }, { col: 3, value: '', bg: TEAL },
    { col: 4, value: '', bg: TEAL }, { col: 5, value: '', bg: TEAL }, { col: 6, value: '', bg: TEAL },
    { col: 7, value: 'TOTAL (inc. VAT)', bold: true, fontSize: 13, fg: WHITE, bg: TEAL, align: 'RIGHT' },
    { col: 8, value: '', bg: TEAL },
    { col: 9, value: fmtCurrency(q.total), bold: true, fontSize: 13, fg: WHITE, bg: TEAL, align: 'RIGHT' },
  ], 30);

  addRow([{ col: 1, value: 'All prices include VAT at 20%', fontSize: 9, fg: MID_GREY }]);

  addBlank(2);

  // ════════════════════════════════════════════
  // PAYMENT SCHEDULE
  // ════════════════════════════════════════════
  addRow([
    { col: 1, value: 'PAYMENT SCHEDULE', bold: true, fontSize: 12, fg: WHITE, bg: TEAL },
    { col: 2, value: '', bg: TEAL }, { col: 3, value: '', bg: TEAL }, { col: 4, value: '', bg: TEAL },
    { col: 5, value: '', bg: TEAL }, { col: 6, value: '', bg: TEAL }, { col: 7, value: '', bg: TEAL },
    { col: 8, value: '', bg: TEAL },
    { col: 9, value: '', bg: TEAL },
  ], 26);

  addBlank(1);

  // Payment rows from pricing engine
  if (q.paymentSchedule && q.paymentSchedule.length > 0) {
    for (const ps of q.paymentSchedule) {
      addRow([
        { col: 1, value: ps.label, fontSize: 10 },
        { col: 9, value: fmtCurrency(ps.amount), fontSize: 10, align: 'RIGHT' },
      ]);
    }
  }

  addBlank(1);

  // Payment total
  addRow([
    { col: 1, value: '', bg: LIGHT_GREY }, { col: 2, value: '', bg: LIGHT_GREY }, { col: 3, value: '', bg: LIGHT_GREY },
    { col: 4, value: '', bg: LIGHT_GREY }, { col: 5, value: '', bg: LIGHT_GREY }, { col: 6, value: '', bg: LIGHT_GREY },
    { col: 7, value: 'TOTAL', bold: true, fontSize: 11, bg: LIGHT_GREY, align: 'RIGHT' },
    { col: 8, value: '', bg: LIGHT_GREY },
    { col: 9, value: fmtCurrency(q.total), bold: true, fontSize: 11, bg: LIGHT_GREY, align: 'RIGHT' },
  ], 24);

  addRow([{ col: 1, value: '* Groundworks & Installation schedule may be adjusted based on project timeline', fontSize: 9, fg: MID_GREY }]);

  addBlank(2);

  // ════════════════════════════════════════════
  // TERMS & CONDITIONS
  // ════════════════════════════════════════════
  addRow([
    { col: 1, value: 'TERMS & CONDITIONS', bold: true, fontSize: 10, fg: TEAL },
  ], 20);

  const terms = [
    'This quotation is valid for 30 days from the date shown above.',
    'All prices include VAT at the current rate of 20%.',
    'A holding deposit of £250 is required to reserve your delivery and installation date.',
    'Delivery lead times are typically 6-10 weeks from receipt of deposit, subject to availability.',
    'Electrical connection to your property\'s consumer unit is arranged separately with our approved electrician.',
    'Skip hire for site waste removal is not included and will be arranged if required.',
    'Any variation to the specification above may result in a revised quotation.',
  ];

  for (const term of terms) {
    addRow([{ col: 1, value: `• ${term}`, fontSize: 9, fg: MID_GREY }]);
  }

  addBlank(2);

  // Footer
  addRow([{ col: 1, value: 'Garden Office Buildings  |  020 3488 2828  |  info@gardenofficebuildings.co.uk', fontSize: 9, fg: TEAL }]);

  return rows;
}

// ─── Convert row data into Sheets API calls ───

function buildSheetValues(rows) {
  // Convert rows into a 2D array for values.update
  // We use 10 columns (A-J)
  const grid = [];
  for (const row of rows) {
    const r = new Array(10).fill('');
    for (const cell of (row.cells || [])) {
      r[cell.col] = cell.value || '';
    }
    grid.push(r);
  }
  return grid;
}

function buildFormatRequests(rows, sheetId) {
  const requests = [];

  // Column widths
  const colWidths = [30, 450, 60, 60, 120, 60, 60, 60, 60, 120]; // A-J
  for (let i = 0; i < colWidths.length; i++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: colWidths[i] },
        fields: 'pixelSize',
      }
    });
  }

  // Default font for entire sheet
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: 10 },
      cell: {
        userEnteredFormat: {
          textFormat: { fontFamily: 'Arial', fontSize: 10, foregroundColorStyle: { rgbColor: DARK_GREY } },
          verticalAlignment: 'MIDDLE',
          wrapStrategy: 'WRAP',
        }
      },
      fields: 'userEnteredFormat(textFormat,verticalAlignment,wrapStrategy)',
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

    // Cell formatting
    for (const cell of (row.cells || [])) {
      const format = {};
      const fields = [];

      if (cell.bold !== undefined || cell.fontSize || cell.fg) {
        format.textFormat = {};
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

    // 1. Create a new blank spreadsheet
    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [{ properties: { title: 'Quote', sheetId: 0 } }],
      }
    });

    const spreadsheetId = createRes.data.spreadsheetId;
    const sheetId = 0;
    console.log('Created spreadsheet:', spreadsheetId);

    // 2. Build quote data
    const rows = buildQuoteData(q);
    const grid = buildSheetValues(rows);
    const formatRequests = buildFormatRequests(rows, sheetId);

    // 3. Write all values
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Quote!A1:J${grid.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: grid },
    });

    // 4. Apply formatting
    if (formatRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: formatRequests },
      });
    }

    // 5. Move to quotes folder
    await drive.files.update({
      fileId: spreadsheetId,
      addParents: QUOTES_FOLDER_ID,
      fields: 'id, parents',
    });

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
  console.log(`GOB Sheets Server v2 running on http://localhost:${PORT}`);
});
