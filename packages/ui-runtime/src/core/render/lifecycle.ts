import type { Player } from '@minecraft/server';
import { registerNativeComponents } from '../../components';
import { DefaultTranslations } from '../../data/Translation';
import type { FunctionComponent, JSX } from '../../jsx';
import { startInputLock } from '../../util';
import { present } from './presenters';
import { setBuildRunner, setPlayerRoot, triggerCleanup } from './session';
import { buildTree } from './tree';

export function render(
  root: JSX.Element | FunctionComponent,
  player: Player,
): void {
  // Ensure the built-in native components are registered before the first build/
  // serialize. Idempotent — safe to call on every render.
  registerNativeComponents();

  startInputLock(player);

  // Convert function component to JSX element if needed, then wrap it so
  // TranslationContext is populated at every root — the default i18n
  // instance's resolver, bound to this player, re-derived each build pass.
  const userRoot: JSX.Element = typeof root === 'function' ? { type: root, props: {} } : root;
  const rootElement: JSX.Element = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the expander invokes the wrapper with exactly these props
    type: DefaultTranslations as FunctionComponent,
    props: { player, children: userRoot },
  };

  // Register this player's session root and a background build runner
  setPlayerRoot(player, rootElement);
  setBuildRunner(player, () => {
    buildTree(rootElement, player);
  });

  // Helper to build and present once
  const presentOnce = (): void => {
    let tree: JSX.Element;

    try {
      tree = buildTree(rootElement, player);
    } catch (err: unknown) {
      console.error(`[ui-runtime] buildTree error: ${String(err)}`);

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
        console.error(`[ui-runtime] present error: ${String(err)}`);
      });
  };

  // Kick off initial present
  presentOnce();
}
