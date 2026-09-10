import type { Binding, Control, ControlEntry } from '../jsonui';
import type { Emit } from '../nodes/utils/types';

export type { Binding, Control, ControlEntry, Emit };

/**
 * What one host does about one socket: the mirror of a face.
 *
 * A face is data to a look. A connector is a look plus an ADDRESS to a
 * mechanism — the control that stands in the face's place and makes it
 * carry a value, take a press, or hold an item.
 *
 * It never sees an IR node. Everything it needs is in its own payload: what
 * the control is called, where the host put it, and the name of whatever
 * shared definition it mounts. That is what lets a mechanism be read on its
 * own, and what keeps the two hosts from sharing anything but a word.
 *
 * Whatever it returns keeps the face's placement — size, offset, anchors,
 * layer — and the build refuses one that does not.
 */
export type Connector<D> = (data: D, face: ControlEntry, ctx: Emit) => ControlEntry;

/** Where the host put a control, and what it is called. */
export interface Addressed {
  /** The control's name in the emitted document. */
  name: string;
  /** The entry, row or container index the host allocated for it. */
  address: number;
  /** The screen-local definition this mounts, unqualified. */
  definition: string;
}

/** A definition a connector needs the screen to hold, by name. */
export type Definitions = Record<string, Control>;
