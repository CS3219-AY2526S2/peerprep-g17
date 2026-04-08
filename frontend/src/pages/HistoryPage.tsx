import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { COLLABORATION_API_URL, QUESTION_API_URL } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Attempt {
  _id: string;
  sessionId: string;
  questionId: string;
  topic: string;
  difficulty: string;
  language: string;
  code: string;
  attemptedAt: string;
}

interface QuestionInfo {
  title: string;
  difficulty: string;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors =
    difficulty === "Easy"
      ? "bg-green-500/20 text-green-400"
      : difficulty === "Medium"
      ? "bg-amber-500/20 text-amber-400"
      : "bg-red-500/20 text-red-400";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors}`}>
      {difficulty}
    </span>
  );
}

export default function HistoryPage() {
  const { token } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [questions, setQuestions] = useState<Record<string, QuestionInfo>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const res = await fetch(`${COLLABORATION_API_URL}/sessions/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          const data: Attempt[] = json.data ?? [];
          setAttempts(data);

          const uniqueIds = [...new Set(data.map((a) => a.questionId))];
          const questionMap: Record<string, QuestionInfo> = {};
          await Promise.all(
            uniqueIds.map(async (id) => {
              try {
                const qRes = await fetch(`${QUESTION_API_URL}/${id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (qRes.ok) {
                  const qJson = await qRes.json();
                  questionMap[id] = {
                    title: qJson.data?.title ?? "Unknown Question",
                    difficulty: qJson.data?.difficulty ?? "",
                  };
                }
              } catch (_) {}
            })
          );
          setQuestions(questionMap);
        }
      } catch (_) {}
      finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Attempt History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            A record of all questions you've attempted in collaboration sessions.
          </p>
        </div>
        {loading && (
          <p className="text-sm text-muted-foreground animate-pulse">Loading history...</p>
        )}
        {!loading && attempts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border/40 rounded-xl">
            <p className="text-lg font-semibold text-muted-foreground">No attempts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Complete a collaboration session to see your history here.</p>
          </div>
        )}
        <div className="space-y-4">
          {attempts.map((attempt) => {
            const q = questions[attempt.questionId];
            const isExpanded = expanded === attempt._id;
            const date = new Date(attempt.attemptedAt);
            return (
              <Card key={attempt._id} className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {q?.title ?? attempt.topic}
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <DifficultyBadge difficulty={q?.difficulty ?? attempt.difficulty} />
                        <span className="text-xs text-muted-foreground">{attempt.language}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpanded(isExpanded ? null : attempt._id)}
                    >
                      {isExpanded ? "Hide Code" : "View Code"}
                    </Button>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="rounded-md border bg-zinc-950 text-zinc-100 font-mono text-xs p-4 max-h-[400px] overflow-y-auto">
                      <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                        <span className="text-zinc-500 uppercase tracking-widest text-[10px]">
                          Submitted Solution
                        </span>
                        <span className="text-zinc-600 text-[10px]">{attempt.language}</span>
                      </div>
                      {attempt.code ? (
                        <pre className="whitespace-pre-wrap">{attempt.code}</pre>
                      ) : (
                        <p className="text-zinc-500 italic">No code was saved for this attempt.</p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
