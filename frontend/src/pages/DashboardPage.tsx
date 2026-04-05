import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 pt-24">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back, {user?.username}. You're logged in as{" "}
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
              user?.role === "superadmin" 
              ? "bg-purple-500/10 text-purple-600"
              : user?.role === "admin"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
            }`}
          >
            {user?.role}
          </span>
        </p>

        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/50 bg-border/50 md:grid-cols-2">
          <div className="bg-background p-6">
            <h3 className="mb-2 text-sm font-medium">Practice Questions</h3>
            <p className="text-sm text-muted-foreground">
              Browse and attempt curated questions by topic and difficulty.
            </p>
            <Link to="/questions" className="mt-4 inline-flex">
              <Button size="sm">View Questions</Button>
            </Link>
          </div>
          <div className="bg-background p-6">
            <h3 className="mb-2 text-sm font-medium">Find a Peer</h3>
            <p className="text-sm text-muted-foreground">
              Get matched with another user and collaborate in real time.
            </p>
            <Link to="/match" className="mt-4 inline-flex">
              <Button size="sm">Open match tester</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
