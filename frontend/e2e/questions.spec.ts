import { test, expect } from "@playwright/test";
import { mockQuestionApi, seedAuthenticatedSession } from "./fixtures";

test("authenticated users can view and filter the questions page", async ({ page }) => {
  await seedAuthenticatedSession(page);
  await mockQuestionApi(page);

  await page.goto("/questions");

  await expect(page.getByRole("heading", { name: /questions/i })).toBeVisible();
  await expect(page.getByText("Two Sum")).toBeVisible();
  await expect(page.getByText("Course Schedule")).toBeVisible();

  await page.getByPlaceholder(/search by title/i).fill("Two");

  await expect(page.getByText("Two Sum")).toBeVisible();
  await expect(page.getByText("Course Schedule")).not.toBeVisible();
});
