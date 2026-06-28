import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

const ignoredConsoleFragments = [
  'Google Maps JavaScript API error',
  'Google Maps authentication failed',
  'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT',
  'Failed to load resource: net::ERR_NETWORK_ACCESS_DENIED'
];

const publicRoutes = [
  { path: '/', text: 'HungryHub' },
  { path: '/restaurants', text: 'Explore Restaurants' },
  { path: '/login', text: 'Welcome Back' },
  { path: '/signup', text: 'Create Account' },
  { path: '/about', text: 'HungryHub' },
  { path: '/contact', text: 'Contact' }
];

function installPageGuards(page) {
  const issues = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (ignoredConsoleFragments.some((fragment) => text.includes(fragment))) return;
    issues.push(`console error: ${text}`);
  });

  page.on('pageerror', (error) => {
    issues.push(`page error: ${error.message}`);
  });

  page.on('response', (response) => {
    const url = response.url();
    if (!url.startsWith(BASE_URL) && !url.startsWith('http://localhost:5000')) return;
    if (response.status() >= 400) {
      issues.push(`network ${response.status()}: ${url}`);
    }
  });

  return issues;
}

test.describe('HungryHub browser smoke QA', () => {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 950 },
    { name: 'mobile', width: 390, height: 844 }
  ]) {
    test(`public routes render without runtime errors on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const issues = installPageGuards(page);

      for (const route of publicRoutes) {
        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toContainText(route.text, { timeout: 15000 });
        await expect(page.locator('#root')).not.toHaveJSProperty('innerHTML', '');
      }

      expect(issues).toEqual([]);
    });
  }

  test('customer can sign in and reach restaurants page', async ({ page }) => {
    const issues = installPageGuards(page);

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email Address').fill('customer@hungryhub.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/restaurants/, { timeout: 15000 });
    await expect(page.getByText('Explore Restaurants')).toBeVisible();
    expect(issues).toEqual([]);
  });
});
