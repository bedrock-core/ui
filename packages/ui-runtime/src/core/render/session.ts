import type { Player } from '@minecraft/server';
import { uiManager } from '@minecraft/server-ui';
import type { JSX } from '../../jsx';
import { stopInputLock } from '../../util';
import { getFibersForPlayer } from '../fabric';
import { cleanupComponentTree } from './tree';

/**
 * Lightweight per-player render session state for background logic passes.
 * We keep the root element and a runner that performs a build-only pass.
 */
interface SessionState {
  root?: JSX.Element;
  runBuild?: () => void;
  pending: boolean;
  suppress: boolean;
  /**
   * Token of the live present chain, `undefined` when none. A chain continuation
   * compares its own token before acting, so a superseded or torn-down chain's
   * tail can never present, clean up, or end a successor's session.
   */
  activeChain?: number;
  /** A root swapped into the live chain awaits its first build+show. */
  swapPending: boolean;
}

const sessions = new Map<string, SessionState>();

/** Monotonic id source for present-chain tokens. */
let nextChainId = 1;

function getOrCreate(player: Player): SessionState {
  const id = player.id;
  let session = sessions.get(id);

  if (!session) {
    session = { pending: false, suppress: false, swapPending: false };

    sessions.set(id, session);
  }

  return session;
}

export function setPlayerRoot(player: Player, root: JSX.Element): void {
  const session = getOrCreate(player);

  session.root = root;
}

export function getPlayerRoot(player: Player): JSX.Element | undefined {
  return sessions.get(player.id)?.root;
}

export function setBuildRunner(player: Player, runBuild: () => void): void {
  const session = getOrCreate(player);

  session.runBuild = runBuild;
}

export function clearPlayerRoot(player: Player): void {
  const session = sessions.get(player.id);

  if (!session) {
    return;
  }

  session.root = undefined;
  session.runBuild = undefined;
  session.pending = false;
  session.suppress = false;
  session.activeChain = undefined;
  session.swapPending = false;
}

/**
 * Mark a new present chain as THE live chain for this player and return its token.
 * Any previously-issued token becomes stale: its continuations must no-op.
 */
export function beginPresentChain(player: Player): number {
  const session = getOrCreate(player);
  const token = nextChainId++;

  session.activeChain = token;
  session.swapPending = false;

  return token;
}

/** Whether `token` still identifies this player's live present chain. */
export function isChainCurrent(player: Player, token: number): boolean {
  return sessions.get(player.id)?.activeChain === token;
}

/**
 * End the live present chain. Token-guarded so a stale tail (an outcome that
 * arrived after the chain was superseded or torn down) cannot clear a
 * successor's liveness.
 */
export function endPresentChain(player: Player, token: number): void {
  const session = sessions.get(player.id);

  if (session?.activeChain === token) {
    session.activeChain = undefined;
    session.swapPending = false;
  }
}

/** Whether any present chain is live for this player. */
export function hasLiveChain(player: Player): boolean {
  return sessions.get(player.id)?.activeChain !== undefined;
}

/**
 * Flag that a new root was swapped into the live chain and awaits its first
 * build+show. No-op without a live chain — render() takes the fresh path then.
 */
export function requestSwap(player: Player): void {
  const session = sessions.get(player.id);

  if (session?.activeChain !== undefined) {
    session.swapPending = true;
  }
}

/** Consume a pending swap: true (clearing the flag) exactly once per swap. */
export function consumeSwap(player: Player): boolean {
  const session = sessions.get(player.id);

  if (session?.swapPending) {
    session.swapPending = false;

    return true;
  }

  return false;
}

/** Whether a swapped-in root is still awaiting its first build+show. */
export function isSwapPending(player: Player): boolean {
  return sessions.get(player.id)?.swapPending ?? false;
}

/**
 * Schedule a background logic pass for this player. Coalesces multiple
 * requests within the same microtask into a single build run. Does not
 * present or serialize UI; it only rebuilds to evaluate effects.
 */
export function scheduleLogicPass(player: Player): void {
  const session = getOrCreate(player);

  // Skip if an interactive transaction is active
  if (session.suppress) {
    return;
  }

  // Skip while a swapped-in root awaits its first presentation — building it
  // early would run its mount pass before the app is ever shown.
  if (session.swapPending) {
    return;
  }

  if (session.pending) {
    return;
  }

  if (!session.root || !session.runBuild) {
    return;
  }

  // Skip if exit requested
  const exiting = getFibersForPlayer(player).some(f => !f.shouldRender);

  if (exiting) {
    return;
  }

  session.pending = true;

  // Schedule in a microtask to avoid re-entrancy and coalesce bursts.
  Promise.resolve().then(() => {
    session.pending = false;

    // The session could have been cleared between schedule and flush.
    const state = sessions.get(player.id);

    if (!(state?.root && state?.runBuild)) {
      return;
    }

    if (state.suppress) {
      return;
    }

    if (state.swapPending) {
      return;
    }

    const exitingNow = getFibersForPlayer(player).some(f => !f.shouldRender);

    if (exitingNow) {
      return;
    }

    try {
      state.runBuild();
    } catch (err: unknown) {
      // Swallow errors to avoid destabilizing runtime during background passes.
      console.warn(`[ui-runtime] background build error: ${String(err)}`);
    }
  });
}

export function beginInteractiveTransaction(player: Player): void {
  const session = getOrCreate(player);

  session.suppress = true;
  session.pending = false; // cancel pending microtask; flush path also checks suppress
}

export function endInteractiveTransaction(player: Player): void {
  const session = getOrCreate(player);

  session.suppress = false;
}

export function isInInteractiveTransaction(player: Player): boolean {
  const session = sessions.get(player.id);

  return session?.suppress ?? false;
}

export function triggerCleanup(player: Player, shouldClose: boolean = false): void {
  stopInputLock(player);
  cleanupComponentTree(player);
  clearPlayerRoot(player);

  if (shouldClose) {
    uiManager.closeAllForms(player);
  }
}
