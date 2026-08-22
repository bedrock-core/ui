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
  slots: Readonly<Record<SlotName, number>>;
  channels: Readonly<Record<ChannelName, number>>;
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
   * Current value of each channel, as a 0..1 ratio. Called on open and whenever
   * `refresh` is invoked; only the channels that actually changed are written.
   */
  channels?: (player: Player) => Partial<Record<ChannelName, number>>;

  /** The item carrying the routing keys. Must match the filter's `protocolItemAux`. */
  markerItem?: string;

  /** Ticks between polls. One is responsive; higher trades latency for cost. */
  pollInterval?: number;
}
