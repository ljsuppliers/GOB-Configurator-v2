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

/** Editor-only marks (wall-end handles, site/furniture handles, polyline points, cursors) must not print. */
export function cleanSvgForOutput(svg) {
  return String(svg || '')
    .replace(/<circle[^>]*class="(?:pw-handle|site-handle|site-pt)"[^>]*\/>/g, '')
    .replace(/<circle[^>]*class="(?:pw-handle|site-handle|site-pt)"[^>]*><\/circle>/g, '')
    .replace(/ style="cursor:[^"]*"/g, '');
}
let logoDataUrl = null;
/** The title block references assets/logo.png by relative path, which an SVG rendered as an
 *  image (or by svg2pdf) cannot fetch, so the logo went missing from exports (Liam 21 Oct 2026). */
async function inlineLogo(svgString) {
  if (!/href="assets\/logo\.png"/.test(svgString)) return svgString;
  try {
    if (!logoDataUrl) {
      const blob = await (await fetch('assets/logo.png')).blob();
      logoDataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
    }
    return svgString.replace(/href="assets\/logo\.png"/g, `href="${logoDataUrl}"`);
  } catch (e) { console.warn('logo inline failed', e); return svgString; }
}
function viewBoxOf(svgString) {
  const m = /viewBox="([\d.\-]+)\s+([\d.\-]+)\s+([\d.]+)\s+([\d.]+)"/.exec(svgString);
  return m ? { w: parseFloat(m[3]), h: parseFloat(m[4]) } : { w: 3600, h: 2520 };
}
/** Full-quality drawing export: the sheet goes into the PDF as vector artwork (svg2pdf.js), so lines
 *  and text stay crisp at any zoom. A high-resolution raster is the fallback if the plugin is missing
 *  or fails. A3 landscape, 10mm margin, sheet fitted to the page keeping its aspect ratio. */
export async function exportDrawingPDF(state, svgString, baseType = 'Drawing') {
  svgString = await inlineLogo(cleanSvgForOutput(svgString));
  if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') { alert('jsPDF library not loaded.'); return; }
  const PDF = (typeof jspdf !== 'undefined') ? jspdf.jsPDF : jsPDF;
  const doc = new PDF({ orientation: 'landscape', unit: 'mm', format: 'a3', compress: true });
  const filename = formatVersionedFilename(baseType, state.customer?.name, state.customer?.date, state.customer?.number);
  const vb = viewBoxOf(svgString);
  const boxW = 400, boxH = 277, scale = Math.min(boxW / vb.w, boxH / vb.h);
  const w = vb.w * scale, h = vb.h * scale, x = (420 - w) / 2, y = (297 - h) / 2;

  if (typeof doc.svg === 'function') {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-20000px;top:0;width:2000px;height:1400px;overflow:hidden;';
    host.innerHTML = svgString;
    const el = host.firstElementChild;
    try {
      el.removeAttribute('style'); el.setAttribute('width', vb.w); el.setAttribute('height', vb.h);
      document.body.appendChild(host);
      await doc.svg(el, { x, y, width: w, height: h });
      host.remove();
      doc.save(filename);
      return;
    } catch (e) {
      console.warn('Vector export failed, falling back to raster', e);
      host.remove();
    }
  }
  await new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const px = 7200; canvas.width = px; canvas.height = Math.round(px * vb.h / vb.w);
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }));
    img.onload = () => {
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h);
      URL.revokeObjectURL(url); doc.save(filename); resolve();
    };
    img.onerror = () => { console.error('Failed to render SVG to canvas'); URL.revokeObjectURL(url); alert('Failed to export drawing. Try using Print instead.'); resolve(); };
    img.src = url;
  });
}
