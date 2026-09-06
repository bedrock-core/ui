import type { Player } from '@minecraft/server';
import { uiManager } from '@minecraft/server-ui';
import { registerNativeComponents } from '../../components';
import { DefaultTranslations } from '../../data/Translation';
import type { FunctionComponent, JSX } from '../../jsx';
import { startInputLock } from '../../util';
import { playerOwner } from '../fabric';
import { present } from './presenters';
import { compiledSnapshotOf, compiledTitleOf } from './screens';
import {
  beginPresentChain,
  consumeSwap,
  endPresentChain,
  getSessionCompiled,
  getSessionRoot,
  hasLiveChain,
  isChainCurrent,
  isSwapPending,
  requestSwap,
  type SessionCompiled,
  setBuildRunner,
  setSessionRoot,
  triggerCleanup,
} from './session';
import { buildTree, cleanupComponentTree } from './tree';

export interface RenderOptions {
  /**
   * Diff every present of a compiled screen against the snapshot its build
   * recorded, and warn on drift: a baked prop that changed, a shape that no
   * longer matches, a live string past its reservation. The runtime half of
   * the liveness guard — probing at build cannot see a threshold no probe
   * crossed, so this is where such a miss becomes loud instead of silent.
   */
  debug?: boolean;
}

/**
 * Shows a screen to one player and keeps it shown across its state changes.
 *
 * A screen the build compiled is drawn from the pack by its title; one it did
 * not is serialized into the form on every present. That serialized path is
 * **deprecated**: it stays until every screen the library itself serves is
 * compiled, and is then removed. Compile every form screen — a `*.screen.tsx`
 * the ui-compile filter bakes — rather than relying on it.
 */
export function render(
  root: JSX.Element | FunctionComponent,
  player: Player,
  options: RenderOptions = {},
): void {
  // Ensure the built-in native components are registered before the first build/
  // serialize. Idempotent — safe to call on every render.
  registerNativeComponents();

  // A form belongs to the player it is shown to: that is what its fibers and
  // session are keyed by, and what its hooks may reach.
  const owner = playerOwner(player);

  // Whether the build compiled this screen. Read from the component itself,
  // before it is wrapped for translations, because the component is the only
  // thing both halves of the build hold in common.
  const compiledTitle = compiledTitleOf(root);
  // Stored with the root: a later render() swaps a different root into this
  // chain, and each pass shows whatever root it finds the way THAT root was
  // compiled.
  const shown: SessionCompiled = { title: compiledTitle, snapshot: compiledSnapshotOf(root), debug: options.debug === true };

  // Convert function component to JSX element if needed, then wrap it so
  // TranslationContext is populated at every root — the default i18n
  // instance's resolver, bound to this player, re-derived each build pass.
  const userRoot: JSX.Element = typeof root === 'function' ? { type: root, props: {} } : root;
  const rootElement: JSX.Element = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the expander invokes the wrapper with exactly these props
    type: DefaultTranslations as FunctionComponent,
    props: { owner, children: userRoot },
  };

  // ── Supersede: a present chain is already live for this player. Swap the new
  // app into it instead of spawning a competing chain — one UI slot per player.
  if (hasLiveChain(owner)) {
    // The old app dies NOW: hook cleanups run and its fibers leave the registry,
    // so the chain's next verdict/build sees only the new app — no dead-fiber
    // 'cleanup' poisoning, no hook-state bleed between same-named roots, no stale
    // exit flag blocking background passes. Only THIS player's fibers are touched.
    cleanupComponentTree(owner);

    // A hook cleanup may have called exit() outside a transaction, tearing the
    // whole session down mid-swap. Fall through to a fresh start in that case.
    if (hasLiveChain(owner)) {
      setSessionRoot(owner, rootElement, shown);
      setBuildRunner(owner, () => {
        buildTree(rootElement, owner, compiledTitle !== undefined);
      });
      requestSwap(owner);

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
  cleanupComponentTree(owner);

  // Register this player's session root and a background build runner
  setSessionRoot(owner, rootElement, shown);
  setBuildRunner(owner, () => {
    buildTree(rootElement, owner, compiledTitle !== undefined);
  });

  const token = beginPresentChain(owner);

  // Build and present one snapshot, then re-enter on the outcome. The root is
  // read fresh from the session each pass so a swapped-in app is picked up.
  const presentOnce = (): void => {
    if (!isChainCurrent(owner, token)) {
      return;
    }

    const rootNow = getSessionRoot(owner);

    if (!rootNow) {
      endPresentChain(owner, token);

      return;
    }

    // Normally a no-op (the swap already wiped at render() time); corrects the
    // pathological case of a swap landing while the old app was mid-build.
    if (consumeSwap(owner)) {
      cleanupComponentTree(owner);
    }

    const current = getSessionCompiled(owner);
    let tree: JSX.Element;

    try {
      tree = buildTree(rootNow, owner, current.title !== undefined);
    } catch (err: unknown) {
      console.error(`[ui-runtime] buildTree error: ${String(err)}`);

      // Tear down rather than stranding the player input-locked on a session
      // whose chain just died.
      endPresentChain(owner, token);
      triggerCleanup(owner);

      return;
    }

    present(player, tree, current.title, { snapshot: current.snapshot, debug: current.debug })
      .then((result) => {
        // Superseded or torn down while the form was up — this outcome is void.
        if (!isChainCurrent(owner, token)) {
          return;
        }

        // A pending swap absorbs ANY outcome: the close that produced it was
        // programmatic (app handoff), not the player dismissing.
        if (isSwapPending(owner)) {
          presentOnce();

          return;
        }

        if (result === 'present') {
          // Another snapshot requested; rebuild and present again immediately
          presentOnce();

          return;
        }

        endPresentChain(owner, token);

        if (result === 'cleanup') {
          triggerCleanup(owner);
        }
        // none: do nothing; user dismissed without callbacks
      })
      .catch((err: unknown) => {
        console.error(`[ui-runtime] present error: ${String(err)}`);

        if (!isChainCurrent(owner, token)) {
          return;
        }

        endPresentChain(owner, token);

        try {
          triggerCleanup(owner);
        } catch {
          // Best effort — the player is likely gone (PlayerQuit).
        }
      });
  };

  // Kick off initial present
  presentOnce();
}
