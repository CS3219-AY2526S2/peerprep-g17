import { Button } from "@/components/ui/button";
import type { QuestionRecord } from "@/types";
import { DIFFICULTY_STYLES } from "@/types";

interface QuestionDetailModalProps {
  question: QuestionRecord;
  onClose: () => void;
  onEdit?: (question: QuestionRecord) => void;
  onDelete?: (questionId: string) => void;
}

/**
 * Full-screen overlay that displays a question's complete details
 * (description, examples, link) with Edit and Delete actions.
 */
export default function QuestionDetailModal({
  question,
  onClose,
  onEdit,
  onDelete,
}: QuestionDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border/50 bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        {/* Header */}
        <div className="pr-8">
          <h2 className="text-xl font-bold tracking-tight">
            {question.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-md border px-2.5 py-0.5 text-xs font-medium ${
                DIFFICULTY_STYLES[question.difficulty] ||
                "bg-muted text-muted-foreground"
              }`}
            >
              {question.difficulty}
            </span>
            {question.categories.map((cat) => (
              <span
                key={cat}
                className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mt-5">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Description
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {question.description}
          </p>
        </div>

        {/* Examples */}
        {question.examples.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Examples
            </h3>
            <div className="mt-2 space-y-3">
              {question.examples.map((ex, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm font-mono"
                >
                  <div>
                    <span className="text-muted-foreground font-sans text-xs font-medium">
                      Input:{" "}
                    </span>
                    {ex.input}
                  </div>
                  <div className="mt-1">
                    <span className="text-muted-foreground font-sans text-xs font-medium">
                      Output:{" "}
                    </span>
                    {ex.output}
                  </div>
                  {ex.explanation && (
                    <div className="mt-2 border-t border-border/30 pt-2 text-xs text-muted-foreground font-sans">
                      {ex.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link */}
        {question.link && (
          <div className="mt-5">
            <a
              href={question.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              View on LeetCode
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
            </a>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between border-t border-border/30 pt-4">
          <p className="text-xs text-muted-foreground">
            Added {new Date(question.createdAt).toLocaleDateString()}
          </p>
          {(onEdit || onDelete) && (
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(question)}
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(question.id)}
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
