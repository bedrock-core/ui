/**
 * The compiler's intermediate representation: a tree whose geometry is already
 * solved.
 *
 * Everything upstream of this — JSX, the fiber renderer, the flexbox pass —
 * produces an `IrDocument`. Everything downstream turns it into JSON UI. Keeping
 * the seam here is deliberate: the emitter knows nothing about containers,
 * slots-as-buttons or the chest screen, so the same emitter can serve other
 * screens and, later, the part-compiled hybrid.
 *
 * Rects are in texels, resolved against the layout's own origin.
 */

import type { ClipDirection } from './jsonui';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NodeBase {
  /** Unique within the document. Becomes the control name in the output. */
  name: string;
  rect: Rect;
}

/** A container. Carries no visual of its own. */
export interface PanelNode extends NodeBase {
  kind: 'panel';
  children: IrNode[];
}

export interface LabelNode extends NodeBase {
  kind: 'label';
  text: string;
  /** True only when `text` is a translation key. Labels localize by default. */
  localize?: boolean;
  color?: [number, number, number];
  shadow?: boolean;
}

export interface ImageNode extends NodeBase {
  kind: 'image';
  texture: string;
}

/** A real container slot the player can interact with. */
export interface SlotNode extends NodeBase {
  kind: 'slot';
  /** Index allocated by the compiler, not written by the author. */
  slot: number;
}

/**
 * A bar filled from a numeric channel. The channel is a bank slot, so the value
 * arrives as that slot's durability ratio.
 */
export interface BarNode extends NodeBase {
  kind: 'bar';
  /** Bank slot allocated for this channel. */
  channel: number;
  trackTexture: string;
  fillTexture: string;
  direction: ClipDirection;
}

export type IrNode = PanelNode | LabelNode | ImageNode | SlotNode | BarNode;

/**
 * How the compiler carved up the container. The author never sees an index; this
 * is what the runtime handle and the entity definition are generated from.
 *
 * Slot 0 is the sentinel, carrying the protocol key in its item id and the
 * layout key in its durability. Drawn slots follow it in document order, so a
 * screen reads left to right, top to bottom, the way it was written. Channels
 * come last, in the bank, where nothing on screen can reach them.
 */
export interface Allocation {
  /** Always 0. Named rather than assumed, because the router hard-codes it. */
  sentinel: number;
  /** Number of slots the layout draws. They occupy `1 .. drawn`. */
  drawn: number;
  /** Number of bank slots backing channels. They occupy `1 + drawn .. size - 1`. */
  channels: number;
  /** `minecraft:inventory` size the entity needs to host this screen. */
  size: number;
}

export interface IrDocument {
  /** JSON UI namespace for the emitted file. */
  namespace: string;
  /** The collection every slot and channel reads from, e.g. `container_items`. */
  collection: string;
  /** Name of the entry definition other files reference. */
  entry: string;
  root: PanelNode;
  allocation: Allocation;
}
