// Pricing engine — calculates all prices from building state
// Reads from prices.json data loaded at init

let pricesData = null;
let componentsData = null;

export function initPricing(prices, components) {
  pricesData = prices;
  componentsData = components;
}

// ─── Derived calculations (used by pricing + quote generation) ───

export function getInternalDimensions(state) {
  const isSig = state.tier === 'signature';
  const intWidth = state.width - 300;   // 150mm each side wall
  const intDepth = state.depth - (isSig ? 700 : 300); // Signature: 400mm canopy + 150mm front + 150mm back
  // Height reduction depends on external height (bigger joists for taller roofs)
  let heightReduction;
  if (state.height <= 2500) heightReduction = 350;
  else if (state.height <= 2750) heightReduction = 450;
  else heightReduction = 550;
  const intHeight = state.height - heightReduction;
  return { width: intWidth, depth: intDepth, height: intHeight };
}

export function getDownlightCount(state) {
  const sqm = (state.width / 1000) * (state.depth / 1000);
  if (sqm <= 9) return 4;
  if (sqm <= 15) return 6;
  if (sqm <= 24) return 8;
  if (sqm <= 32) return 10;
  return 12;
}

export function getSpotlightCount(state) {
  if (state.tier !== 'signature') return 0;
  return Math.floor(state.width / 1000);
}

export function getLightingZones(state) {
  // Base: 1 zone. Extra zone for each partitioned area
  let zones = 1;
  if (state.straightPartition?.enabled) zones++;
  if (state.partitionRoom?.enabled) zones++;
  return zones;
}

export function calculatePrice(state) {
  if (!pricesData) return null;

  const result = {
    basePrice: 0,
    basePriceLabel: '',
    extras: [],
    deductions: [],
    claddingUpgrades: [],
    heightUpgrade: 0,
    heightUpgradeLabel: '',
    installation: 0,
    subtotalExVat: 0,
    vat: 0,
    discount: 0,
    discountLabel: '',
    totalIncVat: 0,
    paymentSchedule: [],
    componentUpgrades: [],
    lineItems: []
  };

  // 1. Base price lookup
  result.basePrice = lookupBasePrice(state);
  result.basePriceLabel = `${(state.width / 1000).toFixed(1)}m x ${(state.depth / 1000).toFixed(1)}m ${state.tier === 'signature' ? 'Signature' : 'Classic'} ${state.buildingType}`;

  // 2. Component upgrade prices (doors/windows beyond standard)
  const allComps = { ...componentsData.doors, ...componentsData.windows };
  for (const comp of state.components) {
    const def = allComps[comp.type];
    if (def && def.upgradePrice > 0) {
      result.componentUpgrades.push({
        label: def.label,
        price: def.upgradePrice
      });
    }
  }

  // 3. Electrical extras
  const elec = pricesData.extras.electrical;
  const ex = state.extras || {};

  if (ex.externalSocket > 0) addExtra(result, elec.externalSocket, ex.externalSocket);
  if (ex.upDownLight > 0) addExtra(result, elec.upDownLight, ex.upDownLight);
  if (ex.heater > 0) addExtra(result, elec.heater, ex.heater);
  if (ex.additionalSocket > 0) addExtra(result, elec.additionalSocket, ex.additionalSocket);
  if (ex.additionalSocketUsb > 0) addExtra(result, elec.additionalSocketUsb, ex.additionalSocketUsb);
  if (ex.additionalLightingZone > 0) addExtra(result, elec.additionalLightingZone, ex.additionalLightingZone);
  if (ex.quineticSwitch) addExtra(result, elec.quineticSwitch, 1);
  if (ex.acUnit === 'standard') addExtra(result, elec.acUnitStandard, 1);
  if (ex.acUnit === 'premium') addExtra(result, elec.acUnitPremium, 1);
  if (ex.cat6Point > 0) addExtra(result, elec.cat6Point, ex.cat6Point);
  if (ex.hdmiCables) addExtra(result, elec.hdmiCables, 1);
  if (ex.floodlightCabling) addExtra(result, elec.floodlightCabling, 1);
  if (ex.tvMountingPrep) addExtra(result, elec.tvMountingPrep, 1);

  // 4. Structural extras
  const struct = pricesData.extras.structural;
  const se = state.structuralExtras || {};

  // Straight partition (back-to-front wall)
  if (state.straightPartition?.enabled) {
    const partitionPrice = state.straightPartition.hasDoor ? 1800 : 1200;
    const partitionLabel = state.straightPartition.hasDoor
      ? 'Internal partition wall with interior door'
      : 'Internal partition wall';
    result.extras.push({ label: partitionLabel, price: partitionPrice });
  }

  if (se.secretDoor) addExtra(result, struct.secretDoor, 1);
  if (se.additionalDecking > 0) {
    result.extras.push({
      label: `${struct.additionalDecking.label} (${se.additionalDecking} sqm)`,
      price: struct.additionalDecking.price * se.additionalDecking
    });
  }
  if (se.premiumFlooring) addExtra(result, struct.premiumFlooring, 1);
  if (se.bifoldUpgrade) addExtra(result, pricesData.extras.doors.bifoldUpgrade, 1);

  // 4c. Deductions
  const ded = state.deductions || {};
  if (pricesData.deductions) {
    // Signature canopy/decking removal
    if (state.tier === 'signature') {
      if (state.hasDecking === false) {
        result.deductions.push({
          label: pricesData.deductions.removeDecking.label,
          price: pricesData.deductions.removeDecking.price
        });
      }
      if (state.hasCanopy === false) {
        result.deductions.push({
          label: pricesData.deductions.removeCanopy.label,
          price: pricesData.deductions.removeCanopy.price
        });
      }
    }
    if (ded.useExistingFoundation) {
      result.deductions.push({
        label: pricesData.deductions.useExistingFoundation.label,
        price: pricesData.deductions.useExistingFoundation.price
      });
    }
  }

  // 4d. Site access charge (custom charge for difficult access)
  const siteAccess = state.site?.accessCharge || 0;
  if (siteAccess > 0) {
    const reason = state.site?.accessChargeReason || 'Site access';
    result.extras.push({
      label: `Site access charge (${reason})`,
      price: siteAccess
    });
  }

  // 4b. Partition room (corner room)
  const pr = state.partitionRoom;
  if (pr && pr.enabled) {
    const partitionRoomPrice = calculatePartitionRoomPrice(pr);
    result.extras.push({
      label: partitionRoomPrice.label,
      price: partitionRoomPrice.price
    });
  }

  // 4c. Bathroom suite (WC or Bathroom)
  const bathroom = state.bathroom;
  if (bathroom && bathroom.enabled && bathroom.type !== 'none') {
    const bathroomPrices = pricesData.extras.bathroom;
    if (bathroom.type === 'wc' && bathroomPrices.wcSuite) {
      result.extras.push({
        label: bathroomPrices.wcSuite.label,
        price: bathroomPrices.wcSuite.price,
        description: bathroomPrices.wcSuite.description
      });
    } else if (bathroom.type === 'bathroom' && bathroomPrices.bathroomSuite) {
      result.extras.push({
        label: bathroomPrices.bathroomSuite.label,
        price: bathroomPrices.bathroomSuite.price,
        description: bathroomPrices.bathroomSuite.description
      });
    }
    // Note: Utility connections are handled separately (like electrical connection)
    // and are not included in the building price for garden offices
  }

  // 5. Cladding upgrades
  result.claddingUpgrades = calculateCladdingUpgrades(state);

  // 6. Height upgrade
  if (se.heightUpgrade > 0) {
    const upgrade = calculateHeightUpgrade(state, se.heightUpgrade);
    result.heightUpgrade = upgrade.price;
    result.heightUpgradeLabel = upgrade.label;
  }

  // 7. Installation
  result.installation = calculateInstallation(state);

  // 8. Sum up
  const extrasTotal = result.extras.reduce((sum, e) => sum + e.price, 0);
  const claddingTotal = result.claddingUpgrades.reduce((sum, c) => sum + c.price, 0);
  const componentTotal = result.componentUpgrades.reduce((sum, c) => sum + c.price, 0);
  const deductionsTotal = result.deductions.reduce((sum, d) => sum + d.price, 0); // negative values

  // Base price, extras, cladding, height, and component upgrades are all inc VAT
  const buildingTotal = result.basePrice + extrasTotal + claddingTotal + result.heightUpgrade + componentTotal + deductionsTotal;
  result.subtotalExVat = buildingTotal; // prices are already customer-facing (inc VAT basis)

  // Apply discount
  const disc = state.discount || { type: 'none', amount: 0 };
  if (disc.type === 'fixed' && disc.amount > 0) {
    result.discount = disc.amount;
    result.discountLabel = disc.description || `Discount: -£${disc.amount.toLocaleString()}`;
  } else if (disc.type === 'percentage' && disc.amount > 0) {
    result.discount = Math.round(buildingTotal * (disc.amount / 100));
    result.discountLabel = disc.description || `${disc.amount}% Discount`;
  }

  result.totalIncVat = buildingTotal + result.installation - result.discount;

  // Build line items for quote
  result.lineItems = buildLineItems(result, state);

  // 9. Payment schedule
  result.paymentSchedule = calculatePaymentSchedule(result);

  return result;
}

function addExtra(result, extraDef, qty) {
  if (!extraDef) return;
  result.extras.push({
    label: qty > 1 ? `${extraDef.label} x${qty}` : extraDef.label,
    price: extraDef.price * qty
  });
}

// Calculate partition room price based on type and size
// Pricing from quote analysis:
// - Basic storage: £400-£900 (base £500 + size factor)
// - With interior door (storage): £800-£1,200 (base £900 + size factor)
// - Toilet/shower room: £1,150-£2,350 (base £1,500 + size factor)
function calculatePartitionRoomPrice(partitionRoom) {
  const areaSqm = (partitionRoom.width / 1000) * (partitionRoom.depth / 1000);
  const sizeFactor = Math.max(0, (areaSqm - 2) * 150); // £150 per sqm above 2sqm base
  
  let basePrice, label;
  switch (partitionRoom.type) {
    case 'storage':
      basePrice = 650; // Mid-range for basic storage
      label = `Partition room - ${partitionRoom.label || 'Storage'} (${partitionRoom.width}x${partitionRoom.depth}mm)`;
      break;
    case 'wc':
      basePrice = 1500; // Mid-range for toilet room
      label = `Partition room - ${partitionRoom.label || 'WC'} (${partitionRoom.width}x${partitionRoom.depth}mm)`;
      break;
    case 'shower':
      basePrice = 1850; // Higher end for shower room
      label = `Partition room - ${partitionRoom.label || 'Shower'} (${partitionRoom.width}x${partitionRoom.depth}mm)`;
      break;
    default:
      basePrice = 650;
      label = `Partition room (${partitionRoom.width}x${partitionRoom.depth}mm)`;
  }
  
  return {
    price: Math.round((basePrice + sizeFactor) / 5) * 5, // Round to nearest £5
    label
  };
}

function lookupBasePrice(state) {
  const tier = state.tier || 'signature';
  const matrix = pricesData.basePrices[tier];
  if (!matrix) return 20000;

  // Try exact match
  const key = `${state.width}x${state.depth}`;
  if (matrix[key]) return matrix[key];

  // Find nearest match by interpolation
  const widths = pricesData.standardWidths;
  const depths = pricesData.standardDepths[tier];

  // Find bounding widths
  let wLow = widths[0], wHigh = widths[widths.length - 1];
  for (let i = 0; i < widths.length - 1; i++) {
    if (state.width >= widths[i] && state.width <= widths[i + 1]) {
      wLow = widths[i]; wHigh = widths[i + 1]; break;
    }
  }
  if (state.width <= widths[0]) { wLow = widths[0]; wHigh = widths[0]; }
  if (state.width >= widths[widths.length - 1]) { wLow = widths[widths.length - 1]; wHigh = widths[widths.length - 1]; }

  // Find bounding depths
  let dLow = depths[0], dHigh = depths[depths.length - 1];
  for (let i = 0; i < depths.length - 1; i++) {
    if (state.depth >= depths[i] && state.depth <= depths[i + 1]) {
      dLow = depths[i]; dHigh = depths[i + 1]; break;
    }
  }
  if (state.depth <= depths[0]) { dLow = depths[0]; dHigh = depths[0]; }
  if (state.depth >= depths[depths.length - 1]) { dLow = depths[depths.length - 1]; dHigh = depths[depths.length - 1]; }

  // Bilinear interpolation
  const p00 = matrix[`${wLow}x${dLow}`] || 20000;
  const p10 = matrix[`${wHigh}x${dLow}`] || p00;
  const p01 = matrix[`${wLow}x${dHigh}`] || p00;
  const p11 = matrix[`${wHigh}x${dHigh}`] || p00;

  const wRange = wHigh - wLow || 1;
  const dRange = dHigh - dLow || 1;
  const wt = (state.width - wLow) / wRange;
  const dt = (state.depth - dLow) / dRange;

  const interpolated = p00 * (1 - wt) * (1 - dt) +
    p10 * wt * (1 - dt) +
    p01 * (1 - wt) * dt +
    p11 * wt * dt;

  return Math.round(interpolated / 5) * 5; // Round to nearest £5
}

function calculateCladdingUpgrades(state) {
  const upgrades = [];
  const cladding = state.cladding || {};
  const heightM = state.height / 1000;

  // Default cladding per tier
  const defaults = state.tier === 'classic'
    ? { front: 'composite-latte', left: 'anthracite-steel', right: 'anthracite-steel', rear: 'anthracite-steel' }
    : { front: 'western-red-cedar', left: 'anthracite-steel', right: 'anthracite-steel', rear: 'anthracite-steel' };

  const sides = {
    left: { widthM: state.depth / 1000, label: 'Left side' },
    right: { widthM: state.depth / 1000, label: 'Right side' },
    rear: { widthM: state.width / 1000, label: 'Rear' }
  };

  for (const [side, info] of Object.entries(sides)) {
    const current = cladding[side];
    const def = defaults[side];
    if (current && current !== def) {
      const upgradeType = pricesData.claddingUpgrade[current.replace('western-red-', '')
        .replace('-steel', '')
        .replace('anthracite', '')
        .replace('grey', '')];

      // Check for timber/composite upgrades on sides
      if (current === 'western-red-cedar' || current === 'thermowood' || current === 'larch') {
        const sqm = info.widthM * heightM;
        const rate = pricesData.claddingUpgrade.cedar?.perSqm || 125;
        upgrades.push({
          label: `Premium timber cladding upgrade - ${info.label}`,
          price: Math.round(sqm * rate)
        });
      } else if (current.startsWith('composite-')) {
        const sqm = info.widthM * heightM;
        const rate = pricesData.claddingUpgrade.composite?.perSqm || 125;
        upgrades.push({
          label: `Composite cladding upgrade - ${info.label}`,
          price: Math.round(sqm * rate)
        });
      }
    }
  }

  return upgrades;
}

function calculateHeightUpgrade(state, additionalMm) {
  const areaSqm = (state.width / 1000) * (state.depth / 1000);
  const thresholds = pricesData.heightUpgradeSizeThresholds;
  let sizeKey = 'large';
  if (areaSqm <= thresholds.small) sizeKey = 'small';
  else if (areaSqm <= thresholds.medium) sizeKey = 'medium';

  const upgradeKey = String(additionalMm);
  const prices = pricesData.heightUpgrade[upgradeKey];
  if (!prices) return { price: 0, label: '' };

  return {
    price: prices[sizeKey] || 0,
    label: `Height upgrade +${additionalMm}mm (to ${(state.height + additionalMm) / 1000}m)`
  };
}

function calculateInstallation(state) {
  const areaSqm = (state.width / 1000) * (state.depth / 1000);
  const ranges = pricesData.installation.ranges;

  for (const range of ranges) {
    if (areaSqm <= range.maxArea) return range.price;
  }
  return ranges[ranges.length - 1].price;
}

function calculatePaymentSchedule(result) {
  const deposit = pricesData.holdingDeposit;
  const buildingAmount = result.totalIncVat - result.installation;
  const halfBuilding = Math.round(buildingAmount / 2);
  const installHalf = Math.round(result.installation / 2);

  return [
    { stage: 1, label: 'Holding deposit reserves your delivery & install date (deductible from 1st payment)', amount: deposit },
    { stage: 2, label: '50% of Garden Office Building due 4 weeks before delivery (less holding deposit)', amount: halfBuilding - deposit },
    { stage: 3, label: '50% of Garden Office Building due on delivery of all materials (approx 1 week into project)', amount: buildingAmount - halfBuilding },
    { stage: 4, label: '50% of Groundworks & Installation due halfway through project*', amount: installHalf },
    { stage: 5, label: '50% of Groundworks & Installation due on completion*', amount: result.installation - installHalf }
  ];
}

function buildLineItems(result, state) {
  const items = [];

  items.push({ label: result.basePriceLabel, amount: result.basePrice, section: 'building' });

  for (const cu of result.componentUpgrades) {
    items.push({ label: cu.label, amount: cu.price, section: 'doors' });
  }

  for (const cl of result.claddingUpgrades) {
    items.push({ label: cl.label, amount: cl.price, section: 'cladding' });
  }

  if (result.heightUpgrade > 0) {
    items.push({ label: result.heightUpgradeLabel, amount: result.heightUpgrade, section: 'structural' });
  }

  for (const ex of result.extras) {
    items.push({ label: ex.label, amount: ex.price, section: 'extras' });
  }

  // Deductions (negative values)
  for (const ded of result.deductions) {
    items.push({ label: ded.label, amount: ded.price, section: 'deductions' });
  }

  items.push({ label: 'Installation & Groundworks', amount: result.installation, section: 'installation' });

  if (result.discount > 0) {
    items.push({ label: result.discountLabel, amount: -result.discount, section: 'discount' });
  }

  return items;
}

// Format currency
export function formatPrice(amount) {
  if (amount < 0) return `-£${Math.abs(amount).toLocaleString('en-GB')}`;
  return `£${amount.toLocaleString('en-GB')}`;
}
