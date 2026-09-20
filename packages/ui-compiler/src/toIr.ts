/**
 * A screen's canvas -> IR.
 *
 * `buildContainerTree` leaves absolute Pocket-space texels on every element as
 * `jsonUIx` / `jsonUIy` / `jsonUIWidth` / `jsonUIHeight`. JSON UI positions a
 * control against its parent, so this pass converts absolute to relative on the
 * way through.
 *
 * Addresses come from the host's `allocate`, never from here: the runtime runs
 * the same walk on the same tree and reads handlers off the same entries, so
 * the third button is the third button on both sides by construction. This
 * pass only looks each cell and channel up by the element it belongs to.
 *
 * Fragments are transparent: they carry no geometry and their children are
 * spliced into the parent, which is what makes a component boundary free.
 *
 * What a kind lowers INTO is that kind's business, in its module under
 * `nodes/`; this walk owns the order, the geometry and the bookkeeping, and
 * hands each element to the definition that claims its type.
 */

import type { JSX } from '@bedrock-core/ui-runtime';
import {
  BACKGROUND_SLOT_TYPE, childElements, CONTAINER_TYPE, isTransparentType,
  type Allocation as ContainerAllocation, BUTTON_TYPE, type VariantTable, WIDE_RECT,
} from '@bedrock-core/ui-runtime/compile';
import type { IrDocument, IrNode, Rect } from './ir';
import { looksOf } from './looks';
import { loweringFor } from './nodes';
import type { LookNode, SwapNode } from './nodes/primitives/swap';
import { FOLLOWS_PREVIOUS, followsOf, num, str } from './nodes/utils/shared';
import type { Addressing, CellAddress, ChannelAddress, LowerContext, NodeDefinition } from './nodes/utils/types';

/** The components a compiled screen can be made of, by the name the author writes. */
const SUPPORTED = 'Panel, Text, Image, Button, Slot, SlotGrid, PlayerInventory, Hotbar, Background, Scroll, Tabs, List';

export class UnsupportedNodeError extends Error {
  public constructor(type: string) {
    super(
      `<${type}> has no compiled form.\n`
      + '  A compiled screen can only contain controls the emitter knows how to bake.\n'
      + `  Supported: ${SUPPORTED}.`,
    );

    this.name = 'UnsupportedNodeError';
  }
}

/** Draw order the author asked for, if any. `withControl` parks it under `__layout`. */
const layerOf = (props: JSX.Props): { layer?: number } => {
  const layout = props.__layout;

  if (typeof layout !== 'object' || layout === null || !('zIndex' in layout)) {
    return {};
  }

  const { zIndex } = layout;

  return typeof zIndex === 'number' ? { layer: zIndex } : {};
};

/** Hidden by the author, or by an ancestor the inheritance pass folded in. */
const visibilityOf = (props: JSX.Props): { visible?: boolean } =>
  props.visible === false ? { visible: false } : {};

/**
 * Absolute rect as the layout pass left it — or, on the wide pass, the one
 * it solved across the whole viewport, which only the content of a scroll
 * over a list has.
 */
const absoluteRect = (element: JSX.Element, wide: boolean): Rect => {
  if (!wide) {
    return {
      x: num(element.props.jsonUIx),
      y: num(element.props.jsonUIy),
      width: num(element.props.jsonUIWidth),
      height: num(element.props.jsonUIHeight),
    };
  }

  if (typeof element.props[WIDE_RECT.width] !== 'number') {
    throw new Error(`The layout solved no wide rect for a <${String(element.type)}>: only a scroll over a list is laid out twice.`);
  }

  return {
    x: num(element.props[WIDE_RECT.x]),
    y: num(element.props[WIDE_RECT.y]),
    width: num(element.props[WIDE_RECT.width]),
    height: num(element.props[WIDE_RECT.height]),
  };
};

const relativeTo = (rect: Rect, origin: Rect): Rect => ({
  x: rect.x - origin.x,
  y: rect.y - origin.y,
  width: rect.width,
  height: rect.height,
});

/** The texture a `<Background>` marker carries, if it carries one. */
const backdropOf = (element: JSX.Element): string | undefined => {
  const texture = element.props.__background;

  return typeof texture === 'string' && texture !== '' ? texture : undefined;
};

/** What the walk carries: where the host put things, and what it has met so far. */
interface Walk {
  addressing: Addressing;
  met: { cells: number; channels: number; visibles: number };
  counters: Map<string, number>;
  backdrop?: string;
  /**
   * How many carried-visible ancestors the element being lowered has. The
   * build's inherit pass stamps `visible: false` down a hidden subtree, so a
   * subtree hidden at build time and shown by its gate at runtime would bake
   * every descendant hidden; under a gate, the gate alone decides.
   */
  carried: number;
  /**
   * Whether the elements being lowered are read at the width the layout
   * solved across the whole viewport. The same elements as the walk's own
   * pass, so nothing is met a second time.
   */
  wide: boolean;
}

/**
 * Names must be unique within the document because they become control names.
 * Nothing in a screen is named by the author, so every node gets a per-kind
 * counter, which is stable for a given tree.
 */
const nameFor = (kind: string, walk: Walk): string => {
  const next = (walk.counters.get(kind) ?? 0) + 1;

  walk.counters.set(kind, next);

  return `${kind}_${next}`;
};

/**
 * Where the host put an element's cell. Missing means the host's walk and this
 * one disagree about the tree, which the runtime could never recover from.
 */
const cellOf = (element: JSX.Element, walk: Walk): CellAddress => {
  const address = walk.addressing.cells.get(element);

  if (address === undefined) {
    throw new Error(`The host gave no cell to a <${String(element.type)}> the compiler met.`);
  }

  if (!walk.wide) {
    walk.met.cells += 1;
  }

  return address;
};

/** Where the host put an element's live value. See {@link cellOf}. */
const channelOf = (element: JSX.Element, walk: Walk): ChannelAddress => {
  const address = walk.addressing.channels.get(element);

  if (address === undefined) {
    throw new Error(`The host gave no channel to a <${String(element.type)}> the compiler met.`);
  }

  if (!walk.wide) {
    walk.met.channels += 1;
  }

  return address;
};

const convertChildren = (parent: JSX.Element, origin: Rect, walk: Walk): IrNode[] =>
  resolveSiblings(childElements(parent.props.children).flatMap(child => convertChild(child, origin, walk)));

/**
 * Everything that crosses siblings, resolved in the one walk that has them all.
 *
 * Nothing inside a node can see what sits beside it, and all three of these
 * are about exactly that:
 *
 *  - EXCLUSIVE swaps that name no group of their own form ONE group, the first
 *    of them naming it. That is what a row of tabs is, and what makes a group
 *    of one — a fold — the same primitive.
 *  - `follows: true` means the swap before it: a fold's rows, which have to
 *    reflow what is under them and so cannot live inside a look.
 *  - A look that DRAWS a sibling takes it out of the list and into itself,
 *    re-based from the swap's own corner. The layout solved it beside the
 *    swap, where a pane belongs — the whole box under the headers — and it is
 *    drawn inside the state, where a pane hidden is a pane never built.
 */
const resolveSiblings = (children: IrNode[]): IrNode[] => {
  let group: string | undefined;
  let previous: string | undefined;
  const drawn = new Set<string>();

  const resolved = children.map((child): IrNode => {
    if (child.kind === 'swap') {
      previous = child.id;

      if (child.exclusive) {
        group ??= child.id;
      }

      return {
        ...child,
        ...child.group === undefined && child.exclusive ? { group } : {},
        looks: child.looks.map(look => drawInto(look, child, children, drawn)),
      };
    }

    if (child.follows !== FOLLOWS_PREVIOUS) {
      return child;
    }

    if (previous === undefined) {
      throw new UnsupportedNodeError('a control that follows a swap with no swap before it');
    }

    return { ...child, follows: previous };
  });

  return resolved.filter(child => child.id === undefined || !drawn.has(child.id));
};

/** The sibling a look draws, moved inside it at the swap's own corner. */
const drawInto = (look: LookNode, swap: SwapNode, siblings: readonly IrNode[], drawn: Set<string>): LookNode => {
  if (look.draws === undefined) {
    return look;
  }

  const target = siblings.find(sibling => sibling.id === look.draws);

  if (target === undefined) {
    throw new UnsupportedNodeError(`a look drawing "${look.draws}", which is not beside its swap`);
  }

  drawn.add(look.draws);

  return {
    ...look,
    children: [
      ...look.children,
      { ...target, rect: { ...target.rect, x: target.rect.x - swap.rect.x, y: target.rect.y - swap.rect.y } },
    ],
  };
};

/** Markers and wrappers produce no node of their own. */
const convertChild = (element: JSX.Element, origin: Rect, walk: Walk): IrNode[] => {
  const { type } = element;

  if (typeof type !== 'string') {
    throw new UnsupportedNodeError(type.name === '' ? 'component' : type.name);
  }

  if (type === BACKGROUND_SLOT_TYPE) {
    // Not part of the canvas: it covers the whole screen. The first one wins.
    walk.backdrop ??= backdropOf(element);

    return [];
  }

  // A kind that claims the type lowers it — before transparency is consulted,
  // because a scroll region is transparent to the layout yet a node of its own.
  const definition = loweringFor(type);

  if (definition !== undefined) {
    return [lower(definition, element, type, origin, walk)];
  }

  if (isTransparentType(type)) {
    return convertChildren(element, origin, walk);
  }

  throw new UnsupportedNodeError(type === CONTAINER_TYPE ? 'Container' : type);
};

const lower = (definition: NodeDefinition, element: JSX.Element, type: string, origin: Rect, walk: Walk): IrNode => {
  if (definition.lower === undefined) {
    throw new UnsupportedNodeError(type);
  }

  // A carried visible rides the decoration, so every kind inherits it by the
  // same spread that carries `layer` — the host's wrapper reads it back off
  // the node and no kind has to know it exists.
  const visibleAddress = walk.addressing.visibles?.get(element);
  const carried = visibleAddress !== undefined;

  if (carried && !walk.wide) {
    walk.met.visibles += 1;
  }

  const own = absoluteRect(element, walk.wide);
  const ctx: LowerContext = {
    origin,
    own,
    rect: relativeTo(own, origin),
    decoration: {
      ...layerOf(element.props),
      // A node INSIDE a carried subtree gives its visibility up to the gate.
      // The build's inherit pass stamps `visible: false` down a hidden
      // subtree, so a subtree hidden at build and shown by its gate at runtime
      // would bake every descendant hidden and the gate would open onto
      // nothing. The subtree's ROOT keeps its own, because a face drawn
      // before any host has no gate to hide it.
      ...walk.carried > 0 && !carried ? {} : visibilityOf(element.props),
      ...carried ? { carriedVisible: visibleAddress } : {},
      ...followsOf(element.props),
      ...typeof element.props.id === 'string' ? { id: element.props.id } : {},
    },
    name: kind => nameFor(kind, walk),
    cellOf: target => cellOf(target, walk),
    channelOf: target => channelOf(target, walk),
    lookOf: target => walk.addressing.looks?.get(target),
    children: (parent, from, options) => {
      if (options?.wide !== true || walk.wide) {
        return convertChildren(parent, from, walk);
      }

      walk.wide = true;

      try {
        return convertChildren(parent, from, walk);
      } finally {
        walk.wide = false;
      }
    },
  };

  walk.carried += carried ? 1 : 0;

  let node: IrNode;

  try {
    node = definition.lower(element, type, ctx);
  } finally {
    walk.carried -= carried ? 1 : 0;
  }

  // A button draws its looks inside its face; any other element whose look is
  // carried is drawn once per look, beside itself.
  const look = element.type === BUTTON_TYPE ? undefined : walk.addressing.looks?.get(element);

  if (look === undefined) {
    return node;
  }

  return {
    ...node,
    carriedLook: {
      address: look.address,
      looks: look.looks.map((version, index) =>
        lowerLook(definition, version, type, origin, walk, { of: node.name, address: look.address, index })),
    },
  };
};

/**
 * One version of a carried look: the element as that look renders it, lowered
 * on its own at the place that look puts it. Its children are left out — the
 * node it is a version of draws them once, whichever version is showing — and
 * so is its visibility, which is the gate's.
 */
const lowerLook = (
  definition: NodeDefinition,
  element: JSX.Element,
  type: string,
  origin: Rect,
  walk: Walk,
  version: { of: string; address: number; index: number },
): IrNode => {
  if (definition.lower === undefined) {
    throw new UnsupportedNodeError(type);
  }

  const bare: JSX.Element = childElements(element.props.children).length === 0
    ? element
    : { ...element, props: { ...element.props, children: undefined } };
  const own = absoluteRect(bare, walk.wide);
  const name = `${version.of}_look_${String(version.index)}`;
  const ctx: LowerContext = {
    origin,
    own,
    rect: relativeTo(own, origin),
    decoration: { ...layerOf(bare.props) },
    name: () => name,
    cellOf: target => cellOf(target, walk),
    channelOf: target => channelOf(target, walk),
    lookOf: () => undefined,
    children: () => [],
  };

  return { ...definition.lower(bare, type, ctx), name, lookGate: { address: version.address, index: version.index } };
};

export interface ToIrOptions {
  /** JSON UI namespace for the emitted file. */
  namespace: string;
  /** The namespace of the addon's shared faces, `<addon>_faces`. */
  faces?: string;
  /** The collection every addressed control reads from. */
  collection: string;
}

/**
 * Where the chest put a built tree's cells and channels, as addresses the IR
 * can carry without knowing they are container indices.
 */
export const chestAddressing = (
  allocation: ContainerAllocation,
  tree?: JSX.Element,
  looks: ReadonlyMap<JSX.Element, VariantTable> = new Map(),
): Addressing => {
  // A button's look rides the size of the stack in its own slot; any other
  // element's rides a bank slot of its own. Either way the look is addressed by
  // the slot whose size names it.
  const lookSlots = new Map([
    ...allocation.slots.map(entry => [entry.element, entry.slot] as const),
    ...allocation.channels.filter(entry => entry.carrier === 'enum').map(entry => [entry.element, entry.slot] as const),
  ]);

  return {
    cells: new Map(allocation.slots.map(entry => [entry.element, { address: entry.slot, role: entry.role }])),
    channels: new Map(allocation.channels
      .filter(entry => entry.carrier === 'text')
      .map(entry => [entry.element, { address: entry.slot, length: entry.length }])),
    looks: new Map(tree === undefined
      ? []
      : [...looks].flatMap(([element, table]) => {
          const slot = lookSlots.get(element);

          return slot === undefined ? [] : [[element, { address: slot, looks: looksOf(tree, table) }] as const];
        })),
  };
};

/**
 * Converts a screen's canvas into an {@link IrDocument}.
 *
 * The root is resolved by the caller rather than found here, because what
 * counts as a screen's root is the host's question — a chest screen renders
 * exactly one `<Container>`, a form renders whatever the author wrote — and
 * this walk has no business asking it.
 *
 * @param root - The element whose rect is the canvas, already resolved.
 * @param addressing - Where the host put every cell and channel of that tree.
 * @param options - Namespace, collection, and the host's renderer if it has one.
 * @throws {@link UnsupportedNodeError} for a control with no compiled form.
 */
export const toIr = (
  root: JSX.Element,
  addressing: Addressing,
  options: ToIrOptions,
): IrDocument => {
  const walk: Walk = {
    addressing,
    met: { cells: 0, channels: 0, visibles: 0 },
    counters: new Map(), carried: 0, wide: false,
  };

  // The canvas: every rect below is relative to it, so a root the solver placed
  // at an offset still emits from (0, 0).
  const origin = absoluteRect(root, false);
  const background = str(root.props.background);
  const children = convertChildren(root, origin, walk);

  const expectedVisibles = addressing.visibles?.size ?? 0;

  if (
    walk.met.cells !== addressing.cells.size
    || walk.met.channels !== addressing.channels.size
    || walk.met.visibles !== expectedVisibles
  ) {
    throw new Error(
      `The host addressed ${addressing.cells.size} cell(s), ${addressing.channels.size} channel(s) `
      + `and ${expectedVisibles} carried visible(s), but the compiler met ${walk.met.cells}, `
      + `${walk.met.channels} and ${walk.met.visibles}. The two walks must see the same tree.`,
    );
  }

  return {
    namespace: options.namespace,
    ...options.faces === undefined ? {} : { faces: options.faces },
    collection: options.collection,
    root: {
      kind: 'panel',
      name: 'root',
      rect: { x: 0, y: 0, width: origin.width, height: origin.height },
      ...background === '' ? {} : { background },
      children,
    },
    ...walk.backdrop === undefined ? {} : { backdrop: walk.backdrop },
  };
};
