import { EntityComponentTypes, ItemComponentTypes, type Player } from '@minecraft/server';
import { PROTOCOL_ITEM } from './contract';
import { isOwned, type ItemContainer } from './items';

/**
 * What the runtime did, and what the world looked like afterwards.
 *
 * Container bugs are hard to see from the outside: the only signal is an item
 * moving, and every wrong answer looks the same in game — a screen that stopped
 * responding. So the snapshot names the three places an item can be (the
 * container, a viewer's inventory, a viewer's cursor) and calls out the one
 * failure that explains most of them: a missing sentinel, which takes the
 * routing key with it and leaves the player looking at a plain chest.
 */

/** Short enough to read in a log line: `NP` for netherite_pickaxe, `PA` for paper. */
const abbreviate = (typeId: string): string => {
  const bare = typeId.replace('minecraft:', '');
  const parts = bare.split('_');

  return parts.map(part => part.slice(0, 2).toUpperCase()).join('').slice(0, 4);
};

const cell = (container: ItemContainer, slot: number): string => {
  const item = container.getItem(slot);

  if (!item) {
    return '-';
  }

  const owned = isOwned(item) ? '' : '!';
  const damage = item.getComponent(ItemComponentTypes.Durability)?.damage;

  return `${owned}${abbreviate(item.typeId)}${item.amount > 1 ? `x${item.amount}` : ''}`
    + `${damage ? `/${damage}` : ''}`;
};

const viewerLine = (viewer: Player): string => {
  const inventory = viewer.getComponent(EntityComponentTypes.Inventory)?.container;
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

  const held = viewer.getComponent(EntityComponentTypes.CursorInventory)?.item;

  return `  ${viewer.name}: inv ${carried} item(s)${escaped > 0 ? `, ${escaped} OURS` : ''}`
    + ` cur ${held ? `${abbreviate(held.typeId)}${isOwned(held) ? ' OURS' : ''}` : '-'}`;
};

export interface SnapshotOptions {
  /** Container indices carrying the routing keys. */
  sentinels: readonly number[];
  /** Slots the layout draws. */
  drawn: readonly number[];
}

/**
 * Prints where everything is, to the content log.
 *
 * @param label - what just happened, e.g. `press slot 3`
 */
export const snapshot = (
  label: string,
  container: ItemContainer,
  viewers: readonly Player[],
  options: SnapshotOptions,
): void => {
  const drawn = options.drawn.map(slot => `${slot}=${cell(container, slot)}`).join(' ');

  // The bank is summarised rather than listed: it is most of the container,
  // and the only thing worth knowing is whether it still holds what was
  // written.
  let bankUsed = 0;

  for (let slot = 0; slot < container.size; slot += 1) {
    if (!options.drawn.includes(slot) && !options.sentinels.includes(slot) && container.getItem(slot)) {
      bankUsed += 1;
    }
  }

  const routed = options.sentinels.every(slot => container.getItem(slot)?.typeId === PROTOCOL_ITEM);

  // The content log, never chat. A snapshot per action would bury everything
  // a player is actually there to read, and the log is where a developer
  // already is.
  console.warn([
    `[core.ui] ${label}`,
    `  key  ${routed ? options.sentinels.map(slot => cell(container, slot)).join(' ') : 'MISSING - screen unrouted'}`,
    `  draw ${drawn}`,
    `  bank ${bankUsed} used of ${container.size - options.drawn.length - options.sentinels.length}`,
    ...viewers.map(viewerLine),
  ].join('\n'));
};
