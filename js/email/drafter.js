// Email draft generator
// Templates from email-templates.json, parameterised with building state

import { getState, getDerived } from '../state.js';
import { calculatePrice, formatPrice } from '../pricing.js';

let templates = null;

export function initEmailDrafter(emailTemplates) {
  templates = emailTemplates;
}

export function generateEmail(templateName) {
  if (!templates || !templates[templateName]) return null;

  const state = getState();
  const derived = getDerived();
  const price = calculatePrice(state);
  const template = templates[templateName];

  const cladLabels = {
    'western-red-cedar': 'premium cedar cladding',
    'anthracite-steel': 'anthracite steel cladding',
    'composite-latte': 'composite slatted cladding',
    'thermowood': 'thermowood cladding',
    'larch': 'larch cladding'
  };

  const cornerDesc = [
    state.cornerLeft === 'open' ? 'open-ended left corner' : 'closed left corner',
    state.cornerRight === 'open' ? 'open-ended right corner' : 'closed right corner'
  ].join(' and ');

  // Generate "Your building includes:" bullet list
  const buildingIncludes = generateBuildingIncludesList(state, cladLabels);

  // Generate showroom offer
  const showroomOffer = "Please let me know if you'd like to visit our showroom to see one of our buildings first-hand.";

  const vars = {
    '{customerName}': state.customer?.name || '[Customer Name]',
    '{customerFirstName}': derived.customerFirstName || '[Name]',
    '{buildingType}': state.buildingType || 'Garden Office Building',
    '{buildingTypeLower}': (state.buildingType || 'garden office building').toLowerCase(),
    '{dimensions}': derived.dimensions,
    '{tier}': state.tier === 'signature' ? 'Signature' : 'Classic',
    '{frontCladdingDesc}': cladLabels[state.cladding?.front] || 'premium timber cladding',
    '{cornerDescription}': cornerDesc,
    '{foundationType}': state.foundationType === 'ground-screw' ? 'ground screw foundations' : 'concrete base foundations',
    '{totalPrice}': formatPrice(price?.totalIncVat || 0),
    '{basePrice}': formatPrice(price?.basePrice || 0),
    '{installation}': formatPrice(price?.installation || 0),
    '{deliveryDate}': state.deliveryDate || '[TBC]',
    '{address}': state.customer?.address || '[Address]',
    '{visitDate}': state.visitDate || '[Date TBC]',
    '{visitTime}': state.visitTime || '[Time TBC]',
    '{salesRep}': state.salesRep || 'Richard',
    '{todayTimeOfDay}': getTodayTimeOfDay(),
    '{todayDayOfWeek}': getTodayDayOfWeek(),
    '{buildingIncludes}': buildingIncludes,
    '{showroomOffer}': showroomOffer,
    '{openingParagraph}': '',
    '{customParagraph}': state.customNotes?.email ? '\n\n' + state.customNotes.email : '',
    '{ambassadorParagraph}': ''
  };

  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(vars)) {
    subject = subject.replaceAll(key, value);
    body = body.replaceAll(key, value);
  }

  // Append signature if it exists
  const sig = templates.signature || '';
  body += sig;

  return { subject, body, templateName };
}

function generateBuildingIncludesList(state, cladLabels) {
  const features = [];

  // Cladding
  const claddingSides = [];
  if (state.cladding?.front) claddingSides.push('front');
  if (state.cladding?.left && state.cladding.left === state.cladding.front) claddingSides.push('left side');
  if (state.cladding?.right && state.cladding.right === state.cladding.front) claddingSides.push('right side');
  if (state.cladding?.rear && state.cladding.rear === state.cladding.front) claddingSides.push('rear');
  
  const claddingDesc = claddingLabels(state.cladding?.front);
  if (claddingSides.length > 0) {
    features.push(`${claddingDesc} on the ${claddingSides.join(', ')}`);
  }

  // Corners
  if (state.cornerLeft === 'open' || state.cornerRight === 'open') {
    const openCorners = [];
    if (state.cornerLeft === 'open') openCorners.push('left');
    if (state.cornerRight === 'open') openCorners.push('right');
    features.push(`Open-ended ${openCorners.join(' and ')} corner${openCorners.length > 1 ? 's' : ''}`);
  }

  // Overhang/decking
  if (state.overhangDepth > 0) {
    features.push(`Contemporary overhang/decking feature (${state.overhangDepth}mm)`);
  }

  // Foundation
  const foundationLabels = {
    'ground-screw': 'Ground screw foundations',
    'concrete-base': 'Concrete base',
    'concrete-pile': 'Concrete pile system'
  };
  features.push(foundationLabels[state.foundationType] || 'Ground screw foundations');

  // Doors & windows (from components)
  const doors = (state.components || []).filter(c => c.type === 'door');
  const windows = (state.components || []).filter(c => c.type === 'window');
  
  if (doors.length > 0) {
    const doorLabels = doors.map(d => d.label).join(', ');
    features.push(`${doorLabels}`);
  }
  
  if (windows.length > 0) {
    const windowLabels = windows.map(w => w.label).join(', ');
    features.push(`${windowLabels}`);
  }

  // Key upgrades/extras
  if (state.extras?.acUnit && state.extras.acUnit !== 'none') {
    const acLabel = state.extras.acUnit === 'premium' ? 'Premium air conditioning with app control' : 'Standard air conditioning';
    features.push(acLabel);
  }

  if (state.structuralExtras?.partition && state.structuralExtras.partition !== 'none') {
    const partitionLabels = {
      'basic': 'Basic storage partition',
      'with-door': 'Partition with interior door',
      'toilet': 'Toilet/shower room partition'
    };
    features.push(partitionLabels[state.structuralExtras.partition]);
  }

  if (state.structuralExtras?.secretDoor) {
    features.push('Secret cladded door');
  }

  // Format as bullet list
  if (features.length === 0) {
    return 'Your building includes our standard specification as detailed in the attached quote.';
  }

  return 'Your building includes:\n\n' + features.map(f => `• ${f}`).join('\n');
}

function claddingLabels(key) {
  const labels = {
    'western-red-cedar': 'Premium cedar cladding',
    'anthracite-steel': 'Anthracite steel cladding',
    'composite-latte': 'Composite slatted cladding',
    'thermowood': 'Thermowood cladding',
    'larch': 'Larch cladding'
  };
  return labels[key] || 'Premium timber cladding';
}

function getTodayTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getTodayDayOfWeek() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

export function getTemplateNames() {
  if (!templates) return [];
  return Object.keys(templates).filter(k => k !== 'signature').map(key => ({
    key,
    label: formatTemplateName(key)
  }));
}

function formatTemplateName(key) {
  const names = {
    initialResponse: '1. Initial Enquiry Response',
    siteVisitConfirmation: '2. Site Visit Confirmation',
    quoteEmail: '3. Post-Visit Quote Email',
    preliminaryQuoteEmail: '3b. Preliminary Quote Email (no site visit)',
    followUp1Week: '4. Follow-Up (1 Week)',
    followUp2Weeks: '5. Follow-Up (2 Weeks)',
    depositConfirmation: '6. Deposit Confirmation',
    drawingSent: '7. Drawing Sent',
    paymentReceived: '8. Payment Received',
    deliveryNotification: '9. Delivery Notification',
    buildComplete: '10. Build Complete'
  };
  return names[key] || key;
}

// Copy email to clipboard
export function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Email copied to clipboard');
    });
  } else {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showNotification('Email copied to clipboard');
  }
}

function showNotification(msg) {
  const el = document.getElementById('notification');
  if (el) {
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  }
}
