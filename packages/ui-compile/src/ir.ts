/**
 * The compiler's intermediate representation: a tree whose geometry is already
 * solved and whose container indices are already handed out.
 *
 * Everything upstream of this — JSX, the fiber renderer, the flexbox pass, the
 * allocation walk — produces an `IrDocument`. Everything downstream turns it
 * into JSON UI. Keeping the seam here is deliberate: the emitter knows nothing
 * about components, entities or the chest screen, so it can be tested on a
 * hand-written document and serve other hosts later.
 *
 * Rects are in texels, relative to the nearest node that carries geometry.
 */

import type { SlotRole } from '@bedrock-core/ui-runtime';
export type { SlotRole };

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
   * It matters more here than in a form, because a compiled screen shares the
   * chest screen with vanilla's own controls and those carry layers of their
   * own — `common_panel` paints its background at layer 1, which is enough to
   * cover anything left at the default.
   */
  layer?: number;
  /** Present only when the author hid the control; JSON UI shows by default. */
  visible?: boolean;
}

/** A container. Draws its background, if it has one, behind its children. */
export interface PanelNode extends NodeBase {
  kind: 'panel';
  /** Nineslice texture drawn over the whole rect, under the children. */
  background?: string;
  children: IrNode[];
}

/**
 * How a label is drawn. The form render pack draws every label at
 * `font_size: small` scaled by a factor, so a compiled label does the same and
 * the measured layout agrees with what the engine paints.
 */
interface LabelStyle {
  /** Engine font alias, e.g. `default` or `MinecraftTen`. */
  fontType: string;
  fontScaleFactor: number;
  shadow?: boolean;
}

/** A baked string. May use any character, because nothing decodes it. */
export interface LabelNode extends NodeBase, LabelStyle {
  kind: 'label';
  text: string;
  /** True only when `text` is a translation key. Labels localize by default. */
  localize: boolean;
}

export interface ImageNode extends NodeBase {
  kind: 'image';
  texture: string;
}

/**
 * A slot reading a collection the screen does not own, at an author-given
 * index. The runtime never allocates or polls it: an interactive one is driven
 * by the engine's own take/place on that collection, a display-only one by
 * nothing at all.
 */
export interface SlotSource {
  /** JSON UI collection the cell reads, e.g. `inventory_items`. */
  collection: string;
  /** The cell of that collection to draw. */
  index: number;
  /** Whether the player can move items through it. */
  interactive: boolean;
}

/** A real container slot the player can interact with. */
export interface SlotNode extends NodeBase {
  kind: 'slot';
  /** Index from the allocation walk, never written by the author. Unused when foreign. */
  slot: number;
  /**
   * Enforced by the runtime, never by the engine: a container offers no way
   * to veto a move, so a forbidden one is undone a tick later rather than
   * prevented. An input slot also loses its drop routes in the JSON, the one
   * take the runtime cannot undo. Meaningful only for an interactive own slot.
   */
  role: SlotRole;
  /**
   * Whether the player can move items through the slot. A locked slot draws an
   * inert cell — the item shows but no route reaches it — since a container can
   * only undo a move a tick later, never veto one, and its {@link role} no
   * longer applies. A foreign slot carries its own flag on {@link source}.
   */
  interactive: boolean;
  /**
   * A collection other than the screen's own. Present makes the slot foreign:
   * `slot` and `role` no longer apply, and the runtime never touches it.
   */
  source?: SlotSource;
}

/**
 * A grid of cells over a collection the screen does not own — the player's
 * inventory or hotbar, or any JSON UI collection. Placed at its solved rect;
 * the runtime never allocates or polls it.
 */
export interface GridNode extends NodeBase {
  kind: 'grid';
  /** The collection every cell reads, e.g. `inventory_items`. */
  collection: string;
  columns: number;
  rows: number;
  /** Whether the player can move items through the cells. */
  interactive: boolean;
  /** Draw the cell that hides the runtime's transport item (inventory/hotbar). */
  hideOwned: boolean;
}

/**
 * What a button looks like instead of an item.
 *
 * A press can only reach script as an item move — JSON UI's button mappings
 * produce game actions, and the container transaction is the only one the
 * server sees. But nothing says the item has to be VISIBLE: `common.container_item`
 * takes its cell face, its item renderer and its button as variables, so the
 * icon can be replaced with nothing and the face with a real button. The item
 * stays as pure transport.
 */
export interface ButtonFace {
  texture: string;
  hover: string;
  pressed: string;
  /**
   * Drawn instead of `texture` while the button is disabled. Optional: a
   * button without one keeps its resting face when disabled, and only stops
   * reacting.
   */
  disabled?: string;
}

/**
 * A container slot drawn as a button, with its children baked into the face.
 *
 * The children were laid out by the flex engine like everything else, so they
 * are ordinary nodes positioned relative to the button's rect. Live text is not
 * among them: a face is a shared definition, and a channel index is not.
 */
export interface ButtonNode extends NodeBase {
  kind: 'button';
  /** Index from the allocation walk, never written by the author. */
  slot: number;
  face: ButtonFace;
  children: IrNode[];
}

/**
 * A scrolling region: a viewport at its solved rect, over content laid out
 * on its own and taller than the viewport. The client scrolls it; the layout
 * stays frozen. Children are positioned relative to the content's origin.
 */
export interface ScrollNode extends NodeBase {
  kind: 'scroll';
  /** Height of the content, at least the viewport's. */
  extent: number;
  children: IrNode[];
}

/**
 * The screen's close button: drawn like a button, but the press is the
 * client's — it closes the screen the way vanilla's own X does — so it has no
 * slot and the runtime never hears it. Its children are baked into the face
 * like any button's.
 */
export interface ExitNode extends NodeBase {
  kind: 'exit';
  face: ButtonFace;
  children: IrNode[];
}

/**
 * A run of characters the script writes as an ordinary string.
 *
 * One cell per character, each backed by its own bank slot: the slot's stack
 * size is the character code, and the label localizes `keyPrefix + code` so the
 * generated `.lang` decides what is drawn. That is the only way text reaches a
 * container screen -- no per-slot binding publishes a string.
 */
export interface TextNode extends NodeBase, LabelStyle {
  kind: 'text';
  /** First bank slot. The run occupies `channel .. channel + length - 1`. */
  channel: number;
  /** How many characters the screen drew room for. */
  length: number;
  /** Key the code is appended to, e.g. `core.ui.c.`. */
  keyPrefix: string;
}

export type IrNode
  = PanelNode | LabelNode | ImageNode | SlotNode | GridNode | ButtonNode | ExitNode | ScrollNode | TextNode;

/**
 * How the container was carved up, in counts. The author never sees an index;
 * this is what the filter reports and sizes the entity's inventory from.
 *
 * Slot 0 is the sentinel, carrying the protocol key in its item id and the
 * layout key in its durability. Drawn cells follow it in document order, so a
 * screen reads left to right, top to bottom, the way it was written. Channels
 * come last, in the bank, where nothing on screen can reach them.
 */
export interface Allocation {
  /** Always 0. Named rather than assumed, because the router hard-codes it. */
  sentinel: number;
  /** Number of cells the layout draws. They occupy `1 .. drawn`. */
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
  /** The entity type the screen's `<Container>` names. */
  entity: string;
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
  allocation: Allocation;
}
