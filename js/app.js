// GOB Configurator v2 — Vue 3 App
// Reactive state, live pricing, drawing preview, email drafting

import { initPricing, calculatePrice, formatPrice } from './pricing.js?v=2';
import { generateDrawing } from './drawing-engine.js?v=42';
import { generateQuotePDF, generateCombinedPDF } from './quote/generator.js';
import { exportDrawingPDF } from './drawing-pdf/export.js';
import { initComponentDrag } from './ui/component-drag.js';
import { initFirebase, isFirebaseReady, saveDesign, updateDesign, listDesigns, loadDesign, deleteDesign } from './cloud-storage.js';
import { copyRichText } from './email/rich-copy.js';
import { buildPremiumBom } from './bom/premium-bom.js?v=3';
import { loadCatalogue, saveCatalogue, joinBom, buildOrders, catalogueEmptyMaterial, SUPPLY_MODES } from './bom/orders.js?v=7';
import { gmailConfigured, gmailSignedInAs, sendEmail } from './bom/gmail-send.js?v=1';
import { computeLabour, DEFAULT_DAY_RATE } from './bom/labour.js?v=3';
import { emptyInstaller } from './bom/installers.js?v=2';
import { SENDER_EMAIL } from './google-config.js?v=1';

const { createApp } = Vue;

// Format date string (YYYY-MM-DD from input[type=date]) to dd/mm/yy UK format
function formatDateUK(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

// Ensure loaded state has all required nested objects (backwards compat with older saves)
function ensureStateDefaults(state) {
  if (!state.externalFeatures) state.externalFeatures = [];
  if (!state.labour) state.labour = { dayRate: DEFAULT_DAY_RATE, extraDays: 0, extraDaysLabel: '', otherSubcontract: 0, otherSubcontractLabel: '' };
  if (state.labour.extraDays === undefined) { state.labour.extraDays = 0; state.labour.extraDaysLabel = ''; }
  if (!state.installer) state.installer = { name: '', email: '', phone: '', agreedPrice: '', daysOverride: '', startDate: '', endDate: '', notes: '' };
  if (!state.bomOverrides) state.bomOverrides = {};
  if (state.quotePriceOverride === undefined) state.quotePriceOverride = '';
  if (!state.orderNotes) state.orderNotes = {};
  if (!state.ordersSent) state.ordersSent = {};
  if (!state.orderStatus) state.orderStatus = {};
  if (!state.acUnits) state.acUnits = [];
  if (!state.drawingLabels) state.drawingLabels = [];
  if (!state.planning) state.planning = { required: false, reasons: [], customReason: '' };
  if (!state.planning.reasons) state.planning.reasons = [];
  if (!state.landscaping) state.landscaping = { required: false, reason: '' };
  if (!state.customNotes) state.customNotes = { quote: '', email: '', drawing: '', drawingNumber: '' };
  if (!state.straightPartition) state.straightPartition = { enabled: false, position: 2500, leftLabel: 'Office', rightLabel: 'Storage', hasDoor: true, doorPosition: 0.5, doorDirection: 'right' };
  if (!state.customer) state.customer = { name: '', address: '', number: '', email: '', date: '' };
  if (!state.site) state.site = {};
  if (!state.survey) state.survey = {};
  if (!state.discount) state.discount = { type: 'none', amount: 0, description: '' };
  if (!state.extras) state.extras = {};
  if (state.deckingDepth === undefined) state.deckingDepth = 400;
  if (state.rooms) {
    for (const room of state.rooms) {
      if (room.labelOffsetX === undefined) room.labelOffsetX = 0;
      if (room.labelOffsetY === undefined) room.labelOffsetY = 0;
    }
  }
  if (!state.cladding) state.cladding = { front: 'anthracite-steel', left: 'anthracite-steel', right: 'anthracite-steel', rear: 'anthracite-steel' };
  if (!state.partitionRoom) state.partitionRoom = { enabled: false };
  if (!state.bathroom) state.bathroom = { enabled: false };
  return state;
}

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
      nextAcUnitId: 2000,
      nextLabelId: 3000,

      // Materials & Orders (premium BOM + supplier POs)
      catalogue: null,
      bomLines: [],
      orders: [],
      orderRef: '',
      bomStatus: '',
      catalogueOpen: false,
      suppliersOpen: false,
      catalogueFilter: '',
      catSaveStatus: '',
      // Full-page materials view
      supplyModes: SUPPLY_MODES,
      materialsPage: false,
      installerPage: false,
      orderRefManual: false,
      labourOpen: true,
      installers: [],
      installersOpen: false,
      installersSaveStatus: '',
      defaultDayRate: DEFAULT_DAY_RATE,
      bomView: 'supplier',
      showDerivations: false,
      collapsed: {},
      // One-button ordering from Liam's Gmail
      gmailReady: gmailConfigured(),
      senderEmail: SENDER_EMAIL,
      sendReview: false,      // review step shown before the real send
      sending: false,
      sendLog: [],

      // Cloud saves
      cloudReady: false,
      cloudDesigns: [],
      currentCloudId: null,
      currentCloudName: '',
      cloudSaveName: '',
      cloudLoading: false,
      cloudError: null,
      cloudPanelOpen: true,

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
    bomMaterialCost() {
      return (this.bomLines || []).reduce((sum, l) => sum + (l.inStock ? 0 : l.lineCost), 0);
    },
    jobSummary() {
      const s = this.state;
      const c = s.cladding || {};
      const pretty = (v) => (v || '').replace(/-/g, ' ');
      const sides = [c.left, c.right].map(pretty).filter(Boolean);
      const sidesTxt = sides.length && sides[0] === sides[1] ? `sides ${sides[0]}` : `left ${pretty(c.left)}, right ${pretty(c.right)}`;
      const canopy = s.tier === 'signature' && s.hasCanopy !== false ? ` + ${((s.overhangDepth || 400) / 1000).toFixed(1)}m canopy/decking` : '';
      const corners = s.tier === 'signature' ? ` · corners ${s.cornerLeft || 'open'}/${s.cornerRight || 'open'}` : '';
      return `${(s.width / 1000).toFixed(1)}m × ${(s.depth / 1000).toFixed(1)}m × ${(s.height / 1000).toFixed(2).replace(/0$/, '')}m external${canopy} · ${s.tier || 'signature'} · front ${pretty(c.front)}, ${sidesTxt}${corners} · ${s.foundationType === 'ground-screw' ? 'ground screws' : 'pedestals'}`;
    },
    labour() {
      if (!this.state) return { dayRate: DEFAULT_DAY_RATE, install: { lines: [], total: 0, days: 0 }, electrician: { lines: [], total: 0 }, subcontract: { lines: [], total: 0, needsPlumber: false }, total: 0 };
      const defs = { ...(this.appData.components?.doors || {}), ...(this.appData.components?.windows || {}) };
      return computeLabour(this.state, defs);
    },
    /** Installer agreement figures: override or the computed install-team total. */
    installerDeal() {
      const inst = this.state.installer || {};
      const computedFee = this.labour.install.total;
      const computedDays = Math.round(this.labour.install.days * 2) / 2;
      const fee = inst.agreedPrice > 0 ? Number(inst.agreedPrice) : computedFee;
      const days = inst.daysOverride > 0 ? Number(inst.daysOverride) : computedDays;
      return { fee, days, computedFee, computedDays, overridden: inst.agreedPrice > 0, half: Math.round(fee / 2) };
    },
    bomSummary() {
      const lines = this.bomLines || [];
      const materialCost = this.bomMaterialCost;
      const engineIncVat = this.price?.totalIncVat || 0;
      const override = Number(this.state?.quotePriceOverride || 0);
      const quoteIncVat = override > 0 ? override : engineIncVat;
      const quoteExVat = quoteIncVat / 1.2;
      const labourCost = this.installerDeal.fee + this.labour.electrician.total + this.labour.subcontract.total;
      const installPrice = this.price?.installation || 0;
      const margin = Math.round((quoteExVat - materialCost - labourCost) * 100) / 100;
      const sups = new Set(lines.filter((l) => l.inCatalogue && !l.inStock).map((l) => l.supplier || 'NO SUPPLIER SET'));
      return {
        materialCost, quoteIncVat, quoteExVat, margin, labourCost, installPrice, engineIncVat, overridden: override > 0,
        marginPct: quoteExVat > 0 ? (margin / quoteExVat) * 100 : 0,
        lines: lines.length,
        inStock: lines.filter((l) => l.inStock).length,
        suppliers: sups.size,
        sent: (this.orders || []).filter((o) => o.sentAt).length,
        noEmail: (this.orders || []).filter((o) => !o.supplier?.email).length,
        notInCatalogue: lines.filter((l) => !l.inCatalogue).length,
        missingCost: lines.filter((l) => l.inCatalogue && !l.inStock && !(l.unitCost > 0)).length,
      };
    },
    supplierSections() {
      const groups = new Map();
      for (const l of this.bomLines || []) {
        const key = l.inCatalogue ? (l.supplier || 'NO SUPPLIER SET') : 'NOT IN CATALOGUE';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(l);
      }
      const supByName = new Map((this.catalogue?.suppliers || []).map((sp) => [sp.name.toLowerCase(), sp]));
      const secs = [...groups.entries()].map(([name, lines]) => {
        lines.sort((a, b) => (a.material?.category || '').localeCompare(b.material?.category || '') || a.name.localeCompare(b.name));
        const sup = supByName.get(name.toLowerCase()) || null;
        const orders = (this.orders || []).filter((o) => o.supplierName === name);
        return {
          name, lines, supplier: sup, email: sup?.email || '',
          subtotal: lines.reduce((t, l) => t + (l.inStock ? 0 : l.lineCost), 0),
          destinations: [...new Set(lines.map((l) => l.destination))],
          orders,
          allSent: orders.length > 0 && orders.every((o) => o.sentAt),
          stockCount: lines.filter((l) => l.inStock).length,
          toOrder: lines.filter((l) => !l.inStock).length,
          status: orders.length === 0 ? 'nothing-to-order' : orders.every((o) => o.status === 'delivered') ? 'delivered' : orders.every((o) => o.status) ? 'ordered' : 'not-ordered',
        };
      });
      const rank = (n) => (n === 'NOT IN CATALOGUE' ? 2 : n === 'NO SUPPLIER SET' ? 1 : 0);
      return secs.sort((a, b) => rank(a.name) - rank(b.name) || b.subtotal - a.subtotal || a.name.localeCompare(b.name));
    },
    /** Logistics split for the printed pack: straight-to-site deliveries by
     *  supplier vs what the factory must load (factory deliveries + stock). */
    logistics() {
      const lines = this.bomLines || [];
      const bySup = (arr) => {
        const m = new Map();
        for (const l of arr) { const k = l.inCatalogue ? (l.supplier || 'No supplier set') : 'Not in catalogue'; if (!m.has(k)) m.set(k, []); m.get(k).push(l); }
        return [...m.entries()].map(([name, ls]) => ({ name, lines: ls.sort((a, b) => (a.material?.category || '').localeCompare(b.material?.category || '')) })).sort((a, b) => a.name.localeCompare(b.name));
      };
      const toSite = lines.filter((l) => !l.inStock && l.destination !== 'factory');
      const factory = lines.filter((l) => l.inStock || l.destination === 'factory');
      return {
        toSite: bySup(toSite),
        factoryDelivered: bySup(factory.filter((l) => !l.inStock)),
        fromStock: factory.filter((l) => l.inStock).sort((a, b) => (a.material?.category || '').localeCompare(b.material?.category || '')),
        counts: { toSite: toSite.length, factory: factory.length },
      };
    },
    categorySections() {
      const groups = new Map();
      for (const l of this.bomLines || []) {
        const key = l.material?.category || 'Other';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(l);
      }
      return [...groups.entries()].map(([name, lines]) => ({
        name, lines, subtotal: lines.reduce((t, l) => t + (l.inStock ? 0 : l.lineCost), 0),
      })).sort((a, b) => a.name.localeCompare(b.name));
    },
    filteredCatalogue() {
      if (!this.catalogue) return [];
      const f = (this.catalogueFilter || '').toLowerCase();
      if (!f) return this.catalogue.materials;
      return this.catalogue.materials.filter((mt) => (mt.name + ' ' + mt.category + ' ' + mt.supplier).toLowerCase().includes(f));
    },
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

    emailBodyHtml() {
      if (!this.emailBody) return '';
      // Escape HTML entities first, then linkify URLs
      const escaped = this.emailBody
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return escaped.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener" style="color:#29A9B9;">$1</a>'
      );
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
      // Reset canopy/decking to included when switching to Signature
      if (newTier === 'signature') {
        this.state.hasCanopy = true;
        this.state.hasDecking = true;
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

    // ─── Materials & Orders ───
    async ensureCatalogue() {
      if (!this.catalogue) this.catalogue = await loadCatalogue();
      return this.catalogue;
    },
    async generateBom() {
      await this.ensureCatalogue();
      const defs = { ...(this.appData.components?.doors || {}), ...(this.appData.components?.windows || {}) };
      const raw = buildPremiumBom(this.state, defs);
      if (!this.state.bomOverrides) this.state.bomOverrides = {};
      this.bomLines = joinBom(raw, this.catalogue, this.state.bomOverrides);
      // Order ref = SURNAME-QUOTENUMBER (Liam 2026-09-05), e.g. SMITH-4500.
      // Re-derived on every generate unless Liam has typed his own ref.
      if (!this.orderRefManual) this.orderRef = this.defaultOrderRef();
      this.rebuildOrders();
      this.bomStatus = `${this.bomLines.length} lines - material cost ${formatPrice(this.bomMaterialCost)}`;
    },
    rebuildOrders() {
      const open = new Set((this.orders || []).filter((o) => o.showEmail).map((o) => o.supplierName + o.destination));
      this.orders = buildOrders(this.bomLines, this.catalogue, {
        ref: this.orderRef,
        siteAddress: [this.state.customer?.name, this.state.customer?.address].filter(Boolean).join('\n'),
        supplierNotes: this.state.orderNotes || {},
      });
      for (const o of this.orders) o.showEmail = open.has(o.supplierName + o.destination);
      // Sent + ordered/delivered status for this job (saved in the design state).
      const sent = this.state.ordersSent || {};
      const st = this.state.orderStatus || {};
      for (const o of this.orders) {
        o.sentAt = sent[this.orderKey(o)]?.at || '';
        o.status = st[this.orderKey(o)]?.status || (o.sentAt ? 'ordered' : '');
        o.statusAt = st[this.orderKey(o)]?.at || o.sentAt || '';
      }
      // each line carries its order's status (for the table chips + logistics pack)
      const byKey = new Map(this.orders.map((o) => [`${o.supplierName}||${o.destination}`, o]));
      for (const l of this.bomLines) {
        const o = l.inStock ? null : byKey.get(`${l.supplier || 'NO SUPPLIER SET'}||${l.destination}`);
        l.orderStatus = o ? (o.status || 'not-ordered') : (l.inStock ? 'stock' : 'not-ordered');
      }
    },
    orderKey(o) { return `${this.orderRef}||${o.supplierName}||${o.destination}`; },
    defaultOrderRef() {
      const name = (this.state.customer?.name || '').trim();
      const parts = name.split(/\s+/).filter(Boolean);
      const surname = (parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'JOB')
        .replace(/[^A-Za-z0-9'-]/g, '').toUpperCase() || 'JOB';
      const num = String(this.state.customer?.number || '').replace(/\D/g, '');
      return num ? `${surname}-${num}` : `${surname}-NOQUOTENO`;
    },
    onOrderRefEdit() {
      this.orderRefManual = this.orderRef.trim() !== '' && this.orderRef !== this.defaultOrderRef();
      if (!this.orderRef.trim()) { this.orderRefManual = false; this.orderRef = this.defaultOrderRef(); }
      this.rebuildOrders();
    },
    async openMaterialsPage() {
      this.ensureLabourState();
      this.installerPage = false;
      this.materialsPage = true;
      this.catalogueOpen = false; this.suppliersOpen = false;
      await this.ensureCatalogue();
      if (!this.bomLines.length) await this.generateBom();
      window.scrollTo(0, 0);
    },
    toggleCollapse(key) { this.collapsed[key] = !this.collapsed[key]; },
    ensureLabourState() {
      if (!this.state) return;
      if (!this.state.labour) this.state.labour = { dayRate: DEFAULT_DAY_RATE, extraDays: 0, extraDaysLabel: '', otherSubcontract: 0, otherSubcontractLabel: '' };
      if (!this.state.installer) this.state.installer = { name: '', email: '', phone: '', agreedPrice: '', daysOverride: '', startDate: '', endDate: '', notes: '' };
    },
    // Installer register lives INSIDE the catalogue document (settings/catalogue),
    // the one Firestore doc the rules already allow - a separate doc was refused.
    async ensureInstallers() {
      await this.ensureCatalogue();
      if (!Array.isArray(this.catalogue.installers)) this.catalogue.installers = [];
      this.installers = this.catalogue.installers;
    },
    async openInstallerPage() {
      this.ensureLabourState();
      await this.ensureCatalogue();
      await this.ensureInstallers();
      if (!this.bomLines.length) await this.generateBom();
      this.materialsPage = false;
      this.installerPage = true;
      window.scrollTo(0, 0);
    },
    pickInstaller(name) {
      this.ensureLabourState();
      const i = this.installers.find((x) => x.name === name);
      this.state.installer.name = name;
      if (i) {
        this.state.installer.email = i.email || '';
        this.state.installer.phone = i.phone || '';
        if (i.dayRate > 0) this.state.labour.dayRate = i.dayRate;
      }
    },
    addInstallerRow() { this.installers.unshift(emptyInstaller()); },
    removeInstallerRow(i) { this.installers = this.installers.filter((x) => x !== i); },
    async saveInstallerList() {
      this.installersSaveStatus = 'Saving…';
      try {
        this.catalogue.installers = this.installers.filter((i) => i.name && i.name.trim());
        this.installers = this.catalogue.installers;
        const where = await saveCatalogue(this.catalogue);
        this.installersSaveStatus = where === 'cloud' ? 'Saved (cloud)' : 'Saved locally';
      }
      catch (e) { this.installersSaveStatus = 'Save failed: ' + e.message; }
      setTimeout(() => { this.installersSaveStatus = ''; }, 3000);
    },
    printInstallerPack() { this.$nextTick(() => window.print()); },
    fmtDateLong(iso) {
      if (!iso) return '________________';
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    },
    openingsOn(elev) {
      const defs = { ...(this.appData.components?.doors || {}), ...(this.appData.components?.windows || {}) };
      return (this.state.components || []).filter((c) => c.elevation === elev).map((c) => ({ ...c, def: defs[c.type] || {} }));
    },
    collapseAll(flag) {
      const keys = this.bomView === 'supplier' ? this.supplierSections.map((x) => x.name) : this.categorySections.map((x) => 'cat:' + x.name);
      for (const k of keys) this.collapsed[k] = flag;
    },
    orderNoteFor(supplierName) { return (this.state.orderNotes || {})[supplierName] || { delivery: '', notes: '' }; },
    setOrderNote(supplierName, field, value) {
      if (!this.state.orderNotes) this.state.orderNotes = {};
      this.state.orderNotes[supplierName] = { ...this.orderNoteFor(supplierName), [field]: value };
      this.rebuildOrders();
    },
    printMaterials() { this.$nextTick(() => window.print()); },
    orderAs(l) {
      if (l.stockPlan && l.stockPlan.text) return l.stockPlan.text;
      return `${l.orderQty}${l.orderUnit && l.orderUnit !== l.unit ? ' × ' + l.orderUnit : ' ' + (l.unit || '')}`;
    },
    async sendOrder(order) {
      if (!order.supplier?.email) { this.bomStatus = `${order.supplierName}: no order email set (Suppliers editor)`; return false; }
      try {
        this.sending = true;
        const id = await sendEmail({ to: order.supplier.email, subject: order.email.subject, body: order.email.body });
        if (!this.state.ordersSent) this.state.ordersSent = {};
        this.state.ordersSent[this.orderKey(order)] = { at: new Date().toISOString(), to: order.supplier.email, gmailId: id, lines: order.items.length };
        order.sentAt = this.state.ordersSent[this.orderKey(order)].at;
        if (!this.state.orderStatus) this.state.orderStatus = {};
        if (!this.state.orderStatus[this.orderKey(order)]) this.state.orderStatus[this.orderKey(order)] = { status: 'ordered', at: order.sentAt };
        this.sendLog.unshift(`Sent to ${order.supplierName} (${order.supplier.email}) from ${gmailSignedInAs() || this.senderEmail}`);
        return true;
      } catch (e) {
        this.sendLog.unshift(`FAILED ${order.supplierName}: ${e.message}`);
        return false;
      } finally { this.sending = false; }
    },
    /** One button: review, then send every unsent order with an email address. */
    async sendAllOrders() {
      const todo = this.orders.filter((o) => o.supplier?.email && !o.sentAt);
      let ok = 0;
      for (const o of todo) { if (await this.sendOrder(o)) ok += 1; }
      this.sendReview = false;
      const noEmail = this.orders.filter((o) => !o.supplier?.email).length;
      this.bomStatus = `${ok} of ${todo.length} purchase orders sent${noEmail ? ` - ${noEmail} supplier${noEmail === 1 ? '' : 's'} still have no email set` : ''}`;
    },
    // Per-JOB overrides (saved with the quote state, NOT the catalogue):
    // everything is site delivery as standard; Liam allocates leftover factory
    // stock to particular jobs here.
    setLineSupply(line, supply) {
      line.supply = supply;
      line.destination = supply === 'factory' ? 'factory' : 'site';
      line.inStock = supply === 'stock';
      if (!this.state.bomOverrides) this.state.bomOverrides = {};
      this.state.bomOverrides[line.name] = { supply };
      this.rebuildOrders();
    },
    // legacy names kept for any old template references
    setLineDestination(line, dest) { this.setLineSupply(line, dest); },
    toggleLineStock(line) { this.setLineSupply(line, line.inStock ? 'site' : 'stock'); },
    setOrderStatus(order, status) {
      if (!this.state.orderStatus) this.state.orderStatus = {};
      if (!status) delete this.state.orderStatus[this.orderKey(order)];
      else this.state.orderStatus[this.orderKey(order)] = { status, at: new Date().toISOString() };
      this.rebuildOrders();
    },
    statusLabel(o) {
      const d = o.statusAt ? new Date(o.statusAt).toLocaleDateString('en-GB') : '';
      return o.status === 'delivered' ? `Delivered ${d}` : o.status === 'ordered' ? `Ordered ${d}` : 'NOT ORDERED';
    },
    async saveCat() {
      this.catSaveStatus = 'Saving…';
      try {
        const where = await saveCatalogue(this.catalogue);
        this.catSaveStatus = where === 'cloud' ? 'Saved to cloud ✓' : 'Saved on this device ✓ (cloud offline)';
      } catch (e) {
        this.catSaveStatus = 'Save failed: ' + (e.message || e);
      }
      setTimeout(() => { this.catSaveStatus = ''; }, 4000);
    },
    addCatalogueRow() {
      this.catalogue.materials.unshift(catalogueEmptyMaterial());
    },
    removeCatalogueRow(mat) {
      if (!confirm(`Delete "${mat.name}" from the catalogue?`)) return;
      this.catalogue.materials = this.catalogue.materials.filter((m) => m !== mat);
    },
    addSupplierRow() {
      this.catalogue.suppliers.unshift({ name: '', email: '', phone: '', notes: '' });
    },
    async copyOrderEmail(order) {
      const txt = `To: ${order.supplier?.email || '[no email set - add it under Suppliers]'}\nSubject: ${order.email.subject}\n\n${order.email.body}`;
      await navigator.clipboard.writeText(txt);
      order.copied = true;
      setTimeout(() => { order.copied = false; }, 2500);
    },
    async copyAllOrders() {
      const txt = this.orders.map((o) => `To: ${o.supplier?.email || '[no email]'}\nSubject: ${o.email.subject}\n\n${o.email.body}`).join('\n\n========================================\n\n');
      await navigator.clipboard.writeText(txt);
      this.bomStatus = 'All purchase orders copied to clipboard';
    },
    mailtoOrder(order) {
      const to = order.supplier?.email || '';
      return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(order.email.subject)}&body=${encodeURIComponent(order.email.body)}`;
    },

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

    addExternalFeature(type, elevation) {
      elevation = elevation || 'front';
      // Default positions: lights at 1/4 and 3/4 of the relevant dimension, sockets in middle
      const dimLength = elevation === 'front' ? this.state.width : this.state.depth;
      let defaultX;
      if (type === 'upDownLight') {
        // Stagger lights so they don't overlap
        const existingLights = this.state.externalFeatures.filter(f => f.type === 'upDownLight' && f.elevation === elevation);
        defaultX = existingLights.length % 2 === 0
          ? Math.round(dimLength * 0.25 / 50) * 50
          : Math.round(dimLength * 0.75 / 50) * 50;
      } else {
        defaultX = Math.round(dimLength * 0.5 / 50) * 50;
      }

      // Default Y positions: lights near top of wall, sockets lower
      const defaultY = type === 'upDownLight' ? 1800 : 800; // mm from ground

      this.state.externalFeatures.push({
        id: 'feat-' + (this.nextFeatureId++),
        type,
        elevation,
        x: defaultX,
        y: defaultY
      });
    },

    removeExternalFeature(id) {
      this.state.externalFeatures = this.state.externalFeatures.filter(f => f.id !== id);
    },

    addAcUnit(type) {
      const isInternal = type === 'internal';
      const x = isInternal
        ? Math.round((this.state.width - 800 - 200) / 50) * 50
        : Math.round(this.state.width / 2 / 50) * 50;
      const y = isInternal
        ? 200
        : Math.round((this.state.depth + 500) / 50) * 50;
      this.state.acUnits.push({
        id: 'ac-' + (this.nextAcUnitId++),
        type,
        x,
        y,
        w: 700,
        h: 300,
        rotated: false,
      });
    },

    removeAcUnit(id) {
      this.state.acUnits = this.state.acUnits.filter(u => u.id !== id);
    },

    addDrawingLabel() {
      this.state.drawingLabels.push({
        id: 'lbl-' + (this.nextLabelId++),
        text: 'Label',
        fontSize: 150,
        color: '#000000',
        x: 5000,
        y: 2000,
        arrowEnabled: false,
        arrowX: 5500,
        arrowY: 2300,
      });
    },

    removeDrawingLabel(id) {
      this.state.drawingLabels = this.state.drawingLabels.filter(l => l.id !== id);
    },

    onPartitionChange() {
      const partition = this.state.structuralExtras.partition;
      if (partition !== 'none' && this.state.rooms.length === 1) {
        const splitWidth = Math.round(this.state.width * 0.6 / 50) * 50;
        this.state.rooms[0].widthMm = splitWidth;
        this.state.rooms.push({
          label: partition === 'toilet' ? 'WC' : 'Storage',
          widthMm: this.state.width - splitWidth,
          labelOffsetX: 0,
          labelOffsetY: 0,
        });
      } else if (partition === 'none' && this.state.rooms.length > 1) {
        this.state.rooms = [{ label: this.state.rooms[0].label, widthMm: this.state.width, labelOffsetX: 0, labelOffsetY: 0 }];
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
      const price = this.price;
      const isSig = s.tier === 'signature';
      const firstName = (s.customer?.name || 'Customer').split(' ')[0];
      // External sizes EXCLUDE the canopy/decking (Liam 2026-09-05); say so on
      // Signature builds so the customer reads the footprint correctly.
      const hasCanopyOrDeck = isSig && (s.hasCanopy !== false || s.hasDecking !== false);
      const dims = `${(s.width/1000).toFixed(1)}m x ${(s.depth/1000).toFixed(1)}m x ${(s.height/1000).toFixed(2).replace(/0$/, '')}m`
        + (hasCanopyOrDeck ? ` (external building size, plus the ${((s.overhangDepth || 400)/1000).toFixed(1)}m canopy and decking to the front)` : ' (external)');
      const buildingTypeLower = (s.buildingType || 'garden office building').toLowerCase();

      // Handle custom paragraph
      const customParagraph = s.customNotes?.email?.trim()
        ? '\n\n' + s.customNotes.email.trim()
        : '';

      // Days/time
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = new Date();
      const todayDayOfWeek = dayNames[today.getDay()];
      let visitDayOfWeek = '';
      if (s.survey?.visitDate) {
        const visitDate = new Date(s.survey.visitDate + 'T12:00:00');
        visitDayOfWeek = dayNames[visitDate.getDay()];
      }
      const hour = today.getHours();
      const todayTimeOfDay = hour < 12 ? 'morning' : 'afternoon';

      const salesRep = s.survey?.salesRep || s.survey?.surveyorName || 'Richard';

      // Opening paragraph (post-visit)
      let openingParagraph;
      if (s.survey?.visitedShowroom) {
        openingParagraph = `Hope all is well. It was great to meet you${visitDayOfWeek ? ' on ' + visitDayOfWeek : ''} at our showroom to discuss your ${buildingTypeLower} project.`;
      } else {
        openingParagraph = `Hope all is well. Thank you for having ${salesRep} visit${visitDayOfWeek ? ' on ' + visitDayOfWeek : ''}, he said it was great to meet to discuss your ${buildingTypeLower} project.`;
      }

      // ─── Discount paragraph ───
      let discountParagraph = '';
      const discount = s.discount || {};
      if (discount.type !== 'none' && discount.amount > 0 && price?.discount > 0) {
        const discountFormatted = '£' + price.discount.toLocaleString('en-GB');
        const discountReason = discount.description || 'discount';
        if (discountReason.toLowerCase().includes('ambassador')) {
          discountParagraph = `\n\nI also wanted to mention that we've recently launched a new Ambassador Scheme. As local completed projects are incredibly valuable for us, we're offering a reduction for customers who are happy, once the build is complete, to allow up to two prospective customers to view the building by appointment. Given you are so local to us and would make a fantastic case study for our business, I've included a ${discountFormatted} ${discountReason} on your quote.`;
        } else {
          discountParagraph = `\n\nWe've included a ${discountFormatted} ${discountReason} on your quote.`;
        }
      }
      // Legacy ambassador support
      if (s.survey?.ambassadorEligible && !discountParagraph) {
        let discountAmount = '£2,000';
        if (price && price.totalIncVat >= 40000) discountAmount = '£4,000';
        else if (price && price.totalIncVat >= 30000) discountAmount = '£3,000';
        discountParagraph = `\n\nI also wanted to mention that we've recently launched a new Ambassador Scheme. As local completed projects are incredibly valuable for us, we're offering a reduction for customers who are happy, once the build is complete, to allow up to two prospective customers to view the building by appointment. Given you are so local to us and would make a fantastic case study for our business, I've included a ${discountAmount} discount on your quote.`;
      }

      // ─── Exclusions: bulleted section (Liam's 2026-08-24 format) ───
      const hasBathroom = !!(s.bathroom?.enabled && s.bathroom?.type);
      const exclusionBullets = [
        '* Electrical connection, which will be subject to a visit from our electrician (£1k to £2k on average)',
      ];
      if (hasBathroom) {
        exclusionBullets.push('* Utility connections (water supply and waste), which will be arranged separately with our plumber and landscaper');
      }
      if (s.foundationType === 'concrete-landscaper') {
        exclusionBullets.push('* Concrete base foundation, which is subject to a visit from our landscaper (£2k to £4k on average). The landscaper can also assist with any preparation works or post-build landscaping.');
      }
      exclusionBullets.push(hasBathroom
        ? '* We also ask that customers provide a 6-yard skip whilst we are on site, to keep everything clean and tidy'
        : '* We also ask that customers provide a toilet facility (porta-loo or downstairs toilet) and 6-yard skip to help keep the site clean and tidy throughout the build (~£500 for both)');
      const exclusionsParagraph =
        'Excluded from our price are the following, but we will arrange and liaise throughout the project, we just ask that you pay the contractors directly:\n\n'
        + exclusionBullets.join('\n');

      // ─── Deposit next steps ───
      let depositNextSteps = 'We will also arrange a visit from our registered electrician to assess the electrical connection.';
      if (s.bathroom?.enabled && s.bathroom?.type) {
        depositNextSteps = 'We will also arrange visits from our registered electrician and plumber to assess the electrical and utility connections.';
      }
      if (s.landscaping?.required) {
        const landscapeReason = s.landscaping.reason === 'custom'
          ? (s.landscaping.customReason || 'preparation works')
          : (s.landscaping.reason || 'preparation works');
        depositNextSteps = depositNextSteps.replace(/\.$/, '') + `, as well as our landscaper, who can assist with the ${landscapeReason}.`;
      }

      // ─── Height upgrade paragraph (preliminary) ───
      let heightUpgradeParagraph = '';
      if (s.height > 2500) {
        const heightM = (s.height / 1000).toFixed(2).replace(/0$/, '');
        heightUpgradeParagraph = `\n\nI've also included an external height of ${heightM}m, which we recommend for buildings of this size. Our standard buildings are 2.5m in height, but for larger buildings, the additional height provides a much more comfortable space. Depending on the position of the building in relation to boundaries, planning permission may be required, which is something we can assist with and is a very straightforward process. Should you not require the additional height and would prefer 2.5m, please let me know and I'll provide an updated quote.`;
      }

      // ─── Planning paragraph ───
      let planningParagraph = '';
      if (s.planning?.required && s.planning.reasons?.length > 0) {
        const reasonLabels = {
          'height': 'the building exceeds 2.5m in height',
          'conservation': 'you are in a conservation area',
          'boundary': 'the building is within 2m of a boundary',
          'maisonette': 'the property is a maisonette',
          'listed': 'the property is a listed building',
          'article4': 'the property is subject to an Article 4 direction',
          'other': s.planning.customReason || 'other circumstances apply'
        };
        const activeReasons = s.planning.reasons.map(r => reasonLabels[r]).filter(Boolean);
        let reasonText = '';
        if (activeReasons.length === 1) {
          reasonText = activeReasons[0];
        } else if (activeReasons.length === 2) {
          reasonText = activeReasons.join(' and ');
        } else {
          reasonText = activeReasons.slice(0, -1).join(', ') + ', and ' + activeReasons[activeReasons.length - 1];
        }
        planningParagraph = `\n\nAs ${reasonText}, planning permission will be required. We work closely with a planning consultant and can handle this for you. We will produce a full set of drawings with elevations and all necessary information for the proposed building/surrounding area and these are then forwarded to our planning consultant who submits the application on your/our behalf. This costs £950 + local council fee (usually £258). Should you wish to proceed we require £250 upfront and £700 once the application is ready for submission. The £250 payment will go towards the building and act as a holding deposit.`;
      }

      // Showroom offer
      const showroomOffer = "Please also let me know if you'd like to visit our showroom or a previous local project to see one of our buildings first-hand.";

      // ─── Cladding helper ───
      const getCladdingLabel = (key) => {
        const labels = {
          'western-red-cedar': 'Western red cedar cladding',
          'anthracite-steel': 'Anthracite steel cladding',
          'grey-steel': 'Grey steel cladding',
          'composite-latte': 'Composite slatted cladding in latte colour',
          'composite-coffee': 'Composite slatted cladding in coffee colour',
          'composite-grey': 'Composite slatted cladding in grey',
          'composite-sage': 'Composite slatted cladding in sage green',
          'composite-chartwell': 'Composite slatted cladding in chartwell green',
          'larch': 'Larch cladding',
        };
        return labels[key] || 'premium cladding';
      };

      // ─── Building includes: detailed bullet list (post-visit) ───
      const buildFeatures = [];

      // Signature canopy/decking
      if (isSig) {
        buildFeatures.push('Signature integrated canopy on front of building with down lights');
        if (s.hasDecking !== false) {
          buildFeatures.push('Signature integrated decking on front of building');
        }
      }

      // Cladding per side (group same types)
      const clad = s.cladding || {};
      const sides = { front: 'front', left: 'left side', right: 'right side', rear: 'rear' };
      const cladGroups = {};
      for (const [side, label] of Object.entries(sides)) {
        const type = clad[side] || 'anthracite-steel';
        if (!cladGroups[type]) cladGroups[type] = [];
        cladGroups[type].push(label);
      }
      for (const [type, sideList] of Object.entries(cladGroups)) {
        buildFeatures.push(`${getCladdingLabel(type)} on ${sideList.join(' and ')}`);
      }

      // Component definitions — needed by the corner line and the
      // doors & windows list below.
      const allDefs = { ...this.appData.components?.doors, ...this.appData.components?.windows };

      // ─── Open/closed corners (signature fronts only) ───
      // cornerLeft/cornerRight are explicit UI state; the explanatory second
      // sentence is only added when we can name what actually meets at that
      // corner (a component on the side wall + the front component nearest
      // that corner).
      if (isSig && (s.cornerLeft === 'open' || s.cornerRight === 'open')) {
        const kindOf = (comp) => {
          const cat = allDefs[comp.type]?.category || '';
          return (cat === 'sliding' || cat === 'bifold' || cat === 'single') ? 'door' : 'window';
        };
        const comps = s.components || [];
        const describeOpenCorner = (side) => {
          const other = side === 'left' ? 'right' : 'left';
          let line = `Open corner on front ${side}, closed corner on front ${other}.`;
          const sideComps = comps.filter((c) => c.elevation === side);
          const sideComp = sideComps.find((c) => kindOf(c) === 'door') || sideComps[0];
          const frontComps = comps.filter((c) => c.elevation === 'front');
          const frontComp = frontComps.length
            ? frontComps.reduce((best, c) => {
                const edge = (comp) => {
                  const w = comp.customWidth || allDefs[comp.type]?.width || 900;
                  return side === 'left' ? comp.positionX : s.width - (comp.positionX + w);
                };
                return edge(c) < edge(best) ? c : best;
              })
            : null;
          if (sideComp && frontComp) {
            line += ` The open corner on the front ${side} will be where the ${kindOf(sideComp)} on the ${side}, and ${kindOf(frontComp)} on the front, meet together to form an 'open corner'.`;
          }
          return line;
        };
        if (s.cornerLeft === 'open' && s.cornerRight === 'open') {
          buildFeatures.push('Open corners on front left and front right');
        } else {
          buildFeatures.push(describeOpenCorner(s.cornerLeft === 'open' ? 'left' : 'right'));
        }
      }

      // External height
      const heightM = (s.height / 1000).toFixed(2).replace(/0$/, '');
      buildFeatures.push(`${heightM}m external height (${s.height > 2500 ? 'upgraded' : 'standard'})`);

      // Internal finish
      buildFeatures.push('Internal wall finish: plaster-boarded, plastered and decorated white');
      buildFeatures.push('Flooring and skirting board');

      // Electrical spec
      const sqm = (s.width / 1000) * (s.depth / 1000);
      let downlights = 4;
      if (sqm > 32) downlights = 12;
      else if (sqm > 24) downlights = 10;
      else if (sqm > 15) downlights = 8;
      else if (sqm > 9) downlights = 6;

      const sockets = 5;

      let lightingZones = 1;
      if (s.straightPartition?.enabled) lightingZones++;
      if (s.partitionRoom?.enabled) lightingZones++;

      let electricalDesc = `Complete internal electrical works including ${downlights} x dimmable LED downlights`;
      if (lightingZones > 1) {
        electricalDesc += `, ${lightingZones} x internal lighting zones on separate switches`;
      }
      if (isSig) {
        const spotlights = Math.floor(s.width / 1000);
        electricalDesc += `, ${spotlights} x external downlights in canopy soffit`;
      }
      electricalDesc += `, ${sockets} x double plug sockets, and 1 x network connection port`;
      buildFeatures.push(electricalDesc);

      // Doors & windows
      const compDoors = [];
      const compWindows = [];
      for (const comp of (s.components || [])) {
        const def = allDefs[comp.type];
        const widthM = ((comp.customWidth || def?.width || 900) / 1000).toFixed(1);
        const cat = def?.category || '';
        if (cat === 'sliding' || cat === 'bifold' || cat === 'single') {
          let desc = 'sliding door';
          if (comp.type.includes('bifold')) desc = 'bi-fold door';
          else if (comp.type.includes('single-cladded')) desc = 'secret cladded door';
          else if (comp.type.includes('single')) desc = 'single opening door';
          compDoors.push(`${widthM}m wide ${desc}`);
        } else {
          const opener = def?.hasOpener ? ' (with top opening window)' : '';
          compWindows.push(`${widthM}m wide window${opener}`);
        }
      }
      const doorWindowParts = [];
      for (const d of compDoors) doorWindowParts.push(`1 x ${d}`);
      for (const w of compWindows) doorWindowParts.push(`1 x ${w}`);
      if (doorWindowParts.length > 0) {
        buildFeatures.push(doorWindowParts.join(', '));
      }

      // Foundation. 'concrete-landscaper' deliberately gets NO includes line —
      // that base is customer-paid and lives in the exclusions list instead.
      const foundationLabels = {
        'ground-screw': 'Ground screw foundation system (installed by our team)',
        'concrete-base': 'Concrete base foundation (installed by our team)',
        'concrete-pile': 'Concrete pile foundation system (installed by our team)',
        'concrete-existing': 'Existing concrete base foundation',
        'hybrid': 'Hybrid foundation: existing concrete base + ground screws'
      };
      if (s.foundationType !== 'concrete-landscaper') {
        buildFeatures.push(foundationLabels[s.foundationType] || 'Ground screw foundation system');
      }

      // Partition
      if (s.straightPartition?.enabled) {
        const leftLabel = s.straightPartition.leftLabel || 'Office';
        const rightLabel = s.straightPartition.rightLabel || 'Storage';
        const doorNote = s.straightPartition.hasDoor ? ' with interior door' : '';
        buildFeatures.push(`Internal partition wall${doorNote} to create separate ${leftLabel.toLowerCase()} and ${rightLabel.toLowerCase()} spaces`);
      } else if (s.partitionRoom?.enabled) {
        const roomLabel = (s.partitionRoom.label || 'room').toLowerCase();
        buildFeatures.push(`Internal partition wall to create separate ${roomLabel} space`);
      }

      // Bathroom
      if (s.bathroom?.enabled && s.bathroom?.type) {
        if (s.bathroom.type === 'wc') {
          buildFeatures.push('WC suite with toilet, small vanity basin, extractor fan, tiling, and all internal plumbing');
        } else if (s.bathroom.type === 'bathroom') {
          buildFeatures.push('Bathroom suite with toilet, vanity basin, shower tray with glass screen, extractor fan, heated towel rail, tiling, and all internal plumbing');
        }
      }

      // AC
      if (s.extras?.acUnit && s.extras.acUnit !== 'none') {
        buildFeatures.push(s.extras.acUnit === 'premium'
          ? 'Premium air conditioning unit with app control (heating and cooling)'
          : 'Standard air conditioning unit (heating and cooling)');
      }

      const buildingIncludes = 'Your building includes:\n\n' + buildFeatures.map(f => `   - ${f}`).join('\n');

      // ─── Building includes: flowing paragraph (preliminary) ───
      const paragraphParts = [];
      if (isSig) {
        let canopyDesc = 'our signature canopy/decking feature';
        if (s.cornerLeft === 'closed' && s.cornerRight === 'closed') canopyDesc += ' with closed side screens';
        else if (s.cornerLeft === 'open' && s.cornerRight === 'open') canopyDesc += ' with open corners';
        paragraphParts.push(canopyDesc);
      }
      paragraphParts.push((foundationLabels[s.foundationType] || 'ground screw foundation system').toLowerCase());
      const frontClad = getCladdingLabel(clad.front || 'anthracite-steel').toLowerCase();
      const sideClad = getCladdingLabel(clad.left || clad.right || 'anthracite-steel').toLowerCase();
      if (frontClad === sideClad) {
        paragraphParts.push(`${frontClad} on all sides`);
      } else {
        paragraphParts.push(`${frontClad} on the front of the building and ${sideClad} on the sides and rear`);
      }
      paragraphParts.push(`${heightM}m external height`);
      if (s.straightPartition?.enabled) {
        const leftLabel = (s.straightPartition.leftLabel || 'office').toLowerCase();
        const rightLabel = (s.straightPartition.rightLabel || 'storage').toLowerCase();
        const doorNote = s.straightPartition.hasDoor ? ' with interior door' : '';
        paragraphParts.push(`internal partition wall${doorNote} to create separate ${leftLabel} and ${rightLabel} spaces`);
      }
      paragraphParts.push('plastered and decorated internal finish');
      paragraphParts.push('all internal electrical works');
      if (isSig) paragraphParts.push('external canopy downlights');
      // Door/window summary for paragraph
      const dwSummaryParts = [];
      if (compDoors.length > 0) dwSummaryParts.push(`${compDoors.length} x main ${compDoors[0]}`);
      if (compWindows.length > 0) dwSummaryParts.push(`${compWindows.length} x additional window${compWindows.length > 1 ? 's' : ''}`);
      if (dwSummaryParts.length > 0) {
        paragraphParts.push(`and door/window combination as discussed per our specification (${dwSummaryParts.join(' and ')} - configuration TBC)`);
      }
      const buildingIncludesParagraph = 'This includes ' + paragraphParts.join(', ') + '.';

      const replacements = {
        '{customerFirstName}': firstName,
        '{customerName}': s.customer?.name || '',
        '{buildingType}': s.buildingType,
        '{buildingTypeLower}': buildingTypeLower,
        '{dimensions}': dims,
        '{tier}': isSig ? 'Signature' : 'Classic',
        '{address}': s.customer?.address || '[Address]',
        '{visitDate}': s.survey?.visitDate || '[Date TBC]',
        '{visitTime}': s.survey?.visitTime || '[Time TBC]',
        '{deliveryDate}': s.deliveryDate || '[TBC]',
        '{customParagraph}': customParagraph,
        '{salesRep}': salesRep,
        '{todayDayOfWeek}': todayDayOfWeek,
        '{todayTimeOfDay}': todayTimeOfDay,
        '{openingParagraph}': openingParagraph,
        '{discountParagraph}': discountParagraph,
        '{buildingIncludes}': buildingIncludes,
        '{buildingIncludesParagraph}': buildingIncludesParagraph,
        '{showroomOffer}': showroomOffer,
        '{exclusionsParagraph}': exclusionsParagraph,
        '{depositNextSteps}': depositNextSteps,
        '{heightUpgradeParagraph}': heightUpgradeParagraph,
        '{planningParagraph}': planningParagraph,
        '{useCase}': buildingTypeLower,
      };

      let body = template.body;
      for (const [key, val] of Object.entries(replacements)) {
        body = body.replaceAll(key, val);
      }

      this.emailSubject = '';
      this.emailBody = body;
    },

    async copyEmail() {
      try {
        const rich = await copyRichText(this.emailBody);
        this.notify(rich
          ? 'Email copied — paste into Gmail with formatting and links'
          : 'Rich copy unavailable in this browser — plain text copied');
      } catch {
        this.notify('Copy failed — select the text and copy manually');
      }
    },

    copyEmailPlain() {
      navigator.clipboard.writeText(this.emailBody).then(() => this.notify('Email copied as plain text'));
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
          this.state = ensureStateDefaults(JSON.parse(text));
          this.nextCompId = 100 + (this.state.components?.length || 0);
          this.nextFeatureId = 1000 + (this.state.externalFeatures?.length || 0);
          this.nextAcUnitId = 2000 + (this.state.acUnits?.length || 0);
          this.nextLabelId = 3000 + (this.state.drawingLabels?.length || 0);
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
      
      // Map cladding keys to readable names (use data if available, fallback to key)
      const getCladLabel = (key) => {
        const def = this.appData.cladding?.types?.[key];
        if (def) return def.label.toLowerCase();
        return key || 'anthracite grey steel';
      };
      
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
        price: e.price,
        description: e.description || ''
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
        date: formatDateUK(this.state.customer?.date || new Date().toISOString().split('T')[0]),
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
        hasCanopy: this.state.hasCanopy !== false,
        hasDecking: this.state.hasDecking !== false,
        
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
        
        // Straight partition
        straightPartition: this.state.straightPartition?.enabled ? {
          enabled: true,
          hasDoor: this.state.straightPartition.hasDoor || false,
          leftLabel: this.state.straightPartition.leftLabel || 'Office',
          rightLabel: this.state.straightPartition.rightLabel || 'Storage',
        } : null,

        // Payment schedule
        paymentSchedule: (this.price.paymentSchedule || []).map(ps => ({
          label: ps.label,
          amount: ps.amount
        })),

        // Custom notes
        quoteNotes: this.state.customNotes?.quote || '',

        // Drawing number
        drawingNumber: this.state.customNotes?.drawingNumber || '',

        // Planning
        planning: this.state.planning?.required ? {
          required: true,
          reasons: this.state.planning.reasons || [],
          customReason: this.state.planning.customReason || ''
        } : null,
      };
      
      this.notify('Creating Google Sheet...');
      
      try {
        const response = await fetch('/api/create-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quoteData)
        });

        const result = await response.json();

        if (result.success) {
          this.notify('Google Sheet created!');
          window.open(result.url, '_blank');
        } else {
          this.notify('Error: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        this.notify('Error creating Google Sheet. Please try again.');
        console.error('Google Sheets error:', err);
      }
    },

    printDrawing() {
      this.showExportMenu = false;
      const svg = document.querySelector('#drawing-canvas svg');
      if (!svg) return;
      const win = window.open('', '_blank');
      win.document.write(`<!DOCTYPE html><html><head><title>Drawing for ${this.state.customer?.name || 'Customer'}</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;}svg{max-width:100%;max-height:100vh;}</style></head><body>${svg.outerHTML}</body></html>`);
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

    // ─── CLOUD SAVE METHODS ───
    async refreshCloudDesigns() {
      if (!this.cloudReady) return;
      this.cloudLoading = true;
      this.cloudError = null;
      try {
        this.cloudDesigns = await listDesigns();
      } catch (err) {
        console.error('Cloud list error:', err);
        this.cloudError = 'Failed to load designs: ' + err.message;
      } finally {
        this.cloudLoading = false;
      }
    },

    async saveToCloud() {
      const name = this.cloudSaveName.trim();
      if (!name) return;
      this.cloudLoading = true;
      this.cloudError = null;
      try {
        const docId = await saveDesign(name, this.state);
        this.currentCloudId = docId;
        this.currentCloudName = name;
        this.cloudSaveName = '';
        this.notify('Saved to cloud: ' + name);
        await this.refreshCloudDesigns();
      } catch (err) {
        console.error('Cloud save error:', err);
        this.cloudError = 'Failed to save: ' + err.message;
      } finally {
        this.cloudLoading = false;
      }
    },

    async updateCloudSave() {
      if (!this.currentCloudId) return;
      this.cloudLoading = true;
      this.cloudError = null;
      try {
        await updateDesign(this.currentCloudId, this.currentCloudName, this.state);
        this.notify('Updated: ' + this.currentCloudName);
        await this.refreshCloudDesigns();
      } catch (err) {
        console.error('Cloud update error:', err);
        this.cloudError = 'Failed to update: ' + err.message;
      } finally {
        this.cloudLoading = false;
      }
    },

    async loadFromCloud(design) {
      this.cloudLoading = true;
      this.cloudError = null;
      try {
        const loadedState = await loadDesign(design.id);
        this.state = ensureStateDefaults(loadedState);
        this.currentCloudId = design.id;
        this.currentCloudName = design.name;
        // Reset ID counters
        this.nextCompId = 100 + (this.state.components?.length || 0);
        this.nextFeatureId = 1000 + (this.state.externalFeatures?.length || 0);
        this.nextAcUnitId = 2000 + (this.state.acUnits?.length || 0);
        this.nextLabelId = 3000 + (this.state.drawingLabels?.length || 0);
        this.notify('Loaded: ' + design.name);
      } catch (err) {
        console.error('Cloud load error:', err);
        this.cloudError = 'Failed to load: ' + err.message;
      } finally {
        this.cloudLoading = false;
      }
    },

    async deleteFromCloud(design) {
      if (!confirm(`Delete "${design.name}"? This cannot be undone.`)) return;
      this.cloudLoading = true;
      this.cloudError = null;
      try {
        await deleteDesign(design.id);
        if (this.currentCloudId === design.id) {
          this.currentCloudId = null;
          this.currentCloudName = '';
        }
        this.notify('Deleted: ' + design.name);
        await this.refreshCloudDesigns();
      } catch (err) {
        console.error('Cloud delete error:', err);
        this.cloudError = 'Failed to delete: ' + err.message;
      } finally {
        this.cloudLoading = false;
      }
    },

    formatCloudDate(date) {
      if (!date) return '';
      const d = date instanceof Date ? date : new Date(date);
      const now = new Date();
      const diff = now - d;
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
      if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
      if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
      const applied = [];

      // Apply cladding preferences
      if (this.state.survey?.claddingPreference) {
        const pref = this.state.survey.claddingPreference;
        if (pref === 'cedar-front-only') {
          this.state.cladding.front = 'western-red-cedar';
          this.state.cladding.left = 'anthracite-steel';
          this.state.cladding.right = 'anthracite-steel';
          applied.push('Cladding (cedar front)');
        } else if (pref === 'cedar-front-sides') {
          this.state.cladding.front = 'western-red-cedar';
          this.state.cladding.left = 'western-red-cedar';
          this.state.cladding.right = 'western-red-cedar';
          this.state.cladding.rear = 'anthracite-steel';
          applied.push('Cladding (cedar front + sides)');
        } else if (pref === 'cedar-all') {
          this.state.cladding.front = 'western-red-cedar';
          this.state.cladding.left = 'western-red-cedar';
          this.state.cladding.right = 'western-red-cedar';
          this.state.cladding.rear = 'western-red-cedar';
          applied.push('Cladding (cedar all round)');
        } else if (pref === 'composite') {
          this.state.cladding.front = 'composite-slatted';
          applied.push('Cladding (composite front)');
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
          const surveyComp = {
            id: 'comp-' + (this.nextCompId++),
            type: doorType,
            elevation: 'front',
            positionX: Math.max(0, pos),
            label: def.label,
          };
          if (doorType.includes('sliding') || doorType.includes('single')) {
            surveyComp.handleSide = 'right';
          }
          this.state.components.push(surveyComp);
          applied.push('Door (' + def.label + ')');
        }
      }

      // Apply AC preference
      if (this.state.survey?.acPreference) {
        this.state.extras.acUnit = 'standard';
        applied.push('Air conditioning');
      }

      // Apply survey extras checkboxes
      if (this.surveyExtras.heating) {
        this.state.extras.heater = Math.max(1, this.state.extras.heater || 0);
        applied.push('Panel heater');
      }
      if (this.surveyExtras.externalSockets) {
        this.state.extras.externalSocket = Math.max(1, this.state.extras.externalSocket || 0);
        applied.push('External socket');
      }
      if (this.surveyExtras.upDownLights) {
        this.state.extras.upDownLight = Math.max(2, this.state.extras.upDownLight || 0);
        applied.push('Up/down lights');
      }
      if (this.surveyExtras.additionalDecking) {
        this.state.structuralExtras.additionalDecking = Math.max(4, this.state.structuralExtras.additionalDecking || 0);
        applied.push('Additional decking');
      }
      if (this.surveyExtras.cat6) {
        this.state.extras.cat6Point = Math.max(2, this.state.extras.cat6Point || 0);
        applied.push('CAT6 points');
      }
      if (this.surveyExtras.partition) {
        this.state.structuralExtras.partition = 'with-door';
        this.onPartitionChange();
        applied.push('Partition wall');
      }
      if (this.surveyExtras.toilet) {
        this.state.structuralExtras.partition = 'toilet';
        this.onPartitionChange();
        applied.push('WC/Bathroom');
      }

      // Set delivery date from preferred delivery
      if (this.state.survey?.preferredDelivery && !this.state.customer.date) {
        this.state.customer.date = this.state.survey.preferredDelivery;
        applied.push('Delivery date');
      }

      if (applied.length > 0) {
        this.notify('Applied to design: ' + applied.join(', '));
      } else {
        this.notify('No preferences to apply — fill in Site Visit Notes first');
      }
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
      this.state = ensureStateDefaults(JSON.parse(JSON.stringify(defaults)));
      // Deep links (state must exist first): ?materials=1 / ?installer=1
      if (/[?&]materials=1/.test(window.location.search)) this.$nextTick(() => this.openMaterialsPage());
      else if (/[?&]installer=1/.test(window.location.search)) this.$nextTick(() => this.openInstallerPage());
      
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
      // Ensure acUnits array exists
      if (!this.state.acUnits) {
        this.state.acUnits = [];
      }
      // Ensure drawingLabels array exists
      if (!this.state.drawingLabels) {
        this.state.drawingLabels = [];
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
      
      // Ensure primaryUse field exists
      if (this.state.primaryUse === undefined) this.state.primaryUse = '';
      if (this.state.primaryUseCustom === undefined) this.state.primaryUseCustom = '';

      // Auto-populate customer number if empty
      if (!this.state.customNotes.drawingNumber) {
        const counterKey = 'gob-customer-number';
        let nextNum = parseInt(localStorage.getItem(counterKey)) || 4500;
        this.state.customNotes.drawingNumber = `GOB-${nextNum}`;
        localStorage.setItem(counterKey, nextNum + 1);
      }

      this.nextCompId = 100 + (this.state.components?.length || 0);
      this.nextFeatureId = 1000 + (this.state.externalFeatures?.length || 0);

      initPricing(prices, components);

      // Initialize drag-drop for components
      this.$nextTick(() => {
        initComponentDrag(this, components);
      });

      this.loaded = true;
      console.log('GOB Configurator v2 loaded');

      // Initialize Firebase cloud saves
      try {
        const fbReady = initFirebase();
        this.cloudReady = fbReady && isFirebaseReady();
        if (this.cloudReady) {
          this.refreshCloudDesigns();
        }
      } catch (err) {
        console.warn('Firebase init skipped:', err.message);
        this.cloudReady = false;
      }
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
