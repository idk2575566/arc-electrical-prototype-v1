const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const pageErrors = [];
  const uncaughtConsole = [];
  let capturedInsertBody = null;

  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    const text = msg.text();
    if (/uncaught|unhandled/i.test(text)) uncaughtConsole.push(`${msg.type()}: ${text}`);
  });
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/rest/v1/visit_logs')) {
      try {
        capturedInsertBody = JSON.parse(req.postData() || '{}');
      } catch {
        capturedInsertBody = req.postData();
      }
    }
  });

  await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });

  // 1) Missing required fields should block submit
  await page.click('button:has-text("Save Visit Record")');
  await page.waitForSelector('#formFeedback:not(.hidden)');

  const feedbackMissing = await page.locator('#formFeedback').innerText();
  assert.match(feedbackMissing, /Please complete highlighted required fields/i);

  const invalidCount = await page.locator('.field-invalid').count();
  assert.ok(invalidCount >= 3, 'Expected required fields to show inline errors');

  // 2) Fill required fields only; advanced remains empty
  await page.selectOption('select[name="siteId"]', 'S-101');
  await page.fill('input[name="visitDate"]', '2026-03-09');
  await page.fill('input[name="engineer"]', 'K. Jones');

  const validTicks = await page.locator('.field-valid-icon').count();
  assert.ok(validTicks >= 3, 'Expected validation ticks on required fields');

  await page.click('button:has-text("Save Visit Record")');

  await page.waitForFunction(() => {
    const text = document.querySelector('#lastActionMessage')?.textContent || '';
    return /Visit saved|Save failed|DB policy blocked write|offline|offline/i.test(text);
  }, { timeout: 10000 });

  const lastAction = await page.locator('#lastActionMessage').innerText();
  assert.match(lastAction, /Visit saved|Save failed|DB policy blocked write|offline/i, 'No visible submit outcome message found');

  if (capturedInsertBody && typeof capturedInsertBody === 'object') {
    assert.equal(capturedInsertBody.site_name?.length > 0, true, 'site_name should be populated');
    assert.equal(capturedInsertBody.engineer_name, 'K. Jones', 'engineer_name should be captured');
  }

  assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join(' | ')}`);
  assert.equal(uncaughtConsole.length, 0, `Unexpected uncaught console errors: ${uncaughtConsole.join(' | ')}`);

  console.log('VERIFY_RESULT');
  console.log(JSON.stringify({ feedbackMissing, lastAction, pageErrors, uncaughtConsole, capturedInsertBody }, null, 2));

  await browser.close();
})();
