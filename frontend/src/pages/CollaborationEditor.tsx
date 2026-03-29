import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { yCollab } from "y-codemirror.next";
import { EditorView, basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { IndexeddbPersistence } from "y-indexeddb";

interface EditorProps {
  sessionId: string;
  username: string;
  token: string;
  onActivity?: () => void;
}

export interface CodeEditorHandle {
  format: () => Promise<void>;
  getCode: () => string;
  disconnect: () => void; 
}

const CodeEditor = forwardRef<CodeEditorHandle, EditorProps>(
  ({ sessionId, username, token, onActivity }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const ytextRef = useRef<Y.Text | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);
    

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
        const formatted = code.split("\n").map(line => {
          const stripped = line.trimStart();
          const indent = Math.round((line.length - stripped.length) / 4) * 4;
          return " ".repeat(indent) + stripped;
        }).join("\n").trimEnd() + "\n";
        
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
      const persistence = new IndexeddbPersistence(sessionId, ydoc);

      const provider = new WebsocketProvider(`${wsUrl}/ws/sessions`, sessionId, ydoc, {
        params: { token },
      });
      providerRef.current = provider;

      provider.awareness.setLocalStateField("user", {
        name: username,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      });

      const ytext = ydoc.getText("codemirror");
      ytextRef.current = ytext;

      const activityExtension = EditorView.updateListener.of((update) => {
        if (update.docChanged && onActivity) {
          onActivity();
        }
      });

      const state = EditorState.create({
        extensions: [
          basicSetup,
          python(),
          oneDark,
          yCollab(ytext, provider.awareness),
          activityExtension,
          EditorView.theme({ "&": { height: "450px" } }),
        ],
      });

      const view = new EditorView({ state, parent: editorRef.current });
      viewRef.current = view;

     return () => {
  provider.disconnect();
  provider.destroy(); 
  persistence.destroy(); 
  ydoc.destroy();
  view.destroy();
};
    }, [sessionId, username, token, onActivity]);

    return <div ref={editorRef} className="rounded-md border overflow-hidden bg-background shadow-inner" />;
  }
);

export default CodeEditor;