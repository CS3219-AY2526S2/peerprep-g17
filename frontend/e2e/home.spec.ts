import { test, expect } from "@playwright/test";

test("guest homepage shows primary entry points", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /practice interviews/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /get started/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^log in$/i }).first()).toBeVisible();
});
