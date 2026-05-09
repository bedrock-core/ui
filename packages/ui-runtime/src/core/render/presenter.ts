import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import type { Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import type { JSX } from '../../jsx';
import { getFibersForPlayer } from '../fabric';
import { serialize, serializeTitleMetadata } from '../serializer';
import type { SerializationContext } from '../types';
import { beginInteractiveTransaction, endInteractiveTransaction } from './session';

export async function present(
  player: Player,
  tree: JSX.Element,
): Promise<'present' | 'cleanup' | 'none'> {
  // Prepare serialization context for button callbacks
  const serializationContext: SerializationContext = { buttonCallbacks: new Map(), buttonIndex: 0 };

  // Snapshot and show
  const form: ActionFormData = new ActionFormData();

  // Encode title with protocol header and root content_height metadata.
  // Use the layout-computed root height; fall back to the canonical viewport
  // height if the value is missing, non-finite, or non-positive so the RP
  // always receives a usable scroll container height.
  const rawHeight = tree.props.jsonUIHeight;
  const contentHeight = (typeof rawHeight === 'number' && Number.isFinite(rawHeight) && rawHeight > 0)
    ? rawHeight
    : CANONICAL_SCREEN.height;

  form.title(serializeTitleMetadata(contentHeight));

  serialize(tree, form, serializationContext);

  return form.show(player).then((response) => {
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
