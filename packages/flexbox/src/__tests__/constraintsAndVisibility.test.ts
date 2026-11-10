import { describe, expect, it } from 'vitest';
import { computeLayout } from '../layout';
import { createNode } from '../node';

describe('size constraints', () => {
  it.each([
    ['absolute minimum', { width: 12, height: 8, minWidth: 40, minHeight: 30 }, { width: 40, height: 30 }],
    ['absolute maximum', { width: 180, height: 120, maxWidth: 80, maxHeight: 60 }, { width: 80, height: 60 }],
    ['percentage minimum', { width: 12, height: 8, minWidth: '25%', minHeight: '50%' }, { width: 50, height: 50 }],
    ['percentage maximum', { width: 180, height: 90, maxWidth: '40%', maxHeight: '60%' }, { width: 80, height: 60 }],
  ] as const)('applies %s dimensions to a child', (_name, style, expected) => {
    const child = createNode({ ...style, flexShrink: 0 });
    const root = createNode({ width: 200, height: 100, flexDirection: 'row', alignItems: 'flex-start' }, [child]);

    computeLayout(root);

    expect(child.layout).toMatchObject({ x: 0, y: 0, ...expected });
  });

  it('keeps a zero-width item at zero while its sibling absorbs the shrink deficit', () => {
    const empty = createNode({ width: 0, height: 10 });
    const content = createNode({ width: 100, height: 10 });
    const root = createNode({ width: 60, height: 20, flexDirection: 'row', gap: 4 }, [empty, content]);

    computeLayout(root);

    expect(empty.layout).toMatchObject({ x: 0, width: 0 });
    expect(content.layout).toMatchObject({ x: 4, width: 56 });
    expect(content.layout.x + content.layout.width).toBe(root.layout.width);
  });
});

describe('percentage children in intrinsic containers', () => {
  it.each([
    ['row', 'nowrap'],
    ['row', 'wrap'],
    ['column', 'nowrap'],
    ['column', 'wrap'],
  ] as const)('resolves percentage children after deriving the %s/%s container size', (flexDirection, wrap) => {
    const row = flexDirection === 'row';
    const wrapped = wrap === 'wrap';
    const fixed = createNode({ width: row ? 20 : 10, height: row ? 10 : 20, flexShrink: 0 });
    const percentageCross = wrapped ? 10 : '200%';
    const percentage = createNode({ width: row ? '50%' : percentageCross, height: row ? percentageCross : '50%', flexShrink: 0 });
    const container = createNode({ flexDirection, wrap, gap: 4, alignItems: 'flex-start', flexShrink: 0 }, [fixed, percentage]);
    const root = createNode({
      width: 100,
      height: 100,
      flexDirection: row ? 'column' : 'row',
      alignItems: 'flex-start',
    }, [container]);

    computeLayout(root);

    const containerCross = wrapped ? 24 : 10;
    const childCross = wrapped ? 10 : 20;

    expect(container.layout).toMatchObject({ width: row ? 20 : containerCross, height: row ? containerCross : 20 });
    expect(fixed.layout).toMatchObject({ x: 0, y: 0, width: row ? 20 : 10, height: row ? 10 : 20 });
    expect(percentage.layout).toMatchObject({ width: row ? 10 : childCross, height: row ? childCross : 10 });

    const mainPosition = row ? percentage.layout.x : percentage.layout.y;
    const crossPosition = row ? percentage.layout.y : percentage.layout.x;

    expect(mainPosition).toBe(wrap === 'wrap' ? 0 : 24);
    expect(crossPosition).toBe(wrap === 'wrap' ? 14 : 0);
  });
});

describe('visibility and placement', () => {
  it('removes a hidden root from layout even when it has explicit dimensions', () => {
    const root = createNode({ display: 'none', width: 120, height: 80 });

    computeLayout(root);

    expect(root.layout).toEqual({ x: 0, y: 0, width: 0, height: 0, zIndex: 0 });
  });

  it('clears root geometry while hidden and measures its content again when shown', () => {
    let measurements = 0;
    const content = createNode({}, [], () => {
      measurements++;

      return { width: 30, height: 10 };
    });
    const root = createNode({ width: 120, height: 80, minWidth: 40, minHeight: 20, zIndex: 3 }, [content]);
    const layout = root.layout;

    computeLayout(root);
    expect(root.layout).toMatchObject({ width: 120, height: 80 });
    measurements = 0;
    root.style.display = 'none';

    computeLayout(root);

    expect(root.layout).toBe(layout);
    expect(root.layout).toEqual({ x: 0, y: 0, width: 0, height: 0, zIndex: 3 });
    expect(measurements).toBe(0);
    root.style.display = 'flex';

    computeLayout(root);

    expect(root.layout).toMatchObject({ width: 120, height: 80 });
    expect(measurements).toBeGreaterThan(0);
    expect(content.layout).toMatchObject({ width: 120, height: 10 });
  });

  it('does not remeasure hidden or zero-width leaves and excludes hidden content from flow', () => {
    const hiddenWidths: number[] = [];
    const collapsedWidths: number[] = [];
    const hidden = createNode({ display: 'none' }, [], availableWidth => {
      hiddenWidths.push(availableWidth);

      return { width: 90, height: 16 };
    });
    const collapsed = createNode({ width: 0, height: 8 }, [], availableWidth => {
      collapsedWidths.push(availableWidth);

      return { width: 90, height: 16 };
    });
    const visible = createNode({ width: 20, height: 10 });
    const root = createNode({ width: 40, height: 40, padding: 5, gap: 4 }, [hidden, collapsed, visible]);

    computeLayout(root);

    expect(hiddenWidths).toEqual([Number.POSITIVE_INFINITY]);
    expect(collapsedWidths).toEqual([Number.POSITIVE_INFINITY]);
    expect(hidden.layout).toMatchObject({ x: 0, y: 0, width: 0, height: 0 });
    expect(collapsed.layout).toMatchObject({ x: 5, y: 5, width: 0, height: 8 });
    expect(visible.layout).toMatchObject({ x: 5, y: 17, width: 20, height: 10 });
  });

  it('aligns a column child to the far content edge with its own trailing margin', () => {
    const child = createNode({ width: 20, height: 10, alignSelf: 'flex-end', marginRight: 3, marginTop: 2 });
    const root = createNode({
      width: 100,
      height: 80,
      flexDirection: 'column',
      alignItems: 'flex-start',
      paddingLeft: 7,
      paddingRight: 11,
      paddingTop: 5,
    }, [child]);

    computeLayout(root);

    expect(child.layout).toMatchObject({ x: 66, y: 7, width: 20, height: 10 });
  });

  it('anchors an absolute child to right and bottom edges with trailing margins', () => {
    const child = createNode({ position: 'absolute', width: 20, height: 15, right: 7, bottom: 9, marginRight: 3, marginBottom: 4 });
    const root = createNode({ width: 120, height: 80, padding: 10, zIndex: 5 }, [child]);

    computeLayout(root);

    expect(child.layout).toEqual({ x: 90, y: 52, width: 20, height: 15, zIndex: 5 });
  });
});
