import { beforeAll, describe, expect, it } from 'vitest';
import type { JSX } from '../../jsx';
import type { ScrollMetrics } from '../serializer';
import { withControl } from '../../components/control';
import { registerNativeComponents } from '../../components';
import { Scroll, ScrollArea } from '../../components/Scroll';
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

function scrollSlot(props: Record<string, unknown>, children: JSX.Node): JSX.Element {
  return { type: 'scroll-slot', props: { ...props, children } };
}

function scrolls(tree: JSX.Element): ScrollMetrics[] {
  return tree.props.jsonUIScrolls as ScrollMetrics[];
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
    const tree = box(320, 210, 'column', [scrollSlot({ __axis: 'x' }, content)]);

    computeLayout(tree);

    const s = scrolls(tree);

    expect(s).toHaveLength(2);
    expect(s[1].axis).toBe('x');
    expect(s[1].extent).toBe(400);
  });

  it('absolute geometry: scroll uses its x/y/width/height', () => {
    const content = column(100, [panel(80, 20)]);
    const tree = box(320, 210, 'column', [scrollSlot({ __x: 30, __y: 50, __width: 100, __height: 80 }, content)]);

    computeLayout(tree);

    expect(scrolls(tree)[1]).toMatchObject({ x: 30, y: 50, width: 100, height: 80 });
  });
});

describe('Scroll / ScrollArea components', () => {
  it('Scroll emits a scroll-slot carrying axis + geometry', () => {
    const el = Scroll({ axis: 'x', width: 120, x: 10, y: 20, children: panel(10, 10) });

    expect(el.type).toBe('scroll-slot');
    expect(el.props.__axis).toBe('x');
    expect(el.props.__width).toBe(120);
    expect(el.props.__x).toBe(10);
    expect(el.props.__y).toBe(20);
  });

  it('ScrollArea emits a transparent fragment carrying direction', () => {
    const el = ScrollArea({ direction: 'row', children: panel(10, 10) });

    expect(el.type).toBe('fragment');
    expect(el.props.__direction).toBe('row');
  });
});
