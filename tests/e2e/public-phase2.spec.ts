import { test, expect } from "@playwright/test";

test.describe("Phase 2 public smoke", () => {
  test("homepage search-first and gateways", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "תולדות" })).toBeVisible();
    await expect(page.getByRole("search")).toBeVisible();
    await expect(page.locator(".gateway-card", { hasText: "מפה" })).toBeVisible();
    await expect(page.locator(".gateway-card", { hasText: "סדר הדורות" })).toBeVisible();
    await expect(page.locator(".gateway-card", { hasText: "תקופות" })).toBeVisible();
  });

  test("search page accepts query", async ({ page }) => {
    await page.goto("/search?q=test");
    await expect(page.getByRole("heading", { name: "חיפוש" })).toBeVisible();
  });

  test("seder preview keeps uuid deep-link contract", async ({ page }) => {
    const id = "00000000-0000-4000-8000-000000000123";
    await page.goto(`/seder-hadorot?person=${id}&intent=focus`);
    await expect(page.getByText(id)).toBeVisible();
  });

  test("mobile homepage smoke", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "תולדות" })).toBeVisible();
    await expect(page.locator('input[type="search"]')).toBeVisible();
  });
});
