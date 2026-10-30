// Playwright test runner config: the lesson is a static page, opened straight from disk.
// Browsers live on D: (PLAYWRIGHT_BROWSERS_PATH=D:\ms-playwright) because C: is nearly full.
const { defineConfig, devices } = require('@playwright/test');

process.env.PLAYWRIGHT_BROWSERS_PATH ||= 'D:\\ms-playwright';

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './.tmp/test-results',
  reporter: [['list'], ['html', { outputFolder: './.tmp/playwright-report', open: 'never' }]],
  timeout: 60_000,
  use: {
    viewport: { width: 1600, height: 900 },
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1600, height: 900 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1600, height: 900 } } },
    { name: 'phone-landscape', use: { ...devices['Pixel 7 landscape'] } },
  ],
});
