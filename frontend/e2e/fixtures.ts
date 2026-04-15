import { type Page } from "@playwright/test";

export const mockUser = {
  id: "user-1",
  username: "alice",
  email: "alice@example.com",
  role: "user",
  university: "NUS",
  bio: "Practising interview questions.",
  profilePhotoUrl: null,
};

export async function seedAuthenticatedSession(page: Page) {
  await page.addInitScript((user) => {
    const tokenPayload = btoa(
      JSON.stringify({
        id: user.id,
        role: user.role,
        iat: 1,
        exp: 4_102_444_800,
      }),
    );
    const token = `header.${tokenPayload}.signature`;
    window.localStorage.setItem("token", token);
    window.localStorage.setItem("user", JSON.stringify(user));
  }, mockUser);
}

export async function mockQuestionApi(page: Page) {
  await page.route("**/api/questions**", async (route) => {
    const url = new URL(route.request().url());

    if (route.request().method() === "GET") {
      const search = url.searchParams.get("search");
      const questions = [
        {
          id: "q-1",
          title: "Two Sum",
          difficulty: "Easy",
          categories: ["Arrays", "Hash Table"],
          description: "Find two values that add up to a target.",
          examples: [],
          link: "https://leetcode.com/problems/two-sum/",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "q-2",
          title: "Course Schedule",
          difficulty: "Medium",
          categories: ["Algorithms", "Depth-First Search"],
          description: "Determine whether all courses can be finished.",
          examples: [],
          link: "https://leetcode.com/problems/course-schedule/",
          createdAt: "2026-01-02T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      ].filter((question) =>
        search ? question.title.toLowerCase().includes(search.toLowerCase()) : true,
      );

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: questions,
          meta: {
            total: questions.length,
            difficulties: ["Easy", "Medium", "Hard"],
            categories: ["Algorithms", "Arrays", "Depth-First Search", "Hash Table"],
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { message: "ok" },
      }),
    });
  });
}
