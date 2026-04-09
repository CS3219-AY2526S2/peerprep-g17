import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { WebSocket } from "ws";
import CollaborationSession from "../models/CollaborationSession";
import { sessionSocketManager } from "./sessionSocketManager";

const messageSync = 0;
const messageAwareness = 1;

export const docs = new Map<string, Y.Doc>();
const awarenesses = new Map<string, awarenessProtocol.Awareness>();
const connections = new Map<string, Set<WebSocket>>();
const clientIds = new Map<WebSocket, number>();
const docsLoading = new Map<string, Promise<Y.Doc>>();

async function persistDoc(sessionId: string, doc: Y.Doc): Promise<void> {
  try {
    const state = Buffer.from(Y.encodeStateAsUpdate(doc));
    await CollaborationSession.findOneAndUpdate(
      { sessionId },
      { yjsState: state },
    );
  } catch (err) {
    console.error("[Yjs] Failed to persist doc:", err);
  }
}

async function loadDoc(sessionId: string, doc: Y.Doc): Promise<void> {
  try {
    const session = await CollaborationSession.findOne({ sessionId });
    if (session?.yjsState) {
      Y.applyUpdate(doc, new Uint8Array(session.yjsState));
      console.log(`[Yjs] Loaded ${session.yjsState.length} bytes for session ${sessionId}`);
    } else {
      console.log(`[Yjs] No persisted state for session ${sessionId}`);
    }
  } catch (err) {
    console.error("[Yjs] Failed to load doc:", err);
  }
}

export async function getOrCreateDoc(sessionId: string): Promise<Y.Doc> {
  if (docs.has(sessionId)) return docs.get(sessionId)!;
  if (docsLoading.has(sessionId)) return docsLoading.get(sessionId)!;

  const loadPromise = (async () => {
    const doc = new Y.Doc();
    await loadDoc(sessionId, doc);
    docs.set(sessionId, doc);
    awarenesses.set(sessionId, new awarenessProtocol.Awareness(doc));
    connections.set(sessionId, new Set());

    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    doc.on("update", () => {
      if (persistTimer) clearTimeout(persistTimer);
      persistTimer = setTimeout(() => {
        void persistDoc(sessionId, doc);
      }, 10);
    });

    docsLoading.delete(sessionId);
    return doc;
  })();

  docsLoading.set(sessionId, loadPromise);
  return loadPromise;
}

function broadcastToOthers(sessionId: string, sender: WebSocket, message: Uint8Array): void {
  const room = connections.get(sessionId);
  if (!room) return;
  for (const client of room) {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function broadcastToAll(sessionId: string, message: Uint8Array): void {
  const room = connections.get(sessionId);
  if (!room) return;
  for (const client of room) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

export async function setupYjsConnection(ws: WebSocket, sessionId: string): Promise<void> {
  const doc = await getOrCreateDoc(sessionId);
  const awareness = awarenesses.get(sessionId)!;
  const room = connections.get(sessionId)!;

  room.add(ws);

  const syncEncoder = encoding.createEncoder();
  encoding.writeVarUint(syncEncoder, messageSync);
  syncProtocol.writeSyncStep1(syncEncoder, doc);
  ws.send(encoding.toUint8Array(syncEncoder));

  const awarenessStates = awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, messageAwareness);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys()))
    );
    ws.send(encoding.toUint8Array(awarenessEncoder));
  }

  const updateHandler = (update: Uint8Array, origin: unknown) => {
    sessionSocketManager.recordActivity(sessionId);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    broadcastToOthers(sessionId, origin as WebSocket, encoding.toUint8Array(encoder));
  };

  const awarenessHandler = ({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }) => {
    const changedClients = added.concat(updated, removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
    );
    broadcastToOthers(sessionId, ws, encoding.toUint8Array(encoder));
  };

  doc.on("update", updateHandler);
  awareness.on("change", awarenessHandler);

  const messageHandler = (data: Buffer, isBinary: boolean) => {
    if (!isBinary) return;
    try {
      const uint8 = new Uint8Array(data);
      const decoder = decoding.createDecoder(uint8);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === messageSync) {
        const replyEncoder = encoding.createEncoder();
        encoding.writeVarUint(replyEncoder, messageSync);
        syncProtocol.readSyncMessage(decoder, replyEncoder, doc, ws);
        const reply = encoding.toUint8Array(replyEncoder);
        if (reply.byteLength > 1) {
          ws.send(reply);
        }
      } else if (messageType === messageAwareness) {
        const update = decoding.readVarUint8Array(decoder);
        try {
          const innerDecoder = decoding.createDecoder(update);
          const len = decoding.readVarUint(innerDecoder);
          if (len > 0) {
            const clientId = decoding.readVarUint(innerDecoder);
            clientIds.set(ws, clientId);
          }
        } catch {
        }
        awarenessProtocol.applyAwarenessUpdate(awareness, update, ws);
      }
    } catch (err) {
      console.error("[Yjs] Failed to handle message:", err);
    }
  };

  ws.on("message", messageHandler);
  ws.on("error", (err) => console.error("[Yjs] WebSocket error:", err));

  ws.on("close", () => {
    room.delete(ws);
    doc.off("update", updateHandler);
    awareness.off("change", awarenessHandler);

    const clientId = clientIds.get(ws);
    if (clientId !== undefined) {
      awarenessProtocol.removeAwarenessStates(awareness, [clientId], null);
      clientIds.delete(ws);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, [clientId])
      );
      broadcastToAll(sessionId, encoding.toUint8Array(encoder));
    }

    if (room.size === 0) {
      console.log(`[Yjs] Room empty for ${sessionId}, starting 3s grace period`);
      setTimeout(() => {
        const currentRoom = connections.get(sessionId);
        if (currentRoom && currentRoom.size > 0) {
          console.log(`[Yjs] Session ${sessionId} rejoined during grace period, skipping cleanup`);
          return;
        }
        persistDoc(sessionId, doc)
          .then(() => {
            docs.delete(sessionId);
            awarenesses.delete(sessionId);
            connections.delete(sessionId);
            console.log(`[Yjs] Session ${sessionId} persisted and cleaned up`);
          })
          .catch((err) => {
            console.error("[Yjs] Failed to persist on close:", err);
            docs.delete(sessionId);
            awarenesses.delete(sessionId);
            connections.delete(sessionId);
          });
      }, 3000);
    }
  });
}

export async function ensureStarterCode(
  sessionId: string,
  starterCode: string,
): Promise<boolean> {
  if (!starterCode.trim()) {
    return false;
  }

  const doc = await getOrCreateDoc(sessionId);
  const text = doc.getText("codemirror");

  if (text.length > 0 && text.toString().trim().length > 0) {
    return false;
  }

  if (text.length > 0) {
    text.delete(0, text.length);
  }
  text.insert(0, starterCode);
  await persistDoc(sessionId, doc);
  return true;
}

export async function getSessionCode(sessionId: string): Promise<string> {
  const doc = await getOrCreateDoc(sessionId);
  return doc.getText("codemirror").toString();
}
