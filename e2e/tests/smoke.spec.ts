import { test, expect } from "@playwright/test";

test.describe("Atlas Smoke Tests", () => {
  test("loads the home page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Atlas" })).toBeVisible();
  });

  test("displays feature tags", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Tasks")).toBeVisible();
    await expect(page.getByText("Time")).toBeVisible();
    await expect(page.getByText("Canvas")).toBeVisible();
    await expect(page.getByText("Boards")).toBeVisible();
  });

  test("is mobile-responsive", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { name: "Atlas" });
    await expect(heading).toBeVisible();
    const box = await heading.boundingBox();
    expect(box).not.toBeNull();
  });
});
