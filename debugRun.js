const { chromium } = require('playwright');
const { runAll } = require('./testingRandomUser');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const url = process.env.RANDOMUSER_URL || 'http://localhost:3000';
  try {
    const results = await runAll(page, { url });
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('Error running checks:', err);
  } finally {
    await browser.close();
  }
})();
