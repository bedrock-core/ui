import { type Player } from '@minecraft/server';
import { MODAL_FORM_SLOT_TYPE, type FormConfig } from '../../../components/Form';
import type { JSX } from '../../../jsx';
import { getFibersForPlayer } from '../../fabric';
import { isElement } from '../../guards';
import { beginInteractiveTransaction, endInteractiveTransaction } from '../session';

/**
 * Outcome of presenting one form snapshot:
 * - `'present'` — re-render immediately (a callback requested another snapshot).
 * - `'cleanup'` — tear the session down (ESC / dismissal / programmatic exit).
 * - `'none'`    — player dismissed with no callback; do nothing.
 */
export type PresentResult = 'present' | 'cleanup' | 'none';

/**
 * Find the `modal-form` marker on the built tree and return its config, or
 * `undefined` if the tree is an ordinary ActionForm tree. The marker is transparent,
 * so it sits a couple of provider levels below the root — walk children until found.
 *
 * @param node - Tree node to search from (typically the built root).
 * @returns The Form config when a modal tree, else `undefined`.
 */
export function findModalConfig(node: JSX.Node): FormConfig | undefined {
  if (!isElement(node)) {
    return undefined;
  }

  if (node.type === MODAL_FORM_SLOT_TYPE) {
    const config = node.props.__formConfig;

    // __formConfig is always a FormConfig (set by <Form>); narrow the unknown prop.
    return config && typeof config === 'object' ? config : undefined;
  }

  const { children } = node.props;
  const childArray = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    const found = findModalConfig(child);

    if (found) {
      return found;
    }
  }

  return undefined;
}

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
  beginInteractiveTransaction(player);

  return Promise.resolve()
    .then(() => callback())
    .finally(() => {
      endInteractiveTransaction(player);
    })
    .then(() => {
      const shouldClose: boolean = getFibersForPlayer(player).some(fiber => !fiber.shouldRender);

      return shouldClose ? 'cleanup' : 'present';
    });
}
