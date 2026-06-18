import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { type Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import type { JSX } from '../../jsx';
import { getFibersForPlayer } from '../fabric';
import { serialize, serializeTitleMetadata, type RegionMetrics } from '../serializer';
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

  // Encode title with protocol header and per-region metrics. The region-aware
  // layout pass surfaces one { width, height } per region on the tree; a
  // single-region screen yields a one-element array sized to the root. Fall back to
  // the canonical viewport dimensions for any missing / non-finite / non-positive
  // value so the RP always receives a usable scroll container size.
  const rawRegions = tree.props.jsonUIRegions;
  const regionsSource: RegionMetrics[] = Array.isArray(rawRegions) && rawRegions.length > 0
    ? rawRegions as RegionMetrics[]
    : [{ width: CANONICAL_SCREEN.width, height: tree.props.jsonUIHeight as number }];

  const sane = (value: unknown, fallback: number): number =>
    (typeof value === 'number' && Number.isFinite(value) && value > 0) ? value : fallback;

  const regions: RegionMetrics[] = regionsSource.map(region => ({
    height: sane(region?.height, CANONICAL_SCREEN.height),
    width: sane(region?.width, CANONICAL_SCREEN.width),
  }));

  form.title(serializeTitleMetadata(screen.type, regions));

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
