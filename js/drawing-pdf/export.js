// Drawing PDF export using jsPDF
// Exports the live SVG drawing to A3 landscape PDF

// Version tracking (shared with quote generator)
function getNextVersion(customerName) {
  if (!customerName) return 1;
  
  const key = `gob-quote-version-${customerName.toLowerCase().replace(/\s+/g, '-')}`;
  const currentVersion = parseInt(localStorage.getItem(key) || '0', 10);
  const nextVersion = currentVersion + 1;
  
  localStorage.setItem(key, nextVersion.toString());
  return nextVersion;
}

function formatVersionedFilename(baseType, customerName, date, quoteNumber) {
  // "PATEL-4595 - Satch Patel - Quote - 22-09-2026.pdf" (Liam 22 Sep 2026: customer
  // name/number first on every download); falls back to the name alone.
  const version = getNextVersion(customerName);
  const dateStr = date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const parts = String(customerName || '').trim().split(/\s+/).filter(Boolean);
  const surname = (parts.length > 1 ? parts[parts.length - 1] : parts[0] || '').replace(/[^A-Za-z0-9'-]/g, '').toUpperCase();
  const num = String(quoteNumber || '').replace(/\D/g, '');
  const ref = surname && num ? `${surname}-${num}` : '';
  const stem = [ref, customerName, baseType, dateStr].filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]+/g, ' ');
  if (!customerName) return `GOB ${baseType}.pdf`;
  return version > 1 ? `${stem} v${version}.pdf` : `${stem}.pdf`;
}

export function exportDrawingPDF(state, svgString) {
  // Check for required libraries
  if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
    alert('jsPDF library not loaded.');
    return;
  }

  const PDF = (typeof jspdf !== 'undefined') ? jspdf.jsPDF : jsPDF;
  const doc = new PDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3'
  });

  const filename = formatVersionedFilename('Drawing', state.customer?.name, state.customer?.date, state.customer?.number);

  // Convert SVG to canvas, then to image in PDF
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 3600;
  canvas.height = 2520;

  const img = new Image();
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  img.onload = () => {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 10, 10, 400, 277);

    URL.revokeObjectURL(url);
    doc.save(filename);
  };
  img.onerror = () => {
    console.error('Failed to render SVG to canvas');
    URL.revokeObjectURL(url);
    alert('Failed to export drawing. Try using Print instead.');
  };
  img.src = url;
}
