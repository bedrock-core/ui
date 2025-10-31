import { fiberRegistry } from '../core/fiber';
import { getRuntimeForPlayer } from '../core/runtimeStore';
import type { TriggerRender } from '../core/types';

/**
 * Hook that returns an imperative function to request a new render.
 */
export function useTriggerRender(): TriggerRender {
  const current = fiberRegistry.getCurrentInstance();

  if (!current) {
    // Called outside of a component; return no-op
    return () => {};
  }

  const runtime = getRuntimeForPlayer(current.player.name);
  if (!runtime) return () => {};

  return (reason?: string) => runtime.triggerRender(reason);
}
