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

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 pt-24 pb-12">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Match Test</h1>
          <p className="text-sm text-muted-foreground">
            Queue this account into the matching service and jump into a basic
            collaboration page when a match is found.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Queue Request</CardTitle>
              <CardDescription>
                Signed in as {user?.username} ({user?.id})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <select
                  id="topic"
                  value={selectedTopic}
                  onChange={(event) => setSelectedTopic(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
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
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                  disabled={loading || matchState?.status === "searching"}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button onClick={createMatchRequest} disabled={!canSubmit}>
                {submitting ? "Submitting..." : "Find match"}
              </Button>
              <Button
                variant="outline"
                onClick={cancelMatchRequest}
                disabled={matchState?.status !== "searching"}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current State</CardTitle>
              <CardDescription>
                WebSocket: {socketConnected ? "connected" : "disconnected"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Status
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {loading ? "Loading..." : matchState?.status || "idle"}
                </div>
              </div>

              {matchState?.topic && (
                <div className="text-sm text-muted-foreground">
                  Topic: <span className="text-foreground">{matchState.topic}</span>
                </div>
              )}
              {matchState?.difficulty && (
                <div className="text-sm text-muted-foreground">
                  Difficulty:{" "}
                  <span className="text-foreground">{matchState.difficulty}</span>
                </div>
              )}
              {matchState?.partnerUserId && (
                <div className="text-sm text-muted-foreground">
                  Partner:{" "}
                  <span className="text-foreground">
                    {matchState.partnerUserId}
                  </span>
                </div>
              )}
              {matchState?.questionId && (
                <div className="text-sm text-muted-foreground">
                  Question:{" "}
                  <span className="text-foreground">{matchState.questionId}</span>
                </div>
              )}
              {matchState?.status === "searching" && countdownMs !== null && (
                <div className="text-sm text-muted-foreground">
                  Time remaining:{" "}
                  <span className="font-medium text-foreground">
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
