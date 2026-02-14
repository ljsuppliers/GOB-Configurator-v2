// Digital site survey form
// Captures customer and site details, can pre-populate the configurator

import { getState, update, updateBatch } from '../state.js';

export function renderSurveyForm(container) {
  const state = getState();

  container.innerHTML = `
    <div class="survey-form">
      <h3>Site Survey Form</h3>

      <div class="survey-section">
        <h4>Customer Details</h4>
        <label>Full Name
          <input type="text" id="survey-name" value="${esc(state.customer?.name)}" />
        </label>
        <label>Address
          <textarea id="survey-address" rows="2">${esc(state.customer?.address)}</textarea>
        </label>
        <label>Contact Number
          <input type="tel" id="survey-phone" value="${esc(state.customer?.number)}" />
        </label>
        <label>Email
          <input type="email" id="survey-email" value="${esc(state.customer?.email)}" />
        </label>
      </div>

      <div class="survey-section">
        <h4>Building Location</h4>
        <label>Location in Garden
          <textarea id="survey-location" rows="2" placeholder="e.g. Bottom left of garden, facing the house"></textarea>
        </label>
        <label>Garden Access
          <select id="survey-access">
            <option value="">Select...</option>
            <option value="side-gate">Side gate</option>
            <option value="through-house">Through house</option>
            <option value="rear-alley">Rear alley/access</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>Parking
          <input type="text" id="survey-parking" placeholder="e.g. On-street parking available" />
        </label>
      </div>

      <div class="survey-section">
        <h4>Ground & Boundaries</h4>
        <label>Ground Conditions
          <select id="survey-ground">
            <option value="level-lawn">Level lawn</option>
            <option value="slight-slope">Slight slope</option>
            <option value="significant-slope">Significant slope</option>
            <option value="patio-concrete">Patio/concrete</option>
            <option value="uneven">Uneven/rough</option>
          </select>
        </label>
        <div class="survey-row">
          <label>Boundary Left (mm)
            <input type="number" id="survey-bl" value="${esc(state.site?.boundaryLeft)}" placeholder="e.g. 1500" />
          </label>
          <label>Boundary Right (mm)
            <input type="number" id="survey-br" value="${esc(state.site?.boundaryRight)}" placeholder="e.g. 2000" />
          </label>
          <label>Boundary Rear (mm)
            <input type="number" id="survey-brear" value="${esc(state.site?.boundaryRear)}" placeholder="e.g. 3000" />
          </label>
        </div>
      </div>

      <div class="survey-section">
        <h4>Adjacent Structures</h4>
        <label>Structures nearby
          <textarea id="survey-structures" rows="2" placeholder="e.g. Shed to the left, fence at rear, hedge on right"></textarea>
        </label>
      </div>

      <div class="survey-section">
        <h4>Power Supply</h4>
        <label>Nearest power supply location
          <input type="text" id="survey-power" placeholder="e.g. Consumer unit in kitchen, 15m from building site" />
        </label>
      </div>

      <div class="survey-section">
        <h4>Planning Considerations</h4>
        <label>
          <input type="checkbox" id="survey-pd" checked /> Within permitted development
        </label>
        <label>Notes
          <textarea id="survey-planning-notes" rows="2" placeholder="Any planning considerations..."></textarea>
        </label>
      </div>

      <div class="survey-section">
        <h4>Photos</h4>
        <label>Upload site photos
          <input type="file" id="survey-photos" multiple accept="image/*" />
        </label>
        <div id="survey-photo-preview" class="photo-preview"></div>
      </div>

      <div class="survey-section">
        <h4>General Notes</h4>
        <textarea id="survey-notes" rows="3" placeholder="Any other notes from the site visit...">${esc(state.site?.notes)}</textarea>
      </div>

      <div class="survey-actions">
        <button id="survey-save" class="btn btn-primary">Save Survey</button>
        <button id="survey-to-quote" class="btn btn-secondary">Create Quote from Survey</button>
      </div>
    </div>
  `;

  // Photo preview handler
  document.getElementById('survey-photos')?.addEventListener('change', handlePhotos);
  document.getElementById('survey-save')?.addEventListener('click', saveSurvey);
  document.getElementById('survey-to-quote')?.addEventListener('click', applyToConfigurator);
}

function handlePhotos(e) {
  const preview = document.getElementById('survey-photo-preview');
  if (!preview) return;
  preview.innerHTML = '';

  for (const file of e.target.files) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = document.createElement('img');
      img.src = ev.target.result;
      img.className = 'survey-photo';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
}

function saveSurvey() {
  const data = collectFormData();
  updateBatch({
    'customer.name': data.name,
    'customer.address': data.address,
    'customer.number': data.phone,
    'customer.email': data.email,
    'site.boundaryLeft': data.boundaryLeft,
    'site.boundaryRight': data.boundaryRight,
    'site.boundaryRear': data.boundaryRear,
    'site.access': data.access,
    'site.notes': data.notes
  });

  showNotification('Survey saved');
}

function applyToConfigurator() {
  saveSurvey();
  // Switch to configurator tab
  document.querySelector('[data-tab="configurator"]')?.click();
  showNotification('Survey data applied to configurator');
}

function collectFormData() {
  return {
    name: document.getElementById('survey-name')?.value || '',
    address: document.getElementById('survey-address')?.value || '',
    phone: document.getElementById('survey-phone')?.value || '',
    email: document.getElementById('survey-email')?.value || '',
    access: document.getElementById('survey-access')?.value || '',
    boundaryLeft: document.getElementById('survey-bl')?.value || '',
    boundaryRight: document.getElementById('survey-br')?.value || '',
    boundaryRear: document.getElementById('survey-brear')?.value || '',
    notes: document.getElementById('survey-notes')?.value || ''
  };
}

function esc(val) {
  return (val || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function showNotification(msg) {
  const el = document.getElementById('notification');
  if (el) {
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  }
}
