/**
 * The contracts a node kind implements.
 *
 * A kind is one vertical slice of the compiler: its IR shape, how a built JSX
 * element lowers into that shape, and how the shape draws. Each slice lives in
 * its own module under `nodes/` and registers a {@link NodeDefinition}; the
 * walks in `toIr.ts`, `face.ts` and `fill.ts` own order and bookkeeping, and
 * dispatch through the definitions instead of switching on kinds.
 *
 * A node is two things ([03-ir](../../../docs/03-ir.md)): what the player sees
 * and what it physically is on the screen it is drawn on. The kind owns the
 * first — its {@link NodeDefinition.face} — and says through
 * {@link NodeDefinition.socket} when it has a second, which a host supplies
 * ([10-faces-and-hosts](../../../docs/10-faces-and-hosts.md)).
 */

import type { JSX } from '@bedrock-core/ui-runtime';
import type { CellRole } from '@bedrock-core/ui-runtime/compile';
import type { Control, ControlEntry, Document } from '../../jsonui';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NodeBase {
  /** Unique within the document. Becomes the control name in the output. */
  name: string;
  /**
   * What the author calls this node, when something beside it has to name it.
   *
   * Sibling-scoped, because both readers are: a look DRAWS a sibling of its
   * swap, and a follower FOLLOWS one. Nothing else resolves an id, and no id
   * reaches the output — the swap's is the exception, and it is qualified with
   * the screen first.
   */
  id?: string;
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
  /**
   * Where this node's visibility travels, when the probes saw it move: the
   * carrier the host allocated — an entry on an action form, a row on a modal,
   * refused outright on a chest.
   *
   * The address and nothing else. What the build rendered with is already on
   * the node, as its own `visible`, and both readers take it from there: the
   * FACE draws it, because a face with no host behind it — a gallery preview —
   * has nothing else to hide it; and the GATE seeds itself with it, so nothing
   * flashes before the first binding resolves. The gate then clears the face's
   * copy as it wraps it, which is the handoff rather than waste: from that
   * moment the entry decides, and a face still saying `visible: false` would
   * stay hidden when the gate opened.
   *
   * It lives on every node rather than being declared by a kind, because any
   * node at all can have its visibility carried — unlike a press or a slot,
   * which belong to what the node IS. The gate wraps whatever the node turned
   * out to be.
   */
  carriedVisible?: number;
  /**
   * The `id` of a swap this node is drawn while ON.
   *
   * The one place something reads a swap back rather than being drawn inside
   * it, and it exists for the one case that cannot nest: a fold's rows have to
   * reflow what is under them, and content inside a look has no say over its
   * siblings. Everything else a swap shows belongs in the look.
   *
   * Still client-only — the read is a `view` binding between siblings, which
   * no host is involved in — so it lives in the face document like any other
   * static property. Which is also why the swap has to BE a sibling: an
   * element writes `follows: true` and the lowering fills in the swap before
   * it, or names one explicitly when it has a reason to.
   */
  follows?: string;
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
  /** Glyph colour, RGB in 0..1. */
  color?: readonly [number, number, number];
  /** Where the glyphs sit in a box wider than the text. Absent: the engine's left. */
  textAlignment?: 'left' | 'center' | 'right';
}

/**
 * The IR node union, declared here as an open interface map so each kind's
 * module registers its own shape — `IrNode` is the union of this map's values,
 * and stays in step with the definitions without a hand-kept list.
 */
export interface IrNodeMap {}

export type IrNode = IrNodeMap[keyof IrNodeMap];

/**
 * Where a cell lives on its host, and what it is.
 *
 * The number means whatever the host said it means — a container index on a
 * chest screen, a `form_buttons` entry on a form. The IR carries it without
 * knowing which, because the walk that hands them out is the host's
 * (`allocate`) and the emitter that reads them back is the host's too.
 */
export interface CellAddress {
  readonly address: number;
  readonly role: CellRole;
}

/** Where a live value travels, and how much room it was given. */
export interface ChannelAddress {
  readonly address: number;
  readonly length: number;
}

/** How a host answers "where does this element live?" for one built tree. */
export interface Addressing {
  readonly cells: ReadonlyMap<JSX.Element, CellAddress>;
  readonly channels: ReadonlyMap<JSX.Element, ChannelAddress>;
  /** Where the host put each carried `visible`: the entry its bool rides. */
  readonly visibles?: ReadonlyMap<JSX.Element, number>;
}

/** What a lowering sees: the element's solved geometry, and the walk's services. */
export interface LowerContext {
  /** Absolute rect of the parent the element is positioned against. */
  origin: Rect;
  /** Absolute rect as the layout pass left it. */
  own: Rect;
  /** `own`, made relative to `origin` — what the emitted control carries. */
  rect: Rect;
  /** The author's layer and visibility, if any — and the entry a carried visible rides. */
  decoration: { layer?: number; visible?: boolean; carriedVisible?: number; follows?: string };
  /** A document-unique name for this node, from a per-kind counter. */
  name(kind: string): string;
  /** Where the host put this element's cell. Throws when the walks disagree. */
  cellOf(element: JSX.Element): CellAddress;
  /** Where the host put this element's live value. Throws when the walks disagree. */
  channelOf(element: JSX.Element): ChannelAddress;
  /** Lowers an element's children, positioned against the given origin. */
  children(parent: JSX.Element, origin: Rect): IrNode[];
}

/**
 * What a node physically is on a host, when it is more than its look.
 *
 *  - `press`   — a button whose press reaches script.
 *  - `text`    — a label whose string changes at runtime.
 *  - `texture` — an image whose path changes at runtime.
 *  - `slot`    — a cell over a collection: the screen's own, or a foreign one.
 *  - `grid`    — a grid of cells over a foreign collection.
 *  - `field`   — a native control the engine owns while the screen is open.
 *  - `list`    — a variable count of rows behind one carried int.
 *  - `visible` — a subtree whose visibility is carried.
 *
 * A host serves the kinds it has a mechanism for and refuses the rest at
 * build, by name.
 */
export type SocketKind = 'press' | 'text' | 'texture' | 'slot' | 'grid' | 'field' | 'list' | 'visible';

/** One place a host has to supply a mechanism: the node, and which mechanism. */
export interface Socket {
  readonly node: IrNode;
  readonly kind: SocketKind;
}

/** What the face pass carries down the tree. */
export interface FaceEmit {
  /** The screen's JSON UI namespace. */
  ns: string;
  /** The namespace of the addon's shared faces, `<addon>_faces`. */
  facesNs: string;
  /**
   * The faces this screen shares with every other screen of the addon, by a
   * name derived from the look itself, so the same look is one definition
   * however many screens draw it.
   */
  faces: Record<string, Control>;
  /** Definitions a node needs of its own, such as a scroll region's content. */
  defs: Record<string, Control>;
  /** Draws one node — how a kind recurses into children. */
  emitNode(node: IrNode): ControlEntry;
  /**
   * Draws nodes as part of a SHARED face: named by position rather than by
   * the screen's counters, so two screens baking the same children produce
   * the same definition. A socket or a per-screen definition in there is a
   * build error — a shared face has no screen to belong to.
   */
  shared(nodes: readonly IrNode[]): ControlEntry[];
}

/** What the host pass carries down the tree. */
export interface Emit {
  ns: string;
  facesNs: string;
  collection: string;
  /**
   * What the runtime shows this screen with, where the host has such a thing.
   *
   * A control that reads a row needs it: every compiled screen in the pack is
   * laid out whenever ANY form opens, so a read has to be able to tell its own
   * screen's rows from another screen's. Empty where the host has no title.
   */
  screen: string;
  /** The screen this document is being filled for. */
  host: HostEmit;
  /** The host renderer that hides the runtime's transport item, if the host has one. */
  ownedRenderer?: string;
  /** Face id -> this screen's mechanism definition for that look. */
  faceNames: Map<string, string>;
  /** Text run signature -> this screen's carrier definition for that style. */
  textNames: Map<string, string>;
  /** Definitions the host needs of its own. */
  defs: Record<string, Control>;
}

/**
 * How one host serves the sockets whose MECHANISM is its own.
 *
 * The face pass has already drawn every node; a host receives each socket's
 * face entry and returns the control that stands in its place — a wrapper
 * around the face (a gate, an index host) or a replacement for it (a cell
 * over a container slot). Either way the outer control keeps the face's
 * placement: size, offset, anchors and layer are the layout's, and the build
 * refuses a host that moves them.
 */
export interface HostEmit {
  readonly id: string;
  /**
   * Controls put under every screen's canvas, before its content — whatever
   * this host needs around a screen that the screen did not ask for.
   */
  chrome?(): ControlEntry[];
  /** Mechanism, by socket kind. A kind absent here is one the host cannot serve. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each entry is narrowed by its own kind, as NODE_DEFINITIONS is
  readonly fill: Partial<Record<Exclude<SocketKind, 'visible'>, (node: any, entry: ControlEntry, ctx: Emit) => ControlEntry>>;
  /**
   * The gate around a node whose `visible` is carried: reads the node's
   * entry and shows or hides the whole subtree. Receives the face entry with
   * its placement and returns the wrapper carrying that placement, the face
   * re-based inside it.
   */
  wrapVisible?(node: IrNode, entry: ControlEntry, ctx: Emit): ControlEntry;
  /**
   * Controls put under the canvas AFTER its content — chrome that must sit
   * over everything the screen drew, and that only exists because of what the
   * tree contains (the form's dropdown popups are the first).
   */
  overlay?(root: IrNode, ctx: Emit): ControlEntry[];
  /** Document-level definitions this host derives from the whole tree, before any socket is filled. */
  assemble?(root: IrNode, document: Document, ctx: Emit): void;
}

/**
 * One node kind, end to end.
 *
 * The walks stay dumb: `toIr` dispatches `lower` by the JSX `type` strings a
 * kind claims, the face pass dispatches `face` by `node.kind`, and the generic
 * traversals reach children only through `children`. Everything else — shared
 * faces, per-screen definitions — is the kind's own business.
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
  /**
   * The mechanism this node needs from its host, if any. A node with none
   * draws the same on every host and is never touched by one.
   */
  socket?(node: N): Exclude<SocketKind, 'visible'> | undefined;
  /**
   * The look: one node becomes one entry in its parent's `controls`, static
   * and the same on every host. A socket's face is what the node looks like
   * at rest — the resting texture, the reference string, the empty cell.
   */
  face(node: N, ctx: FaceEmit): ControlEntry;
}
