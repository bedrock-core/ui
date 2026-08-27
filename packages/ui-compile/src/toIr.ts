/**
 * Built tree + allocation -> IR.
 *
 * `buildContainerTree` leaves absolute Pocket-space texels on every element as
 * `jsonUIx` / `jsonUIy` / `jsonUIWidth` / `jsonUIHeight`. JSON UI positions a
 * control against its parent, so this pass converts absolute to relative on the
 * way through — the same subtraction the form serializer does.
 *
 * Indices come from `allocate`, never from here: the runtime runs the same walk
 * on the same tree and reads handlers off the same entries, so the third button
 * is the third button on both sides by construction. This pass only looks each
 * cell and channel up by the element it belongs to.
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
  BACKGROUND_SLOT_TYPE, childElements, CONTAINER_TYPE, containerEntity, containerRoot,
  ContainerScreenError, isTransparentType, type Allocation as ContainerAllocation,
} from '@bedrock-core/ui-runtime/compile';
import { CHEST_HOST, type ChestHost } from './hosts/chest';
import type { Allocation, IrDocument, IrNode, Rect } from './ir';
import { loweringFor } from './nodes';
import { num, str } from './nodes/shared';
import type { Addressing, CellAddress, ChannelAddress, LowerContext, NodeDefinition } from './nodes/types';

/** The components a container screen can be made of, by the name the author writes. */
const SUPPORTED = 'Panel, Text, Image, Button, Slot, SlotGrid, PlayerInventory, Hotbar, Background, Scroll';

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

/** Absolute rect as the layout pass left it. */
const absoluteRect = (element: JSX.Element): Rect => ({
  x: num(element.props.jsonUIx),
  y: num(element.props.jsonUIy),
  width: num(element.props.jsonUIWidth),
  height: num(element.props.jsonUIHeight),
});

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
  met: { cells: number; channels: number };
  counters: Map<string, number>;
  backdrop?: string;
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

  walk.met.cells += 1;

  return address;
};

/** Where the host put an element's live value. See {@link cellOf}. */
const channelOf = (element: JSX.Element, walk: Walk): ChannelAddress => {
  const address = walk.addressing.channels.get(element);

  if (address === undefined) {
    throw new Error(`The host gave no channel to a <${String(element.type)}> the compiler met.`);
  }

  walk.met.channels += 1;

  return address;
};

const convertChildren = (parent: JSX.Element, origin: Rect, walk: Walk): IrNode[] =>
  childElements(parent.props.children).flatMap(child => convertChild(child, origin, walk));

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

  const own = absoluteRect(element);
  const ctx: LowerContext = {
    origin,
    own,
    rect: relativeTo(own, origin),
    decoration: { ...layerOf(element.props), ...visibilityOf(element.props) },
    name: kind => nameFor(kind, walk),
    cellOf: target => cellOf(target, walk),
    channelOf: target => channelOf(target, walk),
    children: (parent, from) => convertChildren(parent, from, walk),
  };

  return definition.lower(element, type, ctx);
};

export interface ToIrOptions {
  /** JSON UI namespace for the emitted file. */
  namespace: string;
  /** The host the screen is compiled for. Defaults to the chest. */
  host?: ChestHost;
}

/**
 * Where the chest put a built tree's cells and channels, as addresses the IR
 * can carry without knowing they are container indices.
 */
export const chestAddressing = (allocation: ContainerAllocation): Addressing => ({
  cells: new Map(allocation.slots.map(entry => [entry.element, { address: entry.slot, role: entry.role }])),
  channels: new Map(allocation.channels.map(entry => [entry.element, { address: entry.slot, length: entry.length }])),
});

/**
 * Converts a built tree and its allocation into an {@link IrDocument}.
 *
 * @param tree - Output of `buildContainerTree`.
 * @param allocation - Output of `allocate` over the same tree.
 * @param options - Namespace and host for the emitted file.
 * @throws {@link UnsupportedNodeError} for a control with no compiled form.
 * @throws ContainerScreenError when the root names no entity.
 */
export const toIr = (
  tree: JSX.Element,
  allocation: ContainerAllocation,
  options: ToIrOptions,
): IrDocument => {
  const host = options.host ?? CHEST_HOST;
  const addressing = chestAddressing(allocation);
  const root = containerRoot(tree);
  const entity = containerEntity(root);

  if (entity === undefined || entity === '') {
    throw new ContainerScreenError('`<Container>` needs `entity`: the type of the entity the screen opens from.');
  }

  const walk: Walk = {
    addressing,
    met: { cells: 0, channels: 0 },
    counters: new Map(),
  };

  // The canvas: every rect below is relative to it, so a root the solver placed
  // at an offset still emits from (0, 0).
  const origin = absoluteRect(root);
  const background = str(root.props.background);
  const children = convertChildren(root, origin, walk);

  if (walk.met.cells !== addressing.cells.size || walk.met.channels !== addressing.channels.size) {
    throw new Error(
      `The host addressed ${addressing.cells.size} cell(s) and ${addressing.channels.size} channel(s), `
      + `but the compiler met ${walk.met.cells} and ${walk.met.channels}. The two walks must see the same tree.`,
    );
  }

  const drawn = allocation.slots.length;
  const summary: Allocation = {
    sentinels: allocation.sentinels.length,
    drawn,
    channels: allocation.size - allocation.sentinels.length - drawn,
    size: allocation.size,
  };

  return {
    namespace: options.namespace,
    collection: host.collection,
    entity,
    ownedItemRenderer: host.ownedItemRenderer,
    root: {
      kind: 'panel',
      name: 'root',
      rect: { x: 0, y: 0, width: origin.width, height: origin.height },
      ...background === '' ? {} : { background },
      children,
    },
    ...walk.backdrop === undefined ? {} : { backdrop: walk.backdrop },
    allocation: summary,
  };
};
