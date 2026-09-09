import type { PressEvent } from '../core/events';
import { concreteRoots } from '../core/guards';
import type { FunctionComponent, JSX } from '../jsx';
import { type ControlProps, withControl } from './control';
import { PANEL_TYPE } from './Panel';

/**
 * A screen another pack draws INTO this one.
 *
 * A compiled screen's layout lives in the pack of the addon that built it,
 * and a host realm shows it by title. Some of what the host draws is not the
 * host's to bake: the page for one addon in the addon list — its thumbnail,
 * its description, its authors — is that addon's, baked in that addon's pack,
 * and the host has nothing to say about it but where it goes.
 *
 * So the host's screen holds a run of {@link EmbedSlots}: the first entries
 * of the form, reserved before the host's own. Slot 0 carries a MARKER naming
 * the embedded screen; the pack that holds that screen gates it on the
 * marker instead of on the title, and draws it over the host's canvas. The
 * slots after it are the embedded screen's own entries — its presses, and
 * whether each is enabled — which the host writes from the values the
 * screen's owner published, and reads back as presses by slot.
 *
 * On the other side, {@link Embed} is the root of the embedded screen: a
 * component drawn into the AREA the host leaves for it. That area is its
 * canvas — the tree fills it, and nothing inside knows where the host put
 * it — and its entries are numbered from 1 because slot 0 is the marker.
 * Neither side renders the other; the one contract is the host's frame, the
 * area's place in it and the slot count, all constants of the host component
 * that embeds.
 */

/** The host `type` of one reserved entry; emits nothing and is filled by the embedded pack. */
export const EMBED_SLOT_TYPE = 'embed-slot';

/**
 * The marker slot 0 carries for the screen of one addon: the value its pack's
 * gate compares the entry against. The namespace is the addon's, which is
 * also what its compiled screens are emitted under.
 */
export const embedMarker = (namespace: string): string => `core_addon:${namespace}`;

export interface EmbedSlotsProps extends ControlProps {
  /** How many entries are reserved. A constant of the embedding screen: the embedded one is baked against it. */
  count: number;
  /** What each slot carries this present — the marker first, then the embedded screen's values. Padded with ''. */
  values: readonly string[];
  /** A press on slot `index` (never 0, the marker). */
  onPress?: (index: number, event: PressEvent) => unknown | Promise<unknown>;
}

/** Marks a built element as the marker + entry slots of an embedded screen. */
export function isEmbedSlot(element: JSX.Element): boolean {
  return element.type === EMBED_SLOT_TYPE;
}

/** The slot's index in the run: 0 is the marker. */
export function embedSlotIndex(element: JSX.Element): number {
  const { slot } = element.props;

  return typeof slot === 'number' ? slot : 0;
}

/** What one slot carries this present. */
export function embedSlotValue(element: JSX.Element): string {
  const { value } = element.props;

  return typeof value === 'string' ? value : '';
}

export const EmbedSlots: FunctionComponent<EmbedSlotsProps> = ({ count, values, onPress, ...rest }: EmbedSlotsProps): JSX.Element => {
  const slots = Math.max(1, Math.floor(count));

  return {
    type: PANEL_TYPE,
    props: {
      ...withControl(rest),
      children: Array.from({ length: slots }, (_, index): JSX.Element => ({
        type: EMBED_SLOT_TYPE,
        props: {
          ...withControl({ width: 0, height: 0 }),
          slot: index,
          value: values[index] ?? '',
          ...index === 0 || onPress === undefined
            ? {}
            : { onPress: (event: PressEvent): unknown => onPress(index, event) },
        },
      })),
    },
  };
};

/** The canvas the host's own screen is baked at. */
export interface EmbedFrame {
  width: number;
  height: number;
}

/** Where in the host's frame the embedded component draws: its canvas. */
export interface EmbedArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** How an embedded screen sits in its host's frame; what its mount places it by. */
export interface EmbedPlacement {
  /** The host's frame, `[width, height]`. */
  readonly frame: readonly [number, number];
  /** The area's top-left within that frame, `[x, y]`. */
  readonly offset: readonly [number, number];
}

export interface EmbedProps extends Omit<ControlProps, 'width' | 'height'> {
  /** The host's frame: what the host bakes its own screen against. */
  frame: EmbedFrame;
  /** The area of that frame this component fills. It is the canvas everything below is laid out in. */
  area: EmbedArea;
  children?: JSX.Node;
}

/**
 * The root of a component drawn into another pack's screen: a panel the
 * size of the area the host leaves for it, whose pack gates it on the host's
 * marker slot and mounts it where the area sits in the host's frame.
 */
export const Embed: FunctionComponent<EmbedProps> = ({ frame, area, children, ...rest }: EmbedProps): JSX.Element => ({
  type: PANEL_TYPE,
  props: {
    ...withControl({ ...rest, width: area.width, height: area.height }),
    __embed: { frame: [frame.width, frame.height], offset: [area.x, area.y] } satisfies EmbedPlacement,
    children,
  },
});

/** How a built tree's root sits in its host's frame, when the root is an {@link Embed}. */
export function embedPlacementOf(tree: JSX.Element): EmbedPlacement | undefined {
  const [root] = concreteRoots(tree);

  if (root === undefined || root.type !== PANEL_TYPE) {
    return undefined;
  }

  const placement: unknown = root.props.__embed;

  if (typeof placement !== 'object' || placement === null || !('frame' in placement) || !('offset' in placement)) {
    return undefined;
  }

  const pair = (value: unknown): readonly [number, number] | undefined => (
    Array.isArray(value) && value.length === 2 && value.every(item => typeof item === 'number')
      ? [Number(value[0]), Number(value[1])]
      : undefined
  );
  const frame = pair(placement.frame);
  const offset = pair(placement.offset);

  return frame === undefined || offset === undefined ? undefined : { frame, offset };
}

/** Whether a built tree is an embedded screen: its concrete root is an {@link Embed}. */
export function isEmbedRoot(tree: JSX.Element): boolean {
  return embedPlacementOf(tree) !== undefined;
}

/**
 * The entry an embedded screen's own entries start at: slot 0 of the host's
 * run is the marker, so its cells and channels are numbered from 1. The
 * same on both sides, since both walk the tree through here.
 */
export const entryBaseOf = (tree: JSX.Element): number => (isEmbedRoot(tree) ? 1 : 0);
