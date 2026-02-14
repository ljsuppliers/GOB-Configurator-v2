// UI panel controllers
// Manages the configurator panel, price panel, drawing panel updates

import { getState, subscribe, update } from '../state.js';
import { calculatePrice, formatPrice } from '../pricing.js';
import { generateDrawing } from '../drawing/engine.js';
import { renderComponentList } from './inputs.js';
import { generateEmail, getTemplateNames, copyToClipboard } from '../email/drafter.js';
import { renderSurveyForm } from '../survey/form.js';

export function initPanels() {
  // Subscribe to state changes
  subscribe(onStateChange);

  // Initial render
  onStateChange(getState());

  // Setup email drafter panel
  setupEmailPanel();

  // Setup survey panel
  const surveyContainer = document.getElementById('survey-panel');
  if (surveyContainer) renderSurveyForm(surveyContainer);
}

function onStateChange(state) {
  updateDrawingPanel(state);
  updatePricePanel(state);
  updateComponentList(state);
}

function updateDrawingPanel(state) {
  const container = document.getElementById('drawing-canvas');
  if (!container) return;

  const svg = generateDrawing(state);
  container.innerHTML = svg;
}

function updatePricePanel(state) {
  const panel = document.getElementById('price-panel-content');
  if (!panel) return;

  const price = calculatePrice(state);
  if (!price) return;

  let html = '';

  // Base price
  html += `<div class="price-section">
    <div class="price-row price-base">
      <span>Base Price</span>
      <span class="price-amount">${formatPrice(price.basePrice)}</span>
    </div>
  </div>`;

  // Component upgrades
  if (price.componentUpgrades.length > 0) {
    html += `<div class="price-section"><div class="price-section-header">Door/Window Upgrades</div>`;
    for (const cu of price.componentUpgrades) {
      html += `<div class="price-row"><span>${cu.label}</span><span class="price-amount">${formatPrice(cu.price)}</span></div>`;
    }
    html += '</div>';
  }

  // Cladding upgrades
  if (price.claddingUpgrades.length > 0) {
    html += `<div class="price-section"><div class="price-section-header">Cladding Upgrades</div>`;
    for (const cl of price.claddingUpgrades) {
      html += `<div class="price-row"><span>${cl.label}</span><span class="price-amount">${formatPrice(cl.price)}</span></div>`;
    }
    html += '</div>';
  }

  // Height upgrade
  if (price.heightUpgrade > 0) {
    html += `<div class="price-section">
      <div class="price-row"><span>${price.heightUpgradeLabel}</span><span class="price-amount">${formatPrice(price.heightUpgrade)}</span></div>
    </div>`;
  }

  // Extras
  if (price.extras.length > 0) {
    html += `<div class="price-section"><div class="price-section-header">Extras</div>`;
    for (const ex of price.extras) {
      html += `<div class="price-row"><span>${ex.label}</span><span class="price-amount">${formatPrice(ex.price)}</span></div>`;
    }
    html += '</div>';
  }

  // Installation
  html += `<div class="price-section">
    <div class="price-row"><span>Installation & Groundworks</span><span class="price-amount">${formatPrice(price.installation)}</span></div>
  </div>`;

  // Discount
  if (price.discount > 0) {
    html += `<div class="price-section price-discount">
      <div class="price-row"><span>${price.discountLabel}</span><span class="price-amount">-${formatPrice(price.discount)}</span></div>
    </div>`;
  }

  // Total
  html += `<div class="price-total">
    <div class="price-row">
      <span>TOTAL (inc VAT)</span>
      <span class="price-amount">${formatPrice(price.totalIncVat)}</span>
    </div>
  </div>`;

  // Payment schedule
  html += `<div class="price-section payment-schedule">
    <div class="price-section-header">Payment Schedule</div>`;
  for (const p of price.paymentSchedule) {
    html += `<div class="price-row payment-row">
      <span>${p.stage}. ${p.label}</span>
      <span class="price-amount">${formatPrice(p.amount)}</span>
    </div>`;
  }
  html += '</div>';

  // Discount controls
  html += `<div class="price-section discount-controls">
    <div class="price-section-header">Discount</div>
    <div class="discount-row">
      <select id="discount-type" class="input-sm">
        <option value="none" ${state.discount?.type === 'none' ? 'selected' : ''}>No discount</option>
        <option value="fixed" ${state.discount?.type === 'fixed' ? 'selected' : ''}>Fixed amount</option>
        <option value="percentage" ${state.discount?.type === 'percentage' ? 'selected' : ''}>Percentage</option>
      </select>
      <input type="number" id="discount-amount" class="input-sm" value="${state.discount?.amount || ''}" placeholder="Amount" />
    </div>
    <input type="text" id="discount-desc" class="input-sm input-full" value="${state.discount?.description || ''}" placeholder="Description (optional)" />
  </div>`;

  panel.innerHTML = html;

  // Bind discount controls
  bindDiscountControls();
}

function bindDiscountControls() {
  const typeEl = document.getElementById('discount-type');
  const amountEl = document.getElementById('discount-amount');
  const descEl = document.getElementById('discount-desc');

  if (typeEl) {
    typeEl.addEventListener('change', () => {
      update('discount.type', typeEl.value);
    });
  }
  if (amountEl) {
    amountEl.addEventListener('input', () => {
      update('discount.amount', parseFloat(amountEl.value) || 0);
    });
  }
  if (descEl) {
    descEl.addEventListener('input', () => {
      update('discount.description', descEl.value);
    });
  }
}

function updateComponentList(state) {
  renderComponentList('placed-components', state.components);
}

function setupEmailPanel() {
  const panel = document.getElementById('email-panel');
  if (!panel) return;

  const templates = getTemplateNames();

  panel.innerHTML = `
    <div class="email-drafter">
      <h3>Email Drafter</h3>
      <div class="email-template-select">
        <label>Template:
          <select id="email-template-select">
            ${templates.map(t => `<option value="${t.key}">${t.label}</option>`).join('')}
          </select>
        </label>
        <button id="email-generate" class="btn btn-sm">Generate</button>
      </div>
      <div id="email-output" class="email-output">
        <p class="empty-msg">Select a template and click Generate</p>
      </div>
    </div>
  `;

  document.getElementById('email-generate')?.addEventListener('click', () => {
    const templateName = document.getElementById('email-template-select')?.value;
    if (!templateName) return;

    const email = generateEmail(templateName);
    if (!email) return;

    const output = document.getElementById('email-output');
    output.innerHTML = `
      <div class="email-preview">
        <div class="email-field"><strong>Subject:</strong> ${escHtml(email.subject)}</div>
        <div class="email-body"><pre>${escHtml(email.body)}</pre></div>
        <div class="email-actions">
          <button id="copy-subject" class="btn btn-sm">Copy Subject</button>
          <button id="copy-body" class="btn btn-sm">Copy Body</button>
          <button id="copy-all" class="btn btn-sm btn-primary">Copy All</button>
        </div>
      </div>
    `;

    document.getElementById('copy-subject')?.addEventListener('click', () => copyToClipboard(email.subject));
    document.getElementById('copy-body')?.addEventListener('click', () => copyToClipboard(email.body));
    document.getElementById('copy-all')?.addEventListener('click', () => copyToClipboard(`Subject: ${email.subject}\n\n${email.body}`));
  });
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
