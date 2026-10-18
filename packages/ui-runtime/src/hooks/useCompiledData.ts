import { getCurrentFiber, invariant } from '../core/fabric';
import { getSessionCompiled } from '../core/render/session';

/** Library compilation data retained in this host's compiled snapshot, absent during the build. */
export function useCompiledData(key: string): unknown {
  const [fiber] = getCurrentFiber();

  invariant(fiber, 'useCompiledData');

  return getSessionCompiled(fiber.owner).snapshot?.data?.[key];
}
