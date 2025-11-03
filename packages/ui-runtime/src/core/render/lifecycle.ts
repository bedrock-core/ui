import type { Player } from '@minecraft/server';
import type { FunctionComponent, JSX } from '../../jsx';
import { startInputLock } from '../../util';
import { buildTree } from './tree';
import { presentCycle } from './presenter';

/**
 * Main entry point for rendering a component or JSX element.
 *
 * This is the public API that initiates the rendering process:
 * 1. Acquires input lock for the player
 * 2. Normalizes root element (function component or JSX element)
 * 3. Builds complete element tree with all phases
 * 4. Starts presentation cycle (form display and interaction handling)
 *
 * TWO-PHASE ARCHITECTURE:
 * Phase 1 (Rendering): Build tree, create instances, initialize hooks
 * Phase 2 (Logic): Background effects run while form is displayed
 */
export async function render(
  root: JSX.Element | FunctionComponent,
  player: Player,
): Promise<void> {
  startInputLock(player);

  // Convert function component to JSX element if needed
  const rootElement: JSX.Element = typeof root === 'function' ? { type: root, props: {} } : root;

  // Build complete tree (instances created, hooks initialized)
  const tree = await buildTree(rootElement, player);

  await presentCycle(
    player,
    tree,
    rootElement,
  );
}
