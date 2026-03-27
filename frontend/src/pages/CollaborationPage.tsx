import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { COLLABORATION_API_URL } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import type { CollaborationSessionRecord } from "@/types";

export default function CollaborationPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [session, setSession] = useState<CollaborationSessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !sessionId) {
      return;
    }

    let cancelled = false;

    async function loadSession(): Promise<void> {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${COLLABORATION_API_URL}/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await response.json()) as {
          data?: CollaborationSessionRecord;
          error?: string;
        };

        if (!response.ok || !json.data) {
          throw new Error(json.error || "Failed to load collaboration session.");
        }

        if (!cancelled) {
          setSession(json.data);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load collaboration session.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId, token]);

  async function completeSession(): Promise<void> {
    if (!token || !sessionId) {
      return;
    }

    try {
      setCompleting(true);
      setError("");

      const response = await fetch(
        `${COLLABORATION_API_URL}/${sessionId}/complete`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const json = (await response.json()) as {
        data?: CollaborationSessionRecord;
        error?: string;
      };

      if (!response.ok || !json.data) {
        throw new Error(json.error || "Failed to complete collaboration session.");
      }

      setSession(json.data);
      navigate("/match");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to complete collaboration session.",
      );
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 pt-24 pb-12">
        <Card>
          <CardHeader>
            <CardTitle>Collaboration Session</CardTitle>
            <CardDescription>
              Basic test UI for the collaboration handoff path.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm text-muted-foreground">Loading session...</p>}

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {session && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Session ID
                  </div>
                  <div className="mt-1 font-medium">{session.sessionId}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Status
                  </div>
                  <div className="mt-1 font-medium">{session.status}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Topic
                  </div>
                  <div className="mt-1 font-medium">{session.topic}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Difficulty
                  </div>
                  <div className="mt-1 font-medium">{session.difficulty}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Question
                  </div>
                  <div className="mt-1 font-medium">{session.questionId}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Language
                  </div>
                  <div className="mt-1 font-medium">{session.language}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Participant A
                  </div>
                  <div className="mt-1 font-medium">{session.userAId}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Participant B
                  </div>
                  <div className="mt-1 font-medium">{session.userBId}</div>
                </div>
              </div>
            )}

            {session && (
              <p className="text-sm text-muted-foreground">
                Signed in as {user?.username} ({user?.id})
              </p>
            )}
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              onClick={completeSession}
              disabled={!session || session.status === "completed" || completing}
            >
              {completing ? "Completing..." : "Complete session"}
            </Button>
            <Link to="/match">
              <Button variant="outline">Back to match page</Button>
            </Link>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
