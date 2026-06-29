import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { type Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import type { JSX } from '../../../jsx';
import { serialize, serializeScrollMetadata, type ScrollMetrics } from '../../serializer';
import type { ActionSerializationContext } from '../../types';
import { runInteractiveCallback, type PresentResult } from './shared';

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

  form.title(serializeScrollMetadata(resolveScrolls(tree)));

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

/**
 * Coerce a tree-derived metric to a finite number. Position (x/y) may legitimately be
 * 0 or negative, so `allowNonPositive` skips the `> 0` guard for those.
 */
function sane(value: unknown, fallback: number, allowNonPositive = false): number {
  return (typeof value === 'number' && Number.isFinite(value) && (allowNonPositive || value > 0)) ? value : fallback;
}

/**
 * Read the per-scroll geometry the layout pass surfaced on the tree (one
 * `{ axis, x, y, width, height, extent }` per scroll, index 0 is the root scroll) and
 * sanitize it. Falls back to a single full-screen vertical scroll if the tree produced
 * nothing usable, so the RP always receives at least the root scroll. Consumes (deletes)
 * the transient `jsonUIScrolls` / `jsonUIHeight` props off the root.
 */
function resolveScrolls(tree: JSX.Element): ScrollMetrics[] {
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

  return scrollsSource.map(scroll => ({
    axis: scroll?.axis === 'x' ? 'x' : 'y',
    x: sane(scroll?.x, 0, true),
    y: sane(scroll?.y, 0, true),
    width: sane(scroll?.width, CANONICAL_SCREEN.width),
    height: sane(scroll?.height, CANONICAL_SCREEN.height),
    extent: sane(scroll?.extent, CANONICAL_SCREEN.height),
  }));
}
