import type { Player } from '@minecraft/server';
import type { FunctionComponent, JSX } from '../../jsx';
import { Logger, startInputLock } from '../../util';
import { present } from './presenter';
import { setBuildRunner, setPlayerRoot, triggerCleanup } from './session';
import { buildTree } from './tree';

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
    let tree: JSX.Element;

    try {
      tree = buildTree(rootElement, player);
    } catch (err: unknown) {
      Logger.error(`[ui-runtime] buildTree error: ${String(err)}`);

      return;
    }

    present(player, tree)
      .then((result) => {
        if (result === 'present') {
          // Another snapshot requested (programmatic close); rebuild and present again immediately
          presentOnce();
        } else if (result === 'cleanup') {
          triggerCleanup(player);
        } else {
          // none: do nothing; user dismissed without callbacks
        }
      })
      .catch((err: unknown) => {
        Logger.error(`[ui-runtime] present error: ${String(err)}`);
      });
  };

  // Kick off initial present
  presentOnce();
}
