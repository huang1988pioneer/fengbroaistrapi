import { chromium, expect } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('fengbro:last-module', 'subscription');
      localStorage.setItem('fengbro-strapi-connection', JSON.stringify({ url: 'https://cms.example', token: 'test' }));
    });
    await page.route('https://cms.example/**', route => route.fulfill({ json: {
      data: route.request().url().includes('/subscriptions') ? [{ documentId: 'layout-test', name: 'Layout fixture', price: 100, currency: 'TWD', nextdate: '2026-10-01', continue: true }] : [],
      meta: { pagination: { page: 1, pageCount: 1, total: 1 } },
    } }));
    await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:4175');
    await page.getByRole('button', { name: '新增訂閱', exact: true }).click();
    const form = page.locator('[data-layout="form-above-list"]').getByText('快速新增', { exact: true });
    await expect(form).toBeVisible();
    const save = page.getByRole('button', { name: '建立訂閱', exact: true });
    const row = page.getByText('Layout fixture', { exact: true }).filter({ visible: true });
    await expect(row).toBeVisible();
    const formBottom = await save.boundingBox();
    const rowBounds = await row.boundingBox();
    expect(rowBounds.y).toBeGreaterThan(formBottom.y + formBottom.height);
    expect(errors).toEqual([]);
    console.log(`${width}px: form above list, no runtime errors`);
    await page.close();
  }
} finally {
  await browser.close();
}
