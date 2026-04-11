import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { COLLABORATION_API_URL, QUESTION_API_URL } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DIFFICULTY_STYLES, type AttemptRecord, type AttemptSuggestion } from "@/types";

interface QuestionInfo {
  title: string;
  difficulty: string;
  categories: string[];
  description: string;
  link: string;
}

type DateFilter = "all" | "week" | "month" | "quarter";
type StatusFilter = "all" | "solved" | "unsolved" | "attempted";
type SortOption = "recent" | "oldest" | "difficulty";

const DIFFICULTY_ORDER: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        DIFFICULTY_STYLES[difficulty] || "border-border bg-muted text-muted-foreground"
      }`}
    >
      {difficulty || "Unknown"}
    </span>
  );
}

function getAttemptStatus(attempt: AttemptRecord): "solved" | "unsolved" | "attempted" {
  if (attempt.verdict === "Accepted") return "solved";
  if (attempt.verdict) return "unsolved";
  return "attempted";
}

function getStatusLabel(status: ReturnType<typeof getAttemptStatus>) {
  if (status === "solved") return "Solved";
  if (status === "unsolved") return "Unsolved";
  return "Attempted";
}

function getStatusClasses(status: ReturnType<typeof getAttemptStatus>) {
  if (status === "solved") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
  if (status === "unsolved") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400";
  }
  return "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300";
}

function isWithinDateRange(value: string, filter: DateFilter) {
  if (filter === "all") return true;
  const diff = Date.now() - new Date(value).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (filter === "week") return diff <= 7 * day;
  if (filter === "month") return diff <= 30 * day;
  return diff <= 90 * day;
}

function formatCodePreview(code: string) {
  const trimmed = code.trim();
  if (!trimmed) return "No submitted solution was saved for this attempt.";
  const singleLine = trimmed.replace(/\s+/g, " ");
  return singleLine.length > 120 ? `${singleLine.slice(0, 117)}...` : singleLine;
}

export default function HistoryPage() {
  const { token } = useAuth();
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [questions, setQuestions] = useState<Record<string, QuestionInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, AttemptSuggestion>>({});
  const [suggestionLoadingId, setSuggestionLoadingId] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState("");
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [reflectionNotes, setReflectionNotes] = useState<Record<string, string>>({});
  const [reflectionChecks, setReflectionChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const storedNotes = window.localStorage.getItem("attempt-reflection-notes");
      const storedChecks = window.localStorage.getItem("attempt-reflection-checks");
      if (storedNotes) {
        setReflectionNotes(JSON.parse(storedNotes) as Record<string, string>);
      }
      if (storedChecks) {
        setReflectionChecks(JSON.parse(storedChecks) as Record<string, boolean>);
      }
    } catch {
      // Keep reflection support non-blocking if local storage is unavailable.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "attempt-reflection-notes",
        JSON.stringify(reflectionNotes),
      );
    } catch {
      // Ignore local storage failures.
    }
  }, [reflectionNotes]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "attempt-reflection-checks",
        JSON.stringify(reflectionChecks),
      );
    } catch {
      // Ignore local storage failures.
    }
  }, [reflectionChecks]);

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        setError("");
        const res = await fetch(`${COLLABORATION_API_URL}/sessions/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          setError(json?.error || "Failed to load attempt history.");
          return;
        }
        const json = await res.json();
        const data: AttemptRecord[] = json.data ?? [];
        setAttempts(data);

        const uniqueIds = [...new Set(data.map((attempt) => attempt.questionId))];
        const entries = await Promise.all(
          uniqueIds.map(async (id) => {
            try {
              const qRes = await fetch(`${QUESTION_API_URL}/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!qRes.ok) return null;
              const qJson = await qRes.json();
              const record = qJson.data;
              return [
                id,
                {
                  title: record?.title ?? "Unknown Question",
                  difficulty: record?.difficulty ?? "",
                  categories: Array.isArray(record?.categories) ? record.categories : [],
                  description: record?.description ?? "",
                  link: record?.link ?? "",
                },
              ] as const;
            } catch {
              return null;
            }
          }),
        );

        setQuestions(
          Object.fromEntries(
            entries.filter((entry): entry is readonly [string, QuestionInfo] => !!entry),
          ),
        );
      } catch {
        setError("Could not connect to the collaboration service.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const topics = [...new Set(attempts.map((attempt) => attempt.topic).filter(Boolean))].sort();
  const filteredAttempts = attempts
    .filter((attempt) => {
      const question = questions[attempt.questionId];
      const title = question?.title ?? "";
      const categories = question?.categories ?? [];
      const searchTerm = search.trim().toLowerCase();
      const status = getAttemptStatus(attempt);
      const matchesSearch =
        !searchTerm ||
        title.toLowerCase().includes(searchTerm) ||
        attempt.topic.toLowerCase().includes(searchTerm) ||
        categories.some((category) => category.toLowerCase().includes(searchTerm));
      const matchesDate = isWithinDateRange(attempt.attemptedAt, dateFilter);
      const matchesDifficulty =
        difficultyFilter === "all" ||
        (question?.difficulty ?? attempt.difficulty) === difficultyFilter;
      const matchesTopic = topicFilter === "all" || attempt.topic === topicFilter;
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesDate && matchesDifficulty && matchesTopic && matchesStatus;
    })
    .sort((left, right) => {
      if (sortBy === "oldest") {
        return new Date(left.attemptedAt).getTime() - new Date(right.attemptedAt).getTime();
      }
      if (sortBy === "difficulty") {
        const leftDifficulty =
          DIFFICULTY_ORDER[questions[left.questionId]?.difficulty ?? left.difficulty] ?? 0;
        const rightDifficulty =
          DIFFICULTY_ORDER[questions[right.questionId]?.difficulty ?? right.difficulty] ?? 0;
        if (rightDifficulty !== leftDifficulty) return rightDifficulty - leftDifficulty;
      }
      return new Date(right.attemptedAt).getTime() - new Date(left.attemptedAt).getTime();
    });

  const selectedAttempt =
    filteredAttempts.find((attempt) => attempt._id === selectedAttemptId) ||
    attempts.find((attempt) => attempt._id === selectedAttemptId) ||
    null;
  const totalSolved = attempts.filter((attempt) => getAttemptStatus(attempt) === "solved").length;
  const totalUnsolved = attempts.filter((attempt) => getAttemptStatus(attempt) === "unsolved").length;
  const attemptsThisMonth = attempts.filter((attempt) => isWithinDateRange(attempt.attemptedAt, "month")).length;

  async function generateSuggestion(attempt: AttemptRecord) {
    if (!token || suggestionLoadingId) return;
    const question = questions[attempt.questionId];
    setSuggestionLoadingId(attempt._id);
    setSuggestionError("");
    try {
      const res = await fetch(`${COLLABORATION_API_URL}/sessions/history/suggestion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionTitle: question?.title ?? attempt.topic,
          questionDescription: question?.description ?? "",
          difficulty: question?.difficulty ?? attempt.difficulty,
          topics: question?.categories?.length ? question.categories : [attempt.topic],
          language: attempt.language,
          userCode: attempt.code,
          verdict: attempt.verdict,
          passedCount: attempt.passedCount,
          totalCount: attempt.totalCount,
          firstFailingCase: attempt.firstFailingCase,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setSuggestionError(json?.error || "Unable to generate an AI review right now.");
        return;
      }
      setSuggestions((current) => ({ ...current, [attempt._id]: json.data as AttemptSuggestion }));
      setRevealedSolutions((current) => ({ ...current, [attempt._id]: false }));
    } catch {
      setSuggestionError("Unable to generate an AI review right now.");
    } finally {
      setSuggestionLoadingId(null);
    }
  }

  function revealSolution(attemptId: string) {
    setRevealedSolutions((current) => ({ ...current, [attemptId]: true }));
  }

  function updateReflectionNote(attemptId: string, value: string) {
    setReflectionNotes((current) => ({ ...current, [attemptId]: value }));
  }

  function updateReflectionCheck(attemptId: string, value: boolean) {
    setReflectionChecks((current) => ({ ...current, [attemptId]: value }));
  }

  function clearFilters() {
    setSearch("");
    setDateFilter("all");
    setDifficultyFilter("all");
    setTopicFilter("all");
    setStatusFilter("all");
    setSortBy("recent");
  }

  const hasActiveFilters =
    !!search ||
    dateFilter !== "all" ||
    difficultyFilter !== "all" ||
    topicFilter !== "all" ||
    statusFilter !== "all" ||
    sortBy !== "recent";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="relative mx-auto max-w-6xl px-6 pb-12 pt-24">
        <div className="pointer-events-none absolute inset-x-6 top-10 -z-10 h-[20rem] rounded-[3rem] bg-gradient-to-br from-sky-100 via-white to-slate-100/80 blur-3xl dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />
        <section className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-none">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/90 px-3 py-1 text-xs text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-600 dark:bg-sky-300" />
            History
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
            Question Attempt History
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Review past submissions, inspect where an attempt broke down, and ask the AI coach for a hint before revealing the full suggested solution.
          </p>
        </section>
        {error && (
          <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/60"><CardHeader><CardDescription>Total Attempts</CardDescription><CardTitle className="text-3xl">{attempts.length}</CardTitle></CardHeader></Card>
          <Card className="border-border/60"><CardHeader><CardDescription>Solved</CardDescription><CardTitle className="text-3xl">{totalSolved}</CardTitle></CardHeader></Card>
          <Card className="border-border/60"><CardHeader><CardDescription>Unsolved</CardDescription><CardTitle className="text-3xl">{totalUnsolved}</CardTitle></CardHeader></Card>
          <Card className="border-border/60"><CardHeader><CardDescription>Attempts This Month</CardDescription><CardTitle className="text-3xl">{attemptsThisMonth}</CardTitle></CardHeader></Card>
        </section>
        <section className="mt-6 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))]">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, topic, or tag" className="h-11" />
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)} className="surface-select h-11"><option value="all">All time</option><option value="week">Past week</option><option value="month">Past month</option><option value="quarter">Past 3 months</option></select>
            <select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)} className="surface-select h-11"><option value="all">All difficulties</option><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select>
            <select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)} className="surface-select h-11"><option value="all">All topics</option>{topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="surface-select h-11"><option value="all">All statuses</option><option value="solved">Solved</option><option value="unsolved">Unsolved</option><option value="attempted">Attempted</option></select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className="surface-select h-11"><option value="recent">Most recent</option><option value="oldest">Oldest</option><option value="difficulty">Highest difficulty</option></select>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Showing {filteredAttempts.length} of {attempts.length} attempts</p>
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
          </div>
        </section>
        {loading ? (
          <p className="mt-8 animate-pulse text-sm text-muted-foreground">Loading history...</p>
        ) : filteredAttempts.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/40 py-24 text-center">
            <p className="text-lg font-semibold text-muted-foreground">No matching attempts</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">Try adjusting your filters, or complete a collaboration session to start building your review history.</p>
          </div>
        ) : (
          <section className="mt-8 space-y-4">
            {filteredAttempts.map((attempt) => {
              const question = questions[attempt.questionId];
              const status = getAttemptStatus(attempt);
              const date = new Date(attempt.attemptedAt);
              return (
                <Card key={attempt._id} className="border-border/60">
                  <CardHeader className="gap-3">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <DifficultyBadge difficulty={question?.difficulty ?? attempt.difficulty} />
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(status)}`}>{getStatusLabel(status)}</span>
                          <span className="text-xs text-muted-foreground">{attempt.language}</span>
                          {typeof attempt.passedCount === "number" && typeof attempt.totalCount === "number" && <span className="text-xs text-muted-foreground">{attempt.passedCount}/{attempt.totalCount} passed</span>}
                        </div>
                        <div>
                          <CardTitle className="text-xl">{question?.title ?? attempt.topic}</CardTitle>
                          <CardDescription className="mt-1">{attempt.topic}{question?.categories?.length ? ` • ${question.categories.join(" • ")}` : ""}</CardDescription>
                        </div>
                        <p className="text-sm text-muted-foreground">Attempted on {date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })} at {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedAttemptId(attempt._id); setSuggestionError(""); }}>Review Attempt</Button>
                        <Button size="sm" onClick={() => { setSelectedAttemptId(attempt._id); setSuggestionError(""); void generateSuggestion(attempt); }} disabled={suggestionLoadingId === attempt._id || !attempt.code.trim()}>
                          {suggestionLoadingId === attempt._id ? "Generating hint..." : "AI Hint"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-xl border border-border/50 bg-muted/25 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Submitted Solution Preview</p>
                      <p className="mt-2 font-mono text-xs leading-6 text-foreground/90">{formatCodePreview(attempt.code)}</p>
                    </div>
                    {attempt.firstFailingCase && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">First Failing Case</p>
                        <p className="mt-2 text-sm text-amber-900/80 dark:text-amber-100/80">{attempt.firstFailingCase.errorMessage || attempt.firstFailingCase.stderr || "The submission failed on at least one hidden or visible case."}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}
      </main>
      {selectedAttempt && (
        <AttemptDetailsModal
          attempt={selectedAttempt}
          question={questions[selectedAttempt.questionId]}
          suggestion={suggestions[selectedAttempt._id]}
          suggestionError={suggestionError}
          isLoading={suggestionLoadingId === selectedAttempt._id}
          solutionRevealed={!!revealedSolutions[selectedAttempt._id]}
          reflectionNote={reflectionNotes[selectedAttempt._id] ?? ""}
          reflectionChecked={!!reflectionChecks[selectedAttempt._id]}
          onClose={() => setSelectedAttemptId(null)}
          onGenerateSuggestion={() => void generateSuggestion(selectedAttempt)}
          onRevealSolution={() => revealSolution(selectedAttempt._id)}
          onReflectionNoteChange={(value) =>
            updateReflectionNote(selectedAttempt._id, value)
          }
          onReflectionCheckChange={(value) =>
            updateReflectionCheck(selectedAttempt._id, value)
          }
        />
      )}
    </div>
  );
}

interface AttemptDetailsModalProps {
  attempt: AttemptRecord;
  question?: QuestionInfo;
  suggestion?: AttemptSuggestion;
  suggestionError: string;
  isLoading: boolean;
  solutionRevealed: boolean;
  reflectionNote: string;
  reflectionChecked: boolean;
  onClose: () => void;
  onGenerateSuggestion: () => void;
  onRevealSolution: () => void;
  onReflectionNoteChange: (value: string) => void;
  onReflectionCheckChange: (value: boolean) => void;
}

function AttemptDetailsModal({
  attempt,
  question,
  suggestion,
  suggestionError,
  isLoading,
  solutionRevealed,
  reflectionNote,
  reflectionChecked,
  onClose,
  onGenerateSuggestion,
  onRevealSolution,
  onReflectionNoteChange,
  onReflectionCheckChange,
}: AttemptDetailsModalProps) {
  const status = getAttemptStatus(attempt);
  const attemptedAt = new Date(attempt.attemptedAt);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Close attempt details">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
        <div className="pr-10">
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={question?.difficulty ?? attempt.difficulty} />
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(status)}`}>{getStatusLabel(status)}</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">{question?.title ?? attempt.topic}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{attempt.topic}{question?.categories?.length ? ` • ${question.categories.join(" • ")}` : ""}</p>
          <p className="mt-1 text-sm text-muted-foreground">Attempted on {attemptedAt.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })} at {attemptedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="border-border/60" size="sm"><CardHeader><CardDescription>Verdict</CardDescription><CardTitle>{attempt.verdict ?? "Not submitted"}</CardTitle></CardHeader></Card>
          <Card className="border-border/60" size="sm"><CardHeader><CardDescription>Test Cases</CardDescription><CardTitle>{typeof attempt.passedCount === "number" && typeof attempt.totalCount === "number" ? `${attempt.passedCount}/${attempt.totalCount}` : "N/A"}</CardTitle></CardHeader></Card>
          <Card className="border-border/60" size="sm"><CardHeader><CardDescription>Runtime / Memory</CardDescription><CardTitle>{attempt.runtimeMs ? `${attempt.runtimeMs} ms` : "N/A"} / {attempt.memoryKb ? `${attempt.memoryKb} KB` : "N/A"}</CardTitle></CardHeader></Card>
        </div>
        {question?.description && (
          <div className="mt-6 rounded-2xl border border-border/50 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Question Overview</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/90">{question.description}</p>
            {question.link && <a href={question.link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">Open original question</a>}
          </div>
        )}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/50 bg-zinc-950 p-4 text-zinc-100">
              <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">Submitted Solution</p>
                <span className="text-[11px] text-zinc-500">{attempt.language}</span>
              </div>
              {attempt.code.trim() ? <pre className="whitespace-pre-wrap font-mono text-xs leading-6">{attempt.code}</pre> : <p className="text-sm text-zinc-400">No code was saved for this attempt.</p>}
            </div>
            {attempt.firstFailingCase && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Debug Context</p>
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Verdict:</span> {attempt.firstFailingCase.verdict}</p>
                  {attempt.firstFailingCase.inputPreview && <p className="whitespace-pre-wrap text-muted-foreground"><span className="font-medium text-foreground">Input:</span> {attempt.firstFailingCase.inputPreview}</p>}
                  {attempt.firstFailingCase.expectedPreview && <p className="whitespace-pre-wrap text-muted-foreground"><span className="font-medium text-foreground">Expected:</span> {attempt.firstFailingCase.expectedPreview}</p>}
                  {attempt.firstFailingCase.actualPreview && <p className="whitespace-pre-wrap text-muted-foreground"><span className="font-medium text-foreground">Actual:</span> {attempt.firstFailingCase.actualPreview}</p>}
                  {(attempt.firstFailingCase.errorMessage || attempt.firstFailingCase.stderr) && <p className="whitespace-pre-wrap text-muted-foreground"><span className="font-medium text-foreground">Error:</span> {attempt.firstFailingCase.errorMessage || attempt.firstFailingCase.stderr}</p>}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">AI Coach</p>
                  <h3 className="mt-2 text-lg font-semibold">Hint first, full solution only when revealed</h3>
                </div>
                <Button size="sm" onClick={onGenerateSuggestion} disabled={isLoading || !attempt.code.trim()}>{isLoading ? "Generating..." : suggestion ? "Refresh Hint" : "Generate Hint"}</Button>
              </div>
              {!attempt.code.trim() && <p className="mt-3 text-sm text-sky-900/80 dark:text-sky-100/80">This attempt has no saved code, so there is not enough context to generate a tailored hint.</p>}
              {suggestionError && <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">{suggestionError}</p>}
              {suggestion && (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-violet-500/20 bg-background/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Reflect Before Revealing</p>
                    <p className="mt-2 text-sm leading-6 text-foreground/90">
                      Pause for a minute and write down what you think went wrong,
                      what idea you would try next, or which edge case you missed.
                    </p>
                    <label className="mt-4 flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-3 text-sm text-foreground">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-border"
                        checked={reflectionChecked}
                        onChange={(event) =>
                          onReflectionCheckChange(event.target.checked)
                        }
                      />
                      <span>
                        I have thought about how I would improve this solution before
                        revealing the full answer.
                      </span>
                    </label>
                    <textarea
                      value={reflectionNote}
                      onChange={(event) => onReflectionNoteChange(event.target.value)}
                      placeholder="Reflection notes: What did I misunderstand? What would I try next? Which test case would I add?"
                      className="mt-4 min-h-32 w-full rounded-xl border border-border/60 bg-background px-3 py-3 text-sm outline-none transition focus:border-primary"
                    />
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      <p>Prompt 1: What specific part of your approach broke down?</p>
                      <p>Prompt 2: Which data structure or pattern might fit better?</p>
                      <p>Prompt 3: What test case would you use to catch this mistake earlier?</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-sky-500/20 bg-background/80 p-4"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Hint</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{suggestion.hint}</p></div>
                  {suggestion.improvementAreas && <div className="rounded-xl border border-border/50 bg-background/80 p-4"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">What To Improve</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{suggestion.improvementAreas}</p></div>}
                  {suggestion.approach && <div className="rounded-xl border border-border/50 bg-background/80 p-4"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Recommended Approach</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{suggestion.approach}</p></div>}
                  {suggestion.takeaway && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">Key Takeaway</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/80">{suggestion.takeaway}</p></div>}
                  <div className="rounded-xl border border-border/50 bg-background/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Suggested Solution</p>
                        <p className="mt-1 text-sm text-muted-foreground">Hidden by default so users can reflect on the hint before seeing the full answer.</p>
                      </div>
                      {!solutionRevealed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onRevealSolution}
                          disabled={!reflectionChecked}
                        >
                          Reveal Solution
                        </Button>
                      )}
                    </div>
                    {solutionRevealed ? (
                      <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-border/50 bg-muted/30 p-4 font-mono text-xs leading-6">{suggestion.solution || "No solution was generated."}</pre>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                        Review the hint, write a short reflection, and check the box before revealing the full solution.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
