import { test, expect } from './fixtures/test';

/**
 * SEO — verifies the static metadata routes (Phase 6 `robots.ts` and
 * `sitemap.ts`) and the educational guide render server-side. ECharts tabs
 * and the visualizer itself are client components and are covered in
 * smoke.spec.ts.
 */
test.describe('SEO & static routes', () => {
  test('/robots.txt is served and allows crawling', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/User-agent:\s*\*/i);
    expect(body).toMatch(/Allow:\s*\//i);
    expect(body).toMatch(/Sitemap:\s*https?:\/\//i);
  });

  test('/sitemap.xml is served and references the two static pages', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();
    // The body is an XML <urlset>; we only check the URL fragments and the
    // lastmod-less shape Next emits by default.
    expect(body).toMatch(/<urlset/);
    expect(body).toContain('http://localhost:3000/');
    expect(body).toContain('http://localhost:3000/how-it-works');
  });

  test('/how-it-works returns 200 and renders the educational guide', async ({ page }) => {
    const res = await page.goto('/how-it-works');
    expect(res?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: /how hill climbing solves the n-queens puzzle/i }),
    ).toBeVisible();
    // The page has 5 numbered sections; the "Educational Guide" badge sits
    // at the top of the hero.
    await expect(page.getByText('Educational Guide')).toBeVisible();
  });

  test('home page returns 200 and ships the default title', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/N-Queens/);
  });
});
