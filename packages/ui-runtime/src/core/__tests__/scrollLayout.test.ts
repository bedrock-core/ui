import { beforeAll, describe, expect, it } from 'vitest';
import type { JSX } from '../../jsx';
import type { ScrollMetrics } from '../serializer';
import { withControl } from '../../components/control';
import { registerNativeComponents } from '../../components';
import { MAX_SCROLLS, Scroll } from '../../components/Scroll';
import { ScrollLimitError } from '../types';
import { computeLayout } from '../render/phases/layout';

beforeAll(() => {
  // computeLayout relies on the registry to know which types are transparent
  // ('scroll-slot', 'fragment') vs concrete ('panel').
  registerNativeComponents();
});

function panel(width: number, height: number, children?: JSX.Node): JSX.Element {
  return { type: 'panel', props: { ...withControl({ width, height }), children } };
}

function column(width: number, children: JSX.Node): JSX.Element {
  return { type: 'panel', props: { ...withControl({ width, flexDirection: 'column' }), children } };
}

function row(height: number, children: JSX.Node): JSX.Element {
  return { type: 'panel', props: { ...withControl({ height, flexDirection: 'row' }), children } };
}

/** A container that lays out its children — the realistic wrapper for nested scrolls. */
function box(width: number, height: number, direction: 'row' | 'column', children: JSX.Node): JSX.Element {
  return { type: 'panel', props: { ...withControl({ width, height, flexDirection: direction }), children } };
}

/**
 * Build a scroll-slot the way the `<Scroll>` component does: control props flow through
 * `withControl` into `__layout`, and the axis is tagged separately on `__axis`.
 */
function scrollSlot(
  { axis, ...layout }: { axis?: 'x' | 'y' } & Record<string, unknown>,
  children: JSX.Node,
): JSX.Element {
  return {
    type: 'scroll-slot',
    props: { ...withControl(layout), __axis: axis ?? 'y', children },
  };
}

function isScrollMetricsArray(value: unknown): value is ScrollMetrics[] {
  return Array.isArray(value);
}

function scrolls(tree: JSX.Element): ScrollMetrics[] {
  const value = tree.props.jsonUIScrolls;

  if (!isScrollMetricsArray(value)) {
    throw new Error('computeLayout did not emit jsonUIScrolls');
  }

  return value;
}

describe('computeLayout — main scroll only (no <Scroll>)', () => {
  it('emits one full-screen main scroll; extent floors to the viewport for short content', () => {
    const tree = column(320, [panel(50, 20), panel(50, 30)]);

    computeLayout(tree);

    const s = scrolls(tree);

    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ axis: 'y', x: 0, y: 0, width: 320, height: 210 });
    expect(s[0].extent).toBe(210); // content (50) < viewport → floored
    expect(tree.props.region).toBe(0);
  });

  it('main extent grows with content taller than the viewport', () => {
    const tall = column(320, Array.from({ length: 10 }, () => panel(50, 40)));

    computeLayout(tall);

    expect(scrolls(tall)[0].extent).toBe(400); // 10 × 40 > 210
  });
});

describe('computeLayout — nested scrolls (main 0 + extras 1+)', () => {
  it('a fixed-height row of two <Scroll>s → main + 2 flex-positioned scrolls', () => {
    const colA = column(160, [panel(140, 40)]);
    const colB = column(160, [panel(140, 40)]);

    // Fixed-height container so the main scroll does not itself scroll.
    const tree = box(320, 210, 'row', [scrollSlot({}, colA), scrollSlot({}, colB)]);

    computeLayout(tree);

    const s = scrolls(tree);

    expect(s).toHaveLength(3); // main(0) + 2 nested
    expect(s[0]).toMatchObject({ axis: 'y', x: 0, y: 0, width: 320, height: 210 });
    // Two equal flex columns.
    expect(s[1].x).toBe(0);
    expect(s[1].width).toBe(160);
    expect(s[2].x).toBe(160);
    expect(s[2].width).toBe(160);
    // Each scroll's content is tagged with its scroll index.
    expect(colA.props.region).toBe(1);
    expect(colB.props.region).toBe(2);
  });

  it('horizontal nested scroll: extent = content width, height = viewport', () => {
    const content = row(40, [panel(200, 40), panel(200, 40)]);
    const tree = box(320, 210, 'column', [scrollSlot({ axis: 'x' }, content)]);

    computeLayout(tree);

    const s = scrolls(tree);

    expect(s).toHaveLength(2);
    expect(s[1].axis).toBe('x');
    expect(s[1].extent).toBe(400);
  });

  it('absolute geometry: scroll uses its position/top/left/width/height', () => {
    const content = column(100, [panel(80, 20)]);
    const tree = box(320, 210, 'column', [
      scrollSlot({ position: 'absolute', left: 30, top: 50, width: 100, height: 80 }, content),
    ]);

    computeLayout(tree);

    expect(scrolls(tree)[1]).toMatchObject({ x: 30, y: 50, width: 100, height: 80 });
  });
});

describe('Scroll component', () => {
  it('Scroll emits a scroll-slot carrying control layout (axis fixed to y)', () => {
    const el = Scroll({ width: 120, position: 'absolute', left: 10, top: 20, children: panel(10, 10) });

    expect(el.type).toBe('scroll-slot');
    expect(el.props.__axis).toBe('y'); // axis isn't public; internal default keeps the protocol field
    // Control props flow through withControl into __layout (like any other component).
    expect(el.props.__layout).toMatchObject({ width: 120, position: 'absolute', left: 10, top: 20 });
  });

  it('an un-sized, non-absolute Scroll defaults its viewport to flexGrow:1', () => {
    const colA = column(160, [panel(140, 40)]);
    const colB = column(160, [panel(140, 40)]);
    const tree = box(320, 210, 'row', [
      Scroll({ children: colA }),
      Scroll({ children: colB }),
    ]);

    computeLayout(tree);

    const s = scrolls(tree);

    expect(s[1].width).toBe(160);
    expect(s[2].width).toBe(160);
  });
});

describe('computeLayout — scroll limit', () => {
  function nScrolls(n: number): JSX.Element {
    return box(320, 210, 'row', Array.from({ length: n }, () => Scroll({ children: panel(10, 10) })));
  }

  it(`accepts exactly MAX_SCROLLS (${MAX_SCROLLS}) custom scrolls`, () => {
    const tree = nScrolls(MAX_SCROLLS);

    expect(() => computeLayout(tree)).not.toThrow();
    expect(scrolls(tree)).toHaveLength(MAX_SCROLLS + 1); // + root
  });

  it('throws a ScrollLimitError when there are more than MAX_SCROLLS', () => {
    expect(() => computeLayout(nScrolls(MAX_SCROLLS + 1))).toThrow(ScrollLimitError);
  });
});
