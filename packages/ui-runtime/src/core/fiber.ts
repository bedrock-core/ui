import { FunctionComponent, JSX } from '@bedrock-core/ui/jsx-runtime';
import { Player } from '@minecraft/server';
import { Logger } from '../util';
import { Context } from './context';
import { ComponentInstance } from './hooks/types';

/**
 * Global fiber registry that manages component instances and their state
 */
class FiberRegistry {
  private _instances: Map<string, ComponentInstance> = new Map();
  private _instanceStack: ComponentInstance[] = [];
  private _contextStack: Map<Context<unknown>, unknown[]> = new Map();

  /**
   * Create or get a component instance
   */
  getOrCreateInstance(
    id: string,
    player: Player,
    componentFn: FunctionComponent,
    props: JSX.Props,
  ): ComponentInstance {
    let instance: ComponentInstance | undefined = this._instances.get(id);

    if (!instance) {
      instance = {
        id,
        player,
        componentType: componentFn,
        props,
        hooks: [],
        hookIndex: 0,
        mounted: false,
        dirty: false,
      };

      this._instances.set(id, instance);
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
   * Push a context value onto the context stack
   * Called when entering a Context.Provider
   */
  pushContext<T>(context: Context<T>, value: T): void {
    const stack = this._contextStack.get(context as Context<unknown>) || [];
    stack.push(value as unknown);
    this._contextStack.set(context as Context<unknown>, stack);
  }

  /**
   * Pop a context value from the context stack
   * Called when exiting a Context.Provider
   */
  popContext<T>(context: Context<T>): void {
    const stack = this._contextStack.get(context as Context<unknown>);
    if (stack && stack.length > 0) {
      if (stack.length === 0) {
        this._contextStack.delete(context as Context<unknown>);
      }
    }
  }

  /**
   * Read the current value of a context from the context stack
   * Returns the most recently pushed value, or the default value if no Provider exists
   */
  readContext<T>(context: Context<T>): T {
    const stack = this._contextStack.get(context as Context<unknown>);
    if (stack && stack.length > 0) {
      const value = stack[stack.length - 1] as T;

      return value;
    }

    return context.defaultValue;
  }
}

export const fiberRegistry = new FiberRegistry();
