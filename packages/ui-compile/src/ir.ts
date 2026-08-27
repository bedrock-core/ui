/**
 * The compiler's intermediate representation: a tree whose geometry is already
 * solved and whose addresses are already handed out.
 *
 * Everything upstream of this — JSX, the fiber renderer, the flexbox pass, the
 * allocation walk — produces an `IrDocument`. Everything downstream turns it
 * into JSON UI. Keeping the seam here is deliberate: the emitter knows nothing
 * about components, entities or which screen it is drawing on, which is what
 * lets it be tested on a hand-written document and serve every host.
 *
 * Each node kind declares its own shape in its module under `nodes/`; this
 * module is the document around them, and the one place the shapes are
 * exported from. Rects are in texels, relative to the nearest node that
 * carries geometry.
 */

import type { SlotRole } from '@bedrock-core/ui-runtime';
import type { PanelNode } from './nodes/panel';

export type { SlotRole };
export type { IrNode, Rect } from './nodes/types';
export type { PanelNode } from './nodes/panel';
export type { LabelNode } from './nodes/label';
export type { ImageNode } from './nodes/image';
export type { SlotNode, SlotSource } from './nodes/slot';
export type { GridNode } from './nodes/grid';
export type { ButtonFace, ButtonNode } from './nodes/button';
export type { ExitNode } from './nodes/exit';
export type { ScrollNode } from './nodes/scroll';
export type { TextNode } from './nodes/text';

/**
 * How the container was carved up, in counts. The author never sees an index;
 * this is what the filter reports and sizes the entity's inventory from.
 *
 * The first slots are the sentinel, carrying the protocol key in their item
 * id and the layout key in their stack sizes. Drawn cells follow in document
 * order, so a screen reads left to right, top to bottom, the way it was
 * written. Channels come last, in the bank, where nothing on screen can
 * reach them.
 */
export interface Allocation {
  /** Number of sentinel slots, from 0. Named rather than assumed, because the router hard-codes them. */
  sentinels: number;
  /** Number of cells the layout draws. They occupy `sentinels .. sentinels + drawn - 1`. */
  drawn: number;
  /** Number of bank slots backing channels. They occupy `sentinels + drawn .. size - 1`. */
  channels: number;
  /** `minecraft:inventory` size the entity needs to host this screen. */
  size: number;
}

export interface IrDocument {
  /** JSON UI namespace for the emitted file. */
  namespace: string;
  /** The collection every addressed control reads from, e.g. `container_items`. */
  collection: string;
  /**
   * The host's item renderer that hides the runtime's transport item, fully
   * qualified (e.g. `chest.core_ui_gated_item`). A `hideOwned` grid draws its
   * cells with it. Present only when the host provides one.
   */
  ownedItemRenderer?: string;
  /** The canvas: every rect below is relative to it, and it sits at (0, 0). */
  root: PanelNode;
  /**
   * Full-screen texture drawn behind the canvas, from `<Background>`. Not part
   * of the root because it covers the whole screen, not the canvas.
   */
  backdrop?: string;
}
