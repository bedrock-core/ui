import type { ControlEntry } from '../jsonui';
import { topLeft } from './shared';
import type { FaceEmit, IrNode } from './types';

/**
 * A column of laid-out children as a `stack_panel`'s rows.
 *
 * The layout solved every child a fixed place; a stack draws its children one
 * after another instead, so each is wrapped in a row exactly as tall as the
 * distance to the next child (its own height for the last), which reproduces
 * the solved gaps while a stack can still give a HIDDEN row no space — the
 * one native reflow a frozen screen has. A child above the first (a padding
 * the column started with) becomes a leading spacer.
 */
export const stackRows = (children: readonly IrNode[], width: number, ctx: FaceEmit): ControlEntry[] => {
  const [first] = children;
  const lead = first === undefined || first.rect.y <= 0
    ? []
    : [{ lead: { type: 'panel', size: [width, first.rect.y] as [number, number], ...topLeft } } satisfies ControlEntry];

  return [
    ...lead,
    ...children.flatMap((child, index): ControlEntry[] => {
      const next = children[index + 1];
      const pitch = next === undefined ? child.rect.height : next.rect.y - child.rect.y;
      const row = ctx.emitNode({ ...child, rect: { ...child.rect, y: 0 } });

      // A child that folds is as tall as its state, not as the layout drew it
      // open, so its row is content-sized and the gap after it is a spacer of
      // its own — otherwise the row would hold the open height and nothing
      // below would move.
      if (child.kind === 'disclosure') {
        const gap = pitch - child.rect.height;
        const spacer: ControlEntry = { [`${child.name}_gap`]: { type: 'panel', size: [width, gap], ...topLeft } };

        return [
          { [`${child.name}_row`]: { type: 'panel', size: [width, '100%c'], ...topLeft, controls: [row] } },
          ...gap > 0 ? [spacer] : [],
        ];
      }

      return [{ [`${child.name}_row`]: { type: 'panel', size: [width, pitch], ...topLeft, controls: [row] } }];
    }),
  ];
};
