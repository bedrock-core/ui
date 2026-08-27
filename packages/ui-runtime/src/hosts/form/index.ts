/**
 * The form hosts: a screen shown to one player, serialized for them when it is
 * shown.
 *
 * `host.ts` is the contract the registry reads, and is reachable without any
 * of the rest — nothing that merely asks which host a tree belongs to should
 * drag a runtime in behind it. `contract.ts` and `allocate.ts` are what the
 * emitted JSON UI and the runtime agree on.
 */

export { FORM_ACTION, FORM_MODAL } from './host';

export { allocate } from './allocate';
export type { EntryEntry, Placement } from './allocate';

export {
  COLLECTION, COMPILED_MARKER, compiledPrefix, DETAILS_BINDING, ENCODING_MAX, ENCODING_MIN,
  keyFrom, PROTOCOL_HEADER, titleFor,
} from './contract';
