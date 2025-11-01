import type { Player } from '@minecraft/server';
import { system } from '@minecraft/server';
import { ActionFormData, uiManager } from '@minecraft/server-ui';
import { executeEffects } from '../hooks';
import type { StateHook } from '../hooks/types';
import type { FunctionComponent, JSX } from '../jsx';
import { startInputLock } from '../util';
import { fiberRegistry } from './fiber';
import { buildTree, cleanupComponentTree } from './render';
import { clearRuntimeForPlayer, getRuntimeForPlayer, setRuntimeForPlayer } from './runtimeStore';
import { DefaultScheduler } from './scheduler';
import { PROTOCOL_HEADER, serialize } from './serializer';
import type {
  RenderCondition, RenderOptions, RuntimeHandle,
  RuntimeOptions,
  Scheduler, SerializationContext
} from './types';

/**
 * Minimal Runtime skeleton that centralizes scheduling and render triggering.
 * For now, it delegates actual snapshotting/display to the existing render()
 * entry point when a render is requested, to avoid behavior changes.
 */
export class Runtime implements RuntimeHandle {
  private readonly _player: Player;
  private readonly _root: JSX.Element | FunctionComponent;
  private readonly _scheduler: Scheduler;
  private readonly _opts: Required<RuntimeOptions>;
  private readonly _listeners = new Map<string, Set<() => void>>();
  private readonly _conditions = new Set<RenderCondition>();
  private _pendingRender = false;
  private _started = false;

  constructor(
    player: Player,
    root: JSX.Element | FunctionComponent,
    options?: RuntimeOptions,
    scheduler: Scheduler = new DefaultScheduler(),
  ) {
    this._player = player;
    this._root = root;
    this._scheduler = scheduler;
    this._opts = { tickInterval: options?.tickInterval ?? 1 };
  }

  on(event: 'shouldRender' | 'teardown', cb: () => void): void {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event)!.add(cb);
  }

  stop(): void {
    this._scheduler.stop();
    this._started = false;
  }

  destroy(): void {
    this.stop();
    this.emit('teardown');
    this._listeners.clear();
    this._conditions.clear();
    clearRuntimeForPlayer(this._player.name);
  }

  triggerRender(_reason?: string): void {
    // Debounce multiple calls within a single tick
    this._pendingRender = true;
  }

  /** Register a condition function; currently internal—public hook comes later. */
  registerCondition(condition: RenderCondition): void {
    this._conditions.add(condition);
  }

  start(): void {
    if (this._started) return;
    this._started = true;

    // Show initial snapshot immediately via existing render() for compatibility
    this.emit('shouldRender');

    // Begin logic loop
    // Mark root as used to satisfy linter until renderer integration uses it
    void this._root;
    setRuntimeForPlayer(this._player.name, {
      triggerRender: (reason?: string) => this.triggerRender(reason),
      registerCondition: cond => this.registerCondition(cond),
      unregisterCondition: cond => this.unregisterCondition(cond),
      consumePending: () => this.consumePending(),
      evaluateConditionsNow: () => this.evaluateConditionsNow(),
    });
    this._scheduler.start(() => {
      // Evaluate conditions
      let shouldRender = this._pendingRender;
      if (!shouldRender) {
        for (const cond of this._conditions) {
          try {
            if (cond()) { shouldRender = true; break; }
          } catch {
            // Ignore condition errors to keep the loop resilient
          }
        }
      }

      if (shouldRender) {
        this._pendingRender = false;
        this.emit('shouldRender');
      }
    }, this._opts.tickInterval);
  }

  unregisterCondition(condition: RenderCondition): void {
    this._conditions.delete(condition);
  }

  consumePending(): boolean {
    if (this._pendingRender) {
      this._pendingRender = false;

      return true;
    }

    return false;
  }

  evaluateConditionsNow(): boolean {
    for (const cond of this._conditions) {
      try { if (cond()) return true; } catch { /* ignore */ }
    }

    return false;
  }

  private emit(event: 'shouldRender' | 'teardown'): void {
    const listeners = this._listeners.get(event);
    if (!listeners || listeners.size === 0) return;

    for (const cb of listeners) {
      try { cb(); } catch { /* no-op */ }
    }
  }
}

/** Entry point that constructs a Runtime and starts the loop. */
export async function render(
  player: Player,
  root: JSX.Element | FunctionComponent,
  options: RenderOptions = { awaitStateResolution: false },
): Promise<void> {
  // Convert function component to JSX element if needed
  const rootElement: JSX.Element = typeof root === 'function' ? { type: root, props: {} } : root;

  // Begin: input lock
  startInputLock(player);

  // Build complete tree (instances created, hooks initialized)
  let builtTree = buildTree(rootElement, player);

  // Suspension (fallback) if requested
  if (options.awaitStateResolution) {
    await handleSuspensionInternal(player, options.fallback, builtTree.instances, options.awaitTimeout ?? 1000);

    // Rebuild the main tree AFTER suspension completes to capture any state updated by effects
    // during the wait period. Instances will be reused via fiberRegistry and defaults re-applied.
    builtTree = buildTree(rootElement, player);
  } else {
    builtTree = buildTree(rootElement, player);
  }

  await presentCycle(
    player,
    builtTree.tree,
    builtTree.instances,
    rootElement,
    options,
    // After initial render, any further updates should go through rerender()
    (p, r, o) => present(p, r, o),
    {
      // Initial render: consider suspense-triggered close as a reason to re-render
      shouldRerenderOnCancel(instances) {
        for (const id of instances) {
          const inst = fiberRegistry.getInstance(id);
          if (inst?.shouldClose === false) return true;
        }

        return false;
      },
    },
  );
}

/**
 * Re-render function that reuses existing component instances and skips suspense/fallback.
 * This is called after the initial render() when the UI needs to update.
 */
async function present(
  player: Player,
  root: JSX.Element | FunctionComponent,
  options?: RenderOptions,
): Promise<void> {
  const rootElement: JSX.Element = typeof root === 'function' ? { type: root, props: {} } : root;

  // IMPORTANT: Do NOT start input lock again and do NOT run suspension/fallback here.

  // Build the tree again; instances are reused via fiberRegistry.getOrCreateInstance
  const builtTree = buildTree(rootElement, player);

  await presentCycle(
    player,
    builtTree.tree,
    builtTree.instances,
    rootElement,
    options,
    (p, r, o) => present(p, r, o),
    {
      // Rerender: do not force re-render on cancel unless runtime conditions request it
      shouldRerenderOnCancel() { return false; },
    },
  );
}

type ReinvokeFn = (player: Player, root: JSX.Element | FunctionComponent, options?: RenderOptions) => Promise<void>;

interface CancelStrategy { shouldRerenderOnCancel: (instances: Set<string>) => boolean }

/**
 * Shared present cycle: serialize tree, start effect loop, show form, handle response.
 * Parameterized by cancel strategy and reinvoke function for subsequent updates.
 */
async function presentCycle(
  player: Player,
  element: JSX.Element,
  createdInstances: Set<string>,
  rootElement: JSX.Element,
  options: RenderOptions | undefined,
  reinvoke: ReinvokeFn,
  strategy: CancelStrategy,
): Promise<void> {
  // Prepare serialization context for button callbacks
  const serializationContext: SerializationContext = { buttonCallbacks: new Map(), buttonIndex: 0 };

  // Snapshot and show
  const form = new ActionFormData();
  form.title(PROTOCOL_HEADER);
  serialize(element, form, serializationContext);

  // Background effects loop for dirty instances
  const intervalId = system.runInterval(() => {
    for (const id of createdInstances) {
      const instance = fiberRegistry.getInstance(id);
      if (instance?.dirty) {
        instance.dirty = false;
        executeEffects(instance);
      }
    }
  }, 1);

  await form.show(player).then(response => {
    system.clearRun(intervalId);

    if (response.canceled) {
      // Strategy-specific check (e.g., initial render may force re-render after suspense close)
      let shouldRerender = strategy.shouldRerenderOnCancel(createdInstances);

      // Consult runtime conditions/pending triggers
      if (!shouldRerender) {
        const runtime = getRuntimeForPlayer(player.name);
        const runtimeWantsRender = Boolean(runtime?.consumePending?.() || runtime?.evaluateConditionsNow?.());
        shouldRerender = runtimeWantsRender;
      }

      if (shouldRerender) {
        system.run(() => { void reinvoke(player, rootElement, options); });
      } else {
        cleanupComponentTree(player, createdInstances);
      }

      return;
    }

    if (response.selection !== undefined) {
      const callback = serializationContext.buttonCallbacks.get(response.selection);
      if (callback) {
        Promise.resolve(callback())
          .then(() => {
            let shouldCleanup = false;
            for (const id of createdInstances) {
              const instance = fiberRegistry.getInstance(id);
              if (instance?.shouldClose === true) {
                shouldCleanup = true;
                break;
              }
            }

            if (shouldCleanup) {
              cleanupComponentTree(player, createdInstances);
            } else {
              system.run(() => { void reinvoke(player, rootElement, options); });
            }
          })
          .catch(() => {
            system.run(() => { void reinvoke(player, rootElement, options); });
          });
      }
    }
  });
}

/**
 * Internal: Wait for all useState values in the tree to differ from their initial values,
 * or until timeout.
 */
async function waitForStateResolution(
  instanceIds: Set<string>,
  timeoutMs: number,
): Promise<boolean> {
  console.log(`[waitForStateResolution] Starting state resolution wait (timeout: ${timeoutMs}ms, instances: ${instanceIds.size})`);

  return new Promise<boolean>(resolve => {
    const startTime = Date.now();

    const checkStates = (): boolean => {
      let allResolved = true;

      for (const id of instanceIds) {
        const instance = fiberRegistry.getInstance(id);
        if (!instance) {
          console.warn(`[waitForStateResolution] Instance not found: ${id}`);
          continue;
        }

        const stateHooks = instance.hooks.filter(h => h?.type === 'state');
        if (stateHooks.length === 0) {
          continue;
        }

        for (const hook of stateHooks) {
          if (hook.type === 'state') {
            const stateHook = hook as StateHook;
            if (Object.is(stateHook.value, stateHook.initialValue)) {
              console.log(`[waitForStateResolution] Instance ${id} state still matches initial value (value: ${stateHook.value})`);
              allResolved = false;
              // Don't break - check ALL instances before returning false
            } else {
              console.log(`[waitForStateResolution] Instance ${id} state CHANGED! (initial: ${stateHook.initialValue}, current: ${stateHook.value})`);
            }
          }
        }
      }

      return allResolved;
    };

    if (checkStates()) {
      console.log(`[waitForStateResolution] All states resolved immediately`);
      resolve(true);

      return;
    }

    console.log(`[waitForStateResolution] States not resolved yet, starting interval loop`);
    const intervalId = system.runInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        console.warn(`[waitForStateResolution] Timeout reached (${elapsed}ms), resolving with false`);
        system.clearRun(intervalId);
        resolve(false);

        return;
      }

      if (checkStates()) {
        console.log(`[waitForStateResolution] All states resolved after ${elapsed}ms`);
        system.clearRun(intervalId);
        resolve(true);
      }
    }, 1);
  });
}

/**
 * Internal: Show fallback UI while running main effects, wait for state resolution,
 * then close fallback and proceed.
 */
async function handleSuspensionInternal(
  player: Player,
  fallbackComponent: JSX.Element | FunctionComponent | undefined,
  mainInstanceIds: Set<string>,
  timeout: number,
): Promise<void> {
  // Normalize fallback to JSX element
  const fallbackElement: JSX.Element | undefined = typeof fallbackComponent === 'function'
    ? { type: fallbackComponent, props: {} }
    : fallbackComponent;

  let builtTree: { tree: JSX.Element; instances: Set<string> } | undefined;

  if (fallbackElement) {
    // Build fallback tree
    builtTree = buildTree(fallbackElement, player);

    // Show fallback UI
    const ctx: SerializationContext = { buttonCallbacks: new Map(), buttonIndex: 0 };
    const fallbackForm = new ActionFormData();
    fallbackForm.title(PROTOCOL_HEADER);
    serialize(builtTree.tree, fallbackForm, ctx);

    void fallbackForm.show(player);
  }

  // Execute main component effects immediately
  for (const id of mainInstanceIds) {
    const instance = fiberRegistry.getInstance(id);
    if (instance) {
      executeEffects(instance);
      if (!instance.mounted) instance.mounted = true;
    }
  }

  // Start loop for subsequent state changes on main tree
  // During suspension, we always execute effects (including those with no deps)
  // so they can call setState and update the component state
  const mainIntervalId = system.runInterval(() => {
    for (const id of mainInstanceIds) {
      const instance = fiberRegistry.getInstance(id);
      if (instance) {
        // Always run executeEffects during suspension, not just for dirty instances.
        // This ensures effects with no dependency array can execute on each tick
        // and potentially call setState to resolve the suspension.
        executeEffects(instance);
      }
    }
  }, 1);

  // Wait for resolution
  await waitForStateResolution(mainInstanceIds, timeout);

  // Stop loop and close fallback
  system.clearRun(mainIntervalId);
  uiManager.closeAllForms(player);

  if (fallbackElement && builtTree) {
    // Cleanup fallback instances
    for (const id of builtTree.instances) {
      const instance = fiberRegistry.getInstance(id);

      if (instance) {
        executeEffects(instance, true);
        fiberRegistry.deleteInstance(id);
      }
    }
  }
}
