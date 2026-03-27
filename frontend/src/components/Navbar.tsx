import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";


export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme(); 


  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center px-6">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          PeerPrep
        </Link>
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
            <Link to="/questions">
              <Button variant="ghost" size="sm">
                Questions
              </Button>
            </Link>
            <Link to="/match">
              <Button variant="ghost" size="sm">
                Match
              </Button>
            </Link>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
           <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === "dark" ? "🌙" : "☀️"}
            </Button>
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user?.username}
              </span>
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  Profile
                </Button>
              </Link>
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
