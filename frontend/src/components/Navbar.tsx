import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center px-6">
        {/* Left — Brand */}
        <Link to="/" className="text-lg font-semibold tracking-tight">
          PeerPrep
        </Link>

        {/* Center — Nav links (authenticated only) */}
        {isAuthenticated && (
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            {user?.role === "admin" && (
              <Link to="/admin">
                <Button variant="ghost" size="sm">
                  Admin
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Right — Auth actions */}
        <div className="ml-auto flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  Profile
                </Button>
              </Link>
              <span className="text-sm text-muted-foreground">
                {user?.username}
              </span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
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
