# Quote Sheet Data Mapping Implementation

## Summary
Updated `sheets-server.js` and `js/app.js` to include all missing data fields in the Google Sheets quote generation.

---

## Changes Made

### 1. **sheets-server.js**

#### Partition Room & Bathroom Suite
- **Now included in extras array** (no separate rows needed)
- Partition room pricing from `pricing.js`:
  - **Storage**: £650 base + size factor
  - **WC**: £1,500 base + size factor
  - **Shower**: £1,850 base + size factor
- Bathroom suite pricing:
  - **WC Suite**: £5,000
  - **Bathroom Suite**: £8,500
- Both appear in the "Selected Extras" section alongside other extras

#### Optional Extras Section (Rows 61-72)
Added comprehensive extras mapping with three subsections:

**Selected Extras & Upgrades Header (Row 61)**

**Component Upgrades (Rows 62+)**
- Bi-fold door upgrades (£850)
- Premium door/window upgrades
- Extracted from `price.componentUpgrades` array
- Shows description, quantity (1), and price

**Height Upgrade (Next available row)**
- Maps `heightUpgrade.price` and `heightUpgrade.label`
- Example: "Height upgrade +100mm (to 2.6m)"

**Individual Extras (Following rows)**
All extras from the `extras` array are now mapped:
- External sockets (£235 each)
- Up/down lights (£95 each)
- Panel heaters (£495 each)
- Additional sockets (£60/£85 with USB)
- Additional lighting zones (£125)
- Quinetic switch (£265)
- AC units (standard £1,750 / premium £2,250)
- CAT6 points (£45 each)
- TV mounting prep (£95)
- Extracts quantity from label (e.g., "External plug socket x2")

#### Deductions Section (Rows 70-72)
- **Deductions header** (Row 70)
- Maps all deductions with negative amounts:
  - Remove decking (-£750)
  - Use existing foundation (-£500)
- Shows label, quantity, and price (already negative)

---

### 2. **js/app.js**

#### Added to quoteData object:

**Component Upgrades**
```javascript
componentUpgrades: (this.price.componentUpgrades || []).map(u => ({
  label: u.label,
  price: u.price
}))
```

**Height Upgrade**
```javascript
heightUpgrade: this.price.heightUpgrade > 0 ? {
  price: this.price.heightUpgrade,
  label: this.price.heightUpgradeLabel
} : null
```

These are sent alongside the existing:
- `extras` - already mapped ✓
- `deductions` - already mapped ✓
- `components` - already mapped ✓
- `partitionRoom` - now properly priced ✓
- `bathroom` - existing, positioned correctly ✓

---

## Data Flow

1. **pricing.js** calculates all prices and builds arrays:
   - `price.extras` - electrical extras, structural extras
   - `price.deductions` - decking removal, foundation deduction
   - `price.componentUpgrades` - premium doors/windows
   - `price.heightUpgrade` - height upgrade amount
   - `price.claddingUpgrades` - cladding upgrade costs

2. **app.js** `createGoogleSheet()` maps pricing data to quote object:
   - Extracts arrays from `this.price`
   - Maps each extra/deduction to label + price
   - Sends to sheets-server via POST

3. **sheets-server.js** writes data to Google Sheet:
   - Clears rows 61-72 first
   - Writes "SELECTED EXTRAS & UPGRADES" header
   - Maps component upgrades (row 62+)
   - Maps height upgrade (next row)
   - Maps all extras with quantities (following rows)
   - Writes "DEDUCTIONS" header (row 70)
   - Maps all deductions with negative prices

---

## Row Layout in Quote Sheet

```
Row 47-49: Doors & Windows
Row 56-57: Electrical (downlights, spotlights)

Row 61: "SELECTED EXTRAS & UPGRADES" header
Row 62+: Component upgrades (bi-fold upgrade, etc.)
Row XX: Height upgrade (if enabled)
Row XX+: Partition room (if enabled - £650/£1,500/£1,850)
Row XX+: Bathroom suite (if enabled - £5,000/£8,500)
Row XX+: Individual extras (sockets, lights, heaters, AC, CAT6, etc.)

Row 70: "DEDUCTIONS" header
Row 71+: Deductions (remove decking, foundation, etc.)

Row 75: Installation & Groundworks
Row 81-83: Totals (Subtotal, Discount, Total)
```

---

## Testing Checklist

- [ ] Test with multiple extras (3+ different types)
- [ ] Test with deductions (both types)
- [ ] Test with bi-fold upgrade
- [ ] Test with height upgrade (+100mm, +200mm)
- [ ] Test with partition room (all 3 types)
- [ ] Test with bathroom suite (WC vs full bathroom)
- [ ] Test with mixed scenario (extras + deductions)
- [ ] Verify negative formatting on deductions
- [ ] Verify quantity extraction from labels (e.g., "x2")
- [ ] Check row overflow (max 12 extras/deductions combined)

---

## Notes

- Extras/deductions section uses rows 61-72 (12 rows available)
- If more than ~9 extras + deductions, some may be cut off
- Consider expanding to row 74 if needed (before installation section)
- Quantities are extracted from labels using regex: `/x(\d+)$/`
- Deductions use negative prices (already formatted in pricing.js)
- All prices formatted using `formatCurrency()` helper
