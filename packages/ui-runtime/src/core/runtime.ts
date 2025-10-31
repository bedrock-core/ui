import type { Player } from '@minecraft/server';
import type { FunctionComponent, JSX } from '../jsx';
import { ActionFormData } from '@minecraft/server-ui';
import { buildTree, cleanupComponentTree } from './render';
import type { RenderOptions, SerializationContext } from './types';
import { startInputLock } from '../util';
import { system } from '@minecraft/server';
import { fiberRegistry } from './fiber';
import { executeEffects } from '../hooks';
import type { StateHook } from '../hooks/types';
import { uiManager } from '@minecraft/server-ui';
import { serialize, PROTOCOL_HEADER } from './serializer';
import { DefaultScheduler } from './scheduler';
import { setRuntimeForPlayer, clearRuntimeForPlayer, getRuntimeForPlayer } from './runtimeStore';
import type {
  RuntimeHandle,
  RuntimeOptions,
  Scheduler,
  RenderCondition
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
  options?: RenderOptions,
): Promise<void> {
  // Convert function component to JSX element if needed
  const rootElement: JSX.Element = typeof root === 'function' ? { type: root, props: {} } : root;

  // Begin: input lock
  startInputLock(player);

  // Build complete tree (instances created, hooks initialized)
  const { tree: element, instances: createdInstances } = buildTree(rootElement, player);

  // Suspension (fallback) if requested
  if (options?.awaitStateResolution && options?.fallback) {
    const timeout = options.awaitTimeout ?? 10000;
    await handleSuspensionInternal(player, options.fallback, createdInstances, timeout);
  }

  // Prepare serialization context for button callbacks
  const serializationContext: SerializationContext = { buttonCallbacks: new Map(), buttonIndex: 0 };

  // Snapshot and show (inline renderer)
  const form = new ActionFormData();
  form.title(PROTOCOL_HEADER);
  serialize(element, form, serializationContext);

  // Start background effect loop
  const intervalId = system.runInterval(() => {
    for (const id of createdInstances) {
      const instance = fiberRegistry.getInstance(id);
      if (instance?.dirty) {
        instance.dirty = false;
        executeEffects(instance);
      }
    }
  }, 1);

  // Display form and handle response
  await form.show(player).then(response => {
    // Stop background effects
    system.clearRun(intervalId);
    // Instances no longer track effect loop ids; runtime controls scheduling centrally

    if (response.canceled) {
      // 1) Suspense-triggered close should re-render
      let shouldRerender = false;
      for (const id of createdInstances) {
        const instance = fiberRegistry.getInstance(id);
        if (instance?.isProgrammaticClose === false) {
          shouldRerender = true;
          break;
        }
      }

      // 2) Consult runtime conditions/pending triggers
      if (!shouldRerender) {
        const runtime = getRuntimeForPlayer(player.name);
        const runtimeWantsRender = Boolean(runtime?.consumePending?.() || runtime?.evaluateConditionsNow?.());
        shouldRerender = runtimeWantsRender;
      }

      if (shouldRerender) {
        system.run(() => {
          void render(player, rootElement, options);
        });
      } else {
        cleanupComponentTree(player, createdInstances);
      }

      return;
    }

    // Button pressed
    if (response.selection !== undefined) {
      const callback = serializationContext.buttonCallbacks.get(response.selection);
      if (callback) {
        Promise.resolve(callback())
          .then(() => {
            // If programmatic close was requested, cleanup; else re-render
            let shouldCleanup = false;
            for (const id of createdInstances) {
              const instance = fiberRegistry.getInstance(id);
              if (instance?.isProgrammaticClose === true) {
                shouldCleanup = true;
                break;
              }
            }

            if (shouldCleanup) {
              cleanupComponentTree(player, createdInstances);
            } else {
              system.run(() => {
                void render(player, rootElement, options);
              });
            }
          })
          .catch(() => {
            // On error, still re-render to keep flow moving
            system.run(() => {
              void render(player, rootElement, options);
            });
          });
      }
    }
  });
}

/**
 * Internal: Wait for all useState values in the tree to differ from their initial values,
 * or until timeout.
 */
async function waitForStateResolutionInternal(
  instanceIds: Set<string>,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const startTime = Date.now();

    const checkStates = (): boolean => {
      let allResolved = true;

      for (const id of instanceIds) {
        const instance = fiberRegistry.getInstance(id);
        if (!instance) continue;

        for (const hook of instance.hooks) {
          if (hook.type === 'state') {
            const stateHook = hook as StateHook;
            if (Object.is(stateHook.value, stateHook.initialValue)) {
              allResolved = false;
              break;
            }
          }
        }

        if (!allResolved) break;
      }

      return allResolved;
    };

    if (checkStates()) {
      resolve(true);

      return;
    }

    const intervalId = system.runInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        system.clearRun(intervalId);
        resolve(false);

        return;
      }

      if (checkStates()) {
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
  fallbackComponent: JSX.Element | FunctionComponent,
  mainInstanceIds: Set<string>,
  timeout: number,
): Promise<void> {
  // Normalize fallback to JSX element
  const fallbackElement: JSX.Element = typeof fallbackComponent === 'function'
    ? { type: fallbackComponent, props: {} }
    : fallbackComponent;

  // Build fallback tree
  const { tree: fallbackTree, instances: fallbackInstances } = buildTree(fallbackElement, player);

  // Show fallback UI
  const ctx: SerializationContext = { buttonCallbacks: new Map(), buttonIndex: 0 };
  const fallbackForm = new ActionFormData();
  fallbackForm.title(PROTOCOL_HEADER);
  serialize(fallbackTree, fallbackForm, ctx);
  void fallbackForm.show(player);

  // Execute main component effects immediately
  for (const id of mainInstanceIds) {
    const instance = fiberRegistry.getInstance(id);
    if (instance) {
      executeEffects(instance);
      if (!instance.mounted) instance.mounted = true;
    }
  }

  // Start loop for subsequent state changes on main tree
  const mainIntervalId = system.runInterval(() => {
    for (const id of mainInstanceIds) {
      const instance = fiberRegistry.getInstance(id);
      if (instance?.dirty) {
        instance.dirty = false;
        executeEffects(instance);
      }
    }
  }, 1);

  // Wait for resolution
  await waitForStateResolutionInternal(mainInstanceIds, timeout);

  // Stop loop and close fallback
  system.clearRun(mainIntervalId);
  uiManager.closeAllForms(player);

  // Wait a tick for form to close
  await new Promise<void>(resolve => system.run(resolve));

  // Cleanup fallback instances
  for (const id of fallbackInstances) {
    const instance = fiberRegistry.getInstance(id);
    if (instance) {
      executeEffects(instance, true);
      fiberRegistry.deleteInstance(id);
    }
  }

  // Wait a tick before showing main UI
  await new Promise<void>(resolve => system.run(resolve));
}

export type { RuntimeOptions } from './types';
