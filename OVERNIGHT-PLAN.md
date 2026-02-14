# GOB Configurator Overnight Work Plan

Created: 2026-02-13 01:55 GMT

## Overview

Building out the full quote-to-drawing workflow based on analysis of 316 quotes and 24,890 emails.

---

## Task 1: Enhanced Site Survey Form (02:00)

**Goal:** Create comprehensive site survey that captures everything needed for quoting

**Based on:** Quote structure analysis + email correspondence patterns

**Fields to capture:**
- Customer details (name, address, phone, email, customer #)
- Building requirements (type, dimensions, use case)
- Site conditions (access, ground, boundaries, adjacent structures)
- Power supply location
- Planning considerations
- Preferred features (cladding, doors, windows, extras)
- Budget indication
- Preferred delivery date
- Photos upload

**Output:** Survey data that pre-populates the configurator

---

## Task 2: Partition Wall / Toilet Room Feature (03:00)

**Goal:** Add ability to place rectangular partition rooms in corners for toilet/shower

**Requirements:**
- User can add partition room to any corner (front-left, front-right, rear-left, rear-right)
- Specify room dimensions (width x depth)
- Room appears on plan view with door swing
- Pricing auto-calculated based on room type:
  - Basic storage: £400-£900
  - With interior door: £800-£1,200
  - Toilet/shower room: £1,150-£2,350

**Drawing updates:**
- Plan view shows partition walls
- Labels room (WC, Storage, etc.)
- Shows door position and swing arc

---

## Task 3: Email Template Generator (04:00)

**Goal:** Generate perfect email templates matching Liam's style

**Based on:** 24,890 emails analysed

**Templates to create:**
1. Initial enquiry response
2. Site visit booking
3. Post-visit quote email (main template)
4. Follow-up (no response) - 1 week
5. Follow-up (no response) - 2 weeks
6. Deposit confirmation
7. Drawing/specification email
8. Payment received confirmation
9. Delivery notification
10. Build complete / handover

**Style rules:**
- Use ".." not "..."
- "Hope all is well" opener
- "Many thanks, Liam" sign-off
- Personal but professional tone
- Reference Richard by name for site visits
- Include standard disclaimers

---

## Task 4: Quote → Drawing Integration (05:00)

**Goal:** Ensure quote and drawing use identical configuration

**Requirements:**
- Single source of truth (Vue state)
- Quote PDF shows exact components from drawing
- Component descriptions match between systems
- Pricing matches quote structure analysis
- Export both from same screen

---

## Task 5: Pricing Engine Validation (06:00)

**Goal:** Validate pricing against real quote data

**Based on:** 316 quotes analysed

**Checks:**
- Base price by area matches observed ranges
- Add-on prices match 2025-2026 prices
- Installation costs scale correctly
- Height upgrades priced correctly
- Cladding upgrades match observed prices

---

## File Locations

- Project: `~/Desktop/Garden Office Project/GOB-Configurator/`
- Email data: `~/Desktop/Garden Office Project/GOB-Configurator-Project/emails/`
- Quote data: `~/Desktop/Garden Office Project/GOB-Configurator-Project/quotes/`
- Analysis docs: `~/Desktop/Garden Office Project/GOB-Configurator-Project/*.md`
- Server: http://localhost:8766

---

## Success Criteria

By morning, Liam should be able to:
1. Fill in site survey → auto-populate configurator
2. Add toilet/shower room partition to any corner
3. Generate professional quote email with one click
4. Export matching quote PDF and drawing PDF
5. Trust that prices match real-world quotes
