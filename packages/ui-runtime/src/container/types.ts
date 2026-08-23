import type { ItemStack, Player } from '@minecraft/server';

/**
 * What the `ui-compile` filter generates alongside a screen's JSON UI.
 *
 * The script never restates an index: it addresses slots by the names the screen
 * used, and this record carries the numbers the compiler chose. Rename a slot in
 * the `.tsx` and the script stops type-checking, rather than quietly doing
 * nothing in game.
 */
export interface ScreenHandle<SlotName extends string, ChannelName extends string> {
  slots: Readonly<Record<SlotName, SlotSpec>>;
  channels: Readonly<Record<ChannelName, ChannelSpec>>;
  screen: {
    readonly namespace: string;
    readonly layoutId: number;
    readonly sentinelSlot: number;
    readonly drawn: number;
    readonly channelCount: number;
    readonly inventorySize: number;
    readonly entity: string | undefined;
  };
}

/**
 * How a channel's value is carried on the slots behind it.
 *
 * `ratio` is a 0..1 number on one slot's damage value, which is what a bar
 * reads. `text` is a string spread one character per slot, each character
 * riding that slot's stack size — the only value writable in place.
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
 * What a slot lets the player do. Decided by the SCREEN, not the script.
 *
 * Enforced a tick after the fact, because a container gives no way to veto a
 * move: a forbidden one is undone rather than prevented, and the player may see
 * their item flicker.
 */
export type SlotRole = 'both' | 'input' | 'output' | 'button';

/** Where a drawn slot is and what it allows. Generated, never hand-written. */
export interface SlotSpec {
  readonly slot: number;
  readonly role: SlotRole;
}

/** How a slot behaves once the player can reach it. */
export interface SlotBehaviour {
  /**
   * What sits in the slot. Returning an item makes the slot MANAGED: the runtime
   * puts it back whenever it leaves, and reclaims the copy the player took.
   * Omit it and the slot is free — a real input or output the player owns.
   */
  item?: (player: Player) => ItemStack | undefined;

  /**
   * Taking the item is the press. Only meaningful with `item`, because the take
   * is the only signal a container gives back.
   */
  onClick?: (player: Player) => void;

  /** Something arrived in a free slot. */
  onInsert?: (player: Player, stack: ItemStack) => void;

  /** A free slot became empty. */
  onRemove?: (player: Player) => void;
}

export interface ContainerScreenConfig<SlotName extends string, ChannelName extends string> {
  /** Per-slot behaviour, keyed by the names the screen used. */
  slots?: Partial<Record<SlotName, SlotBehaviour>>;

  /**
   * Current value of each channel. Called on open and whenever `refresh` is
   * invoked; only the channels that actually changed are written.
   *
   * A bar takes a 0..1 number; a text run takes an ordinary string. Which one a
   * channel wants is fixed by the primitive the screen used it for, and the
   * generated handle is what says so.
   */
  channels?: (player: Player) => Partial<Record<ChannelName, number | string>>;

  /** The item carrying the routing keys. Must match the filter's `protocolItemAux`. */
  markerItem?: string;

  /**
   * The item backing a `count` channel. Must be STACKABLE.
   *
   * A count channel rides the stack size, so an item with `maxAmount` 1 pins
   * every such channel to 1 — and the engine publishes nothing for a single
   * stack, which reads in game as a channel that silently never arrives. The
   * routing marker is deliberately unstackable (its damage carries the layout
   * key), so counts need their own item.
   */
  countItem?: string;

  /** Ticks between polls. One is responsive; higher trades latency for cost. */
  pollInterval?: number;
}
