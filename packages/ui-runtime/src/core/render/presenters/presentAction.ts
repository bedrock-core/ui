import { type Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import type { JSX } from '../../../jsx';
import { serialize, serializeScrollMetadata } from '../../serializer';
import type { ActionSerializationContext } from '../../types';
import { findBackground, resolveScrolls, runInteractiveCallback, type PresentResult } from './shared';

/**
 * Present one snapshot of an ordinary (ActionForm) tree.
 *
 * Encodes the scroll geometry into the form title (v0007 protocol), serializes the
 * tree into `button()` / `label()` slots, and shows it. A button press dispatches the
 * recorded `onPress` through {@link runInteractiveCallback}; ESC tears the session
 * down.
 *
 * @param player - Player to show the form to.
 * @param tree - Built tree (no `modal-form` marker).
 * @returns Whether to re-present, clean up, or do nothing.
 */
export async function presentAction(
  player: Player,
  tree: JSX.Element,
): Promise<PresentResult> {
  const context: ActionSerializationContext = { mode: 'action', buttonCallbacks: new Map(), buttonIndex: 0 };
  const form: ActionFormData = new ActionFormData();

  form.title(serializeScrollMetadata(resolveScrolls(tree), findBackground(tree)));

  serialize(tree, form, context);

  return form.show(player).then((response) => {
    if (response.canceled) {
      // User ESC.
      return 'cleanup';
    }

    if (response.selection !== undefined) {
      const callback = context.buttonCallbacks.get(response.selection);

      if (callback) {
        return runInteractiveCallback(player, callback);
      }
    }

    return 'none';
  });
}
