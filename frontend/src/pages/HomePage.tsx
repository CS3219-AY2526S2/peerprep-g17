import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

/* ── How-it-works steps ─────────────────────────────── */

const steps = [
  {
    step: "01",
    title: "Pick a topic",
    description:
      "Choose from algorithms, data structures, dynamic programming, and more.",
  },
  {
    step: "02",
    title: "Get matched",
    description:
      "Our engine pairs you with a peer at a similar level in seconds.",
  },
  {
    step: "03",
    title: "Collaborate live",
    description:
      "Code together in a shared editor, chat, run tests, and submit — all in real time.",
  },
];

/* ── Cursor component ───────────────────────────────── */

function CollabCursor({ color }: { color: "sky" | "violet" }) {
  const bg = color === "sky" ? "bg-sky-400" : "bg-violet-400";
  return (
    <span
      className={`animate-blink ml-px inline-block h-[1.15em] w-[2px] translate-y-[1px] ${bg}`}
    />
  );
}

/* ── Component ──────────────────────────────────────── */

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

  /* Syntax color shorthands */
  const kw = "text-violet-400 font-medium";
  const fn = "text-amber-300";
  const bi = "text-sky-300";
  const st = "text-slate-300";
  const br = "text-slate-400";
  const op = "text-sky-200";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* ── Hero ───────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-32 pb-24 md:pt-40 md:pb-32">
        {/* Aurora ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="bg-dot-grid absolute inset-0 opacity-40" />
          <div className="absolute top-[-8rem] left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-600/12 via-violet-500/8 to-emerald-400/6 blur-[160px] animate-gradient-shift dark:from-sky-500/15 dark:via-violet-400/10 dark:to-emerald-400/8" />
          <div className="absolute right-[-12rem] top-40 h-80 w-80 rounded-full bg-violet-600/8 blur-[140px] animate-float-slow dark:bg-violet-400/10" />
          <div className="absolute left-[-10rem] bottom-20 h-72 w-72 rounded-full bg-sky-600/6 blur-[120px] animate-float-slower dark:bg-sky-400/8" />
          <div className="absolute right-[10%] bottom-0 h-56 w-56 rounded-full bg-emerald-500/5 blur-[100px] animate-float-slower dark:bg-emerald-400/6" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="grid items-center gap-16 lg:grid-cols-[1fr_1fr] lg:gap-12">
            {/* ── Left: Copy ─────────────────────── */}
            <div className="max-w-xl">
              <h1 className="animate-fade-up text-5xl leading-[1.05] font-bold tracking-tight md:text-6xl lg:text-[3.5rem]">
                Practice interviews
                <br />
                <span className="bg-gradient-to-r from-sky-600 via-violet-500 to-emerald-400 bg-clip-text text-transparent animate-text-shimmer dark:from-sky-400 dark:via-violet-300 dark:to-emerald-300">
                  with your peers
                </span>
              </h1>

              <p className="animate-fade-up delay-200 mt-7 max-w-lg text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Find a study partner, tackle whiteboard questions together, and
                build confidence for your next technical interview — all in real
                time.
              </p>

              <div className="animate-fade-up delay-300 mt-10 flex flex-wrap items-center gap-4">
                <Link to={primaryHref}>
                  <Button
                    size="lg"
                    className="gap-2.5 bg-slate-950 px-7 text-white shadow-lg shadow-slate-950/20 hover:bg-sky-900 dark:bg-slate-100 dark:text-slate-950 dark:shadow-white/10 dark:hover:bg-sky-200"
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
                      className="border-slate-300 bg-white/80 px-7 text-slate-700 shadow-sm hover:border-sky-800 hover:bg-sky-50 hover:text-sky-950 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-sky-300 dark:hover:bg-sky-950/30 dark:hover:text-sky-100"
                    >
                      Log in
                    </Button>
                  </Link>
                )}
              </div>

              {/* Trust badges */}
              <div className="animate-fade-up delay-400 mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400 dark:text-slate-500">
                <div className="flex items-center gap-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  </svg>
                  End-to-end encrypted
                </div>
                <div className="hidden sm:block h-3 w-px bg-slate-300 dark:bg-slate-700" />
                <div className="flex items-center gap-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  &lt;2s match time
                </div>
                <div className="hidden sm:block h-3 w-px bg-slate-300 dark:bg-slate-700" />
                <div className="flex items-center gap-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m18 16 4-4-4-4" />
                    <path d="m6 8-4 4 4 4" />
                    <path d="m14.5 4-5 16" />
                  </svg>
                  Real-time Yjs sync
                </div>
              </div>
            </div>

            {/* ── Right: Code editor mockup ──────── */}
            <div className="animate-fade-up delay-300 hidden lg:block">
              <div className="animate-glow-pulse rounded-2xl border border-slate-200/60 bg-slate-950 shadow-2xl shadow-sky-500/10 dark:border-slate-700/60 dark:shadow-sky-400/10">
                {/* Title bar */}
                <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="ml-3 flex items-center gap-2 text-[11px] text-slate-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m18 16 4-4-4-4" />
                      <path d="m6 8-4 4 4 4" />
                      <path d="m14.5 4-5 16" />
                    </svg>
                    solution.py
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-800/50 bg-emerald-900/30 px-2 py-0.5 text-[10px] text-emerald-400">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    2 connected
                  </div>
                </div>

                {/* Code — static with two collaboration cursors */}
                <div className="whitespace-pre p-5 font-mono text-[13px] leading-[1.75] select-none">
                  {/* Line 1 */}
                  <div className="flex">
                    <span className="mr-5 inline-block w-5 text-right text-slate-600">
                      1
                    </span>
                    <span>
                      <span className={kw}>def</span>{" "}
                      <span className={fn}>two_sum</span>
                      <span className={br}>(</span>
                      <span className={st}>nums</span>
                      <span className={br}>,</span>{" "}
                      <span className={st}>target</span>
                      <span className={br}>):</span>
                    </span>
                  </div>
                  {/* Line 2 */}
                  <div className="flex">
                    <span className="mr-5 inline-block w-5 text-right text-slate-600">
                      2
                    </span>
                    <span className={st}>
                      {"    "}seen <span className={op}>=</span>{" "}
                      <span className={br}>{"{}"}</span>
                    </span>
                  </div>
                  {/* Line 3 */}
                  <div className="flex">
                    <span className="mr-5 inline-block w-5 text-right text-slate-600">
                      3
                    </span>
                    <span>
                      {"    "}
                      <span className={kw}>for</span>{" "}
                      <span className={st}>i</span>
                      <span className={br}>,</span>{" "}
                      <span className={st}>num</span>{" "}
                      <span className={kw}>in</span>{" "}
                      <span className={bi}>enumerate</span>
                      <span className={br}>(</span>
                      <span className={st}>nums</span>
                      <span className={br}>):</span>
                    </span>
                  </div>
                  {/* Line 4 — alice's cursor */}
                  <div className="flex items-center">
                    <span className="mr-5 inline-block w-5 text-right text-slate-600">
                      4
                    </span>
                    <span>
                      {"        "}
                      <span className={st}>complement</span>{" "}
                      <span className={op}>=</span>{" "}
                      <span className={st}>target</span>{" "}
                      <span className={op}>-</span>{" "}
                      <span className={st}>num</span>
                    </span>
                    <CollabCursor color="sky" />
                  </div>
                  {/* Line 5 */}
                  <div className="flex">
                    <span className="mr-5 inline-block w-5 text-right text-slate-600">
                      5
                    </span>
                    <span>
                      {"        "}
                      <span className={kw}>if</span>{" "}
                      <span className={st}>complement</span>{" "}
                      <span className={kw}>in</span>{" "}
                      <span className={st}>seen</span>
                      <span className={br}>:</span>
                    </span>
                  </div>
                  {/* Line 6 — bob's cursor */}
                  <div className="flex items-center">
                    <span className="mr-5 inline-block w-5 text-right text-slate-600">
                      6
                    </span>
                    <span>
                      {"            "}
                      <span className={kw}>return</span>{" "}
                      <span className={br}>[</span>
                      <span className={st}>seen</span>
                      <span className={br}>[</span>
                      <span className={st}>complement</span>
                      <span className={br}>],</span>{" "}
                      <span className={st}>i</span>
                      <span className={br}>]</span>
                    </span>
                    <CollabCursor color="violet" />
                  </div>
                  {/* Line 7 */}
                  <div className="flex">
                    <span className="mr-5 inline-block w-5 text-right text-slate-600">
                      7
                    </span>
                    <span>
                      {"        "}
                      <span className={st}>seen</span>
                      <span className={br}>[</span>
                      <span className={st}>num</span>
                      <span className={br}>]</span>{" "}
                      <span className={op}>=</span>{" "}
                      <span className={st}>i</span>
                    </span>
                  </div>
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2 text-[10px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>Python</span>
                    <span>UTF-8</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      alice
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      bob
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────── */}
      <section className="relative border-t border-slate-200/60 bg-slate-50/50 px-6 py-24 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-400">
              How it works
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl dark:text-white">
              Three steps to better interview prep
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-500 dark:text-slate-400">
              No grind. No solo flashcards. Just structured peer practice that
              mirrors real interviews.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((item) => (
              <div
                key={item.step}
                className="group relative rounded-2xl border border-slate-200/60 bg-white/90 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-sky-200/80 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-sky-900/60"
              >
                <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sm font-bold text-sky-800 transition-colors group-hover:bg-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:group-hover:bg-sky-900/60">
                  {item.step}
                </span>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/50 bg-gradient-to-br from-slate-950 via-sky-950 to-slate-900 px-8 py-12 text-white shadow-[0_24px_80px_-40px_rgba(3,7,18,0.55)] md:px-14 md:py-14 dark:border-slate-800">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
                  Start Practising
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
                  Built for peer mock interviews,
                  <br className="hidden md:inline" /> not solo grinding.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300/90">
                  Pair up, solve questions together, and get comfortable
                  thinking out loud under interview pressure. Your next
                  technical interview will thank you.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to={primaryHref}>
                  <Button
                    size="lg"
                    className="bg-white text-slate-950 shadow-lg shadow-white/10 hover:bg-sky-100"
                  >
                    {primaryLabel}
                  </Button>
                </Link>
                <Link to="/questions">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/20 bg-white/6 text-white shadow-sm hover:bg-white/12"
                  >
                    Browse questions
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/50 py-8 dark:border-slate-800/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-slate-400 dark:text-slate-500">
          <span>
            {"\u00A9"} 2026{" "}
            <span className="brand-wordmark text-slate-600 dark:text-slate-300">
              PeerPrep
            </span>
          </span>
          <span>CS3219 Group 17</span>
        </div>
      </footer>
    </div>
  );
}
