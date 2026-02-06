const { test, expect } = require('@playwright/test');
const { runAll } = require('../testingRandomUser');

test('randomuser - runAll checks', async ({ page }) => {
  const url = process.env.RANDOMUSER_URL || 'http://localhost:3000';
  const results = await runAll(page, { url });
  console.log(JSON.stringify(results, null, 2));
  expect(results.overall.ok).toBeTruthy();
});
