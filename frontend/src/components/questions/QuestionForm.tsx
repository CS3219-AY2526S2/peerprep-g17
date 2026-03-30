import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DIFFICULTIES, CATEGORIES } from "@/types";
import type { ExampleRecord } from "@/types";

interface QuestionFormData {
  title: string;
  difficulty: string;
  categories: string[];
  description: string;
  link: string;
  examples: ExampleRecord[];
}

interface QuestionFormProps {
  /** Pre-filled data when editing; null when creating. */
  initialData: QuestionFormData | null;
  isEditing: boolean;
  submitting: boolean;
  onSubmit: (data: QuestionFormData) => void;
  onCancel: () => void;
}

/**
 * Reusable form for creating and editing questions.
 * Manages its own internal state and calls `onSubmit` with cleaned data.
 */
export default function QuestionForm({
  initialData,
  isEditing,
  submitting,
  onSubmit,
  onCancel,
}: QuestionFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [difficulty, setDifficulty] = useState(
    initialData?.difficulty || DIFFICULTIES[0],
  );
  const [categories, setCategories] = useState<string[]>(
    initialData?.categories || [],
  );
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [link, setLink] = useState(initialData?.link || "");
  const [examples, setExamples] = useState<ExampleRecord[]>(
    initialData?.examples?.map((ex) => ({ ...ex })) || [],
  );
  const [validationError, setValidationError] = useState("");

  /* ── Category chips ────────────────────────────────── */

  function toggleCategory(category: string) {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  }

  /* ── Examples management ───────────────────────────── */

  function addExample() {
    setExamples((prev) => [...prev, { input: "", output: "" }]);
  }

  function removeExample(index: number) {
    setExamples((prev) => prev.filter((_, i) => i !== index));
  }

  function updateExample(
    index: number,
    field: keyof ExampleRecord,
    value: string,
  ) {
    setExamples((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)),
    );
  }

  /* ── Submit ────────────────────────────────────────── */

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setValidationError("");

    if (categories.length === 0) {
      setValidationError("Select at least one category.");
      return;
    }

    // Strip empty examples
    const cleanedExamples = examples.filter(
      (ex) => ex.input.trim() || ex.output.trim(),
    );

    onSubmit({
      title,
      difficulty,
      categories,
      description,
      link,
      examples: cleanedExamples,
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-border/50 p-6">
      <h2 className="text-lg font-semibold tracking-tight">
        {isEditing ? "Edit Question" : "New Question"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {isEditing
          ? "Modify the question details below."
          : "Fill in the details below to add a new question."}
      </p>

      {validationError && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {validationError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="form-title">Title</Label>
          <Input
            id="form-title"
            type="text"
            placeholder="e.g. Two Sum"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Difficulty + Link */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="form-difficulty">Difficulty</Label>
            <select
              id="form-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-[#3e3e3e] text-[#d4d4d4] px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              required
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="form-link">Link (optional)</Label>
            <Input
              id="form-link"
              type="url"
              placeholder="https://leetcode.com/problems/..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <Label>
            Categories{" "}
            <span className="font-normal text-muted-foreground">
              ({categories.length} selected)
            </span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const selected = categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-[#3e3e3e] text-[#d4d4d4] text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="form-description">Description</Label>
          <textarea
            id="form-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
            placeholder="Describe the problem statement, constraints, and expected behavior."
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {/* ── Examples editor ────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>
              Examples{" "}
              <span className="font-normal text-muted-foreground">
                ({examples.length})
              </span>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addExample}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Add Example
            </Button>
          </div>

          {examples.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No examples added yet. Click "Add Example" to include
              input/output samples.
            </p>
          )}

          {examples.map((ex, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Example {i + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeExample(i)}
                  title="Remove example"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground hover:text-destructive"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Input</Label>
                  <Input
                    placeholder='e.g. nums = [2,7,11,15], target = 9'
                    value={ex.input}
                    onChange={(e) => updateExample(i, "input", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Output</Label>
                  <Input
                    placeholder="e.g. [0,1]"
                    value={ex.output}
                    onChange={(e) => updateExample(i, "output", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  Explanation{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  placeholder="Because nums[0] + nums[1] == 9, we return [0,1]."
                  value={ex.explanation || ""}
                  onChange={(e) =>
                    updateExample(i, "explanation", e.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting
              ? isEditing
                ? "Saving…"
                : "Adding…"
              : isEditing
                ? "Save Changes"
                : "Add Question"}
          </Button>
        </div>
      </form>
    </section>
  );
}
