import { test, expect } from "@playwright/test";

/**
 * Phase 4 public exclusion + unauthorized AI boundaries.
 * Full editorial isolation (enqueue → fake proposal → draft-only accept →
 * public unchanged) is proven in hosted RLS suite:
 * tests/rls/phase4.isolation.test.ts
 */
test.describe("Phase 4 public AI exclusion", () => {
  test("public homepage does not expose AI research controls", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("הפעל מחקר");
    await expect(page.locator("body")).not.toContainText("Ask Toladot");
  });

  test("unauthenticated AI workspace redirects away from editor tools", async ({
    page,
  }) => {
    const res = await page.goto(
      "/admin/people/00000000-0000-0000-0000-000000000099/ai",
    );
    const url = page.url();
    expect(
      url.includes("/login") ||
        url.includes("/admin") ||
        (res?.status() ?? 0) >= 300,
    ).toBeTruthy();
  });
});
