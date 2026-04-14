import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { EditorStatus } from "@/lib/collaboration/types";

interface SharedEditorCardProps {
  editorSlot: ReactNode;
  editorStatus: EditorStatus;
  questionLoaded: boolean;
  runningMode: "run" | "submit" | null;
  explaining: boolean;
  codeCopied: boolean;
  onRun: () => void;
  onSubmit: () => void;
  onCopy: () => void;
  onExplain: () => void;
}

export function SharedEditorCard({
  editorSlot,
  editorStatus,
  questionLoaded,
  runningMode,
  explaining,
  codeCopied,
  onRun,
  onSubmit,
  onCopy,
  onExplain,
}: SharedEditorCardProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 rounded-2xl border border-indigo-200/80 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Shared Editor
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="min-w-20"
            onClick={onRun}
            disabled={runningMode !== null}
          >
            {runningMode === "run" ? "Running..." : "Run"}
          </Button>
          <Button
            size="sm"
            className="min-w-20"
            onClick={onSubmit}
            disabled={runningMode !== null}
          >
            {runningMode === "submit" ? "Submitting..." : "Submit"}
          </Button>
          <Button size="sm" variant="outline" onClick={onCopy}>
            {codeCopied ? "Copied" : "Copy"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onExplain}
            disabled={explaining}
          >
            Explain
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-slate-200/60 dark:border-slate-800">
        {questionLoaded ? (
          editorSlot
        ) : (
          <div className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">
            Loading shared starter code...
          </div>
        )}
      </div>

      {questionLoaded && editorStatus !== "connected" && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-200">
          {editorStatus === "connecting"
            ? "Shared editor connecting..."
            : "Shared editor disconnected. Your chat may still work while code sync reconnects."}
        </div>
      )}
    </div>
  );
}
