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

  const filename = formatVersionedFilename('Drawing', state.customer?.name, state.customer?.date);

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
