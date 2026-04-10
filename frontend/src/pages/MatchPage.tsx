import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { MATCHING_API_URL, MATCHING_WS_URL, QUESTION_API_URL } from "@/config";
import type { MatchState } from "@/types";

type QuestionMetaResponse = {
  meta?: {
    categories?: string[];
  };
};

function formatRemainingTime(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

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
  const sessionData = stateJson.data;

  const deadSessionId = sessionStorage.getItem("dead_session");

  if (sessionData.status === "matched" && sessionData.sessionId) {
    if (sessionData.sessionId === deadSessionId) {
      setMatchState({ ...sessionData, status: "idle" });
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

  const canSubmit = useMemo(
    () => Boolean(selectedTopic) && !submitting && matchState?.status !== "searching",
    [matchState?.status, selectedTopic, submitting],
  );

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="relative mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-12 pt-24">
        <div className="pointer-events-none absolute inset-x-6 top-10 -z-10 h-[24rem] rounded-[3rem] bg-gradient-to-br from-sky-100 via-white to-emerald-50/80 blur-3xl dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/60" />

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/90 px-3 py-1 text-xs text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-600 dark:bg-sky-300" />
            Matchmaking
          </div>

          <div className="mt-5 space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
              Find a Peer
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Choose a topic and difficulty, join the queue, and jump into a
              collaboration session as soon as a match is ready.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-2xl tracking-tight">Queue Request</CardTitle>
              <CardDescription>
                Signed in as {user?.username}. Set your preferences and enter the queue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-sm font-medium">Topic</Label>
                <select
                  id="topic"
                  value={selectedTopic}
                  onChange={(event) => setSelectedTopic(event.target.value)}
                  className="surface-select h-11 w-full text-base"
                  disabled={loading || matchState?.status === "searching"}
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
                <Label htmlFor="difficulty" className="text-sm font-medium">Difficulty</Label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                  className="surface-select h-11 w-full text-base"
                  disabled={loading || matchState?.status === "searching"}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button size="lg" className="min-w-36" onClick={createMatchRequest} disabled={!canSubmit}>
                {submitting ? "Submitting..." : "Find match"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="min-w-32"
                onClick={cancelMatchRequest}
                disabled={matchState?.status !== "searching"}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>

          <Card className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-2xl tracking-tight">Current State</CardTitle>
              <CardDescription>
                WebSocket: {socketConnected ? "connected" : "disconnected"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-800">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Status
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {loading ? "Loading..." : matchState?.status || "idle"}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {matchState?.topic && (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/85">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Topic
                    </div>
                    <div className="mt-1 text-base font-medium text-foreground">
                      {matchState.topic}
                    </div>
                  </div>
                )}
                {matchState?.difficulty && (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/85">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Difficulty
                    </div>
                    <div className="mt-1 text-base font-medium text-foreground">
                      {matchState.difficulty}
                    </div>
                  </div>
                )}
                {matchState?.partnerUserId && (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/85">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Partner
                    </div>
                    <div className="mt-1 text-base font-medium text-foreground break-all">
                      {matchState.partnerUserId}
                    </div>
                  </div>
                )}
                {matchState?.questionId && (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/85">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Question
                    </div>
                    <div className="mt-1 text-base font-medium text-foreground break-all">
                      {matchState.questionId}
                    </div>
                  </div>
                )}
              </div>

              {matchState?.status === "searching" && countdownMs !== null && (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
                  Time remaining:{" "}
                  <span className="font-semibold text-foreground dark:text-amber-100">
                    {formatRemainingTime(countdownMs)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
