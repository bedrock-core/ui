import type { Player } from '@minecraft/server';
import { uiManager } from '@minecraft/server-ui';
import { registerNativeComponents } from '../../components';
import { DefaultTranslations } from '../../data/Translation';
import type { FunctionComponent, JSX } from '../../jsx';
import { startInputLock } from '../../util';
import { present } from './presenters';
import {
  beginPresentChain,
  consumeSwap,
  endPresentChain,
  getPlayerRoot,
  hasLiveChain,
  isChainCurrent,
  isSwapPending,
  requestSwap,
  setBuildRunner,
  setPlayerRoot,
  triggerCleanup,
} from './session';
import { buildTree, cleanupComponentTree } from './tree';

export function render(
  root: JSX.Element | FunctionComponent,
  player: Player,
): void {
  // Ensure the built-in native components are registered before the first build/
  // serialize. Idempotent — safe to call on every render.
  registerNativeComponents();

  // Convert function component to JSX element if needed, then wrap it so
  // TranslationContext is populated at every root — the default i18n
  // instance's resolver, bound to this player, re-derived each build pass.
  const userRoot: JSX.Element = typeof root === 'function' ? { type: root, props: {} } : root;
  const rootElement: JSX.Element = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the expander invokes the wrapper with exactly these props
    type: DefaultTranslations as FunctionComponent,
    props: { player, children: userRoot },
  };

  // ── Supersede: a present chain is already live for this player. Swap the new
  // app into it instead of spawning a competing chain — one UI slot per player.
  if (hasLiveChain(player)) {
    // The old app dies NOW: hook cleanups run and its fibers leave the registry,
    // so the chain's next verdict/build sees only the new app — no dead-fiber
    // 'cleanup' poisoning, no hook-state bleed between same-named roots, no stale
    // exit flag blocking background passes. Only THIS player's fibers are touched.
    cleanupComponentTree(player);

    // A hook cleanup may have called exit() outside a transaction, tearing the
    // whole session down mid-swap. Fall through to a fresh start in that case.
    if (hasLiveChain(player)) {
      setPlayerRoot(player, rootElement);
      setBuildRunner(player, () => {
        buildTree(rootElement, player);
      });
      requestSwap(player);

      // A form on screen resolves its pending show() as canceled and the chain
      // absorbs the swap; with no form up this is a no-op and the chain's next
      // verdict absorbs it instead. The input lock is left untouched, so the
      // player's camera never flashes free between apps.
      uiManager.closeAllForms(player);

      return;
    }
  }

  // ── Fresh start: first render, post-cleanup, or the swap above collapsed.
  // Wipe any fibers a dead session left behind (a 'none' verdict or a crashed
  // build) so a different app can never resurrect their hook state through the
  // player-scoped fiber ids.
  startInputLock(player);
  cleanupComponentTree(player);

  // Register this player's session root and a background build runner
  setPlayerRoot(player, rootElement);
  setBuildRunner(player, () => {
    buildTree(rootElement, player);
  });

  const token = beginPresentChain(player);

  // Build and present one snapshot, then re-enter on the outcome. The root is
  // read fresh from the session each pass so a swapped-in app is picked up.
  const presentOnce = (): void => {
    if (!isChainCurrent(player, token)) {
      return;
    }

    const rootNow = getPlayerRoot(player);

    if (!rootNow) {
      endPresentChain(player, token);

      return;
    }

    // Normally a no-op (the swap already wiped at render() time); corrects the
    // pathological case of a swap landing while the old app was mid-build.
    if (consumeSwap(player)) {
      cleanupComponentTree(player);
    }

    let tree: JSX.Element;

    try {
      tree = buildTree(rootNow, player);
    } catch (err: unknown) {
      console.error(`[ui-runtime] buildTree error: ${String(err)}`);

      // Tear down rather than stranding the player input-locked on a session
      // whose chain just died.
      endPresentChain(player, token);
      triggerCleanup(player);

      return;
    }

    present(player, tree)
      .then((result) => {
        // Superseded or torn down while the form was up — this outcome is void.
        if (!isChainCurrent(player, token)) {
          return;
        }

        // A pending swap absorbs ANY outcome: the close that produced it was
        // programmatic (app handoff), not the player dismissing.
        if (isSwapPending(player)) {
          presentOnce();

          return;
        }

        if (result === 'present') {
          // Another snapshot requested; rebuild and present again immediately
          presentOnce();

          return;
        }

        endPresentChain(player, token);

        if (result === 'cleanup') {
          triggerCleanup(player);
        }
        // none: do nothing; user dismissed without callbacks
      })
      .catch((err: unknown) => {
        console.error(`[ui-runtime] present error: ${String(err)}`);

        if (!isChainCurrent(player, token)) {
          return;
        }

        endPresentChain(player, token);

        try {
          triggerCleanup(player);
        } catch {
          // Best effort — the player is likely gone (PlayerQuit).
        }
      });
  };

  // Kick off initial present
  presentOnce();
}
