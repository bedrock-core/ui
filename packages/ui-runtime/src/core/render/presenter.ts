import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { type Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import type { JSX } from '../../jsx';
import { getFibersForPlayer } from '../fabric';
import { serialize, serializeTitleMetadata } from '../serializer';
import type { SerializationContext } from '../types';
import { beginInteractiveTransaction, endInteractiveTransaction, getPlayerScreen } from './session';

export async function present(
  player: Player,
  tree: JSX.Element,
): Promise<'present' | 'cleanup' | 'none'> {
  // Prepare serialization context for button callbacks
  const serializationContext: SerializationContext = { buttonCallbacks: new Map(), buttonIndex: 0 };

  // Snapshot and show
  const form: ActionFormData = new ActionFormData();

  // The session screen is the render baseline set by render().
  const screen = getPlayerScreen(player);

  // Encode title with protocol header and per-region extent metadata. The
  // region-aware layout pass surfaces one extent per region on the tree; a
  // single-region screen yields a one-element array equal to the root height.
  // Fall back to the canonical viewport height for any missing, non-finite, or
  // non-positive extent so the RP always receives a usable scroll container size.
  const rawExtents = tree.props.jsonUIRegionExtents;
  const extentsSource = Array.isArray(rawExtents) && rawExtents.length > 0
    ? rawExtents as number[]
    : [tree.props.jsonUIHeight];

  const regionExtents = extentsSource.map((extent) => {
    return (typeof extent === 'number' && Number.isFinite(extent) && extent > 0)
      ? extent
      : CANONICAL_SCREEN.height;
  });

  form.title(serializeTitleMetadata(screen.type, regionExtents));

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
