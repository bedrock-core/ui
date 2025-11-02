import { Player } from '@minecraft/server';
import { getCurrentFiber, invariant } from '../core';

/**
 * Hook that returns the Player associated with the current render session.
 * Provides access to the player for whom the UI is being presented.
 *
 * @returns The current Player instance.
 */
export function usePlayer(): Player {
  const [, d] = getCurrentFiber();

  invariant(d, 'usePlayer called outside of an active fiber');

  return d.usePlayer();
}
