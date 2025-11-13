import type { Player } from '@minecraft/server';
import type { FunctionComponent, JSX } from '../../jsx';
import { startInputLock } from '../../util';
import { present } from './presenter';
import { buildTree } from './tree';
import { setBuildRunner, setPlayerRoot, triggerCleanup } from './session';

export function render(
  root: JSX.Element | FunctionComponent,
  player: Player,
): void {
  startInputLock(player);

  // Convert function component to JSX element if needed
  const rootElement: JSX.Element = typeof root === 'function' ? { type: root, props: {} } : root;

  // Register this player's session root and a background build runner
  setPlayerRoot(player, rootElement);
  setBuildRunner(player, () => {
    // Build-only pass to flush effects without presenting
    buildTree(rootElement, player);
  });

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
          triggerCleanup(player);
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
