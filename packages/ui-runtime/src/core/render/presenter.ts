import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { type Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import type { JSX } from '../../jsx';
import { getFibersForPlayer } from '../fabric';
import { serialize, serializeScrollMetadata, FULL_WIDTH, PROTOCOL_HEADER_LENGTH, type ScrollMetrics } from '../serializer';
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
  const scrollsSource: ScrollMetrics[] = Array.isArray(rawScrolls) && rawScrolls.length > 0
    ? rawScrolls
    : [{
        axis: 'y',
        x: 0,
        y: 0,
        width: CANONICAL_SCREEN.width,
        height: CANONICAL_SCREEN.height,
        extent: sane(tree.props.jsonUIHeight, CANONICAL_SCREEN.height),
      }];

  const scrolls: ScrollMetrics[] = scrollsSource.map(scroll => ({
    axis: scroll?.axis === 'x' ? 'x' : 'y',
    x: sane(scroll?.x, 0, true),
    y: sane(scroll?.y, 0, true),
    width: sane(scroll?.width, CANONICAL_SCREEN.width),
    height: sane(scroll?.height, CANONICAL_SCREEN.height),
    extent: sane(scroll?.extent, CANONICAL_SCREEN.height),
  }));

  const title = serializeScrollMetadata(scrolls);

  form.title(title);

  // ── DEBUG: verify the title byte-slicing matches the RP offsets ───────────────────
  // Every field is FULL_WIDTH.n (83) bytes: "X:" (2) + value padded to 80 + marker (1).
  // Field index i sits at PROTOCOL_HEADER_LENGTH + i*83. Layout: 0='scrolls', then per
  // scroll axis,x,y,width,height,extent. So scroll s: axis@(1+6s), x@(2+6s), y@(3+6s),
  // width@(4+6s), height@(5+6s), extent@(6+6s). The RP reads block s at rem-offset
  // (1+6s)*83 and within it width at +249, extent at +415 → field (4+6s)/(6+6s).
  const fieldAt = (i: number): { remOffset: number; value: string } => {
    const start = PROTOCOL_HEADER_LENGTH + i * FULL_WIDTH.n;
    const raw = title.slice(start, start + FULL_WIDTH.n);
    // drop "X:" prefix (2) and trailing marker (1), strip ';' padding
    const value = raw.slice(2, FULL_WIDTH.n - 1).replace(/;+$/, '');

    return { remOffset: i * FULL_WIDTH.n, value };
  };

  const report = scrolls.map((s, k) => {
    const x = fieldAt(2 + 6 * k);
    const y = fieldAt(3 + 6 * k);
    const w = fieldAt(4 + 6 * k);
    const h = fieldAt(5 + 6 * k);

    return `#${k} ts{x:${Math.round(s.x)},y:${Math.round(s.y)},w:${Math.round(s.width)},h:${Math.round(s.height)}} `
      + `title{ x@${x.remOffset}="${x.value}", y@${y.remOffset}="${y.value}", width@${w.remOffset}="${w.value}", height@${h.remOffset}="${h.value}" }`;
  });

  console.warn(`[bcui] title len=${title.length} scrolls=${scrolls.length}\n  ${report.join('\n  ')}`);

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
