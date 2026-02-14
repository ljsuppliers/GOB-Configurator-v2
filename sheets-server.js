/**
 * GOB Configurator - Google Sheets Quote Generator
 * Copies from template and replaces data to match existing quote format
 * 
 * Template structure (Beccy Scott quote - Signature):
 * Row 7-10: Customer info (Name, #, Date, Address) in column E
 * Row 17: Building spec + base price (B17, J17)
 * Row 18-19: Dimensions
 * Row 21: Tier description
 * Row 23: Standard Features header
 * Row 25: Overhang line (Signature only)
 * Row 27: Foundation price (J27)
 * Row 28-29: Corner designs (Signature only)
 * Row 31: External Finish header
 * Row 32-35: Cladding
 * Row 39: Decking line (Signature only)
 * Row 41-44: Internal finish
 * Row 46-51: Doors, windows
 * Row 53-59: Electrical
 * Row 61-72: Optional extras (reference)
 * Row 74-79: Installation / Utility Connections
 * Row 81-83: Totals (SUB, Discount, TOTAL)
 * Row 88-96: Payment schedule
 * 
 * Template Flexibility:
 * - Classic tier: Clears rows 25, 28-29, 39 (no canopy/decking/corners)
 * - Annexe: Detects "Annexe" in buildingType and:
 *   • Uses 25% x 4 payment schedule (not 50/50 building + installation)
 *   • Shows utility connections as "Included" (rows 76-77)
 *   • Kitchen/Bathroom included in base price (no separate line items)
 */

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Load OAuth credentials
const credentialsPath = path.join(__dirname, 'oauth-credentials.json');
const tokenPath = path.join(__dirname, 'oauth-token.json');

// Version tracking (server-side storage)
const versionsPath = path.join(__dirname, 'quote-versions.json');

function getNextVersion(customerName) {
  if (!customerName) return 1;
  
  let versions = {};
  if (fs.existsSync(versionsPath)) {
    versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));
  }
  
  const key = customerName.toLowerCase().replace(/\s+/g, '-');
  const currentVersion = versions[key] || 0;
  const nextVersion = currentVersion + 1;
  
  versions[key] = nextVersion;
  fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2));
  
  return nextVersion;
}

function formatVersionedTitle(customerName, date) {
  const version = getNextVersion(customerName);
  const dateStr = date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  
  if (customerName) {
    return version > 1 
      ? `GOB Quote - ${customerName} - ${dateStr} v${version}`
      : `GOB Quote - ${customerName} - ${dateStr}`;
  }
  
  return 'GOB Quote';
}

let oauth2Client;

function initAuth() {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath));
  const token = JSON.parse(fs.readFileSync(tokenPath));
  const { client_id, client_secret } = credentials.installed || credentials.web;
  
  oauth2Client = new google.auth.OAuth2(client_id, client_secret);
  oauth2Client.setCredentials(token);
  
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      const currentToken = JSON.parse(fs.readFileSync(tokenPath));
      currentToken.refresh_token = tokens.refresh_token;
      fs.writeFileSync(tokenPath, JSON.stringify(currentToken, null, 2));
    }
  });
}

initAuth();

const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Template quote to copy
const TEMPLATE_ID = '1LYhcq5DGjhmuK761zFHdGRctUH0ZcsLczBuxM1HD8Ts';
const QUOTES_FOLDER_ID = '18dfAzGwqwqT-zI0yUBO60MrIFkvInULP';

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '';
  const num = Number(amount);
  if (num < 0) return '-£' + Math.abs(num).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '£' + num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB');
}

function formatComponentType(type) {
  if (!type) return 'window';
  if (type.includes('sliding')) return 'sliding door';
  if (type.includes('bifold')) return 'bi-fold door';
  if (type.includes('single')) return 'single opening door';
  if (type.includes('cladded') || type.includes('secret')) return 'secret cladded door';
  if (type.includes('opener')) return 'window with top opening window';
  if (type.includes('slot')) return 'slot window';
  if (type.includes('fixed') || type.includes('window')) return 'fixed window';
  return 'window';
}

/**
 * Create quote by copying template and updating values
 */
app.post('/api/create-quote', async (req, res) => {
  try {
    const q = req.body;
    console.log('Received quote data:', JSON.stringify(q, null, 2));
    
    const customerName = q.customerName || 'Unknown';
    const date = formatDate(q.date || new Date()).replace(/\//g, '-');
    const title = formatVersionedTitle(customerName, date);
    
    // Copy the template
    const copyRes = await drive.files.copy({
      fileId: TEMPLATE_ID,
      requestBody: {
        name: title,
        parents: [QUOTES_FOLDER_ID]
      }
    });
    
    const spreadsheetId = copyRes.data.id;
    console.log('Copied template to:', spreadsheetId);
    
    // Build dimensions
    const w = (q.width / 1000).toFixed(1);
    const d = (q.depth / 1000).toFixed(1);
    const h = (q.height / 1000).toFixed(1);
    const isSig = q.tier === 'signature';
    const isAnnexe = (q.buildingType || '').toLowerCase().includes('annexe');
    
    console.log(`Quote type: ${q.tier} tier${isAnnexe ? ' (Annexe)' : ''}`);
    
    const intW = q.width - 300;
    const intD = q.depth - (isSig ? 700 : 300);
    const intH = q.height - 350;
    
    // Calculate payment schedule
    const installPrice = q.installationPrice || 6000;
    const totalPrice = q.total || 0;
    
    // Annexe uses 25% x 4 payment schedule, others use 50/50 building + installation split
    let payment1, payment2, payment3, payment4;
    if (isAnnexe) {
      const quarterTotal = totalPrice / 4;
      payment1 = quarterTotal - 250; // Less holding deposit
      payment2 = quarterTotal;
      payment3 = quarterTotal;
      payment4 = quarterTotal;
    } else {
      const buildingAmount = totalPrice - installPrice;
      const halfBuilding = buildingAmount / 2;
      const halfInstall = installPrice / 2;
      payment1 = halfBuilding - 250; // Less holding deposit
      payment2 = halfBuilding;
      payment3 = halfInstall;
      payment4 = halfInstall;
    }
    
    // Determine number of downlights based on area
    const sqm = (q.width * q.depth) / 1000000;
    const numDownlights = Math.max(6, Math.ceil(sqm * 0.5) * 2);
    const numSpotlights = isSig ? Math.floor(q.width / 1000) : 0;
    
    // Build all updates
    const updates = [];
    
    // === CUSTOMER INFO (rows 7-10, column E) ===
    updates.push({ range: 'Quote!E7', values: [[customerName]] });
    updates.push({ range: 'Quote!E8', values: [[q.customerNumber || '']] });
    updates.push({ range: 'Quote!E9', values: [[formatDate(q.date || new Date())]] });
    updates.push({ range: 'Quote!E10', values: [[q.address || '']] });
    
    // === BUILDING SPEC (row 17) ===
    updates.push({ range: 'Quote!B17', values: [[`Your Building: ${w}M x ${d}M x ${h}m ${q.buildingType || 'Garden Office Building'}`]] });
    updates.push({ range: 'Quote!J17', values: [[formatCurrency(q.basePrice)]] });
    
    // === DIMENSIONS (rows 18-19) ===
    const extDimText = isSig 
      ? `External Dimensions – (W) ${q.width}mm (D) x ${q.depth}mm x (H) ${q.height}mm (incl. 400mm canopy/decking)`
      : `External Dimensions – (W) ${q.width}mm (D) x ${q.depth}mm x (H) ${q.height}mm`;
    updates.push({ range: 'Quote!B18', values: [[extDimText]] });
    updates.push({ range: 'Quote!B19', values: [[`Internal Dimensions – (W) ${intW}mm x (D) ${intD}mm x (H) ${intH}mm (approx)`]] });
    
    // === TIER/RANGE (row 21) ===
    const tierText = isSig 
      ? 'Signature range with integrated canopy and decking on front of building'
      : 'Classic design';
    updates.push({ range: 'Quote!B21', values: [[tierText]] });
    
    // === STANDARD FEATURES HEADER (row 23) ===
    updates.push({ range: 'Quote!B23', values: [[isSig ? 'Standard Features (Signature)' : 'Standard Features (Classic)']] });
    
    // === OVERHANG LINE (row 25) ===
    updates.push({ range: 'Quote!B25', values: [[isSig ? 'To include 400mm overhang/decking' : '']] });
    
    // === FOUNDATION (row 27) ===
    if (q.foundationPrice) {
      updates.push({ range: 'Quote!J27', values: [[formatCurrency(q.foundationPrice)]] });
      updates.push({ range: 'Quote!F27', values: [['1']] });
    }
    
    // === CORNERS (rows 28-29) - Signature only ===
    if (isSig) {
      updates.push({ range: 'Quote!B28', values: [[`Front-left corner design (open/closed): ${q.cornerLeft || 'Open'}`]] });
      updates.push({ range: 'Quote!B29', values: [[`Front-right corner design (open/closed): ${q.cornerRight || 'Open'}`]] });
    } else {
      updates.push({ range: 'Quote!B28', values: [['']] });
      updates.push({ range: 'Quote!B29', values: [['']] });
    }
    
    // === CLADDING (rows 32-35) ===
    updates.push({ range: 'Quote!B32', values: [[`Front cladding: ${q.frontCladding || 'composite slatted cladding (coffee)'}`]] });
    
    // Right cladding
    updates.push({ range: 'Quote!B33', values: [[`Right cladding: ${q.rightCladding || 'anthracite grey steel'}`]] });
    if (q.rightCladdingPrice) {
      updates.push({ range: 'Quote!F33', values: [['1']] });
      updates.push({ range: 'Quote!J33', values: [[formatCurrency(q.rightCladdingPrice)]] });
    } else {
      updates.push({ range: 'Quote!F33', values: [['']] });
      updates.push({ range: 'Quote!J33', values: [['']] });
    }
    
    // Left cladding
    updates.push({ range: 'Quote!B34', values: [[`Left cladding: ${q.leftCladding || 'anthracite grey steel'}`]] });
    if (q.leftCladdingPrice) {
      updates.push({ range: 'Quote!F34', values: [['1']] });
      updates.push({ range: 'Quote!J34', values: [[formatCurrency(q.leftCladdingPrice)]] });
    } else {
      updates.push({ range: 'Quote!F34', values: [['']] });
      updates.push({ range: 'Quote!J34', values: [['']] });
    }
    
    // Rear cladding
    updates.push({ range: 'Quote!B35', values: [[`Rear cladding: ${q.rearCladding || 'anthracite grey steel'}`]] });
    
    // === DECKING LINE (row 39) ===
    updates.push({ range: 'Quote!B39', values: [[isSig ? 'Integrated composite decking: dark grey' : '']] });
    
    // === DOORS & WINDOWS (rows 47-51) ===
    // Format components with full descriptions
    // Clear rows 47-51 first
    for (let i = 47; i <= 51; i++) {
      updates.push({ range: `Quote!B${i}`, values: [['']] });
      updates.push({ range: `Quote!F${i}`, values: [['']] });
      updates.push({ range: `Quote!J${i}`, values: [['']] });
    }
    
    if (q.components && q.components.length > 0) {
      let rowNum = 47;
      for (const comp of q.components) {
        if (rowNum > 51) break;
        
        // Build full description like: "1 x full height 2.5m wide sliding door: smooth anthracite grey outside, white inside (opening right to left) front elevation"
        const widthM = comp.width ? (comp.width / 1000).toFixed(1) : '2.5';
        const typeDesc = formatComponentType(comp.type);
        const handleDesc = (comp.type.includes('sliding') || comp.type.includes('single')) 
          ? (comp.handleSide === 'left' ? ' (opening left to right)' : ' (opening right to left)')
          : '';
        const elevDesc = comp.elevation ? ` ${comp.elevation} elevation` : '';
        
        const fullDesc = `1 x full height ${widthM}m wide ${typeDesc}: smooth anthracite grey outside, white inside${handleDesc}${elevDesc}`;
        
        updates.push({ range: `Quote!B${rowNum}`, values: [[fullDesc]] });
        if (comp.price && comp.price > 0) {
          updates.push({ range: `Quote!F${rowNum}`, values: [['1']] });
          updates.push({ range: `Quote!J${rowNum}`, values: [[formatCurrency(comp.price)]] });
        }
        rowNum++;
      }
    }
    
    // Glass type line (row 51 if not used by components)
    const glassRow = Math.max(51, 47 + (q.components?.length || 0));
    if (glassRow <= 51) {
      updates.push({ range: `Quote!B${glassRow}`, values: [['4mm double glazed toughened glass']] });
    }
    
    // Note: Partition room and bathroom suite are now included in the extras array
    // and will be rendered in the "SELECTED EXTRAS & UPGRADES" section below
    
    // === ELECTRICAL (rows 54-59) ===
    // Row 54: Downlights
    updates.push({ range: 'Quote!B54', values: [[`${numDownlights} x dimmable LED downlights`]] });
    updates.push({ range: 'Quote!B55', values: [['Configuration/Quantity TBC on 1st fix electrician visit approximately 1 week into project']] });
    
    // Row 56: External spotlights (Signature only)
    updates.push({ range: 'Quote!B56', values: [[isSig && numSpotlights > 0 ? `${numSpotlights} x external downlights in canopy soffit` : '']] });
    
    // Row 57: Power sockets
    const numSockets = q.socketCount || 5;
    updates.push({ range: 'Quote!B57', values: [[`${numSockets} x double power sockets in brushed steel finish (1 w/ USB ports)`]] });
    
    // Row 58: Light switch
    updates.push({ range: 'Quote!B58', values: [['1 x single dimmable light switch in brushed steel']] });
    
    // Row 59: Network + Consumer unit
    updates.push({ range: 'Quote!B59', values: [['1 x network connection port\nConsumer unit']] });
    
    // === OPTIONAL EXTRAS REFERENCE LIST (rows 61-72) ===
    // DO NOT CLEAR - Keep the template's reference list as-is:
    // External double plug socket (+ £ 235.00)
    // External up/down light (+ £ 95.00)
    // Oil filled electric wall panel radiator (+ £ 495.00)
    // etc.
    // The template has this pre-filled and we keep it for reference
    
    // === SELECTED EXTRAS & UPGRADES (rows 73-onwards, before Installation) ===
    // These are extras the customer HAS selected, inserted before the Installation row
    // We'll use rows that are available between the reference list and Installation
    
    // Count total extras to add
    const hasExtras = (q.extras && q.extras.length > 0) || 
                      (q.componentUpgrades && q.componentUpgrades.length > 0) || 
                      (q.heightUpgrade && q.heightUpgrade.price > 0);
    
    // Use rows 73-74 for selected extras header and items (limited space before Installation at 75)
    // If more space needed, this would require inserting rows in the template
    let currentExtraRow = 73;
    
    if (hasExtras) {
      updates.push({ range: `Quote!B${currentExtraRow}`, values: [['SELECTED EXTRAS & UPGRADES']] });
      updates.push({ range: `Quote!F${currentExtraRow}`, values: [['']] });
      updates.push({ range: `Quote!J${currentExtraRow}`, values: [['']] });
      currentExtraRow++;
    }
    
    // Component upgrades (bi-fold upgrades, premium doors/windows)
    if (q.componentUpgrades && q.componentUpgrades.length > 0) {
      for (const upgrade of q.componentUpgrades) {
        updates.push({ range: `Quote!B${currentExtraRow}`, values: [[upgrade.description || upgrade.label]] });
        updates.push({ range: `Quote!F${currentExtraRow}`, values: [['1']] });
        updates.push({ range: `Quote!J${currentExtraRow}`, values: [[formatCurrency(upgrade.price)]] });
        currentExtraRow++;
      }
    }
    
    // Height upgrade
    if (q.heightUpgrade && q.heightUpgrade.price > 0) {
      updates.push({ range: `Quote!B${currentExtraRow}`, values: [[q.heightUpgrade.label || 'Height upgrade']] });
      updates.push({ range: `Quote!F${currentExtraRow}`, values: [['1']] });
      updates.push({ range: `Quote!J${currentExtraRow}`, values: [[formatCurrency(q.heightUpgrade.price)]] });
      currentExtraRow++;
    }
    
    // Extras from extras array (electrical extras, partition, bathroom, etc)
    if (q.extras && q.extras.length > 0) {
      for (const extra of q.extras) {
        updates.push({ range: `Quote!B${currentExtraRow}`, values: [[extra.label]] });
        
        // Extract quantity from label if present (e.g., "External plug socket x2")
        const qtyMatch = extra.label.match(/x(\d+)$/);
        const qty = qtyMatch ? qtyMatch[1] : '1';
        updates.push({ range: `Quote!F${currentExtraRow}`, values: [[qty]] });
        
        updates.push({ range: `Quote!J${currentExtraRow}`, values: [[formatCurrency(extra.price)]] });
        currentExtraRow++;
      }
    }
    
    // Note: Deductions are NOT shown as separate line items (they're factored into pricing)
    // The sample quotes from GOB don't have a deductions section
    
    // === INSTALLATION (row 75) ===
    updates.push({ range: 'Quote!J75', values: [[formatCurrency(installPrice)]] });
    
    // === ELECTRICAL & PLUMBING CONNECTIONS (rows 76-79) ===
    if (isAnnexe) {
      // Annexe: utility connections are included
      updates.push({ range: 'Quote!B76', values: [['Utility Connections (Electrical, Internet, Water, Waste)']] });
      updates.push({ range: 'Quote!B77', values: [['Included']] });
      updates.push({ range: 'Quote!B78', values: [['']] });
      updates.push({ range: 'Quote!B79', values: [['']] });
    } else {
      // Standard: utility connections arranged separately
      updates.push({ range: 'Quote!B76', values: [['Electrical Connection']] });
      updates.push({ range: 'Quote!B77', values: [['To be arranged by electrician']] });
      
      // If bathroom is included, add plumbing connection note
      if (q.bathroom && q.bathroom.enabled) {
        updates.push({ range: 'Quote!B78', values: [['Utility Connections (Water, Waste)']] });
        updates.push({ range: 'Quote!B79', values: [['To be arranged by plumber/landscaper (quoted separately)']] });
      } else {
        updates.push({ range: 'Quote!B78', values: [['']] });
        updates.push({ range: 'Quote!B79', values: [['']] });
      }
    }
    
    // === TOTALS (rows 81-83) ===
    updates.push({ range: 'Quote!J81', values: [[formatCurrency(q.subtotal)]] });
    
    // Discount row
    if (q.discount && q.discount > 0) {
      updates.push({ range: 'Quote!H82', values: [[q.discountLabel || 'Discount']] });
      updates.push({ range: 'Quote!J82', values: [[formatCurrency(q.discount)]] });
    } else {
      updates.push({ range: 'Quote!H82', values: [['']] });
      updates.push({ range: 'Quote!J82', values: [['']] });
    }
    
    updates.push({ range: 'Quote!J83', values: [[formatCurrency(totalPrice)]] });
    
    // === PAYMENT SCHEDULE (rows 90-96) ===
    // Values in column I
    updates.push({ range: 'Quote!I90', values: [[formatCurrency(250)]] });
    updates.push({ range: 'Quote!I91', values: [[formatCurrency(payment1)]] });
    updates.push({ range: 'Quote!I92', values: [[formatCurrency(payment2)]] });
    updates.push({ range: 'Quote!I93', values: [[formatCurrency(payment3)]] });
    updates.push({ range: 'Quote!I94', values: [[formatCurrency(payment4)]] });
    updates.push({ range: 'Quote!I96', values: [[formatCurrency(totalPrice)]] });
    
    // Description text in column B (different for Annexe)
    if (isAnnexe) {
      const buildingLabel = q.buildingType.includes('Annexe') ? 'Garden Annexe Building' : 'Building';
      updates.push({ range: 'Quote!B90', values: [['Holding deposit reserves your delivery & install date (deductible from 1st payment)']] });
      updates.push({ range: 'Quote!B91', values: [[`25% of ${buildingLabel} due 4 weeks before delivery (less holding deposit)`]] });
      updates.push({ range: 'Quote!B92', values: [[`25% of ${buildingLabel} due on delivery of all materials (approx 2 weeks into project)`]] });
      updates.push({ range: 'Quote!B93', values: [[`25% of ${buildingLabel} due half-way through project (approx 4 weeks into project)`]] });
      updates.push({ range: 'Quote!B94', values: [[`25% of ${buildingLabel} due on completion`]] });
    }
    // For non-annexe quotes, keep the template's default 50/50 text
    
    // Batch update all cells
    console.log(`Updating ${updates.length} cells...`);
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    });
    
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    
    console.log(`Created quote: ${title}`);
    console.log(`URL: ${sheetUrl}`);
    
    res.json({
      success: true,
      spreadsheetId,
      url: sheetUrl,
      title
    });
    
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', templateId: TEMPLATE_ID, folderId: QUOTES_FOLDER_ID });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`GOB Sheets Server running on http://localhost:${PORT}`);
  console.log(`Using template: ${TEMPLATE_ID}`);
  console.log(`Saving to folder: ${QUOTES_FOLDER_ID}`);
});
