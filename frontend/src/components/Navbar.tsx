import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { createProtectedImageUrl } from "@/lib/image";


export default function Navbar() {
  const { isAuthenticated, token, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
        const objectUrl = await createProtectedImageUrl(user.profilePhotoUrl, token);
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

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center px-6">
        <Link to="/" className="flex items-center gap-2 text-foreground/90 tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-900 shadow-sm dark:bg-violet-950/70 dark:text-violet-200">
            <span className="h-2.5 w-2.5 rounded-full bg-current" />
          </span>
          <span className="brand-wordmark text-xl">PeerPrep</span>
        </Link>
        {isAuthenticated && (
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            {(user?.role === "admin" || user?.role === "superadmin") && (
              <Link to="/admin">
                <Button variant="ghost" size="sm">Admin</Button>
              </Link>
            )}
            <Link to="/questions">
              <Button variant="ghost" size="sm">Questions</Button>
            </Link>
            <Link to="/match">
              <Button variant="ghost" size="sm">Match</Button>
            </Link>
            <Link to="/history">
              <Button variant="ghost" size="sm">History</Button>
            </Link>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={toggleTheme}>
            {theme === "dark" ? "🌙" : "☀️"}
          </Button>
          {isAuthenticated ? (
            <>
              <Link
                to={user ? `/users/${user.id}` : "/profile"}
                className="flex items-center gap-2 rounded-full border border-border/60 bg-background/75 px-2 py-1 transition-colors hover:border-sky-300 dark:hover:border-violet-700"
              >
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted text-xs font-semibold text-muted-foreground">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt={`${user?.username || "User"} profile`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{user?.username?.[0]?.toUpperCase() || "?"}</span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{user?.username}</span>
              </Link>
              <Link to="/profile">
                <Button variant="ghost" size="sm">Profile</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>Log out</Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
