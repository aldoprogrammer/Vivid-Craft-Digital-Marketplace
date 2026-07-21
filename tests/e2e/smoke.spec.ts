import { test, expect } from '@playwright/test';

const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';

test.describe('VividCraft smoke', () => {
  test('API gateway health is ready', async ({ request }) => {
    const res = await request.get(`${API_URL}/health/ready`);
    expect(res.ok()).toBeTruthy();
  });

  test('marketplace page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Marketplace' })).toBeVisible();
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/sign in to your vividcraft account/i)).toBeVisible();
  });

  test('orders page redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login/);
  });

  test('public products API returns JSON array', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/marketplace/products`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });
});
