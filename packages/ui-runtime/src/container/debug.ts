import {
  type Container, EntityComponentTypes, ItemComponentTypes, type Player,
} from '@minecraft/server';
import { isOwned } from './marker';

/**
 * What the runtime did, and what the world looked like afterwards.
 *
 * Container bugs are hard to see from the outside: the only signal is an item
 * moving, and every wrong answer looks the same in game — a screen that stopped
 * responding. So the snapshot names the three places an item can be (the
 * container, the player's inventory, the cursor) and calls out the one failure
 * that explains most of them: a missing sentinel, which takes the routing key
 * with it and leaves the player looking at a plain chest.
 */

/** Short enough to read in chat: `NP` for netherite_pickaxe, `PA` for paper. */
const abbreviate = (typeId: string): string => {
  const bare = typeId.replace('minecraft:', '');
  const parts = bare.split('_');

  return parts.map(part => part.slice(0, 2).toUpperCase()).join('').slice(0, 4);
};

const cell = (container: Container, slot: number): string => {
  const item = container.getItem(slot);

  if (!item) {
    return '-';
  }

  const owned = isOwned(item) ? '' : '!';
  const damage = item.getComponent(ItemComponentTypes.Durability)?.damage;

  return `${owned}${abbreviate(item.typeId)}${item.amount > 1 ? `x${item.amount}` : ''}`
    + `${damage ? `/${damage}` : ''}`;
};

export interface SnapshotOptions {
  /** Container index carrying the routing keys. */
  sentinel: number;
  /** Slots the layout draws. */
  drawn: readonly number[];
  /** The item the sentinel is supposed to be. */
  markerItem: string;
}

/**
 * Prints where everything is, to the content log.
 *
 * @param label - what just happened, e.g. `press 3`
 */
export const snapshot = (
  label: string,
  container: Container,
  player: Player,
  options: SnapshotOptions,
): void => {
  const drawn = options.drawn.map(slot => `${slot}=${cell(container, slot)}`).join(' ');

  // The bank is summarised rather than listed: it is most of the container, and
  // the only thing worth knowing is whether it still holds what was written.
  let bankUsed = 0;

  for (let slot = 0; slot < container.size; slot += 1) {
    if (!options.drawn.includes(slot) && slot !== options.sentinel && container.getItem(slot)) {
      bankUsed += 1;
    }
  }

  const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;
  let escaped = 0;
  let carried = 0;

  if (inventory) {
    for (let slot = 0; slot < inventory.size; slot += 1) {
      const item = inventory.getItem(slot);

      if (!item) {
        continue;
      }

      carried += 1;

      if (isOwned(item)) {
        escaped += 1;
      }
    }
  }

  const held = player.getComponent(EntityComponentTypes.CursorInventory)?.item;
  const sentinelItem = container.getItem(options.sentinel);
  const routed = sentinelItem?.typeId === options.markerItem;

  // The content log, never chat. A snapshot per action would bury everything a
  // player is actually there to read, and the log is where a developer already
  // is.
  console.warn([
    `[bcui] ${label}`,
    `  key  ${routed ? cell(container, options.sentinel) : 'MISSING - screen unrouted'}`,
    `  draw ${drawn}`,
    `  bank ${bankUsed} used of ${container.size - options.drawn.length - 1}`,
    `  inv  ${carried} item(s)${escaped > 0 ? `, ${escaped} OURS` : ''}`,
    `  cur  ${held ? `${abbreviate(held.typeId)}${isOwned(held) ? ' OURS' : ''}` : '-'}`,
  ].join('\n'));
};
