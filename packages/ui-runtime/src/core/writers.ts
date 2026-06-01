import type { Writer } from './types';

/**
 * Transparent component types: do not emit payload, serialize children only.
 */
export const TRANSPARENT_TYPES = new Set<string>([
  'fragment',
  'context-provider',
]);

/**
 * Registry mapping of component types to their form writer behavior.
 */
export const WRITERS: Record<string, Writer> = {
  panel: (p, f) => f.label(p),
  text: (p, f) => f.label(p),
  image: (p, f) => f.label(p),
  item_renderer: (p, f, ctx, cbs, props) => {
    if (ctx) {
      if (cbs.onPress) {
        ctx.buttonCallbacks.set(ctx.buttonIndex, cbs.onPress);
      }

      ctx.buttonIndex++;
    }

    f.button(p, String(props?.aux ?? 0));
  },
  button: (p, f, ctx, cbs) => {
    if (ctx) {
      if (cbs.onPress) {
        ctx.buttonCallbacks.set(ctx.buttonIndex, cbs.onPress);
      }

      ctx.buttonIndex++;
    }

    f.button(p);
  },
};
