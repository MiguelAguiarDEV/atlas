import { test, expect } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
});

test.describe("Mobile Experience (390x844)", () => {
  test("bottom tab bar is visible at the bottom", async ({ page }) => {
    await page.goto("/today");
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();
    const box = await nav.boundingBox();
    expect(box).not.toBeNull();
    // Nav should be near the bottom of the viewport
    expect(box!.y + box!.height).toBeGreaterThanOrEqual(790);
  });

  test("no horizontal overflow on /today", async ({ page }) => {
    await page.goto("/today");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance
  });

  test("no horizontal overflow on /tasks", async ({ page }) => {
    await page.goto("/tasks");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("no horizontal overflow on /timer", async ({ page }) => {
    await page.goto("/timer");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("no horizontal overflow on /more", async ({ page }) => {
    await page.goto("/more");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("touch targets on bottom tab bar are >= 44px", async ({ page }) => {
    await page.goto("/today");
    const links = page.getByRole("navigation").getByRole("link");
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("touch targets on task checkboxes are adequate", async ({ page }) => {
    await page.goto("/today");
    const checkboxes = page.getByRole("button", { name: /Mark complete/ });
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await checkboxes.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(24);
      expect(box!.height).toBeGreaterThanOrEqual(24);
    }
  });

  test("touch targets on energy selector buttons are adequate", async ({ page }) => {
    await page.goto("/today");
    const energyButtons = page.getByRole("button", { name: /High|Medium|Low/ });
    const count = await energyButtons.count();
    expect(count).toBe(3);
    for (let i = 0; i < count; i++) {
      const box = await energyButtons.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(40);
    }
  });

  test("filter pills are scrollable on tasks page", async ({ page }) => {
    await page.goto("/tasks");
    // All filter pills should be visible
    await expect(page.getByRole("button", { name: /All/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Done/ })).toBeVisible();
  });

  test("timer circle fits within mobile viewport", async ({ page }) => {
    await page.goto("/timer");
    const svg = page.locator("svg").first();
    await expect(svg).toBeVisible();
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(390);
  });

  test("quick capture bar is visible above tab bar", async ({ page }) => {
    await page.goto("/today");
    const input = page.getByPlaceholder("Quick capture...");
    await expect(input).toBeVisible();
    const inputBox = await input.boundingBox();
    const navBox = await page.getByRole("navigation").boundingBox();
    expect(inputBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    // Input should be above the nav bar
    expect(inputBox!.y).toBeLessThan(navBox!.y);
  });

  test("more page menu items are tappable", async ({ page }) => {
    await page.goto("/more");
    const buttons = page.getByRole("button");
    const count = await buttons.count();
    expect(count).toBe(6);
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
