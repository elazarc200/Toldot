import { expect, test } from "@playwright/test";

test.describe("Phase 3 public explorers", () => {
  test("seder page loads chronological shell", async ({ page }) => {
    await page.goto("/seder-hadorot");
    await expect(page.getByRole("heading", { name: "סדר הדורות" })).toBeVisible();
  });

  test("seder alpha mode loads", async ({ page }) => {
    await page.goto("/seder-hadorot?mode=alpha");
    await expect(page.getByText("אינדקס אלפביתי")).toBeVisible();
  });

  test("seder deep-link rejects bad uuid", async ({ page }) => {
    await page.goto("/seder-hadorot?person=not-a-uuid&intent=focus");
    await expect(page.getByRole("alert")).toContainText("מזהה אדם לא תקין");
  });

  test("map page loads", async ({ page }) => {
    await page.goto("/map");
    await expect(page.getByRole("heading", { name: "מפה", exact: true })).toBeVisible();
  });

  test("mobile viewport seder does not require canvas-only", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/seder-hadorot");
    await expect(page.getByRole("heading", { name: "סדר הדורות" })).toBeVisible();
  });
});
