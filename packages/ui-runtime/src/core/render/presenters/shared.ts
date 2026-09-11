import { type Player } from '@minecraft/server';
import { findModalConfig } from '../../../components/Form';
import { getFibersForOwner, playerOwner } from '../../fabric';
import { beginInteractiveTransaction, endInteractiveTransaction } from '../session';

/**
 * Outcome of presenting one form snapshot:
 * - `'present'` — re-render immediately (a callback requested another snapshot).
 * - `'cleanup'` — tear the session down (ESC / dismissal / programmatic exit).
 * - `'none'`    — player dismissed with no callback; do nothing.
 */
export type PresentResult = 'present' | 'cleanup' | 'none';

// The modal marker is the Form component's own business; re-exported here
// because the presenters have always reached for it through this module.
export { findModalConfig };

/**
 * Run a form callback inside an interactive transaction (background logic passes
 * suppressed for its lifetime), then decide whether the session should re-present or
 * tear down. Shared by both the ActionForm button path and the modal submit/cancel
 * path so the transaction + cleanup semantics stay identical.
 *
 * @param player - Player whose session the callback runs against.
 * @param callback - The form callback (`onPress` / `onSubmit` / `onCancel`).
 * @returns `'cleanup'` if a fiber requested exit during the callback, else `'present'`.
 */
export async function runInteractiveCallback(
  player: Player,
  callback: () => unknown | Promise<unknown>,
): Promise<PresentResult> {
  const owner = playerOwner(player);

  beginInteractiveTransaction(owner);

  return Promise.resolve()
    .then(() => callback())
    .finally(() => {
      endInteractiveTransaction(owner);
    })
    .then(() => {
      const shouldClose: boolean = getFibersForOwner(owner).some(fiber => !fiber.shouldRender);

      return shouldClose ? 'cleanup' : 'present';
    });
}
