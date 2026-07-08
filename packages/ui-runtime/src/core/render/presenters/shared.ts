import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { type Player } from '@minecraft/server';
import { BACKGROUND_SLOT_TYPE } from '../../../components/Background';
import { MODAL_FORM_SLOT_TYPE, type FormConfig } from '../../../components/Form';
import type { JSX } from '../../../jsx';
import type { ScrollMetrics } from '../../serializer';
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
 * Find the first `<Background>` marker on the built tree and return its texture
 * path, or `''` when the tree declares none. Mirrors {@link findModalConfig}: the
 * marker is transparent and may sit anywhere (ActionForm root level or inside a
 * `<Form>`), so walk the whole tree depth-first — first one wins.
 *
 * @param node - Tree node to search from (typically the built root).
 * @returns The backdrop texture path, or `''`.
 */
export function findBackground(node: JSX.Node): string {
  if (!isElement(node)) {
    return '';
  }

  if (node.type === BACKGROUND_SLOT_TYPE) {
    const texture = node.props.__background;

    return typeof texture === 'string' ? texture : '';
  }

  const { children } = node.props;
  const childArray = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    const found = findBackground(child);

    if (found !== '') {
      return found;
    }
  }

  return '';
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
 *
 * Shared by both presenters: the ActionForm and the native modal use the IDENTICAL
 * title-encoded scroll-geometry protocol (v0007) so a label-only tree sizes the same in
 * both — the modal repurposes its native title for this metadata (it has no separate
 * user title; a heading is authored as a `<Text>`).
 */
export function resolveScrolls(tree: JSX.Element): ScrollMetrics[] {
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
