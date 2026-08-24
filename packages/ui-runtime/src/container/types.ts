import type { ItemStack, Player } from '@minecraft/server';
import type { JSX } from '../jsx';

/**
 * How a channel's value is carried on the slots behind it.
 *
 * `ratio` is a 0..1 number on one slot's damage value, which is what a fill
 * reads. `text` is a string spread one character per slot, each character riding
 * that slot's stack size — the only value writable in place.
 */
export type ChannelCarrier = 'ratio' | 'text';

/** Where a channel lives and how wide it is. Generated, never hand-written. */
export interface ChannelSpec {
  /** First bank slot. */
  readonly slot: number;
  readonly carrier: ChannelCarrier;
  /** Slots the channel occupies. One, except for a text run. */
  readonly length: number;
}

/**
 * What a slot lets the player do. Decided by the SCREEN, not a script.
 *
 * Enforced a tick after the fact, because a container gives no way to veto a
 * move: a forbidden one is undone rather than prevented.
 */
export type SlotRole = 'both' | 'input' | 'output' | 'button';

/** Where a drawn slot is and what it allows. Generated, never hand-written. */
export interface SlotSpec {
  readonly slot: number;
  readonly role: SlotRole;
}

/**
 * What the `ui-compile` filter generates alongside a screen's JSON UI.
 *
 * Everything is POSITIONAL, and nothing is named. The runtime re-renders the
 * screen's own component per player and walks the result in the same order the
 * compiler walked the laid-out tree, so the nth slot is the nth slot and the
 * nth channel is the nth channel. That is the whole addressing scheme: it works
 * because the shape is frozen, and it is why the author never writes an index
 * or invents a name.
 */
export interface ScreenHandle {
  readonly slots: readonly SlotSpec[];
  readonly channels: readonly ChannelSpec[];
  readonly screen: {
    readonly namespace: string;
    readonly layoutId: number;
    readonly sentinelSlot: number;
    readonly drawn: number;
    readonly channelCount: number;
    readonly inventorySize: number;
    readonly entity: string | undefined;
  };
  /** The component itself, re-rendered per player to produce the live values. */
  readonly Screen: () => JSX.Element;
}

export interface ContainerScreenConfig {
  /** The item carrying the routing keys. Must match the filter's `protocolItemAux`. */
  markerItem?: string;

  /**
   * The item backing a text channel. Must be STACKABLE.
   *
   * A character rides the stack size, so an item with `maxAmount` 1 pins every
   * cell to 1 — and the engine publishes nothing for a single stack, which
   * reads in game as text that silently never arrives. The routing marker is
   * deliberately unstackable, since its damage carries the layout key.
   */
  countItem?: string;

  /** Ticks between polls. One is responsive; higher trades latency for cost. */
  pollInterval?: number;

  /**
   * Reports every action to the player who caused it, with where every item
   * ended up.
   *
   * A container bug is invisible from the outside — the only signal is an item
   * moving, and every wrong answer looks like a screen that stopped responding.
   * This says which of the three places an item can be it actually went to.
   */
  debug?: boolean;
}

/** Re-exported for handlers, which receive them. */
export type { ItemStack, Player };
