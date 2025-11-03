import type { Player } from '@minecraft/server';
import { system } from '@minecraft/server';
import type { FunctionComponent, JSX } from '../../jsx';
import { startInputLock, stopInputLock } from '../../util';
import { present } from './presenter';
import { buildTree, cleanupComponentTree } from './tree';
import { uiManager } from '@minecraft/server-ui';

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

  // Background logic loop: continuously build tree; present only when requested
  let latestTree: JSX.Element = rootElement;
  let pendingPresent: boolean = true; // present once initially
  let isPresented: boolean = false;

  // Per-session state (closure, not global)
  const session = { closeGen: 0 };

  const intervalId = system.runInterval(() => {
    // Keep logic running: build tree and run effects
    const [tree, shouldPresentOnClose] = buildTree(rootElement, player);
    latestTree = tree;

    // If suspense resolved this tick, mark and close programmatically
    if (shouldPresentOnClose) {
      session.closeGen++; // mark a programmatic close event for this session
      uiManager.closeAllForms(player); // will cause the in-flight show() to resolve canceled=true
    }

    // Only present when requested and not already presenting
    if (pendingPresent && !isPresented) {
      pendingPresent = false; // consume the request now
      isPresented = true;

      present(player, latestTree, session)
        .then(result => {
          // Decide only from the actual result of the resolved show()
          if (result === 'present') {
            // Queue another present on next tick
            pendingPresent = true;
          } else if (result === 'cleanup') {
            pendingPresent = false;
            stopInputLock(player);
            cleanupComponentTree(player);
            system.clearRun(intervalId);
          } else {
            result === 'none';
            pendingPresent = false;
          }
        })
        .catch(() => {
          isPresented = false;
        })
        .finally(() => {
          isPresented = false;
        });
    }
  }, 1);
}
