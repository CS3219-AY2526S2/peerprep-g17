import { test, expect } from "@playwright/test";

test("signup surfaces backend validation errors", async ({ page }) => {
  await page.route("**/api/users/register", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Password must include at least 1 letter and 1 digit.",
      }),
    });
  });

  await page.goto("/signup");
  await page.getByLabel(/username/i).fill("alice");
  await page.getByLabel(/^email$/i).fill("alice@example.com");
  await page.getByLabel(/^password$/i).fill("weakpass");
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page.getByText(/password must include at least 1 letter and 1 digit/i)).toBeVisible();
});

test("login redirects into the authenticated homepage flow", async ({ page }) => {
  await page.route("**/api/users/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: "user-1",
          username: "alice",
          email: "alice@example.com",
          role: "user",
          university: "",
          bio: "",
          profilePhotoUrl: null,
          token: "header.eyJpZCI6InVzZXItMSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxLCJleHAiOjQxMDI0NDQ4MDB9.signature",
        },
      }),
    });
  });

  await page.goto("/login");
  await page.getByLabel(/email or username/i).fill("alice@example.com");
  await page.getByLabel(/^password$/i).fill("Passw0rd");
  await page.getByRole("button", { name: /^log in$/i }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: /go to dashboard/i }).first()).toBeVisible();
});
