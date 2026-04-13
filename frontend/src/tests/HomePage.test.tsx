import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { User } from "@/types";
import * as authModule from "@/contexts/AuthContext";

vi.mock("@/contexts/AuthContext", async () => {
  const actual =
    await vi.importActual<typeof import("@/contexts/AuthContext")>(
      "@/contexts/AuthContext",
    );

  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const mockUseAuth = vi.mocked(authModule.useAuth);

function renderHomePage(userState: {
  isAuthenticated: boolean;
  user: User | null;
}) {
  mockUseAuth.mockReturnValue({
    token: userState.isAuthenticated ? "token" : null,
    user: userState.user,
    isAuthenticated: userState.isAuthenticated,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(),
    updateProfile: vi.fn(),
    uploadProfilePhoto: vi.fn(),
    loginWithToken: vi.fn(),
  });

  return render(
    <MemoryRouter>
      <ThemeProvider>
        <HomePage />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  it("shows guest call-to-actions for unauthenticated users", () => {
    const { container } = renderHomePage({
      isAuthenticated: false,
      user: null,
    });

    expect(screen.getByText(/practice interviews/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /get started/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^log in$/i })).toHaveLength(2);
    expect(container.textContent).not.toContain("Go to Dashboard");
  });

  it("shows dashboard actions for authenticated users", () => {
    const { container } = renderHomePage({
      isAuthenticated: true,
      user: {
        id: "user-1",
        username: "alice",
        email: "alice@example.com",
        role: "user",
        university: "",
        bio: "",
        profilePhotoUrl: null,
      },
    });

    expect(screen.getAllByRole("button", { name: /go to dashboard/i })).toHaveLength(2);
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(container.textContent).not.toContain("Get started");
  });
});
