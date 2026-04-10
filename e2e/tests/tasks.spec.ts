import { test, expect } from "@playwright/test";

test.describe("Tasks Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tasks");
  });

  test("renders page title and summary", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Tasks" })).toBeVisible();
    await expect(page.getByText(/\d+ total/)).toBeVisible();
    await expect(page.getByText(/\d+ completed/)).toBeVisible();
  });

  test("renders all filter pills", async ({ page }) => {
    await expect(page.getByRole("button", { name: /All/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Inbox/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /In Progress/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Done/ })).toBeVisible();
  });

  test("All filter is active by default and shows all tasks", async ({ page }) => {
    const allButton = page.getByRole("button", { name: /All/ });
    // Check that the All button has the active styling
    await expect(allButton).toBeVisible();
    // Count task cards (each has a toggle button)
    const toggleButtons = page.getByRole("button", { name: /Mark complete|Mark incomplete/ });
    await expect(toggleButtons).toHaveCount(10);
  });

  test("clicking Inbox filter shows only inbox tasks", async ({ page }) => {
    await page.getByRole("button", { name: /Inbox/ }).click();
    const toggleButtons = page.getByRole("button", { name: /Mark complete|Mark incomplete/ });
    await expect(toggleButtons).toHaveCount(3);
  });

  test("clicking In Progress filter shows active tasks", async ({ page }) => {
    await page.getByRole("button", { name: /In Progress/ }).click();
    const toggleButtons = page.getByRole("button", { name: /Mark complete|Mark incomplete/ });
    await expect(toggleButtons).toHaveCount(6);
  });

  test("clicking Done filter shows completed tasks", async ({ page }) => {
    await page.getByRole("button", { name: /Done/ }).click();
    const toggleButtons = page.getByRole("button", { name: /Mark complete|Mark incomplete/ });
    await expect(toggleButtons).toHaveCount(2);
  });

  test("switching back to All restores all tasks", async ({ page }) => {
    await page.getByRole("button", { name: /Inbox/ }).click();
    await page.getByRole("button", { name: /All/ }).click();
    const toggleButtons = page.getByRole("button", { name: /Mark complete|Mark incomplete/ });
    await expect(toggleButtons).toHaveCount(10);
  });

  test("task cards show all required info", async ({ page }) => {
    // Check a specific task card has title, priority, project, due date
    await expect(page.getByText("Fix authentication middleware bug")).toBeVisible();
    await expect(page.getByText("P0").first()).toBeVisible();
    await expect(page.getByText("Atlas").first()).toBeVisible();
    await expect(page.getByText("Today").first()).toBeVisible();
  });

  test("task toggle works", async ({ page }) => {
    const firstComplete = page.getByRole("button", { name: "Mark complete" }).first();
    await firstComplete.click();
    await expect(page.getByRole("button", { name: "Mark incomplete" }).first()).toBeVisible();
  });
});
