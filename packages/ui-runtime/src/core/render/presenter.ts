import type { Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import type { JSX } from '../../jsx';
import { getFibersForPlayer } from '../fabric';
import { PROTOCOL_HEADER, serialize } from '../serializer';
import type { SerializationContext } from '../types';

export async function present(
  player: Player,
  tree: JSX.Element,
  session: { closeGen: number },
): Promise<'present' | 'cleanup' | 'none'> {
  // Prepare serialization context for button callbacks
  const serializationContext: SerializationContext = { buttonCallbacks: new Map(), buttonIndex: 0 };

  // Snapshot and show
  const form = new ActionFormData();
  form.title(PROTOCOL_HEADER);

  serialize(tree, form, serializationContext);

  // Capture generation BEFORE showing
  const genBefore = session.closeGen;

  return form.show(player).then(response => {
    // Compare AFTER resolution
    const genAfter = session.closeGen;
    const programmaticCanceled = response.canceled && genAfter !== genBefore;

    if (programmaticCanceled) {
      // We canceled because the runtime closed forms (e.g., suspense resolution)
      return 'present';
    }

    if (response.canceled) {
      // User ESC
      return 'cleanup';
    }

    // Button press
    if (response.selection !== undefined) {
      const callback = serializationContext.buttonCallbacks.get(response.selection);
      if (callback) {
        // Execute button callback then present again (unless useExit was called)
        return Promise.resolve(callback())
          .then(() => {
            const shouldClose = getFibersForPlayer(player).some(fiber => !fiber.shouldRender);

            return shouldClose ? 'cleanup' : 'present';
          });
      }
    }

    return 'none';
  });
}
