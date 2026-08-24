import { type Player, world } from '@minecraft/server';
import { createContainerScreen } from '@bedrock-core/ui-runtime/container';
import { demo } from '@bedrock-core/generated/ui';

/**
 * Serving the compiled screen.
 *
 * This is the whole behaviour-pack side. The screen describes itself — its
 * state, its handlers and its text are all in the JSX — so there is nothing to
 * repeat here and no second place for the two to drift apart.
 *
 * The handle is written by the ui-compile filter into `packs/data/ui/`, never
 * into BP: a filter reads the pack folders and produces a build, it does not
 * edit them.
 */
// Debug on while the runtime is being shaken out: every action reports where
// each item ended up, which is the only way to see a container bug from inside
// the game.
const screen = createContainerScreen(demo, { debug: true });

world.afterEvents.worldLoad.subscribe(() => {
  if (demo.screen.entity) {
    screen.attachToEntity(demo.screen.entity);
  }
});

/**
 * Spawns one to open, since the host entity is not placeable.
 *
 * Nothing opens a container from script, so a screen is bound to something in
 * the world and shown when the player interacts with it.
 */
export const spawnDemo = (player: Player): void => {
  const type = demo.screen.entity;

  if (!type) {
    return;
  }

  for (const existing of player.dimension.getEntities({ type })) {
    existing.remove();
  }

  const facing = player.getViewDirection();

  player.dimension.spawnEntity(type, {
    x: player.location.x + facing.x * 2,
    y: player.location.y,
    z: player.location.z + facing.z * 2,
  });
};
