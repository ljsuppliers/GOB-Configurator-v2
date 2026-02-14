/**
 * Test script to verify Annexe quote generation
 * Run: node test-annexe-quote.js
 */

const testAnnexeQuote = {
  // Customer
  customerName: 'TEST - Simon Toomey (Annexe)',
  customerNumber: 'GOB-2024-999',
  date: '2024-02-13',
  address: '123 Test Street, London, SE1 1AA',
  
  // Building - ANNEXE
  width: 7250,
  depth: 5100,
  height: 3000,
  tier: 'signature',
  buildingType: '1-Bedroom Garden Annexe Building', // Contains "Annexe" - triggers special handling
  
  // Pricing
  basePrice: 62495,
  
  // Cladding
  frontCladding: 'composite slatted cladding (coffee)',
  rightCladding: 'anthracite grey steel',
  leftCladding: 'anthracite grey steel',
  rearCladding: 'anthracite grey steel',
  rightCladdingPrice: 0,
  leftCladdingPrice: 0,
  
  // Corners (Signature)
  cornerLeft: 'Open',
  cornerRight: 'Closed',
  
  // Foundation
  foundationType: 'ground-screw',
  foundationPrice: 1200,
  
  // Components
  components: [],
  
  // Extras & Deductions
  extras: [],
  deductions: [],
  
  // Installation (will be included in 25% x 4 payment schedule)
  installationPrice: 8000,
  
  // Totals
  subtotal: 71695,
  discount: 0,
  discountLabel: '',
  total: 71695,
  
  // Notes
  quoteNotes: 'TEST ANNEXE QUOTE - Should show:\n1. 25% x 4 payment schedule\n2. Utility connections: Included'
};

const testClassicQuote = {
  // Customer
  customerName: 'TEST - Classic Quote',
  customerNumber: 'GOB-2024-998',
  date: '2024-02-13',
  address: '456 Test Avenue, London, SW1 1BB',
  
  // Building - CLASSIC
  width: 5000,
  depth: 3600,
  height: 2500,
  tier: 'classic', // Not signature
  buildingType: 'Garden Office Building',
  
  // Pricing
  basePrice: 28000,
  
  // Cladding
  frontCladding: 'anthracite grey steel',
  rightCladding: 'anthracite grey steel',
  leftCladding: 'anthracite grey steel',
  rearCladding: 'anthracite grey steel',
  rightCladdingPrice: 0,
  leftCladdingPrice: 0,
  
  // Corners (N/A for Classic)
  cornerLeft: 'Open',
  cornerRight: 'Open',
  
  // Foundation
  foundationType: 'ground-screw',
  foundationPrice: 1200,
  
  // Components
  components: [],
  
  // Extras & Deductions
  extras: [],
  deductions: [],
  
  // Installation
  installationPrice: 6000,
  
  // Totals
  subtotal: 35200,
  discount: 0,
  discountLabel: '',
  total: 35200,
  
  // Notes
  quoteNotes: 'TEST CLASSIC QUOTE - Should show:\n1. NO canopy/decking lines\n2. NO corner design lines\n3. Standard 50/50 payment schedule'
};

async function testQuote(quoteData, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${label}`);
  console.log('='.repeat(60));
  
  try {
    const response = await fetch('http://localhost:3001/api/create-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quoteData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✓ Quote created successfully!');
      console.log(`  Title: ${result.title}`);
      console.log(`  URL: ${result.url}`);
    } else {
      console.error('✗ Error:', result.error);
    }
  } catch (err) {
    console.error('✗ Request failed:', err.message);
    console.error('  Make sure sheets-server is running (node sheets-server.js)');
  }
}

async function runTests() {
  console.log('GOB Configurator - Template Flexibility Tests');
  console.log('Testing Classic vs Signature & Annexe templates\n');
  
  // Test 1: Annexe quote
  await testQuote(testAnnexeQuote, 'Annexe Quote (25% x 4 payments, utilities included)');
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Classic quote
  await testQuote(testClassicQuote, 'Classic Quote (no canopy/decking/corners)');
  
  console.log('\n' + '='.repeat(60));
  console.log('Tests complete! Check the generated quotes in Google Drive.');
  console.log('='.repeat(60) + '\n');
}

runTests();
