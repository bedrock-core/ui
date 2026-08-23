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
  /**
   * Draw order within the parent, from the author's `zIndex`.
   *
   * It matters more here than in a form, because a compiled screen shares a
   * parent with vanilla's own controls and those carry layers of their own —
   * `common_panel` paints its background at layer 1, which is enough to cover
   * anything left at the default.
   */
  layer?: number;
}

/** A container. Carries no visual of its own. */
export interface PanelNode extends NodeBase {
  kind: 'panel';
  children: IrNode[];
}

export interface LabelNode extends NodeBase {
  kind: 'label';
  /** Static text. Ignored when {@link LabelNode.channel} is set. */
  text: string;
  /** True only when `text` is a translation key. Labels localize by default. */
  localize?: boolean;
  color?: [number, number, number];
  shadow?: boolean;
}

export interface ImageNode extends NodeBase {
  kind: 'image';
  texture: string;
  /**
   * Bank slot whose value clips this image, if it is a fill.
   *
   * This is what a bar is made of: two images, the lower one whole and the
   * upper one clipped to a 0..1 number. There is no bar control, because there
   * does not need to be one — the same two primitives make a gauge, a meter, a
   * cooldown sweep or a health bar.
   */
  channel?: number;
  /** Which way the fill grows. Only meaningful alongside a channel. */
  direction?: ClipDirection;
}

/**
 * How a slot answers the player. Enforced by the runtime, never by the engine:
 * a container offers no way to veto a move, so a forbidden one is undone a tick
 * later rather than prevented.
 */
export type SlotRole = 'both' | 'input' | 'output' | 'button';

/** A real container slot the player can interact with. */
export interface SlotNode extends NodeBase {
  kind: 'slot';
  /** Index allocated by the compiler, not written by the author. */
  slot: number;
  role: SlotRole;
}

/**
 * An instantiation of a control the game already defines.
 *
 * The compiled screen owns the WHOLE chest screen, so anything vanilla the
 * author still wants — the background, the player's own inventory, the hotbar —
 * has to be asked for. This is how: it costs one control and no slots.
 */
export interface RefNode extends NodeBase {
  kind: 'ref';
  /** Fully qualified, e.g. `common.inventory_panel_bottom_half_with_label`. */
  ref: string;
  /** Left to the referenced control when false: some vanilla parts self-size. */
  sized: boolean;
}

/**
 * A run of characters the script writes as an ordinary string.
 *
 * One cell per character, each backed by its own bank slot: the slot's stack
 * size is the character code, and the label localizes `keyPrefix + code` so the
 * generated `.lang` decides what is drawn. That is the only way text reaches a
 * container screen -- no per-slot binding publishes a string.
 */
export interface TextNode extends NodeBase {
  kind: 'text';
  /** First bank slot. The run occupies `channel .. channel + length - 1`. */
  channel: number;
  /** How many characters the screen drew room for. */
  length: number;
  /** Key the code is appended to, e.g. `bcui.c.`. */
  keyPrefix: string;
  /** Width of one character cell, in texels. */
  cellWidth: number;
  color?: [number, number, number];
  shadow?: boolean;
}

export type IrNode
  = | PanelNode | LabelNode | ImageNode | SlotNode | TextNode | RefNode;

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
