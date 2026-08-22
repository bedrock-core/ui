import { ItemStack, type Player, world } from '@minecraft/server';
import { createContainerScreen } from '@bedrock-core/ui-runtime/container';
import { MinecraftItemTypes } from '@minecraft/vanilla-data';
import { demo } from '@bedrock-core/generated/ui';

/**
 * The reference container screen, driven.
 *
 * Everything numeric comes from the generated handle: slot indices, the bank
 * layout, the routing key, the container size. This file only says what each
 * named slot does. Rename `toggle` in `demo.screen.tsx` and this stops
 * compiling, rather than quietly doing nothing in game.
 *
 * The handle is written by the ui-compile filter into `packs/data/ui/`, never
 * into BP — a filter reads the pack folders and produces a build; it does not
 * edit them. The alias above is how the bundler and the editor both reach it.
 */

/** Stand-in for real machine state until something drives it. */
let charge = 0;

const button = (): ItemStack => {
  const item = new ItemStack(MinecraftItemTypes.Emerald, 1);

  item.nameTag = '§aToggle';
  item.setLore(['§7Taking it is the press.']);

  return item;
};

export const demoScreen = createContainerScreen(demo, {
  slots: {
    // Managed: the runtime puts it back and reclaims the copy, so taking it
    // reads as a press rather than a theft.
    toggle: {
      item: button,
      onClick: (player: Player) => {
        charge = charge >= 1 ? 0 : charge + 0.25;
        demoScreen.refresh(player);
        player.sendMessage(`§7charge → §f${(charge * 100).toFixed(0)}%`);
      },
    },

    // The bays are left free on purpose: no `item`, so the runtime never
    // restores them and the player's own items really go in and come out.
    bay_0: {
      onInsert: (player, stack) => {
        player.sendMessage(`§7bay 0 ← §f${stack.typeId}`);
      },
    },
  },

  channels: () => ({ charge }),
});

/**
 * Nothing opens a container from script, so a screen is bound to something in
 * the world and shown when the player interacts with it.
 */
export const startDemo = (): void => {
  demoScreen.attachToEntity('core:spike_container');
};

/** Spawns one to interact with, since the demo entity is not placeable. */
export const spawnDemo = (player: Player): void => {
  for (const existing of player.dimension.getEntities({ type: 'core:spike_container' })) {
    existing.remove();
  }

  const facing = player.getViewDirection();

  player.dimension.spawnEntity('core:spike_container', {
    x: player.location.x + facing.x * 2,
    y: player.location.y,
    z: player.location.z + facing.z * 2,
  });

  player.sendMessage([
    '§b§l[demo] container ready.§r',
    '§7Press use on it. Take the emerald to raise the bar; fill the bays freely.',
  ].join('\n'));
};

world.afterEvents.worldLoad.subscribe(() => {
  startDemo();
});
