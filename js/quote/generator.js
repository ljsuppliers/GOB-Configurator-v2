// Premium Quote PDF generation using jsPDF
// Redesigned with professional layout and branding

import { getQuoteLayout, formatCurrency, formatDate } from './template.js';

// Load logo base64 (will be injected by build process or loaded separately)
let logoBase64 = null;

// Load logo on module initialization
fetch('./assets/logo-base64.txt')
  .then(res => res.text())
  .then(data => { logoBase64 = data.trim(); })
  .catch(err => console.warn('Logo not loaded:', err));

// ═══════════════════════════════════════════════════════════════
// VERSION TRACKING
// ═══════════════════════════════════════════════════════════════

function getNextVersion(customerName) {
  if (!customerName) return 1;
  
  const key = `gob-quote-version-${customerName.toLowerCase().replace(/\s+/g, '-')}`;
  const currentVersion = parseInt(localStorage.getItem(key) || '0', 10);
  const nextVersion = currentVersion + 1;
  
  localStorage.setItem(key, nextVersion.toString());
  return nextVersion;
}

function formatVersionedFilename(baseType, customerName, date) {
  const version = getNextVersion(customerName);
  const dateStr = date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  
  if (customerName) {
    return version > 1 
      ? `GOB ${baseType} - ${customerName} - ${dateStr} v${version}.pdf`
      : `GOB ${baseType} - ${customerName} - ${dateStr}.pdf`;
  }
  
  return `GOB ${baseType}.pdf`;
}

export function generateQuotePDF(state, price) {
  const widthM = (state.width / 1000).toFixed(1);
  const depthM = (state.depth / 1000).toFixed(1);
  const heightM = (state.height / 1000).toFixed(1);
  const dimensions = `${widthM}m x ${depthM}m x ${heightM}m`;
  const derived = { dimensions };

  // jsPDF loaded globally from lib/
  if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
    alert('jsPDF library not loaded. Please ensure lib/jspdf.min.js is included.');
    return;
  }

  const PDF = (typeof jspdf !== 'undefined') ? jspdf.jsPDF : jsPDF;
  const doc = new PDF({ unit: 'mm', format: 'a4' });

  // ═══════════════════════════════════════════════════════════════
  // PREMIUM DESIGN CONSTANTS
  // ═══════════════════════════════════════════════════════════════
  
  const colors = {
    primary: [44, 85, 48],      // #2c5530 - GOB green
    primaryLight: [58, 115, 64], // #3a7340
    accent: [234, 245, 236],     // #eaf5ec - light green bg
    dark: [26, 26, 26],          // #1a1a1a - text
    grey: [102, 102, 102],       // #666 - secondary text
    lightGrey: [224, 224, 224],  // #e0e0e0 - borders
    white: [255, 255, 255]
  };

  const margins = {
    left: 20,
    right: 20,
    top: 15,
    bottom: 15
  };

  const pageWidth = 210;
  const contentWidth = pageWidth - margins.left - margins.right;

  // ═══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  function setColor(colorArray) {
    doc.setTextColor(...colorArray);
  }

  function setFillColor(colorArray) {
    doc.setFillColor(...colorArray);
  }

  function setDrawColor(colorArray) {
    doc.setDrawColor(...colorArray);
  }

  function drawSection(y, height, bgColor = colors.accent) {
    setFillColor(bgColor);
    doc.rect(margins.left, y, contentWidth, height, 'F');
    return y;
  }

  function drawLine(y, color = colors.lightGrey, thickness = 0.3) {
    setDrawColor(color);
    doc.setLineWidth(thickness);
    doc.line(margins.left, y, pageWidth - margins.right, y);
  }

  function checkPageBreak(currentY, requiredSpace = 40) {
    if (currentY + requiredSpace > 270) {
      doc.addPage();
      return margins.top;
    }
    return currentY;
  }

  // ═══════════════════════════════════════════════════════════════
  // HEADER WITH LOGO & BRANDING
  // ═══════════════════════════════════════════════════════════════

  let y = margins.top;

  // Logo (if loaded)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margins.left, y, 50, 12);
    } catch (e) {
      console.warn('Failed to add logo:', e);
    }
  }

  // Company details (right-aligned)
  setColor(colors.grey);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const headerRight = pageWidth - margins.right;
  doc.text('Rear of 158 Main Road, Biggin Hill', headerRight, y + 3, { align: 'right' });
  doc.text('Kent, TN16 3BA', headerRight, y + 6, { align: 'right' });
  doc.text('01689 818 400', headerRight, y + 9, { align: 'right' });
  doc.text('www.gardenofficebuildings.co.uk', headerRight, y + 12, { align: 'right' });

  y += 20;

  // Divider line
  drawLine(y, colors.primary, 0.8);
  y += 8;

  // ═══════════════════════════════════════════════════════════════
  // QUOTE TITLE & DATE
  // ═══════════════════════════════════════════════════════════════

  setColor(colors.primary);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', margins.left, y);

  // Quote number and date (right side)
  setColor(colors.grey);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(state.customer?.date)}`, headerRight, y - 2, { align: 'right' });
  if (state.customer?.number) {
    doc.text(`Quote #: ${state.customer.number}`, headerRight, y + 3, { align: 'right' });
  }

  y += 12;

  // ═══════════════════════════════════════════════════════════════
  // CUSTOMER DETAILS BOX
  // ═══════════════════════════════════════════════════════════════

  const customerBoxHeight = 22;
  setFillColor(colors.accent);
  doc.roundedRect(margins.left, y, contentWidth, customerBoxHeight, 2, 2, 'F');

  setColor(colors.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED FOR:', margins.left + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(state.customer?.name || '[Customer Name]', margins.left + 5, y + 11);
  
  doc.setFontSize(9);
  setColor(colors.grey);
  if (state.customer?.address) {
    const addressLines = doc.splitTextToSize(state.customer.address, contentWidth - 10);
    let addressY = y + 16;
    addressLines.forEach(line => {
      doc.text(line, margins.left + 5, addressY);
      addressY += 4;
    });
  }

  y += customerBoxHeight + 10;

  // ═══════════════════════════════════════════════════════════════
  // BUILDING SUMMARY - HERO SECTION
  // ═══════════════════════════════════════════════════════════════

  y = checkPageBreak(y, 40);

  setColor(colors.primary);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('YOUR GARDEN OFFICE', margins.left, y);
  y += 8;

  // Main building description
  setColor(colors.dark);
  doc.setFontSize(12);
  const tierName = state.tier === 'signature' ? 'Signature' : 'Classic';
  const buildingDesc = `${dimensions} ${tierName} ${state.buildingType || 'Garden Office'}`;
  doc.text(buildingDesc, margins.left, y);

  // Price on the right
  setColor(colors.primary);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(price.basePrice), headerRight, y, { align: 'right' });

  y += 10;

  // Specifications in a clean layout
  setColor(colors.grey);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const specs = [
    `External: ${state.width}mm × ${state.depth}mm × ${state.height}mm`,
    `Internal: ~${state.width - 200}mm × ${state.depth - 200}mm × ${state.height - 125}mm`,
    `Range: ${tierName} Collection`,
  ];

  if (state.rooms && state.rooms.length > 1) {
    const roomLabels = state.rooms.map(r => r.label || 'Room').join(' + ');
    specs.push(`Layout: ${roomLabels}`);
  }

  specs.forEach(spec => {
    doc.text(`• ${spec}`, margins.left + 3, y);
    y += 4.5;
  });

  y += 6;
  drawLine(y);
  y += 8;

  // ═══════════════════════════════════════════════════════════════
  // SPECIFICATION SECTIONS
  // ═══════════════════════════════════════════════════════════════

  function renderSection(title, items, includePrice = false) {
    let sectionY = checkPageBreak(y, 30);
    
    setColor(colors.primary);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margins.left, sectionY);
    sectionY += 6;

    setColor(colors.dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    items.forEach(item => {
      if (typeof item === 'string') {
        doc.text(`• ${item}`, margins.left + 3, sectionY);
        sectionY += 4.5;
      } else {
        // Item with price
        doc.text(`• ${item.label}`, margins.left + 3, sectionY);
        if (item.price && item.price !== 0) {
          setColor(colors.grey);
          doc.setFont('helvetica', 'bold');
          doc.text(formatCurrency(item.price), headerRight, sectionY, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          setColor(colors.dark);
        }
        sectionY += 4.5;
      }
      sectionY = checkPageBreak(sectionY, 10);
    });

    return sectionY + 4;
  }

  // STANDARD FEATURES
  const standardFeatures = [
    'Insulated timber/panel construction (100mm PIR walls, 75mm PIR floor/ceiling)',
    state.tier === 'signature' ? '400mm canopy with integrated decking feature' : 'Flush front design with clean lines',
    `${state.foundationType === 'ground-screw' ? 'Ground screw' : 'Concrete'} foundation system`,
    `${state.cornerLeft === 'open' ? 'Open' : 'Closed'} left corner, ${state.cornerRight === 'open' ? 'open' : 'closed'} right corner`
  ];

  y = renderSection('STANDARD FEATURES', standardFeatures);

  // EXTERNAL FINISH
  const claddingLabels = {
    'western-red-cedar': 'Western red cedar',
    'anthracite-steel': 'Anthracite grey steel',
    'grey-steel': 'Grey steel',
    'composite-latte': 'Composite slatted (Latte)',
    'composite-coffee': 'Composite slatted (Coffee)',
    'thermowood': 'Thermowood',
    'larch': 'Larch'
  };

  const cladding = state.cladding || {};
  const externalFinish = [
    `Front: ${claddingLabels[cladding.front] || 'Premium timber'}`,
    `Left: ${claddingLabels[cladding.left] || 'Anthracite steel'}`,
    `Right: ${claddingLabels[cladding.right] || 'Anthracite steel'}`,
    `Rear: ${claddingLabels[cladding.rear] || 'Anthracite steel'}`,
    'Fascia, soffit and cappings: Grey',
    'Roof: EPDM rubber membrane',
    'Guttering: Rear-mounted system'
  ];

  if (state.tier === 'signature') {
    externalFinish.push('Integrated composite decking: Dark grey');
  }

  y = renderSection('EXTERNAL FINISH', externalFinish);

  // Add cladding upgrades with prices
  if (price.claddingUpgrades && price.claddingUpgrades.length > 0) {
    y -= 4; // Less space since it's a continuation
    price.claddingUpgrades.forEach(upgrade => {
      setColor(colors.grey);
      doc.setFontSize(9);
      doc.text(`  + ${upgrade.label}`, margins.left + 3, y);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(upgrade.price), headerRight, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 4.5;
    });
    y += 4;
  }

  // INTERNAL FINISH
  const internalFinish = [
    'Flooring: Natural Oak or Light Grey luxury vinyl (to be confirmed)',
    state.tier === 'signature' 
      ? 'Walls: Plasterboarded, plastered and decorated white' 
      : 'Walls: White melamine panel finish',
    'Skirting board: White MDF'
  ];

  y = renderSection('INTERNAL FINISH', internalFinish);

  // DOORS, WINDOWS & PARTITIONS
  y = checkPageBreak(y, 20);
  const components = [];
  
  (state.components || []).forEach(comp => {
    const elevation = comp.elevation ? ` (${comp.elevation})` : '';
    components.push(`${comp.label || comp.type}${elevation}`);
  });

  // Component upgrades
  if (price.componentUpgrades && price.componentUpgrades.length > 0) {
    price.componentUpgrades.forEach(upgrade => {
      components.push({ label: `Upgrade: ${upgrade.label}`, price: upgrade.price });
    });
  }

  // Height upgrade
  if (price.heightUpgrade > 0) {
    components.push({ label: price.heightUpgradeLabel, price: price.heightUpgrade });
  }

  // Partition
  const se = state.structuralExtras || {};
  if (se.partition !== 'none' && se.partition) {
    components.push(`Internal partition wall (${se.partition})`);
  }

  // Partition room
  const pr = state.partitionRoom;
  if (pr && pr.enabled) {
    const cornerLabels = {
      'rear-left': 'rear left',
      'rear-right': 'rear right',
      'front-left': 'front left',
      'front-right': 'front right'
    };
    const cornerPos = cornerLabels[pr.corner] || pr.corner;
    const dims = `${pr.width}mm × ${pr.depth}mm`;
    components.push(`${pr.label || 'Partition room'} (${cornerPos}, ${dims})`);
  }

  if (components.length > 0) {
    y = renderSection('DOORS, WINDOWS & PARTITIONS', components, true);
  }

  // ELECTRICAL INSTALLATION
  const electrical = [
    'LED downlights/panel lights',
    state.tier === 'signature' ? 'External spotlights in canopy soffit' : null,
    '5× double power sockets (1 with USB ports)',
    '1× double light switch',
    '1× network connection port (CAT6)',
    'Consumer unit with RCD protection'
  ].filter(Boolean);

  y = renderSection('ELECTRICAL INSTALLATION', electrical);

  // ═══════════════════════════════════════════════════════════════
  // OPTIONAL EXTRAS
  // ═══════════════════════════════════════════════════════════════

  if (price.extras && price.extras.length > 0) {
    y = checkPageBreak(y, 20);
    
    setColor(colors.primary);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('OPTIONAL EXTRAS', margins.left, y);
    y += 6;

    setColor(colors.dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    price.extras.forEach(extra => {
      doc.text(`• ${extra.label}`, margins.left + 3, y);
      setColor(colors.primary);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(extra.price), headerRight, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      setColor(colors.dark);
      y += 4.5;
      y = checkPageBreak(y, 10);
    });

    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════
  // DEDUCTIONS
  // ═══════════════════════════════════════════════════════════════

  if (price.deductions && price.deductions.length > 0) {
    y = checkPageBreak(y, 15);
    
    setColor(colors.grey);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DEDUCTIONS', margins.left, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    price.deductions.forEach(ded => {
      doc.text(`• ${ded.label}`, margins.left + 3, y);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(ded.price), headerRight, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 4.5;
    });

    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════
  // INSTALLATION & GROUNDWORKS
  // ═══════════════════════════════════════════════════════════════

  y = checkPageBreak(y, 20);

  setColor(colors.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('INSTALLATION & GROUNDWORKS', margins.left, y);
  y += 6;

  setColor(colors.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('• Professional installation including groundworks', margins.left + 3, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(price.installation), headerRight, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 5;

  setColor(colors.grey);
  doc.setFontSize(8);
  doc.text('* Groundworks and installation paid directly to installer team', margins.left + 5, y);
  y += 8;

  setColor(colors.dark);
  doc.setFontSize(9);
  doc.text('• Electrical Connection', margins.left + 3, y);
  y += 4;
  
  setColor(colors.grey);
  doc.setFontSize(8);
  doc.text('* To be arranged by customer\'s own electrician (excluded from quote)', margins.left + 5, y);
  y += 10;

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL NOTES
  // ═══════════════════════════════════════════════════════════════

  if (state.customNotes?.quote && state.customNotes.quote.trim()) {
    y = checkPageBreak(y, 25);
    
    setColor(colors.primary);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('ADDITIONAL NOTES', margins.left, y);
    y += 6;
    
    setColor(colors.dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const notesText = state.customNotes.quote.trim();
    const maxWidth = contentWidth - 6;
    const lines = doc.splitTextToSize(notesText, maxWidth);
    
    lines.forEach(line => {
      y = checkPageBreak(y, 10);
      doc.text(line, margins.left + 3, y);
      y += 4.5;
    });
    
    y += 6;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRICING SUMMARY - PREMIUM TABLE
  // ═══════════════════════════════════════════════════════════════

  y = checkPageBreak(y, 50);

  // Table background
  const tableTop = y;
  const tableHeight = price.discount > 0 ? 24 : 18;
  setFillColor([250, 250, 250]);
  doc.roundedRect(margins.left, tableTop, contentWidth, tableHeight, 1, 1, 'F');

  // Border
  setDrawColor(colors.lightGrey);
  doc.setLineWidth(0.5);
  doc.roundedRect(margins.left, tableTop, contentWidth, tableHeight, 1, 1, 'S');

  y += 5;

  // Subtotal
  setColor(colors.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', margins.left + 5, y);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(price.totalIncVat + price.discount), headerRight - 5, y, { align: 'right' });
  y += 6;

  // Discount (if any)
  if (price.discount > 0) {
    doc.setFont('helvetica', 'normal');
    setColor(colors.grey);
    doc.text(price.discountLabel || 'Discount', margins.left + 5, y);
    setColor([192, 57, 43]); // Red for discount
    doc.text(`-${formatCurrency(price.discount)}`, headerRight - 5, y, { align: 'right' });
    y += 6;
  }

  // Total line
  drawLine(y, colors.lightGrey, 0.3);
  y += 5;

  // TOTAL
  setColor(colors.primary);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', margins.left + 5, y);
  doc.setFontSize(16);
  doc.text(formatCurrency(price.totalIncVat), headerRight - 5, y, { align: 'right' });

  y += tableHeight - (price.discount > 0 ? 17 : 11) + 8;

  setColor(colors.grey);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('All prices include VAT at 20%', margins.left, y);
  y += 10;

  // ═══════════════════════════════════════════════════════════════
  // PAYMENT SCHEDULE
  // ═══════════════════════════════════════════════════════════════

  y = checkPageBreak(y, 30);

  setColor(colors.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT SCHEDULE', margins.left, y);
  y += 7;

  setColor(colors.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  price.paymentSchedule.forEach(payment => {
    doc.text(`${payment.stage}. ${payment.label}`, margins.left + 3, y);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(payment.amount), headerRight, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 5;
  });

  y += 8;

  // ═══════════════════════════════════════════════════════════════
  // TERMS & CONDITIONS
  // ═══════════════════════════════════════════════════════════════

  y = checkPageBreak(y, 35);

  setColor(colors.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS & CONDITIONS', margins.left, y);
  y += 6;

  setColor(colors.grey);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const terms = [
    'This quotation is valid for 30 days from the date shown.',
    'All prices include VAT at 20%.',
    'We ask that customers provide a toilet and mini skip whilst we are on site.',
    'Installation and groundworks are paid directly to our installer team.',
    'Electrical connection to mains supply is excluded and must be arranged by the customer.',
    'Lead time: typically 8-12 weeks from deposit payment.',
    'A deposit of 25% is required to confirm your order and secure your build slot.'
  ];

  terms.forEach(term => {
    y = checkPageBreak(y, 8);
    const lines = doc.splitTextToSize(`• ${term}`, contentWidth - 6);
    lines.forEach(line => {
      doc.text(line, margins.left + 3, y);
      y += 3.5;
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════

  // Position footer at bottom of page
  const footerY = 280;

  drawLine(footerY - 5, colors.primary, 0.8);

  setColor(colors.grey);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  
  const footerText = 'Garden Office Buildings Ltd | Rear of 158 Main Road, Biggin Hill, Kent TN16 3BA';
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
  
  doc.text('Tel: 01689 818 400 | Email: liam@gardenofficebuildings.co.uk', pageWidth / 2, footerY + 3.5, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════
  // SAVE PDF
  // ═══════════════════════════════════════════════════════════════

  const filename = formatVersionedFilename('Quote', state.customer?.name, state.customer?.date);
  doc.save(filename);
  
  return doc; // Return doc for potential reuse in combined PDF
}

// ═══════════════════════════════════════════════════════════════
// COMBINED QUOTE PACK PDF (Quote + Drawing)
// ═══════════════════════════════════════════════════════════════

export async function generateCombinedPDF(state, price, svgString) {
  if (!svgString) {
    alert('No drawing available to include in combined PDF');
    return;
  }
  
  // Note: This is a simplified implementation that exports both PDFs separately
  // A true single-document merge would require refactoring quote generation
  // or using a PDF merging library. For now, we export with sequential versioning.
  
  console.log('Generating combined quote pack (separate PDFs with matching versions)...');
  
  // Export quote first
  generateQuotePDF(state, price);
  
  // Wait for quote download to start
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Then export drawing with matching version
  const widthM = (state.width / 1000).toFixed(1);
  const depthM = (state.depth / 1000).toFixed(1);
  const heightM = (state.height / 1000).toFixed(1);
  const dimensions = `${widthM}m x ${depthM}m x ${heightM}m`;
  
  if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
    console.error('jsPDF not loaded');
    return;
  }

  const PDF = (typeof jspdf !== 'undefined') ? jspdf.jsPDF : jsPDF;
  const doc = new PDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3'
  });

  // Convert SVG to image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 3600;
  canvas.height = 2520;

  const img = new Image();
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 10, 10, 400, 277);

      URL.revokeObjectURL(url);
      
      const filename = formatVersionedFilename('Drawing', state.customer?.name, state.customer?.date);
      doc.save(filename);
      
      console.log('Combined pack exported: Quote + Drawing');
      resolve();
    };

    img.onerror = () => {
      console.error('Failed to render SVG');
      URL.revokeObjectURL(url);
      reject(new Error('Failed to render drawing'));
    };

    img.src = url;
  });
}
