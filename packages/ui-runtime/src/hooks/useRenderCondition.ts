import { fiberRegistry } from '../core/fiber';
import { getRuntimeForPlayer } from '../core/runtimeStore';
import type { UseRenderCondition, RenderCondition } from '../core/types';
import { useEffect } from './useEffect';

/**
 * Hook to register a render condition predicate with the runtime.
 * The predicate is evaluated on the runtime tick until it returns true.
 */
export const useRenderCondition: UseRenderCondition = (predicate, deps) => {
  const current = fiberRegistry.getCurrentInstance();

  useEffect(() => {
    if (!current) return;
    const runtime = getRuntimeForPlayer(current.player.name);
    if (!runtime) return;

    // Keep a stable function reference for register/unregister
    const cond: RenderCondition = () => {
      try { return !!predicate(); } catch { return false; }
    };

    runtime.registerCondition(cond);

    return () => runtime.unregisterCondition(cond);
  }, deps ?? [predicate]);
};
