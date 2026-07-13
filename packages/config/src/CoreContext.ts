import { createContext, useContext } from '@bedrock-core/ui-runtime';
import type { Runtime } from '@bedrock-core/server-runtime';

export const CoreContext = createContext<Runtime | null>(null);

/**
 * Read the runtime from context. `App` always provides it, so a missing value is a
 * programming error — throw rather than propagate a nullable `Runtime` through every screen.
 */
export function useCore(): Runtime {
  const core = useContext(CoreContext);

  if (!core) { throw new Error('useCore must be called within the config UI <App> (CoreContext missing)'); }

  return core;
}
