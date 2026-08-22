/**
 * Laid-out JSX tree -> IR.
 *
 * `computeLayout` writes absolute Pocket-space texels onto every element as
 * `jsonUIx` / `jsonUIy` / `jsonUIWidth` / `jsonUIHeight`. JSON UI positions a
 * control against its parent, so this pass converts absolute to relative on the
 * way through — the same subtraction the runtime serializer already does.
 *
 * Fragments are transparent: they carry no geometry and their children are
 * spliced into the parent, which is what makes a component boundary free.
 */

import type { Allocation, BarNode, IrDocument, IrNode, PanelNode, Rect, SlotNode } from './ir';
import type { ClipDirection } from './jsonui';

/** The shape this pass needs from a laid-out element. Deliberately structural. */
export interface LaidOutElement {
  type: unknown;
  props: Record<string, unknown> & { children?: unknown };
}

export class UnsupportedNodeError extends Error {
  public constructor(type: string) {
    super(
      `<${type}> has no compiled form yet.\n`
      + '  A compiled screen can only contain controls the emitter knows how to bake.\n'
      + '  Supported: panel, text, image, container_slot, container_bar.',
    );

    this.name = 'UnsupportedNodeError';
  }
}

const isElement = (value: unknown): value is LaidOutElement =>
  !!value && typeof value === 'object' && !Array.isArray(value) && 'type' in value;

const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' ? value : fallback;

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const CLIP_DIRECTIONS: readonly ClipDirection[] = ['left', 'right', 'up', 'down', 'center'];

/** Validates rather than asserts: a bad direction is an authoring mistake, not a cast. */
const clipDirection = (value: unknown): ClipDirection => {
  const found = CLIP_DIRECTIONS.find(direction => direction === value);

  if (found) {
    return found;
  }

  if (value === undefined) {
    return 'left';
  }

  throw new Error(
    `Unknown fill direction "${String(value)}". Expected one of: ${CLIP_DIRECTIONS.join(', ')}.`,
  );
};

const childrenOf = (element: LaidOutElement): LaidOutElement[] => {
  const children = element.props.children;

  if (Array.isArray(children)) {
    return children.filter(isElement);
  }

  return isElement(children) ? [children] : [];
};

/** Absolute rect as the layout pass left it. */
const absoluteRect = (element: LaidOutElement): Rect => ({
  x: num(element.props.jsonUIx),
  y: num(element.props.jsonUIy),
  width: num(element.props.jsonUIWidth),
  height: num(element.props.jsonUIHeight),
});

/**
 * The root needs its declared size, not its measured one.
 *
 * `computeLayout` finishes by writing the root scroll's extent onto the tree —
 * `tree.props.jsonUIHeight = scrolls[0].height` — which is the canonical screen
 * height, because at runtime the root is a scroll viewport. A compiled screen is
 * not: it is grafted into a fixed 176 x 83 frame. So for the root alone, a
 * numeric width or height declared on the element wins over the measured value.
 *
 * Declared sizes live under `__layout`, where `withControl` parks everything the
 * flex pass consumes.
 */
const declaredRect = (element: LaidOutElement, measured: Rect): Rect => {
  const layout = element.props.__layout;
  const declared = typeof layout === 'object' && layout !== null
    ? layout as { width?: unknown; height?: unknown }
    : {};

  return {
    ...measured,
    width: typeof declared.width === 'number' ? declared.width : measured.width,
    height: typeof declared.height === 'number' ? declared.height : measured.height,
  };
};

const relativeTo = (rect: Rect, origin: Rect): Rect => ({
  x: rect.x - origin.x,
  y: rect.y - origin.y,
  width: rect.width,
  height: rect.height,
});

interface Naming {
  used: Set<string>;
  counters: Map<string, number>;
}

/**
 * Indices are the compiler's to hand out, never the author's. Slots are numbered
 * as they are met, so document order is screen order; channels are collected and
 * numbered afterwards, because where the bank starts depends on how many slots
 * the screen drew.
 */
interface Allocator {
  slots: SlotNode[];
  bars: BarNode[];
}

/** Slot 0 carries the routing keys, so drawn slots start at 1. */
const SENTINEL_SLOT = 0;

/**
 * Names must be unique within the document because they become control names.
 * An explicit `name` prop wins — it is what the runtime handle will key on — and
 * anything else falls back to a per-kind counter.
 */
const nameFor = (element: LaidOutElement, kind: string, naming: Naming): string => {
  const explicit = element.props.name;

  if (typeof explicit === 'string' && explicit.length > 0) {
    if (naming.used.has(explicit)) {
      throw new Error(
        `Duplicate name "${explicit}". Slot and channel names must be unique within a screen, `
        + 'because the generated handle addresses them by name.',
      );
    }

    naming.used.add(explicit);

    return explicit;
  }

  const next = (naming.counters.get(kind) ?? 0) + 1;

  naming.counters.set(kind, next);

  const generated = `${kind}_${next}`;

  naming.used.add(generated);

  return generated;
};

/** Flattens fragments so a component boundary costs nothing in the output. */
const flatten = (elements: LaidOutElement[]): LaidOutElement[] =>
  elements.flatMap(element =>
    element.type === 'fragment' ? flatten(childrenOf(element)) : [element],
  );

const convert = (
  element: LaidOutElement,
  origin: Rect,
  naming: Naming,
  alloc: Allocator,
): IrNode => {
  const type = String(element.type);
  const rect = relativeTo(absoluteRect(element), origin);

  if (type.startsWith('text')) {
    return {
      kind: 'label',
      name: nameFor(element, 'label', naming),
      rect,
      text: str(element.props.text ?? element.props.children),
      ...element.props.localize === true ? { localize: true } : {},
      ...typeof element.props.shadow === 'boolean' ? { shadow: element.props.shadow } : {},
    };
  }

  switch (type) {
    case 'panel': {
      const own = absoluteRect(element);

      return {
        kind: 'panel',
        name: nameFor(element, 'panel', naming),
        rect,
        // Children are relative to THIS panel, not to the grandparent.
        children: flatten(childrenOf(element)).map(child => convert(child, own, naming, alloc)),
      };
    }

    case 'image':
      return {
        kind: 'image',
        name: nameFor(element, 'image', naming),
        rect,
        texture: str(element.props.texture),
      };

    case 'container_slot': {
      const node: SlotNode = {
        kind: 'slot',
        name: nameFor(element, 'slot', naming),
        rect,
        slot: SENTINEL_SLOT + 1 + alloc.slots.length,
      };

      alloc.slots.push(node);

      return node;
    }

    case 'container_bar': {
      const node: BarNode = {
        kind: 'bar',
        name: nameFor(element, 'bar', naming),
        rect,
        // Placeholder: the bank starts after the last drawn slot, which is not
        // known until the walk finishes.
        channel: -1,
        trackTexture: str(element.props.trackTexture),
        fillTexture: str(element.props.fillTexture),
        direction: clipDirection(element.props.direction),
      };

      alloc.bars.push(node);

      return node;
    }

    default:
      throw new UnsupportedNodeError(type);
  }
};

export interface ToIrOptions {
  namespace: string;
  /** Collection every slot and channel reads, e.g. `container_items`. */
  collection: string;
  /** Name of the entry definition other files reference. */
  entry?: string;
}

/**
 * Converts a laid-out tree into an {@link IrDocument}.
 *
 * @param tree - Output of `expandStatic` then `computeLayout`.
 * @param options - Namespace, collection and entry name for the emitted file.
 * @throws {@link UnsupportedNodeError} for a control with no compiled form.
 */
export const toIr = (tree: LaidOutElement, options: ToIrOptions): IrDocument => {
  const naming: Naming = { used: new Set(), counters: new Map() };
  const alloc: Allocator = { slots: [], bars: [] };
  const roots = flatten([tree]);
  const first = roots[0];

  if (!first) {
    throw new Error('A compiled screen must render at least one control.');
  }

  // The screen's own origin: every rect below is relative to it, so a layout
  // that the solver placed at an offset still emits from (0, 0).
  const origin = absoluteRect(first);
  const converted = convert(first, origin, naming, alloc);
  const canvas = declaredRect(first, { ...origin, x: 0, y: 0 });

  const root: PanelNode = converted.kind === 'panel'
    ? { ...converted, rect: canvas }
    : { kind: 'panel', name: 'root', rect: canvas, children: [converted] };

  // Channels live past the drawn range, so nothing on screen can address them.
  const bankStart = SENTINEL_SLOT + 1 + alloc.slots.length;

  alloc.bars.forEach((bar, ordinal) => {
    bar.channel = bankStart + ordinal;
  });

  const allocation: Allocation = {
    sentinel: SENTINEL_SLOT,
    drawn: alloc.slots.length,
    channels: alloc.bars.length,
    size: bankStart + alloc.bars.length,
  };

  return {
    namespace: options.namespace,
    collection: options.collection,
    entry: options.entry ?? 'screen',
    root,
    allocation,
  };
};
