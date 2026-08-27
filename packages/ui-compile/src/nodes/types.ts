/**
 * The contracts a node kind implements.
 *
 * A kind is one vertical slice of the compiler: its IR shape, how a built JSX
 * element lowers into that shape, and how the shape emits JSON UI. Each slice
 * lives in its own module under `nodes/` and registers a {@link NodeDefinition};
 * the walks in `toIr.ts` and `emit.ts` own order and bookkeeping, and dispatch
 * through the definitions instead of switching on kinds.
 */

import type { JSX } from '@bedrock-core/ui-runtime';
import type { ChannelEntry, SlotEntry } from '@bedrock-core/ui-runtime/compile';
import type { Control, ControlEntry, Document } from '../jsonui';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NodeBase {
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

/**
 * How a label is drawn. The form render pack draws every label at
 * `font_size: small` scaled by a factor, so a compiled label does the same and
 * the measured layout agrees with what the engine paints.
 */
export interface LabelStyle {
  /** Engine font alias, e.g. `default` or `MinecraftTen`. */
  fontType: string;
  fontScaleFactor: number;
  shadow?: boolean;
}

/**
 * The IR node union, declared here as an open interface map so each kind's
 * module registers its own shape — `IrNode` is the union of this map's values,
 * and stays in step with the definitions without a hand-kept list.
 */
export interface IrNodeMap {}

export type IrNode = IrNodeMap[keyof IrNodeMap];

/** What a lowering sees: the element's solved geometry, and the walk's services. */
export interface LowerContext {
  /** Absolute rect of the parent the element is positioned against. */
  origin: Rect;
  /** Absolute rect as the layout pass left it. */
  own: Rect;
  /** `own`, made relative to `origin` — what the emitted control carries. */
  rect: Rect;
  /** The author's layer and visibility, if any. */
  decoration: { layer?: number; visible?: boolean };
  /** A document-unique name for this node, from a per-kind counter. */
  name(kind: string): string;
  /** The cell the allocation gave this element. Throws when the walks disagree. */
  slotOf(element: JSX.Element): SlotEntry;
  /** The channel the allocation gave this element. Throws when the walks disagree. */
  channelOf(element: JSX.Element, carrier: ChannelEntry['carrier']): ChannelEntry;
  /** Lowers an element's children, positioned against the given origin. */
  children(parent: JSX.Element, origin: Rect): IrNode[];
}

/** What the emitter carries down the tree. */
export interface Emit {
  ns: string;
  collection: string;
  /** The host renderer that hides the runtime's transport item, if the host has one. */
  ownedRenderer?: string;
  /** Text run signature -> shared definition name. */
  textNames: Map<string, string>;
  /** Button look signature -> shared definition name. */
  faceNames: Map<string, string>;
  /** Definitions a node needs of its own, such as a scroll region's content. */
  defs: Record<string, Control>;
  /** Emits one node through its definition — how a kind recurses into children. */
  emitNode(node: IrNode): ControlEntry;
}

/**
 * One node kind, end to end.
 *
 * The walks stay dumb: `toIr` dispatches `lower` by the JSX `type` strings a
 * kind claims, `emit` dispatches `emit` by `node.kind`, and the generic
 * traversals reach children only through `children`. Everything else — shapes,
 * shared definitions, document-level assembly — is the kind's own business.
 */
export interface NodeDefinition<N extends IrNode = IrNode> {
  kind: N['kind'];
  /** JSX host `type` strings this kind lowers from. */
  types?: readonly string[];
  /** Predicate alternative to {@link types}, for kinds claimed by a family of type strings. */
  matches?(type: string): boolean;
  /** Built element -> IR node. `type` says which of {@link types} matched. */
  lower?(element: JSX.Element, type: string, ctx: LowerContext): IrNode;
  /** The node's IR children, for the generic traversals. Leafs omit it. */
  children?(node: N): IrNode[];
  /** Marks the shared-definition shapes this node needs. */
  shapes?(node: N, into: Set<string>): void;
  /**
   * Definitions shared by every node of a shape this kind owns. Called once
   * per document, in definition order, with the shapes the tree actually uses.
   */
  sharedDefs?(ns: string, collection: string, kinds: Set<string>): Record<string, Control>;
  /**
   * Document-level definitions this kind derives from the whole tree — one
   * definition per distinct text channel or button look, shared by reference.
   * Called once per document, in definition order, before the screen is built.
   */
  assemble?(root: IrNode, document: Document, ctx: Emit): void;
  /** One node becomes one entry in its parent's `controls`. */
  emit(node: N, ctx: Emit): ControlEntry;
}
