import type { Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import type { JSX } from '../../jsx';
import { getFibersForPlayer } from '../fabric';
import { beginInteractiveTransaction, endInteractiveTransaction } from './session';
import { PROTOCOL_HEADER, serialize } from '../serializer';
import type { SerializationContext } from '../types';

export async function present(
  player: Player,
  tree: JSX.Element,
): Promise<'present' | 'cleanup' | 'none'> {
  // Prepare serialization context for button callbacks
  const serializationContext: SerializationContext = { buttonCallbacks: new Map(), buttonIndex: 0 };

  // Snapshot and show
  const form: ActionFormData = new ActionFormData();
  form.title(PROTOCOL_HEADER);

  serialize(tree, form, serializationContext);

  return form.show(player).then(response => {
    if (response.canceled) {
      // User ESC
      return 'cleanup';
    }

    // Button press
    if (response.selection !== undefined) {
      const callback = serializationContext.buttonCallbacks.get(response.selection);

      if (callback) {
        // Execute button callback inside an interactive transaction to suppress background logic passes
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
    }

    return 'none';
  });
}
