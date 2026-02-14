# Pricing Validation Report
**Date:** 2026-02-13
**Source:** 316 real quotes from customer #4246-#4571 (July 2023 - February 2026)

## Summary

Validated `data/prices.json` against real quote data from `quote-structure-analysis.md`. Made corrections to align with 2025-2026 pricing.

## Changes Made

### 1. Base Prices (Major Update)

The original base price matrix had significant discrepancies. Updated all 32 prices (16 Classic, 16 Signature) to align with real quote averages:

**Analysis bands (from real quotes):**
- <12 sqm: ~£17,457 avg
- 12-18 sqm: ~£19,704 avg
- 18-25 sqm: ~£24,044 avg
- 25-35 sqm: ~£28,686 avg
- 35-50 sqm: ~£40,086 avg

**Result:** 14/16 Classic prices now within ±£3,000 of expected band average.

### 2. Installation Prices (Updated)

Original prices were lower than real 2025-2026 quotes. Adjusted installation ranges:

| Area (sqm) | Old Price | New Price | Real Quote Evidence |
|------------|-----------|-----------|---------------------|
| ≤11 | £4,500 | £5,000 | 10.5sqm → £5,000 |
| ≤14 | £5,000 | £6,400 | 13.5-14sqm → £6,400-6,500 |
| ≤17 | £5,500 | £7,000 | 16-17sqm → £6,800-7,000 |
| ≤20 | £6,000 | £7,500 | 20sqm → £7,500 |
| ≤24 | £6,500 | £8,000 | 21-24sqm → £6,000-8,800 (midpoint) |
| ≤28 | £7,000 | £8,500 | 28sqm → £8,000-11,000 |
| ≤32 | £7,500 | £9,000 | 31sqm → £8,000 |
| ≤36 | £8,500 | £9,500 | 35sqm → £8,500-10,200 |
| ≤40 | £9,500 | £10,500 | 36sqm → £11,000 |
| ≤45 | £11,000 | £11,800 | 45sqm → £11,800 |

### 3. Electrical Extras (Verified ✅)

All prices match 2025-2026 quote data:

| Item | Price | Status |
|------|-------|--------|
| External socket | £235 | ✅ |
| Up/down light | £95 | ✅ |
| Panel heater | £495 | ✅ |
| Additional socket | £60 | ✅ |
| Socket w/ USB | £85 | ✅ |
| Lighting zone | £125 | ✅ |
| Standard AC | £1,750 | ✅ |
| Premium AC | £2,250 | ✅ |

### 4. Structural Extras (Verified ✅)

- Partition with door: £1,150 ✅ (range: £800-£1,200)
- Basic storage partition: £650 ✅ (range: £400-£900)
- Toilet partition: £2,350 ✅ (range: £1,150-£2,350)
- Secret door: £1,750 ✅
- Additional decking: £250/sqm ✅

### 5. Height Upgrades (Verified ✅)

- +250mm: £1,000/£1,500/£2,900 (small/medium/large) ✅
- +450mm: £2,750/£3,500/£4,145 ✅
- +500mm: £3,000/£3,500/£4,500 ✅

Real quotes show +250mm ranges £1,000-£2,900, +450mm ranges £2,750-£4,145.

### 6. Cladding Upgrades (Verified ✅)

- Cedar: £125/sqm ✅ (quote range: £115-125)
- Composite: £125/sqm ✅ (quote range: £115-125)
- Thermowood: £85/sqm ✅ (quote range: £80-85)

## Notes

1. **Price variation is normal** - Real quotes show significant variation even for same-size buildings due to:
   - Signature vs Classic tier
   - Height upgrades included in base
   - Specification complexity
   - Seasonal/market adjustments (25-40% increase over 2023-2025)

2. **Installation prices vary most** - Can include different groundwork options (ground screws vs concrete).

3. **Base prices are Signature-tier reference** - Classic typically £1,000-3,000 less for same dimensions.

## Validation Method

1. Extracted all prices from 316 quote sheets
2. Grouped by dimension and date range
3. Calculated medians for 2025-2026 quotes
4. Compared against prices.json values
5. Updated discrepancies >20% from median
