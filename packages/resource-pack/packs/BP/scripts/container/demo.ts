import type { Block } from '@minecraft/server';
import { createContainerScreen } from '@bedrock-core/ui/container';
import Furnace from '../screens/furnace.screen';

/**
 * Serving the compiled screen.
 *
 * This is the whole behaviour-pack side. The screen describes itself — its
 * state, its handlers and its text are all in the JSX — so nothing is repeated
 * here and there is no second place for the two to drift apart. The build
 * compiled the same module into JSON UI; the runtime runs it again per viewer
 * to produce the live values.
 */
const screen = createContainerScreen(Furnace);

/**
 * Spawns one to open, on top of the button that was pressed, since the host
 * entity is not placeable.
 *
 * Nothing opens a container from script, so a screen is bound to something in
 * the world and shown when the player interacts with it.
 */
export const spawnDemo = (button: Block): void => {
  const { dimension } = button;

  for (const existing of dimension.getEntities({ type: screen.entity })) {
    existing.remove();
  }

  dimension.spawnEntity(screen.entity, {
    x: button.x + 0.5,
    y: button.y + 1,
    z: button.z + 0.5,
  });
};
