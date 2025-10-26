import { FunctionComponent, JSX } from '@bedrock-core/ui/jsx-runtime';
import { system } from '@minecraft/server';
import { Logger } from '../util';
import { ComponentInstance } from './hooks/types';

/**
 * Global fiber registry that manages component instances and their state
 */
class FiberRegistry {
  private _instances: Map<string, ComponentInstance> = new Map();

  private _instanceStack: ComponentInstance[] = [];

  private _playerRenderTimeouts: Map<string, number> = new Map();

  private _renderCallbacks: Map<string, () => void> = new Map();

  /**
   * Create or get a component instance
   */
  getOrCreateInstance(
    id: string,
    componentFn: FunctionComponent,
    props: JSX.Props,
  ): ComponentInstance {
    let instance: ComponentInstance | undefined = this._instances.get(id);

    if (!instance) {
      instance = {
        id,
        componentType: componentFn,
        props,
        hooks: [],
        hookIndex: 0,
        mounted: false,
        dirty: false,
      };

      this._instances.set(id, instance);

      Logger.log(`[FiberRegistry] Created instance: ${id}`);
    } else {
      // Update props if component was re-rendered with different props
      instance.props = props;
    }

    return instance;
  }

  /**
   * Get existing instance without creating
   */
  getInstance(id: string): ComponentInstance | undefined {
    return this._instances.get(id);
  }

  /**
   * Delete instance (cleanup)
   */
  deleteInstance(id: string): void {
    const instance: ComponentInstance | undefined = this._instances.get(id);

    if (instance) {
      // Run cleanup for all effects
      for (const hook of instance.hooks) {
        if (hook && 'cleanup' in hook && hook.cleanup) {
          try {
            hook.cleanup();
          } catch (error) {
            Logger.error(`[FiberRegistry] Error running effect cleanup: ${error}`);
          }
        }
      }

      this._instances.delete(id);

      Logger.log(`[FiberRegistry] Deleted instance: ${id}`);
    }
  }

  /**
   * Push instance onto fiber stack (enter component render)
   */
  pushInstance(instance: ComponentInstance): void {
    this._instanceStack.push(instance);
    instance.hookIndex = 0; // Reset hook index for this render
  }

  /**
   * Pop instance from fiber stack (exit component render)
   */
  popInstance(): ComponentInstance | undefined {
    return this._instanceStack.pop();
  }

  /**
   * Get current instance from top of stack
   */
  getCurrentInstance(): ComponentInstance | undefined {
    return this._instanceStack[this._instanceStack.length - 1] ?? undefined;
  }

  /**
   * Get all registered instances (for debugging/testing)
   */
  getAllInstances(): ComponentInstance[] {
    return Array.from(this._instances.values());
  }

  /**
   * Clear all instances (for cleanup)
   */
  clearAll(): void {
    for (const id of this._instances.keys()) {
      this.deleteInstance(id);
    }
  }

  /**
   * Schedule a deferred render for a player (debounced, batches state changes)
   * Delay is in ticks (1 tick = one system.runTimeout call with delay 0)
   * @param playerId Player identifier
   * @param callback Function to call when timer fires
   * @param delayTicks Number of ticks to wait before rendering (default: 5)
   */
  scheduleRender(playerId: string, callback: () => void, delayTicks: number = 5): void {
    // If already scheduled for this player, don't schedule again (batch state changes)
    if (this._playerRenderTimeouts.has(playerId)) {
      Logger.log(`[FiberRegistry] Render already scheduled for ${playerId}, ignoring duplicate`);

      return;
    }

    Logger.log(`[FiberRegistry] Scheduling render for ${playerId} in ${delayTicks} ticks`);

    const timeoutId = system.runTimeout((): void => {
      Logger.log(`[FiberRegistry] Render timer fired for ${playerId}`);
      this._playerRenderTimeouts.delete(playerId);
      this._renderCallbacks.delete(playerId);
      callback();
    }, delayTicks);

    this._playerRenderTimeouts.set(playerId, timeoutId);
    this._renderCallbacks.set(playerId, callback);
  }

  /**
   * Cancel any pending render for a player
   */
  cancelRender(playerId: string): void {
    const timeoutId = this._playerRenderTimeouts.get(playerId);
    if (timeoutId !== undefined) {
      Logger.log(`[FiberRegistry] Cancelling pending render for ${playerId}`);
      system.clearRun(timeoutId);
      this._playerRenderTimeouts.delete(playerId);
      this._renderCallbacks.delete(playerId);
    }
  }

  /**
   * Check if a render is scheduled for a player
   */
  hasScheduledRender(playerId: string): boolean {
    return this._playerRenderTimeouts.has(playerId);
  }
}

export const fiberRegistry = new FiberRegistry();
