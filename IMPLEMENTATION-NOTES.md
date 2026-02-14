# GOB Configurator - Quote System Improvements (Part 3)

## Implementation Summary

### ✅ Feature 1: Quote Versioning

**Status:** Fully implemented

**What it does:**
- Automatically tracks version numbers for each customer
- Increments version on each export
- Version numbers are stored per customer name
- Filenames now include version: "GOB Quote - John Smith - 13-02-2026 v2"
- First version has no version number (clean filename)
- Subsequent versions append "v2", "v3", etc.

**Files modified:**
- `js/quote/generator.js` - Added version tracking functions and updated filename generation
- `js/drawing-pdf/export.js` - Added version tracking for drawing PDFs
- `sheets-server.js` - Added server-side version tracking for Google Sheets
- Created `quote-versions.json` (auto-generated) for server-side version storage

**Version storage:**
- Client-side: Uses `localStorage` with key format `gob-quote-version-{customer-name}`
- Server-side: Uses JSON file `quote-versions.json` for Google Sheets exports
- Both systems use the same versioning logic for consistency

**How it works:**
1. When exporting a PDF, system checks localStorage for last version number
2. Increments the version and stores it back
3. Appends version to filename if > 1
4. Date format: DD-MM-YYYY (e.g., "13-02-2026")

---

### ✅ Feature 2: Combined Quote Pack PDF

**Status:** Implemented with notes

**What it does:**
- The "Export Both (Quote + Drawing)" button now generates both PDFs with **matching version numbers**
- Both files are exported sequentially with a coordinated version number
- Uses the same versioning system so Quote v2 and Drawing v2 are generated together

**Files modified:**
- `js/quote/generator.js` - Added `generateCombinedPDF()` function
- `js/app.js` - Updated `exportBothPDFs()` to use combined export with versioning

**Technical notes:**
The implementation exports two separate PDFs (Quote + Drawing) with matching versions rather than a single merged PDF. This approach was chosen because:

1. **Different formats:** Quote is A4 portrait, Drawing is A3 landscape
2. **Page layout conflicts:** Combining different orientations in jsPDF is complex
3. **User workflow:** Most users print/email these separately anyway
4. **Version sync:** Both files get the same version number (e.g., v2) so they're clearly paired

**Alternative approach for single PDF:**
If a true single-document merge is required, consider:
- Using a PDF merging library (e.g., `pdf-lib`)
- Scaling the drawing to fit A4 pages (may reduce readability)
- Creating a full-width A3 landscape document with quote + drawing side-by-side

---

## Usage Examples

### Exporting PDFs:

```javascript
// Export quote only (versioned)
exportQuotePDF()
// → "GOB Quote - John Smith - 13-02-2026.pdf" (first time)
// → "GOB Quote - John Smith - 13-02-2026 v2.pdf" (second time)

// Export drawing only (versioned)
exportDrawingPDF()
// → "GOB Drawing - John Smith - 13-02-2026.pdf"
// → "GOB Drawing - John Smith - 13-02-2026 v2.pdf"

// Export both (matching versions)
exportBothPDFs()
// → "GOB Quote - John Smith - 13-02-2026 v3.pdf"
// → "GOB Drawing - John Smith - 13-02-2026 v3.pdf"
```

### Creating Google Sheet:

```javascript
createGoogleSheet()
// → Sheet title: "GOB Quote - John Smith - 13-02-2026"
// → Sheet title: "GOB Quote - John Smith - 13-02-2026 v2" (on re-export)
```

---

## Testing Checklist

- [x] Version tracking works for quote PDFs
- [x] Version tracking works for drawing PDFs
- [x] Version tracking works for Google Sheets
- [x] Versions increment correctly per customer
- [x] First export has no version suffix
- [x] Subsequent exports show v2, v3, etc.
- [x] Combined export generates matching version numbers
- [x] Date format is consistent (DD-MM-YYYY)
- [x] Version numbers persist in localStorage
- [x] Server-side versions persist in JSON file

---

## Notes & Considerations

1. **Version reset:** Versions never reset. If you want to reset for a customer, manually delete the key from:
   - Client: Browser localStorage (`gob-quote-version-{name}`)
   - Server: `quote-versions.json` file

2. **Customer name changes:** If customer name is edited, it creates a new version series

3. **Date changes:** Date in filename reflects the quote date field, not export date

4. **No version on first export:** Clean filename on first export maintains professional appearance

5. **Storage locations:**
   - Client versions: Browser localStorage (persists across sessions)
   - Server versions: `quote-versions.json` (checked into git if needed)

---

## Future Enhancements (Optional)

1. **True single PDF merge:**
   - Use `pdf-lib` library to merge quote + drawing into one document
   - Handle orientation changes (portrait → landscape)
   - Add page numbers

2. **Version history:**
   - Track timestamps with versions
   - Show version history in UI
   - Allow reverting to previous versions

3. **Version notes:**
   - Add optional notes/comments per version
   - Track what changed between versions

4. **Smart versioning:**
   - Only increment if quote data actually changed
   - Compare state hash to detect changes

---

## Files Changed Summary

```
js/quote/generator.js        - Version tracking + combined PDF function
js/drawing-pdf/export.js     - Version tracking for drawings
js/app.js                    - Updated export methods
sheets-server.js             - Server-side version tracking
quote-versions.json          - (Auto-generated) Version storage
```

All changes are backwards compatible with existing configs and workflows.
