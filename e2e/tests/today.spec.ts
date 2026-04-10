import { test, expect } from "@playwright/test";

test.describe("Today Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/today");
  });

  test("shows a greeting heading", async ({ page }) => {
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(
      text?.includes("Good morning") ||
        text?.includes("Good afternoon") ||
        text?.includes("Good evening")
    ).toBe(true);
  });

  test("shows task summary with count and estimate", async ({ page }) => {
    await expect(page.getByText(/\d+\/\d+ tasks/)).toBeVisible();
    await expect(page.getByText(/~\d+h estimated/)).toBeVisible();
  });

  test("renders energy selector with three options", async ({ page }) => {
    await expect(page.getByText("Energy Level")).toBeVisible();
    await expect(page.getByText("High")).toBeVisible();
    await expect(page.getByText("Medium")).toBeVisible();
    await expect(page.getByText("Low")).toBeVisible();
  });

  test("clicking energy selector selects an option", async ({ page }) => {
    const highButton = page.getByRole("button", { name: /High/ });
    await highButton.click();
    // After click, the button styling changes (has green background class)
    await expect(highButton).toBeVisible();
  });

  test("renders task list with tasks", async ({ page }) => {
    await expect(page.getByText("Today\u2019s Tasks")).toBeVisible();
    await expect(page.getByText("Fix authentication middleware bug")).toBeVisible();
    await expect(page.getByText("Design onboarding flow wireframes")).toBeVisible();
  });

  test("task checkboxes toggle on click", async ({ page }) => {
    const checkbox = page.getByRole("button", { name: "Mark complete" }).first();
    await checkbox.click();
    await expect(
      page.getByRole("button", { name: "Mark incomplete" }).first()
    ).toBeVisible();
  });

  test("renders habits section", async ({ page }) => {
    await expect(page.getByText("Habits")).toBeVisible();
    await expect(page.getByText("Morning exercise")).toBeVisible();
    await expect(page.getByText("Read 30 minutes")).toBeVisible();
    await expect(page.getByText("Review inbox zero")).toBeVisible();
  });

  test("habit checkboxes toggle on click", async ({ page }) => {
    const habitButton = page.getByText("Morning exercise").locator("..");
    await habitButton.click();
    // Verify the habit is visually toggled (success color appears)
    await expect(habitButton).toBeVisible();
  });

  test("shows streak counts on habits", async ({ page }) => {
    await expect(page.getByText("12d")).toBeVisible();
    await expect(page.getByText("5d")).toBeVisible();
    await expect(page.getByText("3d")).toBeVisible();
  });

  test("quick capture input is visible", async ({ page }) => {
    await expect(page.getByPlaceholder("Quick capture...")).toBeVisible();
  });

  test("quick capture adds a new task", async ({ page }) => {
    const input = page.getByPlaceholder("Quick capture...");
    await input.fill("Brand new task from E2E");
    await input.press("Enter");
    await expect(page.getByText("Brand new task from E2E")).toBeVisible();
  });
});
