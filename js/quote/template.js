// Quote template utilities for premium PDF generation
// Color scheme and formatting helpers

export function getQuoteLayout() {
  // Legacy layout - kept for backwards compatibility
  // New generator.js uses its own premium layout
  return {
    pageWidth: 210,
    pageHeight: 297,
    marginLeft: 20,
    marginRight: 20,
    marginTop: 15,
    marginBottom: 15,
    colB: 20,
    colE: 90,
    colF: 120,
    colH: 155,
    colJ: 180,
    rowHeight: 6,
    headerSize: 14,
    bodySize: 9,
    smallSize: 7.5,
    sectionHeaderSize: 10.5,
    font: 'helvetica'
  };
}

export function formatCurrency(amount) {
  const absAmount = Math.abs(amount);
  const formatted = `£${absAmount.toLocaleString('en-GB', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  })}`;
  
  return amount < 0 ? `-${formatted}` : formatted;
}

export function formatDate(dateStr) {
  if (dateStr && dateStr.trim()) {
    return dateStr;
  }
  
  const d = new Date();
  const day = d.getDate();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
}

// Premium color palette (GOB brand colors)
export function getBrandColors() {
  return {
    primary: [44, 85, 48],        // #2c5530 - GOB green
    primaryLight: [58, 115, 64],   // #3a7340
    accent: [234, 245, 236],       // #eaf5ec - light green background
    dark: [26, 26, 26],            // #1a1a1a - primary text
    grey: [102, 102, 102],         // #666666 - secondary text
    lightGrey: [224, 224, 224],    // #e0e0e0 - borders/dividers
    white: [255, 255, 255],        // #ffffff
    danger: [192, 57, 43]          // #c0392b - for deductions/removals
  };
}

// Format a dimension in mm to meters
export function formatDimension(mm) {
  return `${(mm / 1000).toFixed(1)}m`;
}

// Format area in square meters
export function formatArea(widthMm, depthMm) {
  const sqm = (widthMm * depthMm) / 1000000;
  return `${sqm.toFixed(1)}m²`;
}

// Helper to split long text into lines for PDF
export function wrapText(text, maxCharsPerLine = 80) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    if ((currentLine + word).length <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  
  if (currentLine) lines.push(currentLine);
  return lines;
}
