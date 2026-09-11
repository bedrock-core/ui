import { uiManager } from '@minecraft/server-ui';
import type { JSX } from '../../jsx';
import { stopInputLock } from '../../util';
import { getFibersForOwner, type Owner } from '../fabric';
import type { CompiledSnapshot } from './screens';
import { cleanupComponentTree } from './tree';

/** Persisted hook values waiting for their fibers: by fiber id, then by slot index. */
export type StateSeed = ReadonlyMap<string, ReadonlyMap<number, unknown>>;

/**
 * Lightweight per-owner render session state for background logic passes.
 * We keep the root element and a runner that performs a build-only pass.
 */
/**
 * How the session's root is shown: the compiled title its layout is picked
 * by, what the build baked, and whether presents are diffed. Kept BESIDE the
 * root, because a handoff swaps the root under a live present chain, and the
 * chain must show the new root the way the new root was compiled — not the way
 * the chain's first root was.
 */
export interface SessionCompiled {
  /** Absent only for a chest session, which never presents through the chain. */
  title?: string;
  snapshot?: CompiledSnapshot;
  debug: boolean;
}

interface SessionState {
  root?: JSX.Element;
  compiled?: SessionCompiled;
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
  /**
   * Hook values handed over before the first build, consumed fiber by fiber
   * as they are created. Whatever is left belongs to components that did not
   * render, and is dropped with the session.
   */
  seed?: Map<string, ReadonlyMap<number, unknown>>;
}

const sessions = new Map<string, SessionState>();

/** Monotonic id source for present-chain tokens. */
let nextChainId = 1;

function getOrCreate(owner: Owner): SessionState {
  const id = owner.id;
  let session = sessions.get(id);

  if (!session) {
    session = { pending: false, suppress: false, swapPending: false };

    sessions.set(id, session);
  }

  return session;
}

/**
 * @param compiled - How the form chain shows this root. A chest session never
 *   presents through the chain (its render lands in slots), so it leaves it.
 */
export function setSessionRoot(owner: Owner, root: JSX.Element, compiled: SessionCompiled = { debug: false }): void {
  const session = getOrCreate(owner);

  session.root = root;
  session.compiled = compiled;
}

export function getSessionRoot(owner: Owner): JSX.Element | undefined {
  return sessions.get(owner.id)?.root;
}

/** How the current root is shown; see {@link SessionCompiled}. */
export function getSessionCompiled(owner: Owner): SessionCompiled {
  return sessions.get(owner.id)?.compiled ?? { debug: false };
}

export function setBuildRunner(owner: Owner, runBuild: () => void): void {
  const session = getOrCreate(owner);

  session.runBuild = runBuild;
}

export function clearSession(owner: Owner): void {
  const session = sessions.get(owner.id);

  if (!session) {
    return;
  }

  session.root = undefined;
  session.runBuild = undefined;
  session.pending = false;
  session.suppress = false;
  session.activeChain = undefined;
  session.swapPending = false;
  session.seed = undefined;
}

/**
 * Hand persisted hook values to the fibers the next build creates. A container
 * screen's state lives on its entity; this is how it gets back into the tree.
 */
export function setStateSeed(owner: Owner, seed: StateSeed): void {
  const session = getOrCreate(owner);

  session.seed = new Map(seed);
}

/** The seed for one fiber, consumed so a fiber recreated later starts fresh. */
export function takeStateSeed(owner: Owner, fiberId: string): ReadonlyMap<number, unknown> | undefined {
  const seed = sessions.get(owner.id)?.seed;
  const values = seed?.get(fiberId);

  seed?.delete(fiberId);

  return values;
}

/**
 * Mark a new present chain as THE live chain for this owner and return its token.
 * Any previously-issued token becomes stale: its continuations must no-op.
 */
export function beginPresentChain(owner: Owner): number {
  const session = getOrCreate(owner);
  const token = nextChainId++;

  session.activeChain = token;
  session.swapPending = false;

  return token;
}

/** Whether `token` still identifies this owner's live present chain. */
export function isChainCurrent(owner: Owner, token: number): boolean {
  return sessions.get(owner.id)?.activeChain === token;
}

/**
 * End the live present chain. Token-guarded so a stale tail (an outcome that
 * arrived after the chain was superseded or torn down) cannot clear a
 * successor's liveness.
 */
export function endPresentChain(owner: Owner, token: number): void {
  const session = sessions.get(owner.id);

  if (session?.activeChain === token) {
    session.activeChain = undefined;
    session.swapPending = false;
  }
}

/** Whether any present chain is live for this owner. */
export function hasLiveChain(owner: Owner): boolean {
  return sessions.get(owner.id)?.activeChain !== undefined;
}

/**
 * Flag that a new root was swapped into the live chain and awaits its first
 * build+show. No-op without a live chain — render() takes the fresh path then.
 */
export function requestSwap(owner: Owner): void {
  const session = sessions.get(owner.id);

  if (session?.activeChain !== undefined) {
    session.swapPending = true;
  }
}

/** Consume a pending swap: true (clearing the flag) exactly once per swap. */
export function consumeSwap(owner: Owner): boolean {
  const session = sessions.get(owner.id);

  if (session?.swapPending) {
    session.swapPending = false;

    return true;
  }

  return false;
}

/** Whether a swapped-in root is still awaiting its first build+show. */
export function isSwapPending(owner: Owner): boolean {
  return sessions.get(owner.id)?.swapPending ?? false;
}

/**
 * Schedule a background logic pass for this owner. Coalesces multiple
 * requests within the same microtask into a single build run. Does not
 * present or serialize UI; it only rebuilds to evaluate effects.
 */
export function scheduleLogicPass(owner: Owner): void {
  // A build renders once: a setter called during it has nothing to wake.
  if (owner.kind === 'build') {
    return;
  }

  const session = getOrCreate(owner);

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
  const exiting = getFibersForOwner(owner).some(f => !f.shouldRender);

  if (exiting) {
    return;
  }

  session.pending = true;

  // Schedule in a microtask to avoid re-entrancy and coalesce bursts.
  Promise.resolve().then(() => {
    session.pending = false;

    // The session could have been cleared between schedule and flush.
    const state = sessions.get(owner.id);

    if (!(state?.root && state?.runBuild)) {
      return;
    }

    if (state.suppress) {
      return;
    }

    if (state.swapPending) {
      return;
    }

    const exitingNow = getFibersForOwner(owner).some(f => !f.shouldRender);

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

export function beginInteractiveTransaction(owner: Owner): void {
  const session = getOrCreate(owner);

  session.suppress = true;
  session.pending = false; // cancel pending microtask; flush path also checks suppress
}

export function endInteractiveTransaction(owner: Owner): void {
  const session = getOrCreate(owner);

  session.suppress = false;
}

export function isInInteractiveTransaction(owner: Owner): boolean {
  const session = sessions.get(owner.id);

  return session?.suppress ?? false;
}

export function triggerCleanup(owner: Owner, shouldClose: boolean = false): void {
  // The input lock and the form on screen belong to a player; an entity's
  // session has neither.
  if (owner.kind === 'player') {
    stopInputLock(owner.player);
  }

  cleanupComponentTree(owner);
  clearSession(owner);

  if (shouldClose && owner.kind === 'player') {
    uiManager.closeAllForms(owner.player);
  }
}
