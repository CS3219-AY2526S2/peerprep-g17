import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import QuestionForm from "@/components/questions/QuestionForm";
import QuestionDetailModal from "@/components/questions/QuestionDetailModal";
import { QUESTION_API_URL } from "@/config";
import {
  DIFFICULTIES,
  CATEGORIES,
  DIFFICULTY_STYLES,
  type QuestionRecord,
  type QuestionMeta,
  type ExampleRecord,
} from "@/types";

/* ═══════════════════════════════════════════════════════ */

export default function QuestionPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // ── Data ──────────────────────────────────────────
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [meta, setMeta] = useState<QuestionMeta | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Alerts ────────────────────────────────────────
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Filters ───────────────────────────────────────
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // ── Form visibility ───────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<QuestionRecord | null>(null);

  // ── Detail modal ──────────────────────────────────
  const [selectedQuestion, setSelectedQuestion] =
    useState<QuestionRecord | null>(null);

  // ── Seed ──────────────────────────────────────────
  const [seeding, setSeeding] = useState(false);

  // ── Filtering ───────────────────────────────────────
  const [sortField, setSortField] = useState<"title" | "difficulty" | null>(null)
  const [sortDirectory, setSortDirectory] = useState<"asc" | "desc">("asc");
  const DIFFICULTY_ORDER: Record<string, number> = {Easy: 0, Medium:1, Hard: 2};


  /* ── Helpers ─────────────────────────────────────── */

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  /* ── FETCH ───────────────────────────────────────── */

  async function fetchQuestions() {
    try {
      const params = new URLSearchParams();
      if (filterDifficulty) params.set("difficulty", filterDifficulty);
      if (filterCategory) params.set("categories", filterCategory);
      if (filterSearch) params.set("search", filterSearch);

      const url = params.toString()
        ? `${QUESTION_API_URL}?${params}`
        : QUESTION_API_URL;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to fetch questions.");
        return;
      }

      setQuestions(json.data);
      setMeta(json.meta || null);
    } catch {
      setError("Could not connect to Question Service.");
    } finally {
      setLoading(false);
    }
  }

  /* ── SUBMIT (create / update) ────────────────────── */

  async function handleFormSubmit(data: {
    title: string;
    difficulty: string;
    categories: string[];
    description: string;
    link: string;
    examples: ExampleRecord[];
  }) {
    clearMessages();
    setSubmitting(true);

    try {
      const isEditing = !!editingQuestion;
      const url = isEditing
        ? `${QUESTION_API_URL}/${editingQuestion.id}`
        : QUESTION_API_URL;

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Operation failed.");
        return;
      }

      setSuccess(
        isEditing
          ? "Question updated successfully."
          : "Question added successfully.",
      );
      setShowForm(false);
      setEditingQuestion(null);
      await fetchQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── DELETE ──────────────────────────────────────── */

  async function handleDelete(questionId: string) {
    clearMessages();

    try {
      const res = await fetch(`${QUESTION_API_URL}/${questionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to delete question.");
        return;
      }

      setSuccess("Question deleted.");
      if (selectedQuestion?.id === questionId) setSelectedQuestion(null);
      await fetchQuestions();
    } catch {
      setError("Could not connect to Question Service.");
    }
  }

  /* ── EDIT (open form with data) ─────────────────── */

  function startEdit(question: QuestionRecord) {
    setEditingQuestion(question);
    setSelectedQuestion(null);
    setShowForm(true);
    clearMessages();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── SEED ────────────────────────────────────────── */

  async function seedDatabase() {
    clearMessages();
    setSeeding(true);

    try {
      const res = await fetch(`${QUESTION_API_URL}/seed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to seed questions.");
        return;
      }

      setSuccess(json.data?.message || "Questions seeded successfully.");
      await fetchQuestions();
    } catch {
      setError("Could not connect to Question Service.");
    } finally {
      setSeeding(false);
    }
  }

  /* ── Effects ─────────────────────────────────────── */

  useEffect(() => {
    fetchQuestions();
  }, [token, filterDifficulty, filterCategory, filterSearch]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const questionCount = meta?.total ?? questions.length;
  const hasActiveFilters = !!(
    filterDifficulty ||
    filterCategory ||
    filterSearch
  );

  /* ── Filtering the Title ─────────────────────────────────────── */

   const handleTheSort = (field: "title" | "difficulty") => {
    if (sortField == field) {
        setSortDirectory(sortDirectory === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirectory("asc");
    }
  };

  const sortingTheQuestions = [...questions].sort((a, b) => {
    if (!sortField) return 0;
    if (sortField == "title") {
      return sortDirectory == "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title)
    }
    if (sortField === "difficulty") {
      const diff = (DIFFICULTY_ORDER[a.difficulty] ?? 0) - (DIFFICULTY_ORDER[b.difficulty] ?? 0);
      return sortDirectory === "asc" ? diff : -diff;
    }
    return 0;
  });


  /* ═══════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 pt-24 pb-16">
        {/* ── Header ──────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Questions</h1>
            <p className="mt-2 text-muted-foreground">
              {isAdmin
                ? "Create, view, and manage the question repository."
                : "Browse and explore the question repository."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {questionCount}{" "}
              {questionCount === 1 ? "question" : "questions"}
            </span>
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  onClick={seedDatabase}
                  disabled={seeding}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
                  {seeding ? "Seeding…" : "Seed Database"}
                </Button>
                <Button
                  onClick={() => {
                    if (showForm && !editingQuestion) {
                      setShowForm(false);
                      setEditingQuestion(null);
                    } else {
                      setEditingQuestion(null);
                      setShowForm(true);
                    }
                    clearMessages();
                  }}
                >
                  {showForm && !editingQuestion ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      Cancel
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                      Add Question
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Alerts ──────────────────────────────── */}
        {error && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
            {success}
          </div>
        )}

        {/* ── Form ───────────────────────────────── */}
        {isAdmin && showForm && (
          <QuestionForm
            key={editingQuestion?.id || "new"}
            initialData={
              editingQuestion
                ? {
                    title: editingQuestion.title,
                    difficulty: editingQuestion.difficulty,
                    categories: [...editingQuestion.categories],
                    description: editingQuestion.description,
                    link: editingQuestion.link || "",
                    examples: editingQuestion.examples,
                  }
                : null
            }
            isEditing={!!editingQuestion}
            submitting={submitting}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingQuestion(null);
            }}
          />
        )}

        {/* ── Filters ────────────────────────────── */}
        {!loading && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by title…"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-64"
            />
            <style>{`
              #filter-difficulty option, #filter-category option {
                background-color: #3e3e3e;
                color: #d4d4d4;
              }
            `} </style>
            <select
              id="filter-difficulty"
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="h-8 rounded-lg border border-input bg-[#3e3e3e] text-[#d4d4d4] px-3 text-sm outline-none"
            >
               <option value="">All Difficulties</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
            </select>
            <select
              id="filter-category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-8 rounded-lg border border-input bg-[#3e3e3e] text-[#d4d4d4] px-3 text-sm outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterDifficulty("");
                  setFilterCategory("");
                  setFilterSearch("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* ── Table ──────────────────────────────── */}
        {loading ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            Loading questions…
          </p>
        ) : questions.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
            </div>
            <p className="text-sm font-medium">No questions found</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Try adjusting your filters."
                : "Add your first question or seed the database."}
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th 
                    className="w-[30%] px-4 py-3 text-left font-medium text-muted-foreground"
                    onClick={() => handleTheSort("title")}
                  >
                    Title {sortField === "title" ? (sortDirectory == "asc" ? "↑" : "↓") : "↕"}
                  </th>
                  <th className="w-[10%] px-4 py-3 text-left font-medium text-muted-foreground"
                    onClick={() => handleTheSort("difficulty")}
                  >
                    Difficulty {sortField === "difficulty" ? (sortDirectory === "asc" ? "↑" : "↓") : "↕"}
                  </th>
                  <th className="w-[30%] px-4 py-3 text-left font-medium text-muted-foreground">
                    Categories
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortingTheQuestions.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedQuestion(q)}
                  >
                    <td className="px-4 py-3 font-medium">{q.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${
                          DIFFICULTY_STYLES[q.difficulty] ||
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(q.categories ?? []).map((cat) => (
                          <span
                            key={cat}
                            className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {q.link && (
                            <a
                              href={q.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                              title="Open on LeetCode"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                            </a>
                          )}
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => startEdit(q)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => handleDelete(q.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ── Question Detail Modal ────────────────── */}
      {selectedQuestion && (
        <QuestionDetailModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          onEdit={isAdmin ? startEdit : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
        />
      )}
    </div>
  );
}