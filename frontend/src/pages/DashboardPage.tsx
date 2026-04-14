import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ACTIVE_SESSION_STORAGE_KEY = "active_collaboration_session";

export default function DashboardPage() {
  const { user } = useAuth();
  const activeSessionId =
    typeof window !== "undefined"
      ? localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)
      : null;

  if (activeSessionId) {
    return <Navigate to={`/collaboration/${activeSessionId}`} replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="relative overflow-hidden px-6 pb-20 pt-28">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-12 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-sky-900/8 blur-[130px] dark:bg-sky-400/10" />
          <div className="absolute right-[-6rem] top-28 h-64 w-64 rounded-full bg-slate-900/6 blur-[110px] dark:bg-slate-100/6" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/80 px-3 py-1 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-700 dark:bg-sky-300" />
              Your practice workspace
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl dark:text-white">
              Pick up where you left off
              <br />
              <span className="bg-gradient-to-r from-slate-950 via-sky-900 to-slate-500 bg-clip-text text-transparent dark:from-white dark:via-sky-200 dark:to-slate-300">
                and keep your prep moving.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Welcome back, {user?.username}. Jump into practice questions,
              start a live collaboration session, and keep your interview prep
              feeling consistent from the homepage to the rest of the app.
            </p>

            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Signed in as{" "}
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  user?.role === "superadmin"
                    ? "bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200"
                    : user?.role === "admin"
                      ? "bg-slate-900/8 text-slate-700 dark:bg-slate-100/10 dark:text-slate-200"
                      : "bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {user?.role}
              </span>
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-7 shadow-[0_16px_48px_-28px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950/75">
              <div className="mb-4 h-10 w-10 rounded-full bg-sky-100 dark:bg-sky-950/70" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Practice Questions
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Browse curated questions by topic and difficulty without the
                tiny text feeling disconnected from the rest of the product.
              </p>
              <Link to="/questions" className="mt-5 inline-flex">
                <Button
                  size="sm"
                  className="bg-slate-950 text-white hover:bg-sky-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-sky-200"
                >
                  View Questions
                </Button>
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-7 shadow-[0_16px_48px_-28px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950/75">
              <div className="mb-4 h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Find a Peer
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Start a live session quickly and move into a collaboration space
                that is easier to demo, read, and navigate.
              </p>
              <Link to="/match" className="mt-5 inline-flex">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 bg-white/80 text-slate-700 hover:border-sky-800 hover:bg-sky-50 hover:text-sky-950 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-sky-300 dark:hover:bg-sky-950/30 dark:hover:text-sky-100"
                >
                  Open Match Tester
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
