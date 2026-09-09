/**
 * IR -> JSON UI, in two passes: the faces (`face.ts`), then the host's
 * mechanisms standing in for the sockets (`fill.ts`). This is the one call
 * for a caller that wants the served document and nothing in between.
 */

import { faceOf } from './face';
import { fill } from './fill';
import type { IrDocument } from './ir';
import type { Document } from './jsonui';
import type { HostEmit } from './nodes/types';

export { BACKDROP_DEFINITION, SCREEN_DEFINITION } from './face';

/**
 * Turns a solved tree into the JSON UI document one host serves.
 *
 * @param doc - The solved IR.
 * @param host - The screen it is drawn on: it supplies the mechanism for every
 *   socket, and whatever chrome it needs around them.
 */
export const emit = (doc: IrDocument, host: HostEmit): Document => fill(faceOf(doc), host);
