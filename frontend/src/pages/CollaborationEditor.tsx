import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { yCollab } from "y-codemirror.next";
import { EditorView, basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Awareness } from "y-protocols/awareness";

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
          oneDark,
          yCollab(ytext, filteredAwareness),
          activityExtension,
          EditorView.theme({ "&": { height: "clamp(320px, 52vh, 460px)" } }),
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
      username,
    ]);

    return (
      <div className="rounded-[1.1rem] border border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/70 to-sky-50/60 p-2 shadow-[0_18px_44px_-30px_rgba(79,70,229,0.32)] dark:border-slate-800 dark:bg-slate-950/80">
        <div
          ref={editorRef}
          className="overflow-hidden rounded-xl border border-indigo-200/80 bg-background shadow-inner dark:border-slate-800"
        />
      </div>
    );
  },
);

export default CodeEditor;
