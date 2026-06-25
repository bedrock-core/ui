import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { type Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import type { JSX } from '../../jsx';
import { getFibersForPlayer } from '../fabric';
import { serialize, serializeScrollMetadata, type ScrollMetrics } from '../serializer';
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

  // Coerce a tree-derived metric to a finite number. Position (x/y) may legitimately be
  // 0 or negative, so `allowNonPositive` skips the > 0 guard for those.
  const sane = (value: unknown, fallback: number, allowNonPositive = false): number =>
    (typeof value === 'number' && Number.isFinite(value) && (allowNonPositive || value > 0)) ? value : fallback;

  // Encode the title with the protocol header and the scroll list. The layout pass
  // surfaces one { axis, x, y, width, height, extent } per scroll on the tree (index 0
  // is the root scroll). Fall back to a single full-screen vertical scroll if the tree
  // produced nothing usable, so the RP always receives at least the root scroll.
  const rawScrolls = tree.props.jsonUIScrolls;
  const rawHeight = tree.props.jsonUIHeight;

  delete (tree.props as Record<string, unknown>).jsonUIScrolls;
  delete (tree.props as Record<string, unknown>).jsonUIHeight;

  const scrollsSource: ScrollMetrics[] = Array.isArray(rawScrolls) && rawScrolls.length > 0
    ? rawScrolls
    : [{
        axis: 'y',
        x: 0,
        y: 0,
        width: CANONICAL_SCREEN.width,
        height: CANONICAL_SCREEN.height,
        extent: sane(rawHeight, CANONICAL_SCREEN.height),
      }];

  const scrolls: ScrollMetrics[] = scrollsSource.map(scroll => ({
    axis: scroll?.axis === 'x' ? 'x' : 'y',
    x: sane(scroll?.x, 0, true),
    y: sane(scroll?.y, 0, true),
    width: sane(scroll?.width, CANONICAL_SCREEN.width),
    height: sane(scroll?.height, CANONICAL_SCREEN.height),
    extent: sane(scroll?.extent, CANONICAL_SCREEN.height),
  }));

  form.title(serializeScrollMetadata(scrolls));

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
