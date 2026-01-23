const { chromium } = require('playwright');

async function testUI() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Testing CBA Frontend UI...\n');

  // Test 1: Home page
  console.log('1. Loading Home page...');
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/cba-1-home.png', fullPage: true });
  const title = await page.title();
  console.log('   Title: ' + title);

  // Test 2: Admin login page
  console.log('2. Loading Admin Login page...');
  await page.goto('http://localhost:5173/admin/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/cba-2-admin-login.png', fullPage: true });

  // Test 3: Try to access admin events (should redirect to login)
  console.log('3. Testing Admin Events page (should require auth)...');
  await page.goto('http://localhost:5173/admin/events');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/cba-3-admin-events.png', fullPage: true });
  const eventsUrl = page.url();
  console.log('   Current URL: ' + eventsUrl);

  // Test 4: Create an admin user and login via API
  console.log('4. Creating admin user via API...');
  const createUserRes = await page.evaluate(async () => {
    const res = await fetch('http://localhost:3000/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'Admin123!',
        role: 'admin'
      })
    });
    return { status: res.status, ok: res.ok };
  });
  console.log('   User creation: ' + (createUserRes.ok ? 'Success' : 'Failed (may already exist)'));

  // Test 5: Login
  console.log('5. Logging in...');
  const loginRes = await page.evaluate(async () => {
    const res = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'Admin123!'
      })
    });
    const envelope = await res.json();
    // API wraps responses in { success, data } envelope
    const token = envelope.data?.accessToken || envelope.accessToken;
    return { status: res.status, token };
  });
  console.log('   Login: ' + (loginRes.token ? 'Success' : 'Failed'));

  if (loginRes.token) {
    // Store the token in localStorage for API calls
    // Also set up the zustand auth store state
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
      // Set zustand persist state for cba-auth store
      localStorage.setItem('cba-auth', JSON.stringify({
        state: {
          token: token,
          role: 'admin',
          judgeContext: null
        },
        version: 0
      }));
    }, loginRes.token);

    // Reload page to pick up new auth state
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Test 6: Access admin events page after login
    console.log('6. Loading Admin Events page (authenticated)...');
    await page.goto('http://localhost:5173/admin/events');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/cba-4-admin-events-auth.png', fullPage: true });

    // Test 7: Create a new event via the form
    console.log('7. Navigating to Create Event page...');
    await page.goto('http://localhost:5173/admin/events/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/cba-5-create-event.png', fullPage: true });

    // Fill out the form
    console.log('8. Filling out Create Event form...');
    await page.fill('#name', 'BBQ Championship 2026');
    await page.fill('#date', '2026-03-15');
    await page.fill('#location', 'Austin, TX');
    await page.screenshot({ path: '/tmp/cba-6-create-event-filled.png', fullPage: true });

    // Submit the form
    console.log('9. Submitting Create Event form...');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/cba-7-event-detail.png', fullPage: true });
    const detailUrl = page.url();
    console.log('   Redirected to: ' + detailUrl);

    // Test 10: Go back to events list
    console.log('10. Checking Events list...');
    await page.goto('http://localhost:5173/admin/events');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/cba-8-events-list.png', fullPage: true });
  }

  // Test 11: Check Scan QR page
  console.log('11. Loading Scan QR page...');
  await page.goto('http://localhost:5173/scan');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/cba-9-scan-qr.png', fullPage: true });

  await browser.close();
  console.log('\nScreenshots saved to /tmp/cba-*.png');
  console.log('UI testing complete!');
}

testUI().catch(console.error);
