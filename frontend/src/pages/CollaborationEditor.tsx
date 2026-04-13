import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { yCollab } from "y-codemirror.next";
import { EditorView, basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  autocompletion,
  completeFromList,
  snippetCompletion,
} from "@codemirror/autocomplete";
import type { Awareness } from "y-protocols/awareness";
import { useTheme } from "@/components/ThemeProvider";

interface EditorProps {
  sessionId: string;
  username: string;
  token: string;
  initialCode?: string;
  sharedCode?: string;
  sharedYjsState?: string | null;
  onActivity?: () => void;
  onConnectionStatusChange?: (
    status: "connecting" | "connected" | "disconnected",
  ) => void;
}

export interface CodeEditorHandle {
  format: () => Promise<void>;
  getCode: () => string;
  disconnect: () => void;
}

const pythonSnippetCompletions = [
  snippetCompletion("for ${item} in ${iterable}:\n    ${pass}", {
    label: "for",
    type: "keyword",
    detail: "Loop template",
    info: "Insert a Python for-loop block.",
  }),
  snippetCompletion("if ${condition}:\n    ${pass}", {
    label: "if",
    type: "keyword",
    detail: "Conditional block",
    info: "Insert a Python if block.",
  }),
  snippetCompletion("elif ${condition}:\n    ${pass}", {
    label: "elif",
    type: "keyword",
    detail: "Else-if block",
    info: "Insert a Python elif block.",
  }),
  snippetCompletion("else:\n    ${pass}", {
    label: "else",
    type: "keyword",
    detail: "Else block",
    info: "Insert a Python else block.",
  }),
  snippetCompletion("while ${condition}:\n    ${pass}", {
    label: "while",
    type: "keyword",
    detail: "While loop",
    info: "Insert a Python while-loop block.",
  }),
  snippetCompletion("def ${function_name}(${args}):\n    ${pass}", {
    label: "def",
    type: "keyword",
    detail: "Function template",
    info: "Insert a Python function definition.",
  }),
  snippetCompletion("class ${ClassName}:\n    def __init__(self${params}):\n        ${pass}", {
    label: "class",
    type: "keyword",
    detail: "Class template",
    info: "Insert a Python class definition.",
  }),
  snippetCompletion("try:\n    ${pass}\nexcept ${Exception} as ${err}:\n    ${handle_error}", {
    label: "try",
    type: "keyword",
    detail: "Try/except block",
    info: "Insert a Python try/except block.",
  }),
  snippetCompletion("with ${expression} as ${value}:\n    ${pass}", {
    label: "with",
    type: "keyword",
    detail: "Context manager",
    info: "Insert a Python with block.",
  }),
  snippetCompletion("from ${module} import ${name}", {
    label: "from",
    type: "keyword",
    detail: "Import statement",
    info: "Insert a from-import statement.",
  }),
  snippetCompletion("import ${module}", {
    label: "import",
    type: "keyword",
    detail: "Import statement",
    info: "Insert an import statement.",
  }),
  snippetCompletion("return ${value}", {
    label: "return",
    type: "keyword",
    detail: "Return statement",
    info: "Insert a return statement.",
  }),
];

const CodeEditor = forwardRef<CodeEditorHandle, EditorProps>(
  (
    {
      sessionId,
      username,
      token,
      initialCode = "",
      sharedCode = "",
      sharedYjsState = null,
      onActivity,
      onConnectionStatusChange,
    },
    ref,
  ) => {
    const { theme } = useTheme();
    const editorRef = useRef<HTMLDivElement>(null);
    const ytextRef = useRef<Y.Text | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);
    const onActivityRef = useRef(onActivity);
    const initialCodeRef = useRef(initialCode);

    useEffect(() => {
      onActivityRef.current = onActivity;
    }, [onActivity]);

    useEffect(() => {
      initialCodeRef.current = initialCode;
    }, [initialCode]);

    const lightEditorTheme = EditorView.theme({
      "&": {
        height: "clamp(420px, 62vh, 760px)",
        backgroundColor: "#ffffff",
      },
      ".cm-scroller": {
        overflow: "auto",
        fontSize: "15px",
        lineHeight: "1.6",
      },
      ".cm-gutters": {
        backgroundColor: "#f8fafc",
        color: "#64748b",
        borderRight: "1px solid #e2e8f0",
      },
      ".cm-content": {
        caretColor: "#0f172a",
      },
      ".cm-activeLine": {
        backgroundColor: "#f8fafc",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "#f8fafc",
      },
      ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection":
        {
          backgroundColor: "#dbeafe",
        },
    });

    const darkEditorTheme = EditorView.theme({
      "&": {
        height: "clamp(420px, 62vh, 760px)",
      },
      ".cm-scroller": {
        overflow: "auto",
        fontSize: "15px",
        lineHeight: "1.6",
      },
    });

    useImperativeHandle(ref, () => ({
      disconnect() {
        if (providerRef.current) {
          providerRef.current.disconnect();
          providerRef.current.destroy();
        }
      },
      async format() {
        const ytext = ytextRef.current;
        if (!ytext) return;
        const code = ytext.toString();
        const formatted =
          code
            .split("\n")
            .map((line) => {
              const stripped = line.trimStart();
              const indent = Math.round((line.length - stripped.length) / 4) * 4;
              return " ".repeat(indent) + stripped;
            })
            .join("\n")
            .trimEnd() + "\n";

        ytext.delete(0, ytext.length);
        ytext.insert(0, formatted);
      },
      getCode() {
        return ytextRef.current?.toString() ?? "";
      },
    }));

    useEffect(() => {
      if (!editorRef.current || !token) return;

      const wsUrl = import.meta.env.VITE_COLLAB_WS_URL ?? "ws://localhost:8083";
      const ydoc = new Y.Doc();

      if (sharedYjsState) {
        try {
          const binaryString = atob(sharedYjsState);
          const update = Uint8Array.from(binaryString, (char) =>
            char.charCodeAt(0),
          );
          Y.applyUpdate(ydoc, update);
        } catch {
          // Fall back to the live socket sync path below.
        }
      }

      const ytext = ydoc.getText("codemirror");
      ytextRef.current = ytext;

      const collapseDuplicateStarterCode = () => {
        const starterCode = initialCodeRef.current;
        if (!starterCode.trim()) {
          return;
        }

        const currentText = ytext.toString();
        if (!currentText) {
          return;
        }

        let dedupedText = currentText;
        let repeatCount = 0;
        while (dedupedText.startsWith(starterCode)) {
          dedupedText = dedupedText.slice(starterCode.length);
          repeatCount += 1;
        }

        if (repeatCount > 1 && dedupedText.length === 0) {
          dedupedText = starterCode;
        } else {
          dedupedText = currentText;
        }

        if (dedupedText !== currentText) {
          ydoc.transact(() => {
            ytext.delete(0, ytext.length);
            ytext.insert(0, dedupedText);
          });
        }
      };

      const provider = new WebsocketProvider(
        `${wsUrl}/ws/sessions/`,
        sessionId,
        ydoc,
        {
          params: {
            token,
            username,
          },
        },
      );

      const setupWsFilter = () => {
        if (provider.ws) {
          const socket = provider.ws;
          const originalOnMessage = socket.onmessage;
          socket.onmessage = (event) => {
            if (typeof event.data === "string" && event.data.startsWith("{")) {
              return;
            }
            originalOnMessage?.call(socket, event);
          };
        }
      };

      const handleProviderStatus = (event: {
        status: "connected" | "disconnected" | "connecting";
      }) => {
        onConnectionStatusChange?.(event.status);
      };

      const handleSync = (isSynced: boolean) => {
        if (isSynced) {
          queueMicrotask(collapseDuplicateStarterCode);
        }
      };

      onConnectionStatusChange?.("connecting");
      setupWsFilter();
      provider.on("sync", handleSync);
      provider.on("status", setupWsFilter);
      provider.on("status", handleProviderStatus);
      providerRef.current = provider;

      provider.awareness.setLocalStateField("user", {
        name: username,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      });

      const filteredAwareness = new Proxy(provider.awareness as Awareness, {
        get(target, prop, receiver) {
          if (prop === "getStates") {
            return () => {
              const states = target.getStates();
              const filtered = new Map(states);
              filtered.forEach((state, clientId) => {
                if (
                  clientId !== target.doc.clientID &&
                  state?.user?.name === username
                ) {
                  filtered.delete(clientId);
                }
              });
              return filtered;
            };
          }

          return Reflect.get(target, prop, receiver);
        },
      });

      const activityExtension = EditorView.updateListener.of((update) => {
        if (update.docChanged && onActivityRef.current) {
          onActivityRef.current();
        }
      });

      const state = EditorState.create({
        doc: ytext.toString() || sharedCode || "",
        extensions: [
          basicSetup,
          python(),
          autocompletion({
            override: [completeFromList(pythonSnippetCompletions)],
            activateOnTyping: true,
          }),
          ...(theme === "dark" ? [oneDark, darkEditorTheme] : [lightEditorTheme]),
          yCollab(ytext, filteredAwareness),
          activityExtension,
        ],
      });

      const view = new EditorView({ state, parent: editorRef.current });
      viewRef.current = view;

      return () => {
        provider.off("sync", handleSync);
        provider.off("status", setupWsFilter);
        provider.off("status", handleProviderStatus);
        onConnectionStatusChange?.("disconnected");
        provider.disconnect();
        provider.destroy();
        view.destroy();
        viewRef.current = null;
        ydoc.destroy();
      };
    }, [
      initialCode,
      onConnectionStatusChange,
      sessionId,
      sharedCode,
      sharedYjsState,
      token,
      theme,
      username,
    ]);

    return (
      <div className="resize-y overflow-auto rounded-[1.1rem] border border-indigo-200/80 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div
          ref={editorRef}
          className="min-h-[420px] overflow-hidden rounded-xl border border-indigo-200/80 bg-white shadow-inner dark:border-slate-800 dark:bg-slate-950"
        />
      </div>
    );
  },
);

export default CodeEditor;
