# GOB Configurator - Comprehensive TODO

Based on analysis of 2025-2026 quotes and emails.

---

## 1. OPTIONAL EXTRAS - Complete List (2025-2026 Prices)

### Electrical Extras ✅ (Already in system)
- [x] External double plug socket - £235
- [x] External up/down light - £95
- [x] Oil filled electric wall panel heater - £495
- [x] Additional double plug socket - £60
- [x] Additional plug socket w/ USB - £85
- [x] Additional lighting zone on separate switch - £125
- [x] Wireless quinetic switch system - £265
- [x] Air conditioning (standard Mitsubishi MSZ-HR) - £1,750
- [x] Air conditioning (premium Mitsubishi MSZ-LN w/ app) - £2,250
- [x] Additional CAT6 network point - £45

### Structural Extras ✅ (Already in system)
- [x] Height upgrade 2.5m → 2.75m - £2,000
- [x] Height upgrade 2.5m → 2.95m - £3,500
- [x] Additional decking - £350/sqm
- [x] Cedar cladding upgrade per side - £125/sqm
- [x] Composite cladding upgrade per side - £125/sqm

### MISSING EXTRAS - Need to Add
- [x] **TV mounting preparation** (HDMI cables + brush plates) - £95 ✅ Added 2026-02-13
- [ ] **Underfloor heating** - price TBD (seen in emails)
- [x] **Bi-fold door upgrade** from sliding - £850 ✅ Added 2026-02-13
- [x] **Removal of integrated decking** - DEDUCTION of £750 ✅ Added 2026-02-13
- [x] **Premium flooring upgrade** - £350 ✅ Added 2026-02-13
- [ ] **Removal service** for existing structure - ~£450/day

### DEDUCTIONS - Added 2026-02-13
- [x] **Remove integrated decking** - -£750
- [x] **Use existing foundation** - -£500

---

## 2. QUOTE EMAIL - Must Be Fully Customised

### Required Personalisation Fields ✅ (Completed 2026-02-13)
- [x] **Customer first name** (not just full name)
- [x] **Who did site visit** (Liam / Richard / Guillaume) - salesRep field
- [x] **Date of site visit** - visitDate field with day of week calculation
- [x] **Day of week for sign-off** ("Have a lovely Friday!")
- [ ] **Building use case** mentioned naturally (office, gym, multi-purpose, etc.)
- [ ] **Specific features discussed** during visit
- [x] **Ambassador discount** if applicable (local, good case study) - ambassadorEligible checkbox
- [ ] **Promotional offer** if current (e.g., "February Ambassador Scheme")

### Quote Email Structure (from real 2026 emails) ✅ (Implemented)
1. Greeting: "Good afternoon [FirstName]" or "Hi [FirstName]" ✅ uses todayTimeOfDay
2. Opener: "Hope all is well and thank you for having [SalesRep] visit on [DayOfWeek]" ✅
3. If showroom visit: "It was great to meet you to discuss your project" ✅ visitedShowroom checkbox
4. Quote intro: "I've attached our quote for a [dimensions] [building type]..."
5. **"Your building includes:"** - bullet list of key features
6. **"For all our projects we produce a detailed drawing..."**
7. Ambassador/discount paragraph (if applicable)
8. Optional extras mention
9. Exclusions (electrical connection, toilet, skip)
10. "We've looked at all our competitors..." confidence paragraph
11. **"Regarding next steps:"** - £250 deposit, Guillaume visit, drawing
12. **"In the meantime:"** - Gallery, YouTube, Telegraph links
13. Showroom visit offer
14. Sign-off: "Have a great [DayOfWeek] and rest of the week…"
15. "Many thanks, Liam"

### Custom Notes Field Needed ✅
- [x] Add **"Custom notes for email"** text area in survey/configurator
- [x] These get inserted into the quote email body
- [x] Examples: specific site conditions discussed, customer's use case details, why we recommended certain options

---

## 3. CUSTOM NOTES - All Documents ✅

### Quote PDF ✅
- [x] Add **"Additional Notes"** section before totals
- [x] For site-specific info, special arrangements, etc.

### Quote Email ✅
- [x] Add **"Custom paragraph"** field
- [x] Gets inserted after building description

### Drawing ✅
- [x] Add **"Notes"** text block on drawing
- [x] Position: near title block or bottom margin
- [x] For construction notes, site access notes, etc.

---

## 4. DRAWING FEATURES - Need to Add

### External Features (must show on elevations/plan)
- [ ] **Up/down lights** - show on front elevation (wall-mounted lights)
- [ ] **External sockets** - show position on elevation
- [ ] **AC unit** - show on side elevation (external condenser unit position)
- [ ] **Downpipe positions** - currently shows but verify accuracy

### Plan View Additions
- [ ] **AC unit position** - rectangle with "AC" label
- [ ] **Water butt position** - if selected
- [ ] **Door swing arcs** - for all doors (currently only partition)
- [ ] **Furniture layout option?** - desk, sofa positions (future feature)

### Dimension Annotations
- [ ] **Internal dimensions** as well as external
- [ ] **Window/door positions** from left edge
- [ ] **Partition room dimensions** if enabled

---

## 5. SALES REP TRACKING

### In Survey Form
- [x] Already added: Surveyor dropdown (Liam/Richard)
- [ ] Add: **Guillaume** option (office manager for follow-ups)

### In Quote Email
- [ ] Auto-populate **"Thank you for having [SalesRep] visit"**
- [ ] Different wording if Liam did visit vs Richard
- [ ] If customer visited showroom instead: "Thank you for visiting our showroom"

---

## 6. DATE/TIME TRACKING

### In Survey Form
- [ ] Add: **Visit date** (date picker)
- [ ] Add: **Visit time** (time picker)

### In Quote Email
- [ ] Calculate day of week from visit date
- [ ] "Thank you for having Richard visit on **Saturday afternoon**"
- [ ] Sign-off: "Have a great **[today's day]** and rest of the week…"

---

## 7. PRICING ADJUSTMENTS

### Deductions (negative prices) ✅ DONE 2026-02-13
- [x] **Remove integrated decking** - £750 deduction
- [x] **Use existing foundation** - £500 deduction
- [x] These show as negative line items in price panel and quote PDF

### Discounts
- [x] Already has discount field
- [ ] Add **discount reason** field (Ambassador, Early Bird, Promotional, etc.)
- [ ] Auto-generate discount text for email

---

## 8. AMBASSADOR SCHEME

### When to Apply
- Local customer (good for case studies)
- Willing to allow 2 prospective customer visits
- Discount: typically £1,500 - £2,000

### Implementation
- [ ] Add **"Ambassador discount"** checkbox in survey
- [ ] Auto-adds discount with label
- [ ] Adds paragraph to quote email explaining the scheme

---

## Priority Order

1. ~~**Custom notes fields** (quote, email, drawing) - HIGH~~ ✅ DONE
2. **Quote email full personalisation** - HIGH
3. ~~**Missing extras** (bi-fold upgrade, decking removal, TV prep) - HIGH~~ ✅ DONE 2026-02-13
4. **Drawing: AC unit, up/down lights** - MEDIUM
5. **Visit date/time tracking** - MEDIUM
6. **Ambassador scheme automation** - MEDIUM
7. ~~**Deduction line items** - LOW~~ ✅ DONE 2026-02-13
8. **Internal dimensions on drawing** - LOW
