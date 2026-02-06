/*
  taiko-login.txt

  Playwright test (JavaScript) template for testing the login page at
  https://taiko.mantishub.io/login_page.php

  Instructions:
  - Save this file as `tests/taiko-login.spec.js` (or copy its contents there).
  - Provide valid credentials via environment variables before running:
      $env:TAIKO_USER='your-username'
      $env:TAIKO_PASS='your-password'
  - Run:
      npx playwright test tests/taiko-login.spec.js --headed

  The script tries multiple common selectors for username/password/login button
  so it should work even if the form uses slightly different attribute names.

*/

const { test, expect } = require('@playwright/test');

// helper: try a list of selectors and return the first that exists on the page
async function firstSelectorExists(page, selectors) {
  for (const s of selectors) {
    const el = await page.$(s);
    if (el) return s;
  }
  return null;
}

test.describe('Taiko login page tests', () => {
  const url = 'https://taiko.mantishub.io/login_page.php';

  test('login success (use env TA IKO_USER/TAIKO_PASS)', async ({ page }) => {
    await page.goto(url);

    // possible selectors to try (common patterns)
    const usernameSelectors = [
      'input[name="username"]',
      'input#username',
      'input[name="login"]',
      'input[name="username_field"]',
      'input[type="text"]'
    ];
    const passwordSelectors = [
      'input[name="password"]',
      'input#password',
      'input[name="pass"]',
      'input[type="password"]'
    ];
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      'input[value="Login"]'
    ];

    const userSel = await firstSelectorExists(page, usernameSelectors);
    const passSel = await firstSelectorExists(page, passwordSelectors);
    const btnSel = await firstSelectorExists(page, submitSelectors);

    if (!userSel || !passSel || !btnSel) {
      // fail early with helpful message
      throw new Error(`Could not find form controls. Found: user=${userSel} pass=${passSel} btn=${btnSel}`);
    }

    // read credentials from environment
    const username = process.env.TAIKO_USER || process.env.TAIKO_USERNAME || '';
    const password = process.env.TAIKO_PASS || process.env.TAIKO_PASSWORD || '';
    if (!username || !password) {
      console.warn('TAIKO_USER/TAIKO_PASS not provided — this test will try to log in with empty credentials.');
    }

    await page.fill(userSel, username);
    await page.fill(passSel, password);
    await page.click(btnSel);

    // wait for navigation or an element that indicates login success
    // common success indicators: logout link, user menu, dashboard heading
    const successIndicators = [
      'a:has-text("Logout")',
      'a:has-text("Sign out")',
      'text=My Account',
      'text=Dashboard',
      'nav >> text=Projects'
    ];

    // try to wait for one of the success indicators
    let ok = false;
    for (const si of successIndicators) {
      try {
        await page.waitForSelector(si, { timeout: 3000 });
        ok = true;
        break;
      } catch (e) {
        // ignore timeout and try next
      }
    }

    expect(ok).toBeTruthy();
  });

  test('login negative: invalid credentials shows error', async ({ page }) => {
    await page.goto(url);
    const usernameSelectors = ['input[name="username"]', 'input#username', 'input[type="text"]'];
    const passwordSelectors = ['input[name="password"]', 'input#password', 'input[type="password"]'];
    const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Login")'];

    const userSel = await firstSelectorExists(page, usernameSelectors);
    const passSel = await firstSelectorExists(page, passwordSelectors);
    const btnSel = await firstSelectorExists(page, submitSelectors);

    if (!userSel || !passSel || !btnSel) {
      throw new Error('Could not find login form controls for negative test');
    }

    // use a deliberate bad password
    await page.fill(userSel, 'invalid_user_xyz');
    await page.fill(passSel, 'wrong_password_123');
    await page.click(btnSel);

    // expect an error message or the login form still visible
    const errorSelectors = ['.error', '.warning', 'text=Invalid', 'text=failed', 'text=incorrect'];
    let foundError = false;
    for (const es of errorSelectors) {
      try {
        await page.waitForSelector(es, { timeout: 3000 });
        foundError = true;
        break;
      } catch (e) {}
    }

    // if no explicit error, at least the login form should remain visible
    const formStillThere = await firstSelectorExists(page, usernameSelectors) !== null;
    expect(foundError || formStillThere).toBeTruthy();
  });
});

/*
  Notes:
  - This template tries multiple selectors so it's robust if the form uses different names.
  - For a real CI test, set credentials in environment variables (TAIKO_USER / TAIKO_PASS).
  - If you want, I can also create this as `tests/taiko-login.spec.js` and add an npm script.
*/
