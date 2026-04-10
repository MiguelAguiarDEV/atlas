import { test, expect } from "@playwright/test";

test.describe("Timer Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/timer");
  });

  test("renders page title and subtitle", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Timer" })).toBeVisible();
    await expect(page.getByText("Track your focus time")).toBeVisible();
  });

  test("shows timer display at 00:00:00", async ({ page }) => {
    await expect(page.getByText("00:00:00")).toBeVisible();
  });

  test("shows task name on timer", async ({ page }) => {
    await expect(page.getByText("Fix authentication middleware bug")).toBeVisible();
  });

  test("shows start button initially", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
  });

  test("clicking start switches to stop button", async ({ page }) => {
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
  });

  test("timer counts up after start", async ({ page }) => {
    await page.getByRole("button", { name: "Start timer" }).click();
    // Wait a bit for the timer to increment
    await page.waitForTimeout(2500);
    // Timer should no longer show 00:00:00
    await expect(page.getByText("00:00:00")).not.toBeVisible();
  });

  test("timer stops after clicking stop", async ({ page }) => {
    await page.getByRole("button", { name: "Start timer" }).click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Stop timer" }).click();
    // Record the time
    const timeText = await page.locator(".font-mono").textContent();
    // Wait and verify time didn't change
    await page.waitForTimeout(1500);
    await expect(page.locator(".font-mono")).toHaveText(timeText!);
  });

  test("shows reset button after stopping with time > 0", async ({ page }) => {
    await page.getByRole("button", { name: "Start timer" }).click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Stop timer" }).click();
    await expect(page.getByText("Reset")).toBeVisible();
  });

  test("reset returns timer to 00:00:00", async ({ page }) => {
    await page.getByRole("button", { name: "Start timer" }).click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Stop timer" }).click();
    await page.getByText("Reset").click();
    await expect(page.getByText("00:00:00")).toBeVisible();
  });

  test("shows today focus summary", async ({ page }) => {
    await expect(page.getByText("Today\u2019s focus time")).toBeVisible();
    await expect(page.getByText("2h 30m")).toBeVisible();
    await expect(page.getByText("Sessions")).toBeVisible();
    await expect(page.getByText("3")).toBeVisible();
  });

  test("renders recent sessions", async ({ page }) => {
    await expect(page.getByText("Recent Sessions")).toBeVisible();
    await expect(page.getByText("Fix auth middleware")).toBeVisible();
    await expect(page.getByText("Design wireframes")).toBeVisible();
    await expect(page.getByText("Code review PR #42")).toBeVisible();
  });

  test("shows session durations and times", async ({ page }) => {
    await expect(page.getByText("1h 23m")).toBeVisible();
    await expect(page.getByText("45m")).toBeVisible();
    await expect(page.getByText("22m")).toBeVisible();
    await expect(page.getByText("2:30 PM")).toBeVisible();
  });
});
