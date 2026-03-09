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

  await page.selectOption('select[name="siteId"]', 'S-101');
  await page.fill('input[name="visitDate"]', '2026-03-09');
  await page.fill('input[name="engineer"]', 'K. Jones');
  await page.selectOption('select[name="rcdResult"]', 'Pass');
  await page.click('summary');
  await page.selectOption('select[name="ptw"]', 'Yes');
  await page.fill('input[name="insulation"]', '2.8');
  await page.selectOption('select[name="remedial"]', 'No');
  await page.fill('input[name="nextDue"]', '2026-09-09');
  await page.fill('textarea[name="notes"]', 'Playwright verification run');

  await page.click('button:has-text("Save Visit Record")');

  await page.waitForFunction(() => {
    const text = document.querySelector('#lastActionMessage')?.textContent || '';
    return /Saved visit|Save failed|DB policy blocked write|Offline|Validation failed/i.test(text);
  }, { timeout: 10000 });

  const lastAction = await page.locator('#lastActionMessage').innerText();
  const feedback = await page.locator('#formFeedback').isVisible() ? await page.locator('#formFeedback').innerText() : '';

  assert.ok(/Saved visit|Save failed|DB policy blocked write|Offline|Validation failed/i.test(lastAction), 'No visible submit outcome message found');

  if (capturedInsertBody && typeof capturedInsertBody === 'object') {
    assert.equal(typeof capturedInsertBody.permit_to_work, 'boolean', 'permit_to_work must be boolean');
    assert.equal(typeof capturedInsertBody.remedial_required, 'boolean', 'remedial_required must be boolean');
  }

  assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join(' | ')}`);
  assert.equal(uncaughtConsole.length, 0, `Unexpected uncaught console errors: ${uncaughtConsole.join(' | ')}`);

  console.log('VERIFY_RESULT');
  console.log(JSON.stringify({ lastAction, feedback, pageErrors, uncaughtConsole, capturedInsertBody }, null, 2));

  await browser.close();
})();