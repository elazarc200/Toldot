import { test, expect } from "@playwright/test";

const editorEmail = process.env.RLS_TEST_EDITOR_EMAIL;
const editorPassword = process.env.RLS_TEST_EDITOR_PASSWORD;

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

test.describe("Phase 1 admin smoke", () => {
  test("editor can open knowledge admin hub, people, and chronology", async ({
    page,
  }) => {
    test.skip(!editorEmail || !editorPassword, "editor credentials required");
    await login(page, editorEmail!, editorPassword!);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText("מנוע ידע")).toBeVisible();
    await page.goto("/admin/people");
    await expect(page.getByRole("heading", { name: "אנשים" })).toBeVisible();
    await expect(page.getByText("יצירת אדם")).toBeVisible();
    await page.goto("/admin/chronology");
    await expect(page.getByRole("heading", { name: "כרונולוגיה ופעילות במקום" })).toBeVisible();
    await page.goto("/admin/publish");
    await expect(page.getByRole("heading", { name: "מחזור חיים, פרסום וגלגול לאחור" })).toBeVisible();
  });
});
