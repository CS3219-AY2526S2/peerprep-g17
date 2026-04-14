import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { MATCHING_API_URL, MATCHING_WS_URL, QUESTION_API_URL } from "@/config";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import type { MatchState } from "@/types";

type QuestionMetaResponse = {
  meta?: {
    categories?: string[];
  };
};

const MATCH_STATE_REFRESH_INTERVAL_MS = 5000;

function formatRemainingTime(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/* ── Status helpers ─────────────────────────────────── */

function statusLabel(status?: string): string {
  switch (status) {
    case "searching":
      return "Searching…";
    case "matched":
      return "Matched!";
    case "timed_out":
      return "Timed out";
    case "cancelled":
      return "Cancelled";
    default:
      return "Ready";
  }
}

function statusStyle(status?: string): string {
  switch (status) {
    case "searching":
      return "border-sky-200/80 bg-sky-50/90 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200";
    case "matched":
      return "border-emerald-200/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200";
    case "timed_out":
      return "border-amber-200/80 bg-amber-50/90 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200";
    case "cancelled":
      return "border-slate-200/80 bg-slate-50/90 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300";
    default:
      return "border-slate-200/80 bg-slate-50/90 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300";
  }
}

function statusDot(status?: string): string {
  switch (status) {
    case "searching":
      return "bg-sky-500";
    case "matched":
      return "bg-emerald-500";
    case "timed_out":
      return "bg-amber-500";
    default:
      return "bg-slate-400 dark:bg-slate-500";
  }
}

/* ── Component ──────────────────────────────────────── */

export default function MatchPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef<WebSocket | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [countdownMs, setCountdownMs] = useState<number | null>(null);
  const {
    profile: partnerProfile,
    photoPreview: partnerPhotoPreview,
  } = usePublicProfile(matchState?.partnerUserId, token, {
    enabled: Boolean(matchState?.partnerUserId),
  });

  /* ── Sync helper ────────────────────────────────────── */

  const syncMatchState = useMemo(
    () =>
      async function syncMatchStateFromServer() {
        if (!token) {
          return;
        }

        const response = await fetch(`${MATCHING_API_URL}/requests/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          return;
        }

        const json = await response.json();
        const sessionData = json.data as MatchState | null;

        if (!sessionData) {
          return;
        }

        const deadSessionId = sessionStorage.getItem("dead_session");

        if (sessionData.status === "matched" && sessionData.sessionId) {
          if (sessionData.sessionId === deadSessionId) {
            setMatchState(null);
          } else {
            navigate(`/collaboration/${sessionData.sessionId}`);
          }
          return;
        }

        setMatchState(sessionData);
      },
    [navigate, token],
  );

  /* ── Effects ─────────────────────────────────────────── */

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function loadPage(): Promise<void> {
      try {
        setLoading(true);
        setError("");

        const [topicsRes, stateRes] = await Promise.all([
          fetch(
            `${QUESTION_API_URL}?executionModes=python_function,python_class`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
          fetch(`${MATCHING_API_URL}/requests/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const topicsJson = (await topicsRes.json()) as QuestionMetaResponse;
        const categories = topicsJson.meta?.categories || [];

        if (!cancelled) {
          setTopics(categories);
          setSelectedTopic((current) => current || categories[0] || "");
        }
        if (stateRes.ok) {
          const stateJson = await stateRes.json();
          const sessionData = stateJson.data as MatchState;

          const deadSessionId = sessionStorage.getItem("dead_session");

          if (sessionData.status === "matched" && sessionData.sessionId) {
            if (sessionData.sessionId === deadSessionId) {
              setMatchState(null);
            } else {
              navigate(`/collaboration/${sessionData.sessionId}`);
            }
          } else {
            setMatchState(sessionData);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load match page data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = new WebSocket(
      `${MATCHING_WS_URL}?token=${encodeURIComponent(token)}`,
    );
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setSocketConnected(true);
    });

    socket.addEventListener("close", () => {
      setSocketConnected(false);
    });

    socket.addEventListener("message", (event) => {
      try {
        const nextState = JSON.parse(event.data) as MatchState;
        setMatchState(nextState);
        setError("");

        if (nextState.status === "matched" && nextState.sessionId) {
          navigate(`/collaboration/${nextState.sessionId}`);
        }
      } catch {
        setError("Received an invalid matchmaking event.");
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [navigate, token]);

  useEffect(() => {
    if (matchState?.status !== "searching" || !matchState.remainingMs) {
      setCountdownMs(null);
      return;
    }

    const expiresAt = Date.now() + matchState.remainingMs;

    const tick = () => {
      setCountdownMs(Math.max(0, expiresAt - Date.now()));
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [matchState]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void syncMatchState();
    }, MATCH_STATE_REFRESH_INTERVAL_MS);

    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") {
        void syncMatchState();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [syncMatchState, token]);

  const canSubmit = useMemo(
    () =>
      Boolean(selectedTopic) &&
      !submitting &&
      matchState?.status !== "searching",
    [matchState?.status, selectedTopic, submitting],
  );

  /* ── Handlers ───────────────────────────────────────── */

  async function createMatchRequest(): Promise<void> {
    if (!token || !selectedTopic) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      sessionStorage.removeItem("dead_session");
      const response = await fetch(`${MATCHING_API_URL}/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: selectedTopic,
          difficulty,
        }),
      });

      const json = (await response.json()) as {
        data?: MatchState;
        error?: string;
      };

      if (!response.ok || !json.data) {
        throw new Error(json.error || "Failed to create matchmaking request.");
      }

      setMatchState(json.data);

      if (json.data.status === "matched" && json.data.sessionId) {
        navigate(`/collaboration/${json.data.sessionId}`);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create matchmaking request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelMatchRequest(): Promise<void> {
    if (!token) {
      return;
    }

    try {
      setError("");
      const response = await fetch(`${MATCHING_API_URL}/requests/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error || "Failed to cancel request.");
      }

      setMatchState({
        status: "cancelled",
        requestId: matchState?.requestId || "cancelled",
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to cancel request.",
      );
    }
  }

  /* ── Derived state ──────────────────────────────────── */

  const isSearching = matchState?.status === "searching";
  const currentStatus = matchState?.status;

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="relative px-6 pb-20 pt-28 md:pt-32">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="bg-dot-grid absolute inset-0 opacity-40" />
          <div className="absolute top-12 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-sky-800/8 blur-[140px] animate-float-slow dark:bg-sky-400/10" />
          <div className="absolute right-[-6rem] top-28 h-64 w-64 rounded-full bg-violet-900/5 blur-[120px] animate-float-slower dark:bg-violet-400/8" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl">
          {/* ── Page header ──────────────────────────── */}
          <div className="animate-fade-up mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/80 px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              <span className={`h-2 w-2 rounded-full ${socketConnected ? "bg-emerald-500" : "bg-slate-400"}`} />
              {socketConnected ? "Connected" : "Connecting…"}
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl dark:text-white">
              Find a Peer
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400">
              Choose a topic and difficulty, join the queue, and jump into a
              live collaboration session as soon as a match is found.
            </p>
          </div>

          <div className="animate-fade-up delay-100 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* ── Left: Queue form ──────────────────── */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-7 shadow-[0_16px_48px_-28px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950/70">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Queue Preferences
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Signed in as{" "}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {user?.username}
                </span>
              </p>

              <div className="mt-7 space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="topic"
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Topic
                  </Label>
                  <select
                    id="topic"
                    value={selectedTopic}
                    onChange={(event) =>
                      setSelectedTopic(event.target.value)
                    }
                    className="surface-select h-11 w-full text-base"
                    disabled={loading || isSearching}
                  >
                    {topics.length === 0 && (
                      <option value="">No topics available</option>
                    )}
                    {topics.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="difficulty"
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Difficulty
                  </Label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(event) =>
                      setDifficulty(event.target.value)
                    }
                    className="surface-select h-11 w-full text-base"
                    disabled={loading || isSearching}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
                    {error}
                  </div>
                )}
              </div>

              <div className="mt-7 flex gap-3">
                <Button
                  size="lg"
                  className="min-w-36 bg-slate-950 text-white shadow-sm hover:bg-sky-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-sky-200"
                  onClick={createMatchRequest}
                  disabled={!canSubmit}
                >
                  {submitting ? (
                    "Submitting…"
                  ) : isSearching ? (
                    "In queue…"
                  ) : (
                    <>
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
                        className="mr-1.5"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                      </svg>
                      Find match
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="min-w-28 border-slate-300 text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-rose-800 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
                  onClick={cancelMatchRequest}
                  disabled={!isSearching}
                >
                  Cancel
                </Button>
              </div>
            </div>

            {/* ── Right: Live status ────────────────── */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-7 shadow-[0_16px_48px_-28px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950/70">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Match Status
              </h2>

              {/* Status badge */}
              <div className="mt-5">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium ${statusStyle(currentStatus)}`}
                >
                  <span className="relative flex h-2 w-2">
                    {isSearching && (
                      <span
                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${statusDot(currentStatus)}`}
                      />
                    )}
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${statusDot(currentStatus)}`}
                    />
                  </span>
                  {loading ? "Loading…" : statusLabel(currentStatus)}
                </div>
              </div>

              {/* ── Searching animation ──────────────── */}
              {isSearching && countdownMs !== null && (
                <div className="mt-6 rounded-xl border border-sky-200/60 bg-sky-50/50 p-5 dark:border-sky-900/50 dark:bg-sky-950/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-sky-800 dark:text-sky-200">
                        Looking for a peer…
                      </div>
                      <div className="mt-1 text-xs text-sky-600/80 dark:text-sky-300/60">
                        You'll be matched automatically
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold tabular-nums tracking-tight text-sky-900 dark:text-sky-100">
                        {formatRemainingTime(countdownMs)}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-sky-600/60 dark:text-sky-400/50">
                        remaining
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {matchState.remainingMs && (
                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-sky-200/60 dark:bg-sky-900/40">
                      <div
                        className="h-full rounded-full bg-sky-500 transition-all duration-1000 ease-linear dark:bg-sky-400"
                        style={{
                          width: `${Math.max(0, (countdownMs / matchState.remainingMs) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── Idle state ──────────────────────── */}
              {!isSearching && !partnerProfile && !loading && (
                <div className="mt-6 rounded-xl border border-dashed border-slate-300/80 bg-slate-50/50 px-5 py-8 text-center dark:border-slate-800 dark:bg-slate-950/30">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-400"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    No active search
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Configure your preferences and hit
                    &ldquo;Find match&rdquo; to start.
                  </p>
                </div>
              )}

              {/* ── Match details ───────────────────── */}
              {(matchState?.topic || matchState?.difficulty) && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {matchState.topic && (
                    <div className="rounded-xl border border-slate-200/60 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Topic
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {matchState.topic}
                      </div>
                    </div>
                  )}
                  {matchState.difficulty && (
                    <div className="rounded-xl border border-slate-200/60 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Difficulty
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {matchState.difficulty}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Partner card ──────────────────────── */}
              {partnerProfile && (
                <div className="mt-5 rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/60">
                    Your Match
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/80 bg-white text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {partnerPhotoPreview ? (
                        <img
                          src={partnerPhotoPreview}
                          alt={`${partnerProfile.username} profile`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>
                          {partnerProfile.username[0]?.toUpperCase() ||
                            "?"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {partnerProfile.username}
                      </div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {partnerProfile.university ||
                          "No university listed"}
                      </div>
                    </div>
                    <Link
                      to={`/users/${partnerProfile.id}`}
                      className="flex-shrink-0 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                    >
                      View profile →
                    </Link>
                  </div>
                  {partnerProfile.bio && (
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {partnerProfile.bio}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
