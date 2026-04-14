import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { createProtectedImageUrl } from "@/lib/image";

const navLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/questions", label: "Questions" },
  { to: "/match", label: "Match" },
  { to: "/history", label: "History" },
];

export default function Navbar() {
  const { isAuthenticated, token, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    let objectUrlToRevoke: string | null = null;
    let cancelled = false;

    async function loadProfilePhoto() {
      if (!token || !user?.profilePhotoUrl) {
        setPhotoPreview(null);
        return;
      }

      if (!user.profilePhotoUrl.includes("/api/users/")) {
        setPhotoPreview(user.profilePhotoUrl);
        return;
      }

      try {
        const objectUrl = await createProtectedImageUrl(
          user.profilePhotoUrl,
          token,
        );
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        objectUrlToRevoke = objectUrl;
        setPhotoPreview(objectUrl);
      } catch {
        if (!cancelled) {
          setPhotoPreview(null);
        }
      }
    }

    void loadProfilePhoto();

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [token, user?.profilePhotoUrl]);

  function isActive(path: string): boolean {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  }

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/75 backdrop-blur-xl">
      <div className="relative mx-auto flex h-14 w-full max-w-[1700px] items-center px-6 lg:px-8">
        {/* ── Logo ──────────────────────────────── */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-foreground/90 transition-opacity hover:opacity-80"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-800 shadow-sm dark:bg-sky-950/70 dark:text-sky-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m18 16 4-4-4-4" />
              <path d="m6 8-4 4 4 4" />
              <path d="m14.5 4-5 16" />
            </svg>
          </span>
          <span className="brand-wordmark text-lg tracking-tight">
            PeerPrep
          </span>
        </Link>

        {/* ── Center nav links ──────────────────── */}
        {isAuthenticated && (
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-0.5">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-[13px] font-medium transition-colors ${
                    isActive(link.to)
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
            {(user?.role === "admin" || user?.role === "superadmin") && (
              <Link to="/admin">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-[13px] font-medium transition-colors ${
                    isActive("/admin")
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Admin
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* ── Right actions ─────────────────────── */}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            )}
          </Button>

          {isAuthenticated ? (
            <>
              <div className="mx-1 h-4 w-px bg-border/60" />
              <Link
                to={user ? `/users/${user.id}` : "/profile"}
                className="flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-2.5 py-1 transition-all hover:border-sky-300/80 hover:shadow-sm dark:hover:border-sky-800"
              >
                <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt={`${user?.username || "User"} profile`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>
                      {user?.username?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <span className="text-[13px] font-medium text-foreground/80">
                  {user?.username}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-[13px] text-muted-foreground hover:text-foreground"
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="sm"
                  className="bg-slate-950 text-[13px] text-white hover:bg-sky-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-sky-200"
                >
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
