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
 */

import type { JSX } from '@bedrock-core/ui-runtime';
import {
  BACKGROUND_SLOT_TYPE, BUTTON_TYPE, childElements, CONTAINER_TYPE, containerEntity, containerRoot,
  ContainerScreenError, IMAGE_TYPE, isExitButton,
  isTextElementType, isTransparentType, KEY_PREFIX, labelFontFields,
  liveTextLength, PANEL_TYPE, SCROLL_SLOT_TYPE, SLOT_GRID_TYPE, slotGridConfig, slotInteractive, slotSource, SLOT_TYPE,
  TEXT_SHADOW_TYPE,
  TEXT_SHADOW_WRAP_TYPE, type Allocation as ContainerAllocation, type ChannelEntry, type SlotEntry,
} from '@bedrock-core/ui-runtime/compile';
import { CHEST_HOST, type ChestHost, GATED_ITEM } from './hosts/chest';
import type {
  Allocation, ButtonFace, ButtonNode, ExitNode, GridNode, IrDocument, IrNode, LabelNode, PanelNode,
  Rect, ScrollNode, SlotNode, TextNode,
} from './ir';

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

const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

/**
 * The string a serializing component parks in its `value` tail, or undefined
 * when the tail is a RawMessage the client would have resolved.
 */
const tailOf = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null || !('tail' in value)) {
    return undefined;
  }

  const { tail } = value;

  return typeof tail === 'string' ? tail : undefined;
};

/** What `<Text>` recorded about its string for the layout pass. */
const textMetricsOf = (value: unknown): { isKey: boolean; resolvedText: string } => {
  if (typeof value !== 'object' || value === null) {
    return { isKey: false, resolvedText: '' };
  }

  const isKey = 'isKey' in value && value.isKey === true;
  const resolvedText = 'resolvedText' in value && typeof value.resolvedText === 'string'
    ? value.resolvedText
    : '';

  return { isKey, resolvedText };
};

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

/**
 * What a built `<Button>` looks like. The component resolves every state to a
 * concrete texture, so a missing state reads as the base one — which is also
 * why a disabled look is only kept when it differs from the resting face.
 */
const faceOf = (props: JSX.Props): ButtonFace => {
  const texture = str(props.background);
  const locked = str(props.backgroundLocked);

  return {
    texture,
    hover: str(props.backgroundHover),
    pressed: str(props.backgroundPressed),
    ...locked === texture ? {} : { disabled: locked },
  };
};

/** What the walk carries: the allocation to look up, and what it has met so far. */
interface Walk {
  slots: Map<JSX.Element, SlotEntry>;
  channels: Map<JSX.Element, ChannelEntry>;
  met: { slots: number; channels: number };
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
 * The cell the allocation gave an element. Missing means the two walks
 * disagree about the tree, which the runtime could never recover from.
 */
const slotOf = (element: JSX.Element, walk: Walk): SlotEntry => {
  const entry = walk.slots.get(element);

  if (entry === undefined) {
    throw new Error(`The allocation has no cell for a <${String(element.type)}> the compiler met.`);
  }

  walk.met.slots += 1;

  return entry;
};

/** The channel the allocation gave an element. See {@link slotOf}. */
const channelOf = (element: JSX.Element, carrier: ChannelEntry['carrier'], walk: Walk): ChannelEntry => {
  const entry = walk.channels.get(element);

  if (entry === undefined || entry.carrier !== carrier) {
    throw new Error(`The allocation has no ${carrier} channel for a <${String(element.type)}> the compiler met.`);
  }

  walk.met.channels += 1;

  return entry;
};

const labelOf = (element: JSX.Element, base: Omit<LabelNode, 'kind' | 'text' | 'localize' | 'fontType' | 'fontScaleFactor'>): LabelNode => {
  const { props } = element;
  const tail = tailOf(props.value);
  const metrics = textMetricsOf(props.__textMetrics);
  const defaults = labelFontFields();

  return {
    kind: 'label',
    ...base,
    // A string tail is what the label shows: a literal, or a key the engine
    // resolves. A RawMessage tail would be resolved by the client in a form;
    // here the build's own resolution is baked instead.
    text: tail ?? metrics.resolvedText,
    localize: tail !== undefined && metrics.isKey,
    fontType: str(props.fontType, defaults.fontType),
    fontScaleFactor: num(props.fontScaleFactor, defaults.fontScaleFactor),
  };
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

  // Transparent to the layout, but not to the output: a region has a viewport
  // of its own, and its content was laid out from the region's origin.
  if (type === SCROLL_SLOT_TYPE) {
    return [scrollOf(element, origin, walk)];
  }

  if (isTransparentType(type)) {
    return convertChildren(element, origin, walk);
  }

  return [convert(element, type, origin, walk)];
};

/** The content's own origin: a region's children are solved relative to its top-left. */
const REGION_ORIGIN: Rect = { x: 0, y: 0, width: 0, height: 0 };

const scrollOf = (element: JSX.Element, origin: Rect, walk: Walk): ScrollNode => {
  const rect = relativeTo(absoluteRect(element), origin);
  const children = convertChildren(element, REGION_ORIGIN, walk);
  const bottom = children.reduce((max, child) => Math.max(max, child.rect.y + child.rect.height), 0);

  return {
    kind: 'scroll',
    name: nameFor('scroll', walk),
    rect,
    ...layerOf(element.props),
    ...visibilityOf(element.props),
    extent: Math.max(rect.height, bottom),
    children,
  };
};

const convert = (element: JSX.Element, type: string, origin: Rect, walk: Walk): IrNode => {
  const { props } = element;
  const own = absoluteRect(element);
  const rect = relativeTo(own, origin);
  const decoration = { ...layerOf(props), ...visibilityOf(props) };

  if (isTextElementType(type)) {
    const shadow = type === TEXT_SHADOW_TYPE || type === TEXT_SHADOW_WRAP_TYPE;
    const length = liveTextLength(element);
    const defaults = labelFontFields();

    // The label's own nudge, applied here so the emitter sees one offset.
    const nudged: Rect = { ...rect, x: rect.x + num(props.labelX), y: rect.y + num(props.labelY) };

    if (length !== undefined) {
      const channel = channelOf(element, 'text', walk);

      const node: TextNode = {
        kind: 'text',
        name: nameFor('text', walk),
        rect: nudged,
        ...decoration,
        channel: channel.slot,
        length: channel.length,
        keyPrefix: KEY_PREFIX,
        fontType: str(props.fontType, defaults.fontType),
        fontScaleFactor: num(props.fontScaleFactor, defaults.fontScaleFactor),
        ...shadow ? { shadow } : {},
      };

      return node;
    }

    return labelOf(element, {
      name: nameFor('label', walk),
      rect: nudged,
      ...decoration,
      ...shadow ? { shadow } : {},
    });
  }

  switch (type) {
    case PANEL_TYPE: {
      const background = str(props.background);
      const node: PanelNode = {
        kind: 'panel',
        name: nameFor('panel', walk),
        rect,
        ...decoration,
        ...background === '' ? {} : { background },
        // Children are relative to THIS panel, not to the grandparent.
        children: convertChildren(element, own, walk),
      };

      return node;
    }

    case IMAGE_TYPE:
      return {
        kind: 'image',
        name: nameFor('image', walk),
        rect,
        ...decoration,
        texture: tailOf(props.value) ?? '',
      };

    case BUTTON_TYPE: {
      // A close button is the client's: no cell to look up, nothing for the
      // runtime to poll.
      if (isExitButton(element)) {
        const exit: ExitNode = {
          kind: 'exit',
          name: nameFor('exit', walk),
          rect,
          ...decoration,
          face: faceOf(props),
          children: convertChildren(element, own, walk),
        };

        return exit;
      }

      const entry = slotOf(element, walk);
      const node: ButtonNode = {
        kind: 'button',
        name: nameFor('button', walk),
        rect,
        ...decoration,
        slot: entry.slot,
        face: faceOf(props),
        // Baked into the face, relative to the button like any other child.
        children: convertChildren(element, own, walk),
      };

      return node;
    }

    case SLOT_TYPE: {
      const source = slotSource(element);

      if (source !== undefined) {
        // Foreign: reads another collection at the author's index, so it is not
        // in the allocation and the runtime never polls it.
        const node: SlotNode = {
          kind: 'slot',
          name: nameFor('slot', walk),
          rect,
          ...decoration,
          slot: source.index,
          role: 'both',
          interactive: source.interactive,
          source,
        };

        return node;
      }

      const entry = slotOf(element, walk);

      if (entry.role === 'button') {
        throw new Error('The allocation numbered a <Slot> as a button.');
      }

      const node: SlotNode = {
        kind: 'slot',
        name: nameFor('slot', walk),
        rect,
        ...decoration,
        slot: entry.slot,
        role: entry.role,
        interactive: slotInteractive(element),
      };

      return node;
    }

    case SLOT_GRID_TYPE: {
      const config = slotGridConfig(element);
      const node: GridNode = {
        kind: 'grid',
        name: nameFor('grid', walk),
        rect,
        ...decoration,
        collection: config.collection,
        columns: config.columns,
        rows: config.rows,
        interactive: config.interactive,
        hideOwned: config.hideOwned,
      };

      return node;
    }

    default:
      throw new UnsupportedNodeError(type === CONTAINER_TYPE ? 'Container' : type);
  }
};

export interface ToIrOptions {
  /** JSON UI namespace for the emitted file. */
  namespace: string;
  /** The host the screen is compiled for. Defaults to the chest. */
  host?: ChestHost;
}

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
  const root = containerRoot(tree);
  const entity = containerEntity(root);

  if (entity === undefined || entity === '') {
    throw new ContainerScreenError('`<Container>` needs `entity`: the type of the entity the screen opens from.');
  }

  const walk: Walk = {
    slots: new Map(allocation.slots.map(entry => [entry.element, entry])),
    channels: new Map(allocation.channels.map(entry => [entry.element, entry])),
    met: { slots: 0, channels: 0 },
    counters: new Map(),
  };

  // The canvas: every rect below is relative to it, so a root the solver placed
  // at an offset still emits from (0, 0).
  const origin = absoluteRect(root);
  const background = str(root.props.background);
  const children = convertChildren(root, origin, walk);

  if (walk.met.slots !== allocation.slots.length || walk.met.channels !== allocation.channels.length) {
    throw new Error(
      `The allocation numbered ${allocation.slots.length} cell(s) and ${allocation.channels.length} channel(s), `
      + `but the compiler met ${walk.met.slots} and ${walk.met.channels}. The two walks must see the same tree.`,
    );
  }

  const drawn = allocation.slots.length;
  const summary: Allocation = {
    sentinel: allocation.sentinel,
    drawn,
    channels: allocation.size - allocation.sentinel - 1 - drawn,
    size: allocation.size,
  };

  return {
    namespace: options.namespace,
    collection: host.collection,
    entity,
    ownedItemRenderer: `${host.namespace}.${GATED_ITEM}`,
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
