// Smoke test: the lesson starts, a screen builds and narrates, and navigation works.
const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const page0 = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const stateOf = page => page.locator('#stage').getAttribute('data-state');

test('Begin starts screen 1 and its narration', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(page0);
  await page.locator('#bStart').click();
  await expect(page.locator('#pNum')).toHaveText('01');
  await expect(page.locator('#heading .w.on').first()).toBeVisible({ timeout: 10_000 });
  expect(errors).toEqual([]);
});

test('screen 4 completes and NEXT / BACK move between screens', async ({ page }) => {
  await page.goto(`${page0}?s=4&speed=3&vo=0`);
  await expect.poll(() => stateOf(page), { timeout: 20_000 }).toBe('COMPLETE');
  await page.locator('#bNext').click();
  await expect(page.locator('#pNum')).toHaveText('05');
  await page.locator('#bBack').click();
  await expect(page.locator('#pNum')).toHaveText('04');
});

test('voice clip format is playable in this browser', async ({ page }) => {
  await page.goto(`${page0}?s=1`);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && !!Engine.ctx);
  const format = await page.evaluate(() => Voice.format);
  // ogg where Ogg Opus plays, caf (Safari) otherwise; null would mean silent narration
  expect(['ogg', 'caf']).toContain(format);
});
