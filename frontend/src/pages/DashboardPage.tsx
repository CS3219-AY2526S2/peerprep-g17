import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { COLLABORATION_API_URL, QUESTION_API_URL } from "@/config";

/* ── Types ──────────────────────────────────────────── */

interface AttemptRecord {
  _id: string;
  sessionId: string;
  questionId: string;
  topic: string;
  difficulty: string;
  verdict?: string;
  mode?: string;
  attemptedAt: string;
}

interface QuestionMeta {
  total: number;
  difficulties: string[];
  categories: string[];
}

/* ── Quick action cards data ────────────────────────── */

const quickActions = [
  {
    title: "Practice Questions",
    description:
      "Browse curated questions by topic and difficulty. Filter by algorithms, data structures, and more.",
    href: "/questions",
    buttonLabel: "View Questions",
    buttonVariant: "default" as const,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
      </svg>
    ),
    accent: "sky",
  },
  {
    title: "Find a Peer",
    description:
      "Start a live session — get matched by topic and difficulty, then collaborate in a shared editor.",
    href: "/match",
    buttonLabel: "Start Matching",
    buttonVariant: "outline" as const,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    accent: "violet",
  },
  {
    title: "Attempt History",
    description:
      "Review your past sessions, track submitted solutions, and revisit reflections you've written.",
    href: "/history",
    buttonLabel: "View History",
    buttonVariant: "outline" as const,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    accent: "emerald",
  },
];

const accentStyles: Record<string, { iconBg: string; iconText: string }> = {
  sky: {
    iconBg: "bg-sky-100 dark:bg-sky-950/60",
    iconText: "text-sky-700 dark:text-sky-300",
  },
  violet: {
    iconBg: "bg-violet-100 dark:bg-violet-950/60",
    iconText: "text-violet-700 dark:text-violet-300",
  },
  emerald: {
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconText: "text-emerald-700 dark:text-emerald-300",
  },
};

/* ── Helpers ────────────────────────────────────────── */



function verdictBadge(verdict?: string): string {
  switch (verdict) {
    case "Accepted":
      return "border-emerald-200/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400";
    case "Wrong Answer":
      return "border-amber-200/70 bg-amber-50/80 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400";
    default:
      return "border-rose-200/70 bg-rose-50/80 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400";
  }
}

function formatRelativeDate(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function roleBadgeStyles(role?: string): string {
  switch (role) {
    case "superadmin":
      return "bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200";
    case "admin":
      return "bg-slate-900/8 text-slate-700 dark:bg-slate-100/10 dark:text-slate-200";
    default:
      return "bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

/* ── Component ──────────────────────────────────────── */

const ACTIVE_SESSION_STORAGE_KEY = "active_collaboration_session";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const activeSessionId =
    typeof window !== "undefined"
      ? localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)
      : null;

  if (activeSessionId) {
    return <Navigate to={`/collaboration/${activeSessionId}`} replace />;
  }
  const [recentAttempts, setRecentAttempts] = useState<AttemptRecord[]>([]);
  const [questionMeta, setQuestionMeta] = useState<QuestionMeta | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  // Fetch recent attempts + question meta on mount
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const [attemptsRes, questionsRes] = await Promise.all([
          fetch(`${COLLABORATION_API_URL}/sessions/attempts`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(QUESTION_API_URL, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!cancelled && attemptsRes.ok) {
          const attemptsJson = await attemptsRes.json();
          const allAttempts = (attemptsJson.data || []) as AttemptRecord[];
          // Take only the latest 5 submissions
          setRecentAttempts(
            allAttempts
              .filter((a) => a.mode === "submit")
              .slice(0, 5),
          );
        }

        if (!cancelled && questionsRes.ok) {
          const questionsJson = await questionsRes.json();
          setQuestionMeta(questionsJson.meta || null);
        }
      } catch {
        // Silently fail – dashboard still works without this data
      } finally {
        if (!cancelled) setLoadingAttempts(false);
      }
    }

    void fetchData();
    return () => { cancelled = true; };
  }, [token]);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="relative overflow-hidden px-6 pb-20 pt-28 md:pt-32">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="bg-dot-grid absolute inset-0 opacity-40" />
          <div className="absolute top-12 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-sky-800/8 blur-[140px] animate-float-slow dark:bg-sky-400/10" />
          <div className="absolute right-[-6rem] top-28 h-64 w-64 rounded-full bg-violet-900/5 blur-[120px] animate-float-slower dark:bg-violet-400/8" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl">

          {/* ── Header ────────────────────────────── */}
          <div className="animate-fade-up max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/80 px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              </span>
              Your practice workspace
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl dark:text-white">
              {greeting},{" "}
              <span className="bg-gradient-to-r from-slate-950 via-sky-800 to-slate-500 bg-clip-text text-transparent dark:from-white dark:via-sky-200 dark:to-slate-400">
                {user?.username}
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400">
              Jump into practice questions, start a live collaboration session,
              or review your progress. Keep your interview prep consistent and
              build momentum every day.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Signed in as
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeStyles(user?.role)}`}
              >
                {user?.role}
              </span>
            </div>
          </div>

          {/* ── Quick stats row ───────────────────── */}
          {questionMeta && (
            <div className="animate-fade-up delay-100 mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 px-5 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {questionMeta.total}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Questions Available
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 px-5 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {questionMeta.categories.length}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Topics
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 px-5 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {questionMeta.difficulties.length}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Difficulty Levels
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 px-5 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {recentAttempts.length}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Recent Submissions
                </div>
              </div>
            </div>
          )}

          {/* ── Quick action cards ────────────────── */}
          <div className="animate-fade-up delay-200 mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {quickActions.map((action) => {
              const accent = accentStyles[action.accent] || accentStyles.sky;
              return (
                <div
                  key={action.title}
                  className={`group rounded-3xl border border-slate-200/70 bg-white/90 p-7 shadow-[0_16px_48px_-28px_rgba(15,23,42,0.22)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_56px_-28px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-950/70`}
                >
                  <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${accent.iconBg} ${accent.iconText} transition-transform duration-300 group-hover:scale-110`}>
                    {action.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {action.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {action.description}
                  </p>
                  <Link to={action.href} className="mt-5 inline-flex">
                    {action.buttonVariant === "default" ? (
                      <Button
                        size="sm"
                        className="bg-slate-950 text-white shadow-sm hover:bg-sky-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-sky-200"
                      >
                        {action.buttonLabel}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-300 bg-white/80 text-slate-700 hover:border-sky-800 hover:bg-sky-50 hover:text-sky-950 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-sky-300 dark:hover:bg-sky-950/30 dark:hover:text-sky-100"
                      >
                        {action.buttonLabel}
                      </Button>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* ── Recent activity ────────────────────── */}
          <div className="animate-fade-up delay-300 mt-14">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  Recent Submissions
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Your latest coding submissions across all sessions.
                </p>
              </div>
              <Link to="/history">
                <Button variant="ghost" size="sm" className="text-sky-700 dark:text-sky-300">
                  View all →
                </Button>
              </Link>
            </div>

            {loadingAttempts ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl border border-slate-200/60 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-900/40"
                  />
                ))}
              </div>
            ) : recentAttempts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/50 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-950/30">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  No submissions yet
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Start a session and submit your first solution to see it here.
                </p>
                <Link to="/match" className="mt-5 inline-flex">
                  <Button size="sm" className="bg-slate-950 text-white hover:bg-sky-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-sky-200">
                    Find a Peer
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                {recentAttempts.map((attempt, index) => (
                  <div
                    key={attempt._id}
                    className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/40 ${
                      index < recentAttempts.length - 1
                        ? "border-b border-slate-100/80 dark:border-slate-800/60"
                        : ""
                    }`}
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {attempt.topic?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {attempt.topic}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {attempt.difficulty}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        {formatRelativeDate(attempt.attemptedAt)}
                      </div>
                    </div>
                    {attempt.verdict && (
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${verdictBadge(attempt.verdict)}`}
                      >
                        {attempt.verdict}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Motivation banner ──────────────────── */}
          <div className="animate-fade-up delay-400 mt-14">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/50 bg-gradient-to-br from-slate-950 via-sky-950 to-slate-900 px-7 py-8 text-white shadow-lg md:px-10 md:py-10 dark:border-slate-800">
              <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
              <div className="pointer-events-none absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl" />

              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
                    Keep building
                  </p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight md:text-2xl">
                    Consistency beats cramming.
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300/80">
                    Even 20 minutes a day of peer practice builds the muscle
                    memory you need for real interviews.
                  </p>
                </div>
                <Link to="/match">
                  <Button
                    size="lg"
                    className="bg-white text-slate-950 shadow-lg shadow-white/10 hover:bg-sky-100"
                  >
                    Start a Session
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
