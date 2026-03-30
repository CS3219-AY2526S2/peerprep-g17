import * as Y from 'yjs';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';

const docs = new Map<string, Y.Doc>();

export function attachYjs(ws: any, req: any, sessionId: string) {
    try {
        setupWSConnection(ws, req);
        console.log(`[Yjs] Attached to session: ${sessionId}`);
    } catch (e) {
        console.error("[Yjs] Could not start sync logic, but server is still alive.");
    }
}