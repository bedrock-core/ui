import type { RenderCondition } from './types';

/** Minimal interface the hooks need from the runtime. */
export interface RuntimeLike {
  triggerRender: (reason?: string) => void;
  registerCondition: (cond: RenderCondition) => void;
  unregisterCondition: (cond: RenderCondition) => void;
  consumePending?: () => boolean;
  evaluateConditionsNow?: () => boolean;
}

const runtimeByPlayer = new Map<string, RuntimeLike>();

export function setRuntimeForPlayer(playerName: string, runtime: RuntimeLike): void {
  runtimeByPlayer.set(playerName, runtime);
}

export function getRuntimeForPlayer(playerName: string): RuntimeLike | undefined {
  return runtimeByPlayer.get(playerName);
}

export function clearRuntimeForPlayer(playerName: string): void {
  runtimeByPlayer.delete(playerName);
}
