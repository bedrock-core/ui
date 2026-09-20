import { EntityComponentTypes, ItemComponentTypes, type Player } from '@minecraft/server';
import type { ItemContainer, ProtocolItems } from './items';

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

/** Short enough to read in a log line: `NP` for netherite_pickaxe. */
const abbreviate = (typeId: string): string => {
  const bare = typeId.replace('minecraft:', '');
  const parts = bare.split('_');

  return parts.map(part => part.slice(0, 2).toUpperCase()).join('').slice(0, 4);
};

/**
 * One slot: a protocol item as its role and the value it carries (`T3`, a
 * transport wearing look 3), a player's item as `!` and its abbreviated type.
 */
const cell = (container: ItemContainer, items: ProtocolItems, slot: number): string => {
  const item = container.getItem(slot);

  if (!item) {
    return '-';
  }

  const count = item.amount > 1 ? `x${item.amount}` : '';
  const role = items.roleOf(item);

  if (role !== undefined) {
    return `${role.slice(0, 1).toUpperCase()}${items.valueOf(item)}${count}`;
  }

  const damage = item.getComponent(ItemComponentTypes.Durability)?.damage;

  return `!${abbreviate(item.typeId)}${count}${damage ? `/${damage}` : ''}`;
};

const viewerLine = (viewer: Player, items: ProtocolItems): string => {
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

      if (items.isOwned(item)) {
        escaped += 1;
      }
    }
  }

  const held = viewer.getComponent(EntityComponentTypes.CursorInventory)?.item;

  return `  ${viewer.name}: inv ${carried} item(s)${escaped > 0 ? `, ${escaped} OURS` : ''}`
    + ` cur ${held ? `${abbreviate(held.typeId)}${items.isOwned(held) ? ' OURS' : ''}` : '-'}`;
};

export interface SnapshotOptions {
  /** Container indices carrying the routing keys. */
  sentinels: readonly number[];
  /** The screen's protocol items. */
  items: ProtocolItems;
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
  const { items } = options;
  const drawn = options.drawn.map(slot => `${slot}=${cell(container, items, slot)}`).join(' ');

  // The bank is summarised rather than listed: it is most of the container,
  // and the only thing worth knowing is whether it still holds what was
  // written.
  let bankUsed = 0;

  for (let slot = 0; slot < container.size; slot += 1) {
    if (!options.drawn.includes(slot) && !options.sentinels.includes(slot) && container.getItem(slot)) {
      bankUsed += 1;
    }
  }

  const routed = options.sentinels.every((slot) => {
    const item = container.getItem(slot);

    return item !== undefined && items.roleOf(item) === 'sentinel';
  });

  // The content log, never chat. A snapshot per action would bury everything
  // a player is actually there to read, and the log is where a developer
  // already is.
  console.warn([
    `[core.ui] ${label}`,
    `  key  ${routed ? options.sentinels.map(slot => cell(container, items, slot)).join(' ') : 'MISSING - screen unrouted'}`,
    `  draw ${drawn}`,
    `  bank ${bankUsed} used of ${container.size - options.drawn.length - options.sentinels.length}`,
    ...viewers.map(viewer => viewerLine(viewer, items)),
  ].join('\n'));
};
