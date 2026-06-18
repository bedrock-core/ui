import { beforeAll, describe, expect, it } from 'vitest';
import type { JSX } from '../../jsx';
import { withControl } from '../../components/control';
import { registerNativeComponents } from '../../components';
import { computeLayout } from '../render/phases/layout';
import { DualScroll } from '../../screens/DualScroll';

beforeAll(() => {
  // computeLayout relies on the registry to know which types are transparent
  // ('region-slot', 'fragment') vs concrete ('panel').
  registerNativeComponents();
});

function panel(width: number, height: number, children?: JSX.Node): JSX.Element {
  return { type: 'panel', props: { ...withControl({ width, height }), children } };
}

function column(width: number, children: JSX.Node): JSX.Element {
  return { type: 'panel', props: { ...withControl({ width, flexDirection: 'column', gap: 4 }), children } };
}

function slot(region: number, children: JSX.Node): JSX.Element {
  return { type: 'region-slot', props: { __region: region, children } };
}

describe('computeLayout — single region (no slots)', () => {
  it('tags every element region 0 and surfaces one extent', () => {
    const tree = panel(320, 100, [panel(50, 20), panel(50, 30)]);

    computeLayout(tree);

    const [a, b] = tree.props.children as JSX.Element[];

    expect(tree.props.region).toBe(0); // root keeps the withControl default (0)
    expect(a.props.region).toBe(0);
    expect(b.props.region).toBe(0);
    expect(tree.props.jsonUIRegionExtents).toHaveLength(1);
  });
});

describe('computeLayout — multi region (slots)', () => {
  it('lays out each slot independently with region-local offsets and per-region extents', () => {
    const left = panel(150, 40, [panel(100, 40)]);
    const right = panel(150, 90, [panel(100, 90)]);

    const tree: JSX.Element = {
      type: 'fragment',
      props: { children: [slot(0, left), slot(1, right)] },
    };

    computeLayout(tree);

    // Region tagging follows the enclosing slot.
    expect(left.props.region).toBe(0);
    expect((left.props.children as JSX.Element[])[0].props.region).toBe(0);
    expect(right.props.region).toBe(1);
    expect((right.props.children as JSX.Element[])[0].props.region).toBe(1);

    // Each region root is laid out at its own origin (region-local coordinates).
    expect(left.props.jsonUIy).toBe(0);
    expect(right.props.jsonUIy).toBe(0);

    // One extent per region, in region-index order. Extents floor at the canonical
    // viewport height, so both regions report at least that — but they are computed
    // independently (the right column's taller content does not affect the left).
    const extents = tree.props.jsonUIRegionExtents as number[];

    expect(extents).toHaveLength(2);
    expect(extents[0]).toBeGreaterThan(0);
    expect(extents[1]).toBeGreaterThan(0);
  });

  it('DualScroll slot components produce region-slot elements tagged 0 and 1', () => {
    const left = DualScroll.Left({ children: panel(100, 20) });
    const right = DualScroll.Right({ children: panel(100, 20) });

    expect(left.type).toBe('region-slot');
    expect(left.props.__region).toBe(0);
    expect(right.type).toBe('region-slot');
    expect(right.props.__region).toBe(1);
  });

  it('computes stacked region-local coordinates for a demo-shaped nested tree', () => {
    // Mirror DualScrollDemo: fragment (context wrappers) → region-slot → column panel
    // → [header, column → rows]. Verify deep rows get stacked (non-zero) region-local y.
    const leftRows = [panel(140, 12), panel(140, 12), panel(140, 12)];
    const leftRoot = column(150, [panel(140, 10), column(150, leftRows)]);

    const rightRows = [panel(140, 12), panel(140, 12)];
    const rightRoot = column(150, [panel(140, 10), column(150, rightRows)]);

    const tree: JSX.Element = {
      type: 'fragment',
      props: {
        children: [
          { type: 'fragment', props: { children: [slot(0, leftRoot)] } },
          { type: 'fragment', props: { children: [slot(1, rightRoot)] } },
        ],
      },
    };

    computeLayout(tree);

    // Region tagging
    const leftInner = (leftRoot.props.children as JSX.Element[])[1];
    const leftRowEls = leftInner.props.children as JSX.Element[];

    expect(leftRoot.props.region).toBe(0);
    expect(leftRowEls[0].props.region).toBe(0);

    // Rows must be stacked: the second row sits below the first (non-zero, increasing y).
    expect(leftRowEls[1].props.jsonUIy).toBeGreaterThan(leftRowEls[0].props.jsonUIy as number);
    expect(leftRowEls[2].props.jsonUIy).toBeGreaterThan(leftRowEls[1].props.jsonUIy as number);

    // Right region tagged 1 and laid out independently at its own origin.
    const rightInner = (rightRoot.props.children as JSX.Element[])[1];
    const rightRowEls = rightInner.props.children as JSX.Element[];

    expect(rightRoot.props.region).toBe(1);
    expect(rightRowEls[1].props.jsonUIy).toBeGreaterThan(rightRowEls[0].props.jsonUIy as number);

    expect(tree.props.jsonUIRegionExtents).toHaveLength(2);
  });

  it('orders extents by region index regardless of document order', () => {
    const tree: JSX.Element = {
      type: 'fragment',
      props: { children: [slot(1, panel(150, 90)), slot(0, panel(150, 40))] },
    };

    computeLayout(tree);

    const extents = tree.props.jsonUIRegionExtents as number[];

    expect(extents).toHaveLength(2);
  });
});
