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
 * On the other side, {@link Embed} is the root of the embedded screen: its
 * canvas is the host's whole frame, so it positions its content where the
 * host left room, and its entries are numbered from 1 because slot 0 is the
 * marker. Neither side renders the other; the one contract is the frame and
 * the slot count, both constants of the host component that embeds.
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

export interface EmbedProps extends ControlProps {
  children?: JSX.Node;
}

/**
 * The root of a screen drawn into another pack's: a panel the size of the
 * host's frame, whose pack gates it on the host's marker slot.
 */
export const Embed: FunctionComponent<EmbedProps> = ({ children, ...rest }: EmbedProps): JSX.Element => ({
  type: PANEL_TYPE,
  props: {
    ...withControl(rest),
    __embed: true,
    children,
  },
});

/** Whether a built tree is an embedded screen: its concrete root is an {@link Embed}. */
export function isEmbedRoot(tree: JSX.Element): boolean {
  const [root] = concreteRoots(tree);

  return root !== undefined && root.type === PANEL_TYPE && root.props.__embed === true;
}

/**
 * The entry an embedded screen's own entries start at: slot 0 of the host's
 * run is the marker, so its cells and channels are numbered from 1. The
 * same on both sides, since both walk the tree through here.
 */
export const entryBaseOf = (tree: JSX.Element): number => (isEmbedRoot(tree) ? 1 : 0);
