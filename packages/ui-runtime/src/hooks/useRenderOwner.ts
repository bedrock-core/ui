import { getCurrentFiber, invariant } from '../core/fabric';
import type { Owner } from '../core/fabric';

/** The current render's player, shared container owner, or build identity. */
export function useRenderOwner(): Owner {
  const [fiber] = getCurrentFiber();

  invariant(fiber, 'useRenderOwner');

  return fiber.owner;
}
