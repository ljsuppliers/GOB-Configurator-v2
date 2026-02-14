// GOB Configurator v2 — Vue 3 App
// Reactive state, live pricing, drawing preview, email drafting

import { initPricing, calculatePrice, formatPrice } from './pricing.js';
import { generateDrawing } from './drawing-engine.js';
import { generateQuotePDF, generateCombinedPDF } from './quote/generator.js';
import { exportDrawingPDF } from './drawing-pdf/export.js';
import { initComponentDrag } from './ui/component-drag.js';

const { createApp } = Vue;

async function fetchJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Failed to load ${path}: ${r.statusText}`);
  return r.json();
}

createApp({
  data() {
    return {
      loaded: false,
      state: null,
      appData: {},

      // UI state
      showExportMenu: false,
      activeBottomTab: 'email',
      selectedEmailTemplate: 'quoteEmail',
      emailSubject: '',
      emailBody: '',

      nextCompId: 100,
      nextFeatureId: 1000,

      // Survey extras checkboxes (mapped to state on apply)
      surveyExtras: {
        heating: false,
        externalSockets: false,
        upDownLights: false,
        partition: false,
        toilet: false,
        cat6: false,
        additionalSockets: false,
        tvMounting: false,
      },

      // Site sketch state
      sketchColour: '#333333',
      sketchLineWidth: 2,
      sketchCtx: null,
      isDrawing: false,

      // Static definitions
      buildingTypes: [
        'Garden Office Building',
        'Garden Room Building',
        'Garden Gym Building',
        'Garden Annexe Building',
        'Multi-Purpose Garden Building',
        'Garden Office/Gym Building',
      ],

      stepperExtras: [
        { key: 'externalSocket', label: 'External plug socket', price: 235, max: 4 },
        { key: 'upDownLight', label: 'Up/down light', price: 95, max: 6 },
        { key: 'heater', label: 'Panel heater', price: 495, max: 4 },
        { key: 'additionalSocket', label: 'Add. double socket', price: 60, max: 10 },
        { key: 'additionalSocketUsb', label: 'Add. socket w/ USB', price: 85, max: 10 },
        { key: 'additionalLightingZone', label: 'Add. lighting zone', price: 125, max: 6 },
        { key: 'cat6Point', label: 'CAT6 point', price: 45, max: 10 },
      ],
    };
  },

  computed: {
    price() {
      if (!this.state || !this.appData.prices) return null;
      return calculatePrice(this.state);
    },

    drawingSvg() {
      if (!this.state || !this.appData.components) return '';
      return generateDrawing(this.state, this.appData.components, this.appData.cladding);
    },

    doorTypes() {
      return this.appData.components?.doors || {};
    },

    windowTypes() {
      return this.appData.components?.windows || {};
    },

    claddingTypes() {
      return this.appData.cladding?.types || {};
    },

    // Sorted cladding types: composite first, then others, "other" at bottom
    sortedCladdingTypes() {
      const types = this.appData.cladding?.types || {};
      const sorted = {};
      // Add composite options first
      for (const [key, value] of Object.entries(types)) {
        if (key.startsWith('composite-')) sorted[key] = value;
      }
      // Add all other types except "other"
      for (const [key, value] of Object.entries(types)) {
        if (!key.startsWith('composite-') && key !== 'other') sorted[key] = value;
      }
      // Add "other" at the end
      if (types.other) sorted.other = types.other;
      return sorted;
    },
  },

  watch: {
    'state.tier'(newTier) {
      if (!this.appData.cladding) return;
      const defaults = this.appData.cladding.defaultByTier[newTier];
      if (defaults) {
        this.state.cladding.front = defaults.front;
      }
    },
    activeBottomTab(newTab) {
      if (newTab === 'survey') {
        this.$nextTick(() => this.initSketch());
      }
    },
  },

  methods: {
    fmt: formatPrice,

    step(obj, key, delta, min = 0, max = 10) {
      obj[key] = Math.max(min, Math.min(max, (obj[key] || 0) + delta));
    },

    getCompWidth(comp) {
      const allComps = { ...this.appData.components?.doors, ...this.appData.components?.windows };
      const def = allComps[comp.type];
      return def?.width || 900;
    },

    canMoveVertically(comp) {
      // Only non-fullHeight windows can be moved vertically
      const allComps = { ...this.appData.components?.doors, ...this.appData.components?.windows };
      const def = allComps[comp.type];
      // Doors are always ground level, fullHeight windows are fixed
      if (!def) return false;
      return def.category === 'standard' || def.category === 'slot';
    },

    addComponent(type) {
      const allComps = { ...this.appData.components.doors, ...this.appData.components.windows };
      const def = allComps[type];
      if (!def) return;
      const pos = Math.round((this.state.width / 2 - def.width / 2) / 50) * 50;
      const comp = {
        id: 'comp-' + (this.nextCompId++),
        type,
        elevation: 'front',
        positionX: Math.max(0, pos),
        label: def.label,
      };
      // Add handleSide for sliding and single doors
      if (type.includes('sliding') || type.includes('single')) {
        comp.handleSide = 'right';
      }
      this.state.components.push(comp);
    },

    removeComponent(id) {
      this.state.components = this.state.components.filter(c => c.id !== id);
    },

    removeRoom(index) {
      if (this.state.rooms.length > 1) {
        this.state.rooms.splice(index, 1);
      }
    },

    addExternalFeature(type) {
      // Default positions: lights at 1/4 and 3/4 width, sockets in middle
      let defaultX;
      if (type === 'upDownLight') {
        // Stagger lights so they don't overlap
        const existingLights = this.state.externalFeatures.filter(f => f.type === 'upDownLight');
        defaultX = existingLights.length % 2 === 0 
          ? Math.round(this.state.width * 0.25 / 50) * 50 
          : Math.round(this.state.width * 0.75 / 50) * 50;
      } else {
        defaultX = Math.round(this.state.width * 0.5 / 50) * 50;
      }
      
      // Default Y positions: lights near top of wall, sockets lower
      const defaultY = type === 'upDownLight' ? 1800 : 800; // mm from ground
      
      this.state.externalFeatures.push({
        id: 'feat-' + (this.nextFeatureId++),
        type,
        x: defaultX,
        y: defaultY
      });
    },

    removeExternalFeature(id) {
      this.state.externalFeatures = this.state.externalFeatures.filter(f => f.id !== id);
    },

    onPartitionChange() {
      const partition = this.state.structuralExtras.partition;
      if (partition !== 'none' && this.state.rooms.length === 1) {
        const splitWidth = Math.round(this.state.width * 0.6 / 50) * 50;
        this.state.rooms[0].widthMm = splitWidth;
        this.state.rooms.push({
          label: partition === 'toilet' ? 'WC' : 'Storage',
          widthMm: this.state.width - splitWidth,
        });
      } else if (partition === 'none' && this.state.rooms.length > 1) {
        this.state.rooms = [{ label: this.state.rooms[0].label, widthMm: this.state.width }];
      }
    },

    onPartitionRoomTypeChange() {
      const typeLabels = {
        'storage': 'Storage',
        'wc': 'WC',
        'shower': 'Shower'
      };
      this.state.partitionRoom.label = typeLabels[this.state.partitionRoom.type] || 'Room';
    },

    generateEmail() {
      if (!this.appData.emailTemplates) return;
      const template = this.appData.emailTemplates[this.selectedEmailTemplate];
      if (!template) return;

      const s = this.state;
      const firstName = (s.customer?.name || 'Customer').split(' ')[0];
      const dims = `${(s.width/1000).toFixed(1)}m x ${(s.depth/1000).toFixed(1)}m x ${(s.height/1000).toFixed(1)}m`;

      // Handle custom paragraph - add newlines if content exists
      const customParagraph = s.customNotes?.email?.trim() 
        ? '\n\n' + s.customNotes.email.trim()
        : '';

      // Calculate days of week
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = new Date();
      const todayDayOfWeek = dayNames[today.getDay()];
      
      // Calculate visit day of week
      let visitDayOfWeek = '';
      if (s.survey?.visitDate) {
        const visitDate = new Date(s.survey.visitDate + 'T12:00:00'); // Add time to avoid timezone issues
        visitDayOfWeek = dayNames[visitDate.getDay()];
      }

      // Time of day for greeting
      const hour = today.getHours();
      const todayTimeOfDay = hour < 12 ? 'morning' : 'afternoon';

      // Sales rep - fallback to Richard for backwards compatibility
      const salesRep = s.survey?.salesRep || s.survey?.surveyorName || 'Richard';

      // Opening paragraph - different for showroom visit vs site visit
      let openingParagraph;
      if (s.survey?.visitedShowroom) {
        openingParagraph = `Hope all is well. It was great to meet you${visitDayOfWeek ? ' on ' + visitDayOfWeek : ''} at our showroom to discuss your ${s.buildingType.toLowerCase()} project.`;
      } else {
        openingParagraph = `Hope all is well. Thank you for having ${salesRep} visit${visitDayOfWeek ? ' on ' + visitDayOfWeek : ''}, he said it was great to meet to discuss your ${s.buildingType.toLowerCase()} project.`;
      }

      // Discount paragraph - based on discount settings
      let discountParagraph = '';
      const discount = s.discount || {};
      const price = this.price;
      
      if (discount.type !== 'none' && discount.amount > 0 && price?.discount > 0) {
        const discountFormatted = '£' + price.discount.toLocaleString('en-GB');
        const discountReason = discount.description || 'discount';
        
        // Check if it's an ambassador discount
        if (discountReason.toLowerCase().includes('ambassador')) {
          discountParagraph = `\n\nI also wanted to mention that we've recently launched a new Ambassador Scheme. As local completed projects are incredibly valuable for us, we're offering a reduction for customers who are happy, once the build is complete, to allow up to two prospective customers to view the building by appointment. Given you are so local to us and would make a fantastic case study for our business, I've included a ${discountFormatted} ${discountReason} on your quote.`;
        } else {
          // Generic discount paragraph
          discountParagraph = `\n\nI've included a ${discountFormatted} ${discountReason} on your quote.`;
        }
      }
      
      // Legacy ambassador paragraph support (from survey checkbox)
      let ambassadorParagraph = '';
      if (s.survey?.ambassadorEligible && !discountParagraph) {
        // Only use this if no discount is already set
        let discountAmount = '£2,000';
        if (price && price.totalIncVat >= 40000) {
          discountAmount = '£4,000';
        } else if (price && price.totalIncVat >= 30000) {
          discountAmount = '£3,000';
        }
        ambassadorParagraph = `\n\nI also wanted to mention that we've recently launched a new Ambassador Scheme. As local completed projects are incredibly valuable for us, we're offering a reduction for customers who are happy, once the build is complete, to allow up to two prospective customers to view the building by appointment. Given you are so local to us and would make a fantastic case study for our business, I've included a ${discountAmount} discount on your quote.`;
      }

      // Build "building includes" text based on tier and features
      let buildingIncludes = `The ${s.tier === 'signature' ? 'Signature' : 'Classic'} range includes`;
      if (s.tier === 'signature') {
        buildingIncludes += ' a 400mm integrated canopy and decking on the front of the building.';
      } else {
        buildingIncludes += ' a sleek, minimalist design without the front canopy/decking.';
      }
      
      // Add bathroom info if enabled
      if (s.bathroom?.enabled && s.bathroom?.type) {
        if (s.bathroom.type === 'wc') {
          buildingIncludes += '\n\nThe price includes a WC suite with toilet, small vanity basin, extractor fan, tiling, and all internal plumbing. Utility connections (water supply and waste) will be arranged separately with our plumber and landscaper, similar to the electrical connection.';
        } else if (s.bathroom.type === 'bathroom') {
          buildingIncludes += '\n\nThe price includes a bathroom suite with toilet, vanity basin, shower tray with glass screen, extractor fan, heated towel rail, tiling, and all internal plumbing. Utility connections (water supply and waste) will be arranged separately with our plumber and landscaper, similar to the electrical connection.';
        }
      }
      
      // Showroom offer
      const showroomOffer = 'We also welcome you to visit our showroom in Biggin Hill to see our buildings first-hand. We have several display models available, and Richard is always happy to answer any questions.';

      const replacements = {
        '{customerFirstName}': firstName,
        '{customerName}': s.customer?.name || '',
        '{buildingType}': s.buildingType,
        '{buildingTypeLower}': s.buildingType.toLowerCase(),
        '{dimensions}': dims,
        '{tier}': s.tier === 'signature' ? 'Signature' : 'Classic',
        '{frontCladdingDesc}': this.claddingTypes[s.cladding?.front]?.label || 'cedar cladding',
        '{cornerDescription}': `${s.cornerLeft} left corner and ${s.cornerRight} right corner`,
        '{foundationType}': (s.foundationType || 'ground-screw').replace(/-/g, ' '),
        '{deliveryDate}': s.customer?.date || '[TBC]',
        '{customParagraph}': customParagraph,
        '{salesRep}': salesRep,
        '{visitDayOfWeek}': visitDayOfWeek,
        '{todayDayOfWeek}': todayDayOfWeek,
        '{todayTimeOfDay}': todayTimeOfDay,
        '{openingParagraph}': openingParagraph,
        '{ambassadorParagraph}': ambassadorParagraph,
        '{discountParagraph}': discountParagraph || ambassadorParagraph,
        '{buildingIncludes}': buildingIncludes,
        '{showroomOffer}': showroomOffer,
      };

      let subject = template.subject;
      let body = template.body;
      for (const [key, val] of Object.entries(replacements)) {
        subject = subject.replaceAll(key, val);
        body = body.replaceAll(key, val);
      }

      // Append signature
      if (this.appData.emailTemplates.signature) {
        body += this.appData.emailTemplates.signature;
      }

      this.emailSubject = subject;
      this.emailBody = body;
    },

    copyEmail() {
      const text = `Subject: ${this.emailSubject}\n\n${this.emailBody}`;
      navigator.clipboard.writeText(text).then(() => this.notify('Email copied to clipboard'));
    },

    saveConfig() {
      const json = JSON.stringify(this.state, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.state.customer?.name
        ? `GOB-Config-${this.state.customer.name.replace(/\s+/g, '-')}.json`
        : 'GOB-Config.json';
      a.click();
      URL.revokeObjectURL(url);
      this.notify('Configuration saved');
    },

    loadConfig() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          this.state = JSON.parse(text);
          this.nextCompId = 100 + (this.state.components?.length || 0);
          this.nextFeatureId = 1000 + (this.state.externalFeatures?.length || 0);
          // Ensure externalFeatures exists for older configs
          if (!this.state.externalFeatures) {
            this.state.externalFeatures = [];
          }
          this.notify('Configuration loaded: ' + (this.state.customer?.name || file.name));
        } catch (err) {
          alert('Invalid configuration file: ' + err.message);
        }
      });
      input.click();
    },

    exportQuotePDF() {
      this.showExportMenu = false;
      generateQuotePDF(this.state, this.price);
    },

    exportDrawingPDF() {
      this.showExportMenu = false;
      const svg = document.querySelector('#drawing-canvas svg');
      if (!svg) {
        this.notify('No drawing to export');
        return;
      }
      exportDrawingPDF(this.state, svg.outerHTML);
    },

    async exportBothPDFs() {
      this.showExportMenu = false;
      
      const svg = document.querySelector('#drawing-canvas svg');
      if (!svg) {
        // No drawing available, just export quote
        generateQuotePDF(this.state, this.price);
        this.notify('Quote exported (no drawing available)');
        return;
      }
      
      try {
        await generateCombinedPDF(this.state, this.price, svg.outerHTML);
        this.notify('Exported Quote + Drawing Pack (versioned)');
      } catch (err) {
        console.error('Combined export failed:', err);
        this.notify('Export failed. Try exporting separately.');
      }
    },

    // Alternative: Export as truly separate files (useful for testing)
    async exportSeparatePDFs() {
      this.showExportMenu = false;
      
      // Export quote PDF
      generateQuotePDF(this.state, this.price);
      
      // Short delay to allow first download to start
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Export drawing PDF
      const svg = document.querySelector('#drawing-canvas svg');
      if (svg) {
        exportDrawingPDF(this.state, svg.outerHTML);
        this.notify('Exported Quote + Drawing PDFs separately');
      } else {
        this.notify('Quote exported, but no drawing available');
      }
    },

    generateCustomerNumber() {
      // Try to get last customer number from localStorage
      const lastNumber = localStorage.getItem('gobLastCustomerNumber');
      let newNumber;
      
      if (lastNumber) {
        // Increment last number
        const lastNum = parseInt(lastNumber.replace(/\D/g, ''), 10);
        newNumber = 'GOB-' + String(lastNum + 1).padStart(4, '0');
      } else {
        // Use timestamp-based for first time
        const timestamp = Date.now();
        const shortId = timestamp.toString().slice(-6);
        newNumber = 'GOB-' + shortId;
      }
      
      // Store for next time
      localStorage.setItem('gobLastCustomerNumber', newNumber);
      return newNumber;
    },

    async createGoogleSheet() {
      this.showExportMenu = false;
      
      // ─── VALIDATION ───
      const missing = [];
      if (!this.state.customer?.name?.trim()) missing.push('Customer Name');
      if (!this.state.customer?.address?.trim()) missing.push('Customer Address');
      
      if (missing.length > 0) {
        this.notify('⚠️ Please fill in: ' + missing.join(', '));
        return;
      }
      
      // Auto-fill date if empty
      if (!this.state.customer.date) {
        this.state.customer.date = new Date().toISOString().split('T')[0];
      }
      
      // Auto-generate customer number if empty
      if (!this.state.customer.number) {
        this.state.customer.number = this.generateCustomerNumber();
      }
      
      // Sanity check on price (optional warning)
      if (this.price && this.price.totalIncVat) {
        const total = this.price.totalIncVat;
        if (total < 15000) {
          const proceed = confirm(`⚠️ Warning: Total price is £${(total/1000).toFixed(1)}k - this seems low for a garden office. Continue anyway?`);
          if (!proceed) return;
        } else if (total > 60000) {
          const proceed = confirm(`⚠️ Warning: Total price is £${(total/1000).toFixed(1)}k - this seems high for a garden office. Continue anyway?`);
          if (!proceed) return;
        }
      }
      
      // Map cladding keys to readable names
      const claddingLabels = {
        'western-red-cedar': 'composite slatted cladding (coffee)',
        'composite-latte': 'composite slatted cladding (latte)',
        'composite-coffee': 'composite slatted cladding (coffee)',
        'composite-black': 'composite slatted cladding (black)',
        'anthracite-steel': 'anthracite grey steel',
        'cedar-diagonal': 'western red cedar (diagonal)',
        'cedar-horizontal': 'western red cedar (horizontal)',
      };
      
      const getCladLabel = (key) => claddingLabels[key] || key;
      
      // Find cladding upgrade prices from price object
      const getCladdingPrice = (side) => {
        const upgrade = this.price.claddingUpgrades?.find(u => u.label.toLowerCase().includes(side));
        return upgrade ? upgrade.price : 0;
      };
      
      // Build components list for doors/windows
      const componentsList = (this.state.components || []).map(c => {
        const allDefs = { ...this.appData.components?.doors, ...this.appData.components?.windows };
        const def = allDefs[c.type];
        // Use custom width if set, otherwise default from definition
        const width = c.customWidth && c.customWidth > 0 ? c.customWidth : (def?.width || 900);
        return {
          type: c.type,
          width: width,
          description: def?.quoteDescription || def?.label || c.type,
          elevation: c.elevation || 'front',
          handleSide: c.handleSide || 'right',
          price: def?.upgradePrice || 0
        };
      });
      
      // Build extras list
      const extrasList = (this.price.extras || []).map(e => ({
        label: e.label,
        price: e.price
      }));
      
      // Build deductions list
      const deductionsList = (this.price.deductions || []).map(d => ({
        label: d.label,
        price: d.price
      }));
      
      // Build quote data from state and price
      const quoteData = {
        // Customer
        customerName: this.state.customer?.name || '',
        customerNumber: this.state.customer?.number || '',
        date: this.state.customer?.date || new Date().toISOString().split('T')[0],
        address: this.state.customer?.address || '',
        
        // Building
        width: this.state.width,
        depth: this.state.depth,
        height: this.state.height,
        tier: this.state.tier,
        buildingType: this.state.buildingType || 'Garden Office Building',
        
        // Pricing
        basePrice: this.price.basePrice,
        
        // Cladding
        frontCladding: getCladLabel(this.state.cladding?.front),
        rightCladding: getCladLabel(this.state.cladding?.right),
        leftCladding: getCladLabel(this.state.cladding?.left),
        rearCladding: getCladLabel(this.state.cladding?.rear),
        rightCladdingPrice: getCladdingPrice('right'),
        leftCladdingPrice: getCladdingPrice('left'),
        
        // Corners (Signature only)
        cornerLeft: this.state.cornerLeft === 'closed' ? 'Closed' : 'Open',
        cornerRight: this.state.cornerRight === 'closed' ? 'Closed' : 'Open',
        
        // Foundation
        foundationType: this.state.foundationType || 'ground-screw',
        foundationPrice: this.state.foundationType === 'ground-screw' ? 1200 : 0,
        
        // Components (doors/windows)
        components: componentsList,
        
        // Component upgrades (door/window upgrades beyond standard)
        componentUpgrades: (this.price.componentUpgrades || []).map(u => ({
          label: u.label,
          price: u.price
        })),
        
        // Height upgrade
        heightUpgrade: this.price.heightUpgrade > 0 ? {
          price: this.price.heightUpgrade,
          label: this.price.heightUpgradeLabel
        } : null,
        
        // Extras
        extras: extrasList,
        
        // Deductions
        deductions: deductionsList,
        
        // Partition
        partitionRoom: this.state.partitionRoom?.enabled ? {
          enabled: true,
          type: this.state.partitionRoom.type,
          width: this.state.partitionRoom.width,
          depth: this.state.partitionRoom.depth,
          label: this.state.partitionRoom.label
        } : null,
        
        // Bathroom suite
        bathroom: this.state.bathroom?.enabled ? {
          enabled: true,
          type: this.state.bathroom.type,
          notes: this.state.bathroom.notes || ''
        } : null,
        
        // Installation
        installationPrice: this.price.installation || 6000,
        
        // Totals
        subtotal: this.price.subtotalExVat + this.price.installation,
        discount: this.price.discount || 0,
        discountLabel: this.price.discountLabel || this.state.discount?.description || 'Discount',
        total: this.price.totalIncVat,
        
        // Survey info for ambassador discount
        ambassadorEligible: this.state.survey?.ambassadorEligible || false,
        salesRep: this.state.survey?.salesRep || '',
        
        // Custom notes
        quoteNotes: this.state.customNotes?.quote || ''
      };
      
      this.notify('Creating Google Sheet...');
      
      try {
        const response = await fetch('http://localhost:3001/api/create-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quoteData)
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.notify('Google Sheet created!');
          window.open(result.url, '_blank');
        } else {
          this.notify('Error: ' + result.error);
        }
      } catch (err) {
        this.notify('Error: Make sure sheets-server is running (node sheets-server.js)');
        console.error('Google Sheets error:', err);
      }
    },

    printDrawing() {
      this.showExportMenu = false;
      const svg = document.querySelector('#drawing-canvas svg');
      if (!svg) return;
      const win = window.open('', '_blank');
      win.document.write(`<!DOCTYPE html><html><head><title>GOB Drawing - ${this.state.customer?.name || 'Preview'}</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;}svg{max-width:100%;max-height:100vh;}</style></head><body>${svg.outerHTML}</body></html>`);
      win.document.close();
      win.print();
    },

    notify(msg) {
      const el = document.getElementById('notification');
      if (el) {
        el.textContent = msg;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2500);
      }
    },

    // ─── SURVEY METHODS ───
    markSurveyComplete() {
      if (!this.state.survey) {
        this.state.survey = {};
      }
      this.state.survey.completed = true;
      this.state.survey.completedDate = new Date().toLocaleDateString('en-GB');
      this.notify('Survey marked as complete');
    },

    applySurveyToQuote() {
      // Apply cladding preferences
      if (this.state.survey?.claddingPreference) {
        const pref = this.state.survey.claddingPreference;
        if (pref === 'cedar-front-only') {
          this.state.cladding.front = 'western-red-cedar';
          this.state.cladding.left = 'anthracite-steel';
          this.state.cladding.right = 'anthracite-steel';
        } else if (pref === 'cedar-front-sides') {
          this.state.cladding.front = 'western-red-cedar';
          this.state.cladding.left = 'western-red-cedar';
          this.state.cladding.right = 'western-red-cedar';
          this.state.cladding.rear = 'anthracite-steel';
        } else if (pref === 'cedar-all') {
          this.state.cladding.front = 'western-red-cedar';
          this.state.cladding.left = 'western-red-cedar';
          this.state.cladding.right = 'western-red-cedar';
          this.state.cladding.rear = 'western-red-cedar';
        } else if (pref === 'composite') {
          this.state.cladding.front = 'composite-slatted';
        } else if (pref === 'thermowood') {
          this.state.cladding.front = 'thermowood';
        }
      }

      // Apply door preferences
      if (this.state.survey?.doorPreference) {
        const doorPref = this.state.survey.doorPreference;
        // Remove existing doors first
        this.state.components = this.state.components.filter(c => {
          const def = this.appData.components?.doors?.[c.type];
          return !def; // Keep non-doors
        });

        const doorMap = {
          'sliding-2.5m': 'sliding-door-2500',
          'bifold-2.5m': 'bifold-2700',
          'bifold-3.5m': 'bifold-3500',
          'bifold-4m': 'bifold-4500',
          'french-doors': 'single-glazed-door',
          'secret-door': 'single-cladded-door',
        };
        
        const doorType = doorMap[doorPref];
        if (doorType && this.appData.components?.doors?.[doorType]) {
          const def = this.appData.components.doors[doorType];
          const pos = Math.round((this.state.width / 2 - def.width / 2) / 50) * 50;
          this.state.components.push({
            id: 'comp-' + (this.nextCompId++),
            type: doorType,
            elevation: 'front',
            positionX: Math.max(0, pos),
            label: def.label,
          });
        }
      }

      // Apply AC preference
      if (this.state.survey?.acPreference) {
        this.state.extras.acUnit = 'standard';
      }

      // Apply survey extras checkboxes
      if (this.surveyExtras.heating) {
        this.state.extras.heater = Math.max(1, this.state.extras.heater || 0);
      }
      if (this.surveyExtras.externalSockets) {
        this.state.extras.externalSocket = Math.max(1, this.state.extras.externalSocket || 0);
      }
      if (this.surveyExtras.upDownLights) {
        this.state.extras.upDownLight = Math.max(2, this.state.extras.upDownLight || 0);
      }
      if (this.surveyExtras.additionalDecking) {
        this.state.structuralExtras.additionalDecking = Math.max(4, this.state.structuralExtras.additionalDecking || 0);
      }
      if (this.surveyExtras.cat6) {
        this.state.extras.cat6Point = Math.max(2, this.state.extras.cat6Point || 0);
      }
      if (this.surveyExtras.partition) {
        this.state.structuralExtras.partition = 'with-door';
        this.onPartitionChange();
      }
      if (this.surveyExtras.toilet) {
        this.state.structuralExtras.partition = 'toilet';
        this.onPartitionChange();
      }

      // Set delivery date from preferred delivery
      if (this.state.survey?.preferredDelivery && !this.state.customer.date) {
        this.state.customer.date = this.state.survey.preferredDelivery;
      }

      this.notify('Survey data applied to configurator');
    },

    // Site Sketch methods
    initSketch() {
      const canvas = document.getElementById('site-sketch-canvas');
      if (!canvas) return;
      
      this.sketchCtx = canvas.getContext('2d');
      
      // Load saved sketch if exists
      if (this.state.survey?.siteSketch) {
        const img = new Image();
        img.onload = () => {
          this.sketchCtx.drawImage(img, 0, 0);
        };
        img.src = this.state.survey.siteSketch;
      }
      
      // Drawing event listeners
      canvas.addEventListener('mousedown', this.startDrawing);
      canvas.addEventListener('mousemove', this.draw);
      canvas.addEventListener('mouseup', this.stopDrawing);
      canvas.addEventListener('mouseout', this.stopDrawing);
      
      // Touch support
      canvas.addEventListener('touchstart', this.handleTouch);
      canvas.addEventListener('touchmove', this.handleTouch);
      canvas.addEventListener('touchend', this.stopDrawing);
    },

    startDrawing(e) {
      this.isDrawing = true;
      const canvas = e.target;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      this.sketchCtx.beginPath();
      this.sketchCtx.moveTo(x, y);
      this.sketchCtx.strokeStyle = this.sketchColour;
      this.sketchCtx.lineWidth = this.sketchLineWidth;
      this.sketchCtx.lineCap = 'round';
      this.sketchCtx.lineJoin = 'round';
    },

    draw(e) {
      if (!this.isDrawing) return;
      const canvas = e.target;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      this.sketchCtx.lineTo(x, y);
      this.sketchCtx.stroke();
    },

    stopDrawing() {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.saveSketch();
      }
    },

    handleTouch(e) {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent(
        e.type === 'touchstart' ? 'mousedown' : 'mousemove',
        { clientX: touch.clientX, clientY: touch.clientY }
      );
      e.target.dispatchEvent(mouseEvent);
    },

    clearSketch() {
      const canvas = document.getElementById('site-sketch-canvas');
      if (!canvas || !this.sketchCtx) return;
      this.sketchCtx.clearRect(0, 0, canvas.width, canvas.height);
      this.saveSketch();
    },

    saveSketch() {
      const canvas = document.getElementById('site-sketch-canvas');
      if (!canvas) return;
      if (!this.state.survey) this.state.survey = {};
      this.state.survey.siteSketch = canvas.toDataURL('image/png');
    },
  },

  mounted() {
    // Close export menu on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.export-wrapper')) {
        this.showExportMenu = false;
      }
    });
    
    // Auto-fill date if empty (wait for state to be ready)
    this.$nextTick(() => {
      if (this.state && this.state.customer) {
        if (!this.state.customer.date) {
          this.state.customer.date = new Date().toISOString().split('T')[0];
        }
      }
    });
  },

  async created() {
    try {
      const [defaults, prices, components, cladding, emailTemplates] = await Promise.all([
        fetchJSON('data/defaults.json'),
        fetchJSON('data/prices.json'),
        fetchJSON('data/components.json'),
        fetchJSON('data/cladding.json'),
        fetchJSON('data/email-templates.json'),
      ]);

      this.appData = { prices, components, cladding, emailTemplates };
      this.state = JSON.parse(JSON.stringify(defaults));
      
      // Ensure survey and site objects exist
      if (!this.state.survey) {
        this.state.survey = {
          completed: false,
          completedDate: '',
          surveyorName: '',
          visitDate: '',
          salesRep: '',
          visitedShowroom: false,
          ambassadorEligible: false,
          useCase: '',
          budgetRange: '',
          preferredDelivery: '',
          claddingPreference: '',
          doorPreference: '',
          windowPreference: '',
          heatingPreference: '',
          acPreference: false,
          extrasNotes: '',
          competitorQuotes: '',
          urgency: 'normal',
          referralSource: '',
        };
      }
      // Ensure new survey fields exist for existing configs
      if (!this.state.survey.visitDate) this.state.survey.visitDate = '';
      if (!this.state.survey.salesRep) this.state.survey.salesRep = '';
      if (this.state.survey.visitedShowroom === undefined) this.state.survey.visitedShowroom = false;
      if (this.state.survey.ambassadorEligible === undefined) this.state.survey.ambassadorEligible = false;
      // Ensure partitionRoom object exists
      if (!this.state.partitionRoom) {
        this.state.partitionRoom = {
          enabled: false,
          corner: 'rear-left',
          width: 1500,
          depth: 1500,
          type: 'storage',
          label: 'Storage'
        };
      }
      // Ensure customNotes object exists
      if (!this.state.customNotes) {
        this.state.customNotes = {
          quote: '',
          email: '',
          drawing: ''
        };
      }
      // Ensure deductions object exists
      if (!this.state.deductions) {
        this.state.deductions = {
          removeDecking: false,
          useExistingFoundation: false
        };
      }
      // Ensure new structural extras exist
      if (this.state.structuralExtras.premiumFlooring === undefined) {
        this.state.structuralExtras.premiumFlooring = false;
      }
      if (this.state.structuralExtras.bifoldUpgrade === undefined) {
        this.state.structuralExtras.bifoldUpgrade = false;
      }
      // Ensure new electrical extras exist
      if (this.state.extras.tvMountingPrep === undefined) {
        this.state.extras.tvMountingPrep = false;
      }
      // Ensure externalFeatures array exists
      if (!this.state.externalFeatures) {
        this.state.externalFeatures = [];
      }
      // Ensure bathroom state exists
      if (!this.state.bathroom) {
        this.state.bathroom = {
          enabled: false,
          type: 'none',
          includeUtilityConnections: false,
          notes: ''
        };
      }
      if (!this.state.site.location) this.state.site.location = '';
      if (!this.state.site.parking) this.state.site.parking = '';
      if (!this.state.site.groundCondition) this.state.site.groundCondition = 'level-lawn';
      if (!this.state.site.structures) this.state.site.structures = '';
      if (!this.state.site.powerLocation) this.state.site.powerLocation = '';
      if (this.state.site.permittedDevelopment === undefined) this.state.site.permittedDevelopment = true;
      if (!this.state.site.planningNotes) this.state.site.planningNotes = '';
      if (this.state.site.accessCharge === undefined) this.state.site.accessCharge = 0;
      if (!this.state.site.accessChargeReason) this.state.site.accessChargeReason = '';
      if (!this.state.site.powerSource) this.state.site.powerSource = '';
      if (!this.state.site.powerDistance) this.state.site.powerDistance = '';
      if (!this.state.survey.partitionNotes) this.state.survey.partitionNotes = '';
      if (!this.state.survey.bathroomType) this.state.survey.bathroomType = '';
      if (!this.state.survey.bathroomNotes) this.state.survey.bathroomNotes = '';
      
      this.nextCompId = 100 + (this.state.components?.length || 0);
      this.nextFeatureId = 1000 + (this.state.externalFeatures?.length || 0);

      initPricing(prices, components);

      // Initialize drag-drop for components
      this.$nextTick(() => {
        initComponentDrag(this, components);
      });

      this.loaded = true;
      console.log('GOB Configurator v2 loaded');
    } catch (err) {
      console.error('Failed to initialise:', err);
      document.body.innerHTML = `<div style="padding:40px;font-family:Arial">
        <h2>Error loading GOB Configurator</h2>
        <p>${err.message}</p>
        <p>Make sure all data files are present in the /data/ folder.</p>
      </div>`;
    }
  },
}).mount('#app');
