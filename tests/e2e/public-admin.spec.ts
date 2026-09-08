import { test, expect } from "@playwright/test";

test.describe("Phase 0 public / editorial boundary", () => {
  test("anonymous public home is accessible with Hebrew RTL", async ({
    page,
  }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "תולדות" })).toBeVisible();
  });

  test("unauthenticated /admin is rejected (redirected away)", async ({
    page,
  }) => {
    const response = await page.goto("/admin");
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "התחברות" })).toBeVisible();
  });
});
