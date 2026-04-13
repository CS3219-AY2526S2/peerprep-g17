import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const featureCards = [
  {
    title: "Real-time Collaboration",
    description:
      "Code together in a shared editor with live sync, just like a real whiteboard interview.",
  },
  {
    title: "Smart Matching",
    description:
      "Get matched with peers based on topic, difficulty, and skill level within seconds.",
  },
  {
    title: "Curated Questions",
    description:
      "Practice with a growing library of questions indexed by topic and difficulty.",
  },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const primaryHref = isAuthenticated ? "/dashboard" : "/signup";
  const primaryLabel = isAuthenticated ? "Go to Dashboard" : "Get started";
  const ACTIVE_SESSION_STORAGE_KEY = "active_collaboration_session";

  const activeSessionId =
    typeof window !== "undefined"
      ? localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)
      : null;

  if (isAuthenticated && activeSessionId) {
    return <Navigate to={`/collaboration/${activeSessionId}`} replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="relative overflow-hidden px-6 pt-40 pb-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-28 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-sky-900/10 blur-[140px] dark:bg-sky-400/10" />
          <div className="absolute right-[-8rem] bottom-10 h-72 w-72 rounded-full bg-slate-900/6 blur-[120px] dark:bg-slate-100/6" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center">
          <div className="flex max-w-3xl flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/80 px-3 py-1 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-700 dark:bg-sky-300" />
              Now in active development
            </div>

            <h1 className="text-5xl leading-[1.05] font-bold tracking-tight md:text-6xl">
              Practice interviews
              <br />
              <span className="bg-gradient-to-r from-slate-950 via-sky-900 to-slate-500 bg-clip-text text-transparent dark:from-white dark:via-sky-200 dark:to-slate-300">
                with your peers
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Find a study partner, tackle whiteboard questions together, and
              build confidence for your next technical interview, all in real
              time.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to={primaryHref}>
                <Button
                  size="lg"
                  className="gap-2 bg-slate-950 px-6 text-white hover:bg-sky-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-sky-200"
                >
                  {primaryLabel}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Button>
              </Link>

              {!isAuthenticated && (
                <Link to="/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-slate-300 bg-white/80 px-6 text-slate-700 hover:border-sky-800 hover:bg-sky-50 hover:text-sky-950 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-sky-300 dark:hover:bg-sky-950/30 dark:hover:text-sky-100"
                  >
                    Log in
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="mt-24 grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
            {featureCards.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200/80 bg-white/88 p-6 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.24)] transition-transform duration-200 hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-950/75"
              >
                <div className="mb-4 h-9 w-9 rounded-full bg-sky-100 text-sky-900 dark:bg-sky-950/70 dark:text-sky-200" />
                <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 w-full max-w-5xl rounded-3xl border border-slate-200/80 bg-gradient-to-r from-slate-950 to-sky-950 px-8 py-8 text-white shadow-[0_18px_60px_-30px_rgba(3,7,18,0.6)] dark:border-slate-800">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-sky-200/85">
                  Start Practising
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Built for peer mock interviews, not solo grinding.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                  Pair up, solve questions together, and get comfortable thinking out loud under interview pressure.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to={primaryHref}>
                  <Button
                    size="lg"
                    className="bg-white text-slate-950 hover:bg-sky-100"
                  >
                    {primaryLabel}
                  </Button>
                </Link>
                <Link to="/questions">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/20 bg-white/6 text-white hover:bg-white/12"
                  >
                    Browse questions
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/80 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 text-sm text-slate-500 dark:text-slate-400">
          <span>
            {"\u00A9"} 2026 <span className="brand-wordmark text-slate-800 dark:text-slate-100">PeerPrep</span>. CS3219 Group 17.
          </span>
        </div>
      </footer>
    </div>
  );
}
