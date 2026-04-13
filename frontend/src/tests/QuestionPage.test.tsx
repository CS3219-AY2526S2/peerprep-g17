import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import QuestionPage from "@/pages/QuestionPage";
import { renderWithProviders } from "@/tests/utils";

describe("QuestionPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "q-1",
              title: "Two Sum",
              difficulty: "Easy",
              categories: ["Arrays", "Hash Table"],
              description: "Find two numbers that add up to a target.",
              examples: [],
              link: "https://leetcode.com/problems/two-sum/",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
          meta: {
            total: 1,
            difficulties: ["Easy", "Medium", "Hard"],
            categories: ["Arrays", "Hash Table"],
          },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("renders fetched questions for authenticated users", async () => {
    renderWithProviders(<QuestionPage />, {
      token: "test-token",
      user: { id: "user-1", username: "alice", role: "user" },
    });

    expect(screen.getByText(/loading questions/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Two Sum")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Arrays").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hash Table").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });
});
