import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { yCollab } from "y-codemirror.next";
import { EditorView, basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { IndexeddbPersistence } from 'y-indexeddb'


interface EditorProps {
  sessionId: string;
  username: string;
  token: string;
}

export interface CodeEditorHandle {
  format: () => Promise<void>;
}

const CodeEditor = forwardRef<CodeEditorHandle, EditorProps>(
  ({ sessionId, username, token }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const ytextRef = useRef<Y.Text | null>(null);
    const viewRef = useRef<EditorView | null>(null);

    useImperativeHandle(ref, () => ({

      async format() {
        const ytext = ytextRef.current;
        if (!ytext) return;
        const code = ytext.toString();
        const formatted = code.split("\n")
          .map(line => {
            const stripped = line.trimStart();
            const indent = line.length - stripped.length;
            const normalizedIndent = Math.round(indent / 4) * 4;
            return " ".repeat(normalizedIndent) + stripped;
          })
          .join("\n")
          .trimEnd() + "\n";

        ytext.delete(0, ytext.length);
        ytext.insert(0, formatted);
      }
    }));

    useEffect(() => {
      if (!editorRef.current || !token) return;

      const wsUrl = import.meta.env.VITE_COLLAB_WS_URL ?? "ws://localhost:8083";
      const ydoc = new Y.Doc();
      new IndexeddbPersistence(sessionId, ydoc); 
      const provider = new WebsocketProvider(
        `${wsUrl}/ws/sessions`,
        sessionId,
        ydoc,
        { params: { token } }
      );

      provider.on("status", (event: { status: string }) => {
        console.log("[Collab] WebSocket status:", event.status);
      });

      provider.awareness.setLocalStateField("user", {
        name: username,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      });

      const ytext = ydoc.getText("codemirror");
      ytextRef.current = ytext;

      const state = EditorState.create({
        extensions: [
          basicSetup,
          python(),
          oneDark,
          yCollab(ytext, provider.awareness),
          EditorView.theme({
            "&": { height: "450px" },
            ".cm-scroller": { overflow: "auto" },
          }),
        ],
      });

      const view = new EditorView({ state, parent: editorRef.current });
      viewRef.current = view;

      return () => {
        provider.disconnect();
        ydoc.destroy();
        view.destroy();
      };
    }, [sessionId, username, token]);

    return <div ref={editorRef} className="rounded-md border overflow-hidden" />;
  }
);

export default CodeEditor;