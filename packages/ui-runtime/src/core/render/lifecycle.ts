import type { Player } from '@minecraft/server';
import type { FunctionComponent, JSX } from '../../jsx';
import { startInputLock, stopInputLock } from '../../util';
import { present } from './presenter';
import { buildTree, cleanupComponentTree } from './tree';

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
export function render(
  root: JSX.Element | FunctionComponent,
  player: Player,
): void {
  startInputLock(player);

  // Convert function component to JSX element if needed
  const rootElement: JSX.Element = typeof root === 'function' ? { type: root, props: {} } : root;

  // Helper to build and present once
  const presentOnce = (): void => {
    // Build with traversal context carrying session bump function
    const tree = buildTree(rootElement, player);

    present(player, tree)
      .then(result => {
        if (result === 'present') {
          // Another snapshot requested (programmatic close); rebuild and present again immediately
          presentOnce();
        } else if (result === 'cleanup') {
          stopInputLock(player);
          cleanupComponentTree(player);
        } else {
          // none: do nothing; user dismissed without callbacks
        }
      })
      .catch(() => {
        // swallow to keep runtime stable; no interval loop to clear
      });
  };

  // Kick off initial present
  presentOnce();
}
