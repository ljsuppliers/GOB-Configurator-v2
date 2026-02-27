// Email draft generator
// Templates from email-templates.json, parameterised with building state

import { getState, getDerived } from '../state.js';
import { calculatePrice, formatPrice } from '../pricing.js';

let templates = null;
let appData = null;

export function initEmailDrafter(emailTemplates, data) {
  templates = emailTemplates;
  appData = data;
}

export function generateEmail(templateName) {
  if (!templates || !templates[templateName]) return null;

  const state = getState();
  const derived = getDerived();
  const price = calculatePrice(state);
  const template = templates[templateName];

  const isSig = state.tier === 'signature';
  const salesRep = state.salesRep || 'Richard';
  const buildingTypeLower = (state.buildingType || 'garden office building').toLowerCase();

  // Dynamic opening paragraph (post-visit)
  let openingParagraph;
  if (state.visitedShowroom) {
    openingParagraph = `Hope all is well. It was great to meet you at our showroom to discuss your ${buildingTypeLower} project.`;
  } else {
    openingParagraph = `Hope all is well. Thank you for having ${salesRep} visit, he said it was great to meet to discuss your ${buildingTypeLower} project.`;
  }

  // Exclusions paragraph - adapts based on bathroom selection
  let exclusionsParagraph = 'Excluded from our price is the electrical connection, which will be subject to a visit from our electrician.';
  if (state.bathroom?.enabled && state.bathroom?.type) {
    exclusionsParagraph += ' The utility connections (water supply and waste) will also be arranged separately with our plumber and landscaper.';
    exclusionsParagraph += ' We also ask that customers provide a mini skip whilst we are on site.';
  } else {
    exclusionsParagraph += ' We also ask that customers provide a toilet facility (porta-loo or downstairs toilet) and 6-yard skip to help keep the site clean and tidy throughout the build.';
  }

  // Deposit next steps
  let depositNextSteps = 'We will also arrange a visit from our registered electrician to assess the electrical connection.';
  if (state.bathroom?.enabled && state.bathroom?.type) {
    depositNextSteps = 'We will also arrange visits from our registered electrician and plumber to assess the electrical and utility connections.';
  }

  // Height upgrade paragraph (for preliminary emails)
  let heightUpgradeParagraph = '';
  if (state.height > 2500) {
    const heightM = (state.height / 1000).toFixed(2).replace(/0$/, '');
    heightUpgradeParagraph = `\n\nI've also included an external height of ${heightM}m, which we recommend for buildings of this size. Our standard buildings are 2.5m in height, but for larger buildings, the additional height provides a much more comfortable space. However, this does require planning permission, which is something we can assist with and is a very straightforward process. Should you not require the additional height and would prefer 2.5m, please let me know and I'll provide an updated quote.`;
  }

  // Planning permission paragraph (for preliminary emails with height > 2.5m)
  let planningParagraph = '';
  if (state.height > 2500) {
    planningParagraph = '\n\nAs the building exceeds 2.5m in height, planning permission will be required. We work closely with a planning consultant and can handle this for you. We will produce a full set of drawings with elevations and all necessary information for the proposed building/surrounding area and these are then forwarded to our planning consultant who submits the application on your/our behalf. This costs £750 + VAT + local council fee (usually £528). Should you wish to proceed we require £250 upfront and £500 once the application is ready for submission. The £250 payment will go towards the building and act as the holding deposit.';
  }

  // Discount paragraph
  let discountParagraph = '';
  if (price?.discount > 0) {
    const discountLabel = price.discountLabel || state.discount?.description || 'discount';
    discountParagraph = `\n\nWe've included a ${formatPrice(price.discount)} ${discountLabel} on your quote.`;
  }

  // Showroom offer
  const showroomOffer = "Please also let me know if you'd like to visit our showroom or a previous local project to see one of our buildings first-hand.";

  // Building includes (bullet list for post-visit, paragraph for preliminary)
  const buildingIncludes = generateBuildingIncludesList(state, price);
  const buildingIncludesParagraph = generateBuildingIncludesParagraph(state, price);

  const vars = {
    '{customerName}': state.customer?.name || '[Customer Name]',
    '{customerFirstName}': derived.customerFirstName || '[Name]',
    '{buildingType}': state.buildingType || 'Garden Office Building',
    '{buildingTypeLower}': buildingTypeLower,
    '{dimensions}': derived.dimensions,
    '{tier}': isSig ? 'Signature' : 'Classic',
    '{totalPrice}': formatPrice(price?.totalIncVat || 0),
    '{basePrice}': formatPrice(price?.basePrice || 0),
    '{installation}': formatPrice(price?.installation || 0),
    '{deliveryDate}': state.deliveryDate || '[TBC]',
    '{address}': state.customer?.address || '[Address]',
    '{visitDate}': state.visitDate || '[Date TBC]',
    '{visitTime}': state.visitTime || '[Time TBC]',
    '{salesRep}': salesRep,
    '{todayTimeOfDay}': getTodayTimeOfDay(),
    '{todayDayOfWeek}': getTodayDayOfWeek(),
    '{buildingIncludes}': buildingIncludes,
    '{buildingIncludesParagraph}': buildingIncludesParagraph,
    '{showroomOffer}': showroomOffer,
    '{openingParagraph}': openingParagraph,
    '{customParagraph}': state.customNotes?.email ? '\n\n' + state.customNotes.email : '',
    '{discountParagraph}': discountParagraph,
    '{exclusionsParagraph}': exclusionsParagraph,
    '{depositNextSteps}': depositNextSteps,
    '{heightUpgradeParagraph}': heightUpgradeParagraph,
    '{planningParagraph}': planningParagraph,
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

// ─── Detailed bullet-point list (post-visit quote email) ───
// Matches the real email format from actual GOB emails
function generateBuildingIncludesList(state, price) {
  const features = [];
  const isSig = state.tier === 'signature';

  // Signature canopy/decking
  if (isSig) {
    features.push('Signature integrated canopy on front of building with down lights');
    if (state.hasDecking !== false) {
      features.push('Signature integrated decking on front of building');
    }
  }

  // Cladding per side
  const claddingDesc = buildCladdingDescription(state);
  for (const line of claddingDesc) {
    features.push(line);
  }

  // External height
  const heightM = (state.height / 1000).toFixed(1);
  if (state.height > 2500) {
    features.push(`${heightM}m external height (upgraded)`);
  } else {
    features.push(`${heightM}m external height (standard)`);
  }

  // Internal finish
  features.push('Internal wall finish: plaster-boarded, plastered and decorated white');
  features.push('Flooring and skirting board');

  // Electrical
  const sqm = (state.width / 1000) * (state.depth / 1000);
  let downlights = 4;
  if (sqm > 32) downlights = 12;
  else if (sqm > 24) downlights = 10;
  else if (sqm > 15) downlights = 8;
  else if (sqm > 9) downlights = 6;

  let sockets = 4;
  if (sqm > 25) sockets = 7;
  else if (sqm > 10) sockets = 5;

  let electricalDesc = `Complete internal electrical works including ${downlights} x dimmable LED downlights`;
  if (isSig) {
    const spotlights = Math.floor(state.width / 1000);
    electricalDesc += `, ${spotlights} x external downlights in canopy soffit`;
  }
  electricalDesc += `, ${sockets} x double plug sockets, and 1 x network connection port`;
  features.push(electricalDesc);

  // Doors & windows
  const doorWindowDesc = buildDoorWindowDescription(state);
  if (doorWindowDesc) {
    features.push(doorWindowDesc);
  }

  // Foundation
  const foundationLabels = {
    'ground-screw': 'Ground screw foundation system',
    'concrete-base': 'Concrete base foundation',
    'concrete-pile': 'Concrete pile foundation system'
  };
  features.push(foundationLabels[state.foundationType] || 'Ground screw foundation system');

  // Partition
  if (state.partitionRoom?.enabled) {
    const partLabels = {
      'storage': 'Internal partition wall to create separate storage space',
      'wc': 'Internal partition wall with WC/shower room',
      'shower': 'Internal partition wall with shower room',
    };
    features.push(partLabels[state.partitionRoom.type] || 'Internal partition wall');
  }
  if (state.straightPartition?.enabled) {
    const leftLabel = state.straightPartition.leftLabel || 'Office';
    const rightLabel = state.straightPartition.rightLabel || 'Storage';
    const doorNote = state.straightPartition.hasDoor ? ' with interior door' : '';
    features.push(`Internal partition wall${doorNote} to create separate ${leftLabel.toLowerCase()} and ${rightLabel.toLowerCase()} spaces`);
  }

  // AC
  if (state.extras?.acUnit && state.extras.acUnit !== 'none') {
    const acLabel = state.extras.acUnit === 'premium'
      ? 'Premium air conditioning unit with app control (heating and cooling)'
      : 'Standard air conditioning unit (heating and cooling)';
    features.push(acLabel);
  }

  if (features.length === 0) {
    return 'Your building includes our standard specification as detailed in the attached quote.';
  }

  return 'Your building includes:\n\n' + features.map(f => `   - ${f}`).join('\n');
}

// ─── Flowing paragraph version (preliminary quote email) ───
// Matches the real preliminary email format
function generateBuildingIncludesParagraph(state, price) {
  const parts = [];
  const isSig = state.tier === 'signature';

  if (isSig) {
    let canopyDesc = 'our signature canopy/decking feature';
    if (state.cornerLeft === 'closed' && state.cornerRight === 'closed') {
      canopyDesc += ' with closed side screens';
    } else if (state.cornerLeft === 'open' && state.cornerRight === 'open') {
      canopyDesc += ' with open corners';
    }
    parts.push(canopyDesc);
  }

  // Foundation
  const foundationLabels = {
    'ground-screw': 'ground screw foundation system',
    'concrete-base': 'concrete base foundation',
    'concrete-pile': 'concrete pile foundation system'
  };
  parts.push(foundationLabels[state.foundationType] || 'ground screw foundation system');

  // Cladding summary
  const frontClad = getCladdingLabel(state.cladding?.front);
  const sidesClad = getCladdingLabel(state.cladding?.left || state.cladding?.right);
  if (frontClad === sidesClad) {
    parts.push(`${frontClad} on all sides`);
  } else {
    parts.push(`${frontClad} on the front of the building and ${sidesClad} on the sides and rear`);
  }

  // Height
  const heightM = (state.height / 1000).toFixed(1);
  parts.push(`${heightM}m external height`);

  // Partition
  if (state.straightPartition?.enabled) {
    const leftLabel = state.straightPartition.leftLabel || 'office';
    const rightLabel = state.straightPartition.rightLabel || 'storage';
    const doorNote = state.straightPartition.hasDoor ? ' with interior door' : '';
    parts.push(`internal partition wall${doorNote} to create separate ${leftLabel.toLowerCase()} and ${rightLabel.toLowerCase()} spaces`);
  } else if (state.partitionRoom?.enabled) {
    parts.push('internal partition wall');
  }

  // Standard finishes
  parts.push('plastered and decorated internal finish');
  parts.push('all internal electrical works');
  if (isSig) parts.push('external canopy downlights');

  // Door/window summary
  const doorWindowSummary = buildDoorWindowSummary(state);
  if (doorWindowSummary) {
    parts.push(`and ${doorWindowSummary}`);
  }

  return 'This includes ' + parts.join(', ') + '.';
}

// ─── Helper: cladding description lines for bullet list ───
function buildCladdingDescription(state) {
  const lines = [];
  const sides = { front: 'front', left: 'left side', right: 'right side', rear: 'rear' };
  const clad = state.cladding || {};

  // Group sides by cladding type
  const groups = {};
  for (const [side, label] of Object.entries(sides)) {
    const type = clad[side] || 'anthracite-steel';
    if (!groups[type]) groups[type] = [];
    groups[type].push(label);
  }

  for (const [type, sideList] of Object.entries(groups)) {
    const claddingName = getCladdingLabel(type);
    lines.push(`${claddingName} on ${sideList.join(' and ')}`);
  }

  return lines;
}

// ─── Helper: door/window description for bullet list ───
function buildDoorWindowDescription(state) {
  const components = state.components || [];
  if (components.length === 0) return null;

  const allDefs = appData ? { ...appData.components?.doors, ...appData.components?.windows } : {};

  const doors = [];
  const windows = [];

  for (const comp of components) {
    const def = allDefs[comp.type];
    const widthM = (comp.customWidth || def?.width || 900) / 1000;
    const label = def?.label || comp.type;

    if (def?.category === 'sliding' || def?.category === 'bifold' || def?.category === 'single') {
      doors.push(`${widthM}m wide ${getComponentShortDesc(comp.type, def)}`);
    } else {
      const opener = def?.hasOpener ? ' (with top opening window)' : '';
      windows.push(`${widthM}m wide ${getComponentShortDesc(comp.type, def)}${opener}`);
    }
  }

  const parts = [];
  if (doors.length > 0) {
    parts.push(`${doors.length} x main ${doors.join(', ')}`);
  }
  if (windows.length > 0) {
    parts.push(`${windows.length} x additional full height ${windows.join(', ')} window${windows.length > 1 ? 's' : ''}`);
  }

  return parts.join(' and ') + ' - configuration TBC';
}

// ─── Helper: short door/window summary for preliminary paragraph ───
function buildDoorWindowSummary(state) {
  const components = state.components || [];
  if (components.length === 0) return null;

  const allDefs = appData ? { ...appData.components?.doors, ...appData.components?.windows } : {};

  let doorCount = 0;
  let windowCount = 0;
  let mainDoorDesc = '';

  for (const comp of components) {
    const def = allDefs[comp.type];
    if (def?.category === 'sliding' || def?.category === 'bifold' || def?.category === 'single') {
      doorCount++;
      if (!mainDoorDesc) {
        const widthM = (comp.customWidth || def?.width || 900) / 1000;
        mainDoorDesc = `${widthM}m wide ${getComponentShortDesc(comp.type, def)}`;
      }
    } else {
      windowCount++;
    }
  }

  const parts = [];
  if (doorCount > 0) parts.push(`${doorCount} x main ${mainDoorDesc}`);
  if (windowCount > 0) parts.push(`${windowCount} x additional window${windowCount > 1 ? 's' : ''}`);

  return `door/window combination as discussed per our specification (${parts.join(' and ')} - configuration TBC)`;
}

function getComponentShortDesc(type, def) {
  if (!type) return 'door';
  if (type.includes('sliding')) return 'sliding door';
  if (type.includes('bifold')) return 'bi-fold door';
  if (type.includes('single-cladded')) return 'secret cladded door';
  if (type.includes('single')) return 'single opening door';
  if (type.includes('slot')) return 'slot window';
  if (def?.hasOpener) return 'window with opener';
  return 'fixed window';
}

function getCladdingLabel(key) {
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
