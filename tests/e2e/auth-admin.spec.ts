import { test, expect } from "@playwright/test";

const editorEmail = process.env.RLS_TEST_EDITOR_EMAIL;
const editorPassword = process.env.RLS_TEST_EDITOR_PASSWORD;
const nonEditorEmail = process.env.RLS_TEST_NON_EDITOR_EMAIL;
const nonEditorPassword = process.env.RLS_TEST_NON_EDITOR_PASSWORD;

async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/login?next=/admin");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL(/\/(admin|login)/, { timeout: 60_000 }),
    page.getByRole("button", { name: "התחברות" }).click(),
  ]);
}

test.describe("authenticated editorial access", () => {
  test.beforeAll(() => {
    expect(
      editorEmail && editorPassword && nonEditorEmail && nonEditorPassword,
      "RLS_TEST_EDITOR_* and RLS_TEST_NON_EDITOR_* must be set in .env.local",
    ).toBeTruthy();
  });

  test("non-editor is denied /admin", async ({ page }) => {
    await login(page, nonEditorEmail!, nonEditorPassword!);
    await expect(page).toHaveURL(/\/login\?error=forbidden/);
    await expect(
      page.getByRole("alert").filter({ hasText: "אינו חבר מערכת העריכה" }),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/login");
  });

  test("editor can access /admin and sees capabilities", async ({ page }) => {
    await login(page, editorEmail!, editorPassword!);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { name: "לוח עריכה" })).toBeVisible();
    await expect(page.getByText("edit — מאושר")).toBeVisible();
    await expect(page.getByText("publish — מאושר")).toBeVisible();
    await expect(
      page.getByText("manage_editorial_membership — מאושר"),
    ).toBeVisible();
  });
});
