import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("bottom tab bar is visible on all pages", async ({ page }) => {
    const pages = ["/today", "/tasks", "/timer", "/more"];
    for (const p of pages) {
      await page.goto(p);
      await expect(page.getByRole("navigation")).toBeVisible();
    }
  });

  test("bottom tab bar has four tabs", async ({ page }) => {
    await page.goto("/today");
    const nav = page.getByRole("navigation");
    const links = nav.getByRole("link");
    await expect(links).toHaveCount(4);
  });

  test("tabs have correct labels", async ({ page }) => {
    await page.goto("/today");
    const nav = page.getByRole("navigation");
    await expect(nav.getByText("Today")).toBeVisible();
    await expect(nav.getByText("Tasks")).toBeVisible();
    await expect(nav.getByText("Timer")).toBeVisible();
    await expect(nav.getByText("More")).toBeVisible();
  });

  test("Today tab links to /today", async ({ page }) => {
    await page.goto("/today");
    const todayLink = page.getByRole("navigation").getByRole("link", { name: /Today/ });
    await expect(todayLink).toHaveAttribute("href", "/today");
  });

  test("Tasks tab links to /tasks", async ({ page }) => {
    await page.goto("/today");
    const tasksLink = page.getByRole("navigation").getByRole("link", { name: /Tasks/ });
    await expect(tasksLink).toHaveAttribute("href", "/tasks");
  });

  test("Timer tab links to /timer", async ({ page }) => {
    await page.goto("/today");
    const timerLink = page.getByRole("navigation").getByRole("link", { name: /Timer/ });
    await expect(timerLink).toHaveAttribute("href", "/timer");
  });

  test("More tab links to /more", async ({ page }) => {
    await page.goto("/today");
    const moreLink = page.getByRole("navigation").getByRole("link", { name: /More/ });
    await expect(moreLink).toHaveAttribute("href", "/more");
  });

  test("Today tab has active styling on /today", async ({ page }) => {
    await page.goto("/today");
    const todayLink = page.getByRole("navigation").getByRole("link", { name: /Today/ });
    await expect(todayLink).toHaveAttribute("aria-current", "page");
  });

  test("Tasks tab has active styling on /tasks", async ({ page }) => {
    await page.goto("/tasks");
    const tasksLink = page.getByRole("navigation").getByRole("link", { name: /Tasks/ });
    await expect(tasksLink).toHaveAttribute("aria-current", "page");
  });

  test("Timer tab has active styling on /timer", async ({ page }) => {
    await page.goto("/timer");
    const timerLink = page.getByRole("navigation").getByRole("link", { name: /Timer/ });
    await expect(timerLink).toHaveAttribute("aria-current", "page");
  });

  test("More tab has active styling on /more", async ({ page }) => {
    await page.goto("/more");
    const moreLink = page.getByRole("navigation").getByRole("link", { name: /More/ });
    await expect(moreLink).toHaveAttribute("aria-current", "page");
  });

  test("navigating via tabs loads correct page content", async ({ page }) => {
    await page.goto("/today");
    // Click Tasks tab
    await page.getByRole("navigation").getByRole("link", { name: /Tasks/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Tasks" })).toBeVisible();

    // Click Timer tab
    await page.getByRole("navigation").getByRole("link", { name: /Timer/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Timer" })).toBeVisible();

    // Click More tab
    await page.getByRole("navigation").getByRole("link", { name: /More/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "More" })).toBeVisible();

    // Click Today tab
    await page.getByRole("navigation").getByRole("link", { name: /Today/ }).click();
    const heading = page.getByRole("heading", { level: 1 });
    const text = await heading.textContent();
    expect(
      text?.includes("Good morning") ||
        text?.includes("Good afternoon") ||
        text?.includes("Good evening")
    ).toBe(true);
  });

  test("root / redirects to /today", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/today");
    expect(page.url()).toContain("/today");
  });
});
