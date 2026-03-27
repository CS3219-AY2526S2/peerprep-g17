import * as Y from 'yjs';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';

const docs = new Map<string, Y.Doc>();

export function attachYjs(ws: any, req: any) {
  try {
    setupWSConnection(ws, req);
  } catch (e) {
    console.error("Yjs Setup failed internally, check node_modules/y-websocket");
  }
}