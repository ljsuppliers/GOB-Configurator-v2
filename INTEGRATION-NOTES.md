# GOB Configurator - Quote & Drawing Integration

## Architecture

The GOB Configurator uses a **single source of truth** architecture where the Vue reactive state (`state`) drives both the quote PDF and the drawing SVG.

### Data Flow

```
Vue State (state)
    │
    ├─► pricing.js ─► generateQuotePDF() ─► Quote PDF
    │
    └─► drawing-engine.js ─► generateDrawing() ─► SVG ─► exportDrawingPDF() ─► Drawing PDF
```

## Key Integration Points

### 1. Components (Doors & Windows)

**State Location:** `state.components[]`

Each component has:
- `id`: Unique identifier (e.g., "comp-1")
- `type`: Component type key (e.g., "sliding-door-2500")
- `elevation`: Which wall ("front", "left", "right")
- `positionX`: Position in mm from left edge
- `label`: Human-readable name from components.json

**Quote PDF:** Shows `comp.label` in "Doors, Windows & Partitions" section
**Drawing:** Uses `comp.type` to select rendering function, dimensions from components.json

### 2. Component Upgrades (Pricing)

**Data Source:** `data/components.json`

Components with `upgradePrice > 0` appear as priced line items in the quote.
Both systems use the same definitions ensuring price-feature alignment.

### 3. Partition Room (Corner Room)

**State Location:** `state.partitionRoom`

Structure:
```javascript
{
  enabled: true/false,
  corner: "rear-left" | "rear-right" | "front-left" | "front-right",
  width: 1500,  // mm
  depth: 1500,  // mm
  type: "storage" | "wc" | "shower",
  label: "Storage"
}
```

**Quote PDF:** 
- Listed in "Doors, Windows & Partitions" section with position and dimensions
- Priced in "Optional Extras" via pricing.js `calculatePartitionRoomPrice()`

**Drawing:**
- Rendered in plan view via `renderPartitionRoom()`
- Shows walls, door opening, door swing arc, and label

### 4. Rooms

**State Location:** `state.rooms[]`

Each room has:
- `label`: Room name (e.g., "Office", "Storage")
- `widthMm`: Room width in mm

**Quote PDF:** Shows layout summary when multiple rooms exist
**Drawing:** Shows room labels in plan view, partition walls between rooms

## Export Features

### Individual Exports
- **Export Quote PDF:** Generates detailed quote with all components and pricing
- **Export Drawing PDF:** Generates A3 landscape drawing with elevations and plan

### Combined Export
- **Export Both:** Generates quote PDF, then drawing PDF (500ms delay between downloads)

## Verification Checklist

When making changes, verify:

1. [ ] Component added via palette appears in state.components
2. [ ] Component label matches between quote and source definition
3. [ ] Upgrade prices appear in both price summary and quote PDF
4. [ ] Partition room appears in both plan view and quote
5. [ ] Room labels match between drawing and state
6. [ ] Export Both generates both PDFs correctly

## File Locations

| File | Purpose |
|------|---------|
| `js/app.js` | Vue app, state management, export methods |
| `js/pricing.js` | Price calculation, component upgrades |
| `js/drawing-engine.js` | SVG drawing generation |
| `js/quote/generator.js` | Quote PDF generation |
| `js/drawing-pdf/export.js` | Drawing PDF export |
| `data/components.json` | Door/window definitions with prices |
| `data/defaults.json` | Default state structure |
