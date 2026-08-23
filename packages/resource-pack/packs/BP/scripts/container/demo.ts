import { ItemStack, type Player, system, world } from '@minecraft/server';
import { createContainerScreen } from '@bedrock-core/ui-runtime/container';
import { MinecraftItemTypes } from '@minecraft/vanilla-data';
import { demo } from '@bedrock-core/generated/ui';

/**
 * Everything the container runtime can currently drive, in one screen.
 *
 * Numbers come from the generated handle: slot indices, the bank layout, the
 * routing key, the container size. This file only says what each named slot
 * does. Rename a slot in `demo.screen.tsx` and this stops compiling, rather
 * than quietly doing nothing in game.
 *
 * The handle is written by the ui-compile filter into `packs/data/ui/`, never
 * into BP — a filter reads the pack folders and produces a build; it does not
 * edit them.
 */

/** Bar fill, 0..1. */
let charge = 0;

/**
 * The machine's own readout. Letters, digits and `.` only — see the charset.
 *
 * Only the charge buttons write it. Every other thing on screen has a channel
 * of its own, so nothing overwrites anything.
 */
let status = 'ready';

/** Cycled by the book, to show a string changing on demand. */
let mode = 0;

const MODES = ['idle', 'running', 'paused', 'done'];

/** How many times any button has been pressed. */
let presses = 0;

/** Which button was pressed last. */
let last = 'none';

/** Ticks since the world loaded, so one line moves without anyone touching it. */
let started = 0;

/** What last moved through the free slots. Written by them and nothing else. */
let io = 'slots empty';

/**
 * What a button looks like.
 *
 * The screen says a slot IS a button; this says what it shows. A button's face
 * is its item, so a custom look means a custom item in the pack rather than a
 * texture path in the layout.
 */
const button = (type: string, name: string, hint: string) => (): ItemStack => {
  const item = new ItemStack(type, 1);

  item.nameTag = name;
  item.setLore([hint]);

  return item;
};

/** Kept in step so the bar and the readout never disagree. */
const setCharge = (next: number): void => {
  charge = Math.max(0, Math.min(1, next));
  status = `charge ${(charge * 100).toFixed(0)}.0 units`;
};

/** Every button records itself, so `presses` and `last` need no repetition. */
const pressed = (name: string): void => {
  presses += 1;
  last = `last ${name}`;
};

export const demoScreen = createContainerScreen(demo, {
  slots: {
    up: {
      item: button(MinecraftItemTypes.Emerald, '§aRaise', '§7Adds a quarter.'),
      onClick: (player: Player) => {
        pressed('raise');
        setCharge(charge + 0.25);
        demoScreen.refresh(player);
      },
    },

    down: {
      item: button(MinecraftItemTypes.Redstone, '§cLower', '§7Takes a quarter.'),
      onClick: (player: Player) => {
        pressed('lower');
        setCharge(charge - 0.25);
        demoScreen.refresh(player);
      },
    },

    cycle: {
      item: button(MinecraftItemTypes.Book, '§eCycle', '§7Next mode.'),
      onClick: (player: Player) => {
        pressed('cycle');
        mode = (mode + 1) % MODES.length;
        demoScreen.refresh(player);
      },
    },

    reset: {
      item: button(MinecraftItemTypes.Bucket, '§fReset', '§7Back to zero.'),
      onClick: (player: Player) => {
        pressed('reset');
        charge = 0;
        mode = 0;
        status = 'ready';
        demoScreen.refresh(player);
      },
    },

    // Declared `input` in the layout, so the runtime puts back anything the
    // player tries to take out — a hopper's intake. Undone a tick later rather
    // than prevented, because a container gives no way to veto a move.
    input: {
      onInsert: (player, stack) => {
        io = `in ${stack.typeId.replace('minecraft:', '').replaceAll('_', ' ')}`;
        demoScreen.refresh(player);
      },
      onRemove: (player) => {
        io = 'slots empty';
        demoScreen.refresh(player);
      },
    },

    // Declared `output`: the player may take from it and may not fill it.
    // Anything inserted goes straight back to their inventory.
    output: {
      onRemove: (player) => {
        io = 'output taken';
        demoScreen.refresh(player);
      },
    },

    // Ordinary storage, for comparison: anything in, anything out.
    store: {},
  },

  // Six independent channels. Each text run owns its own slots, so writing one
  // leaves the others alone — and unchanged cells are skipped, which is why a
  // clock ticking once a second costs almost nothing.
  channels: () => ({
    charge,
    status,
    mode: MODES[mode] ?? 'idle',
    level: `${(charge * 100).toFixed(0)}.0`,
    presses: `p ${presses}`,
    uptime: `t ${Math.floor((system.currentTick - started) / 20)}`,
    last,
    io,
  }),
});

/**
 * Nothing opens a container from script, so a screen is bound to something in
 * the world and shown when the player interacts with it.
 */
export const startDemo = (): void => {
  started = system.currentTick;
  demoScreen.attachToEntity('core:spike_container');

  // Nothing about a container screen is push-based, so a value that changes on
  // its own needs something to say so. A refresh costs only the cells that
  // actually moved, which for a clock is the last two or three.
  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      demoScreen.refresh(player);
    }
  }, 20);
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
    '§7Take a button item to press it. The two right-hand slots are yours.',
  ].join('\n'));
};

world.afterEvents.worldLoad.subscribe(() => {
  startDemo();
});
