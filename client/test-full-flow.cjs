/**
 * Full end-to-end test of CBA application flow.
 * Tests: Event creation -> Categories -> Teams -> Tables -> Judge scoring
 */
const { chromium } = require('playwright');

const API_BASE = 'http://localhost:3000';

async function apiCall(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return json.data || json;
}

async function testFullFlow() {
  console.log('=== CBA Full Flow Test ===\n');

  // Step 1: Create admin user and login
  console.log('1. Setting up admin user...');
  try {
    await apiCall('/users', 'POST', {
      username: 'testadmin',
      password: 'Admin123!',
      role: 'admin',
    });
  } catch (e) {
    // User may already exist
  }

  const loginRes = await apiCall('/auth/login', 'POST', {
    username: 'testadmin',
    password: 'Admin123!',
  });
  const token = loginRes.accessToken;
  console.log('   Admin login: ' + (token ? 'Success' : 'Failed'));

  if (!token) {
    console.log('Failed to login. Aborting.');
    return;
  }

  // Step 2: Create an event
  console.log('\n2. Creating test event...');
  const event = await apiCall('/events', 'POST', {
    name: 'Test BBQ Competition',
    date: '2026-06-15',
    location: 'Test City',
    aggregationMethod: 'trimmed_mean',
    scoringScaleMin: 1,
    scoringScaleMax: 9,
    scoringScaleStep: 1,
  }, token);
  console.log('   Event created: ' + event.name + ' (ID: ' + event.id + ')');

  // Step 3: Create categories (nested under event)
  console.log('\n3. Creating categories...');
  const brisket = await apiCall(`/events/${event.id}/categories`, 'POST', {
    name: 'Brisket',
    displayOrder: 1,
    weight: 1,
  }, token);
  console.log('   Category: Brisket (ID: ' + brisket.id + ')');

  const ribs = await apiCall(`/events/${event.id}/categories`, 'POST', {
    name: 'Ribs',
    displayOrder: 2,
    weight: 1,
  }, token);
  console.log('   Category: Ribs (ID: ' + ribs.id + ')');

  // Step 4: Create criteria for Brisket (nested under event)
  console.log('\n4. Creating criteria...');
  const appearance = await apiCall(`/events/${event.id}/criteria`, 'POST', {
    categoryId: brisket.id,
    name: 'Appearance',
    phase: 'appearance',
    weight: 1,
    displayOrder: 1,
  }, token);
  console.log('   Criterion: Appearance (ID: ' + appearance.id + ')');

  const taste = await apiCall(`/events/${event.id}/criteria`, 'POST', {
    categoryId: brisket.id,
    name: 'Taste',
    phase: 'taste_texture',
    weight: 2,
    displayOrder: 2,
  }, token);
  console.log('   Criterion: Taste (ID: ' + taste.id + ')');

  const tenderness = await apiCall(`/events/${event.id}/criteria`, 'POST', {
    categoryId: brisket.id,
    name: 'Tenderness',
    phase: 'taste_texture',
    weight: 1,
    displayOrder: 3,
  }, token);
  console.log('   Criterion: Tenderness (ID: ' + tenderness.id + ')');

  // Step 5: Create teams (nested under event)
  console.log('\n5. Creating teams...');
  const team1 = await apiCall(`/events/${event.id}/teams`, 'POST', {
    name: 'Smokin\' Hot',
    teamNumber: 101,
  }, token);
  console.log('   Team: #101 Smokin\' Hot (ID: ' + team1.id + ')');

  const team2 = await apiCall(`/events/${event.id}/teams`, 'POST', {
    name: 'BBQ Masters',
    teamNumber: 102,
  }, token);
  console.log('   Team: #102 BBQ Masters (ID: ' + team2.id + ')');

  // Step 6: Create table with seats (nested under event)
  console.log('\n6. Creating judge table...');
  const table = await apiCall(`/events/${event.id}/tables`, 'POST', {
    tableNumber: 1,
    name: 'Main Table',
  }, token);
  console.log('   Table: #1 Main Table (ID: ' + table.id + ')');

  // Create seats (nested under table)
  const seat1 = await apiCall(`/tables/${table.id}/seats`, 'POST', {
    seatNumber: 1,
  }, token);
  console.log('   Seat 1 created (ID: ' + seat1.id + ')');

  const seat2 = await apiCall(`/tables/${table.id}/seats`, 'POST', {
    seatNumber: 2,
  }, token);
  console.log('   Seat 2 created (ID: ' + seat2.id + ')');

  // Step 7: Create submissions (nested under category)
  console.log('\n7. Creating submissions...');
  const submission1 = await apiCall(`/categories/${brisket.id}/submissions`, 'POST', {
    teamId: team1.id,
  }, token);
  console.log('   Submission for Team 101 in Brisket (ID: ' + submission1.id + ')');

  const submission2 = await apiCall(`/categories/${brisket.id}/submissions`, 'POST', {
    teamId: team2.id,
  }, token);
  console.log('   Submission for Team 102 in Brisket (ID: ' + submission2.id + ')');

  // Step 8: Launch browser for judge flow
  console.log('\n8. Testing Judge UI with Playwright...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Go to scan page
  await page.goto('http://localhost:5173/scan');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/cba-flow-1-scan.png', fullPage: true });
  console.log('   Screenshot: Scan page');

  // Enter seat code (we'll simulate the manual entry)
  // The scan page should have an input for table code
  const codeInput = await page.$('input[type="text"]');
  if (codeInput) {
    await codeInput.fill(seat1.id);
    await page.screenshot({ path: '/tmp/cba-flow-2-code-entered.png', fullPage: true });
    console.log('   Screenshot: Code entered');

    // Click continue
    const continueBtn = await page.$('button');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/cba-flow-3-authenticated.png', fullPage: true });
      console.log('   Screenshot: Judge authenticated');
    }
  }

  // Check admin pages with auth
  console.log('\n9. Testing Admin UI...');

  // Set up admin auth in browser
  await page.evaluate((tkn) => {
    localStorage.setItem('auth_token', tkn);
    localStorage.setItem('cba-auth', JSON.stringify({
      state: { token: tkn, role: 'admin', judgeContext: null },
      version: 0
    }));
  }, token);

  // Event detail page
  await page.goto(`http://localhost:5173/admin/events/${event.id}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/cba-flow-4-event-detail.png', fullPage: true });
  console.log('   Screenshot: Event detail');

  // Submissions page
  await page.goto(`http://localhost:5173/admin/events/${event.id}/submissions`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/cba-flow-5-submissions.png', fullPage: true });
  console.log('   Screenshot: Submissions page');

  // Tables page with QR codes
  await page.goto(`http://localhost:5173/admin/events/${event.id}/tables`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/cba-flow-6-tables-qr.png', fullPage: true });
  console.log('   Screenshot: Tables with QR');

  // Results page
  await page.goto('http://localhost:5173/admin/results');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/cba-flow-7-results.png', fullPage: true });
  console.log('   Screenshot: Results page');

  await browser.close();

  // Clean up (optional - delete the test event)
  console.log('\n10. Cleanup...');
  // await apiCall(`/events/${event.id}`, 'DELETE', null, token);
  console.log('   (Skipping cleanup to preserve test data)');

  console.log('\n=== Test Complete ===');
  console.log('Screenshots saved to /tmp/cba-flow-*.png');
}

testFullFlow().catch(console.error);
