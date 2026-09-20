import type { ControlEntry } from '../../jsonui';
import { folds, topLeft } from './shared';
import type { FaceEmit, IrNode } from './types';

/**
 * A row of laid-out children as a horizontal `stack_panel`'s columns.
 *
 * Each child keeps its own width — its glyphs', where it hugs them — and the
 * distance the layout left before the next one becomes a spacer of its own, so
 * the row reproduces the solved gaps while the engine packs what is actually
 * there. A hidden child takes no space and the children after it move left,
 * which is what lets a trail hold a slot it was sent nothing for.
 *
 * A CENTRED row starts at its first child: the space the layout left in front
 * of it is what centring the solved widths came to, and the stack hangs from
 * the middle of its box instead — so keeping that space would centre the row
 * twice.
 */
export const stackColumns = (children: readonly IrNode[], height: number, centred: boolean, ctx: FaceEmit): ControlEntry[] => {
  const [first] = children;
  const lead = centred || first === undefined || first.rect.x <= 0
    ? []
    : [{ lead: { type: 'panel', size: [first.rect.x, height] as [number, number], ...topLeft } } satisfies ControlEntry];

  return [
    ...lead,
    ...children.flatMap((child, index): ControlEntry[] => {
      const next = children[index + 1];
      const gap = next === undefined ? 0 : next.rect.x - (child.rect.x + child.rect.width);
      const column = ctx.emitNode({ ...child, rect: { ...child.rect, x: 0 } });

      // The gap the layout left, as a spacer of its own: a column's width is
      // its content's, so the distance to the next child is not a pitch that
      // can be folded into the child's own box.
      return [
        column,
        ...gap > 0 ? [{ [`${child.name}_gap`]: { type: 'panel', size: [gap, height] as [number, number], ...topLeft } } satisfies ControlEntry] : [],
      ];
    }),
  ];
};

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
      if (folds(child)) {
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
