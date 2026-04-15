import { afterEach, describe, expect, it } from "vitest";
import { Routes, Route } from "react-router-dom";
import { screen } from "@testing-library/react";
import { RequireAuth, RequireAdmin } from "@/components/RouteGuards";
import { renderWithProviders } from "@/tests/utils";

describe("RouteGuards", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("redirects unauthenticated users away from protected routes", () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/protected"
          element={
            <RequireAuth>
              <div>Protected page</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>,
      { route: "/protected" },
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects non-admin users away from admin routes", () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <div>Admin page</div>
            </RequireAdmin>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>,
      {
        route: "/admin",
        token: "test-token",
        user: { id: "user-1", username: "alice", role: "user" },
      },
    );

    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("allows admins through admin routes", () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <div>Admin page</div>
            </RequireAdmin>
          }
        />
      </Routes>,
      {
        route: "/admin",
        token: "admin-token",
        user: { id: "user-1", username: "alice", role: "admin" },
      },
    );

    expect(screen.getByText("Admin page")).toBeInTheDocument();
  });
});
