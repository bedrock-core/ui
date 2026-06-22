import { describe, expect, it } from 'vitest';
import type { Player } from '@minecraft/server';
import { Panel } from '../../components/Panel';
import { Scroll } from '../../components/Scroll';
import { isElement } from '../guards';
import { expandAndResolveContexts } from '../render/phases/expand';
import { computeLayout } from '../render/phases/layout';
import { createInitialContext } from '../render/traversal';
import type { JSX } from '../../jsx';
import type { ScrollMetrics } from '../serializer';

function el(type: unknown, props: Record<string, unknown>): JSX.Element {
  return { type, props } as JSX.Element;
}

/** Collect concrete (string-typed) elements of a given type from a tree. */
function collect(node: JSX.Node, type: string, out: JSX.Element[]): void {
  if (!isElement(node)) {
    if (Array.isArray(node)) {
      node.forEach(n => collect(n as JSX.Node, type, out));
    }

    return;
  }

  if (node.type === type) {
    out.push(node);
  }

  collect(node.props.children as JSX.Node, type, out);
}

/**
 * Full expand → layout pipeline over real `<Scroll>` / `<ScrollArea>` components:
 * the slots must be found across the expanded (array-normalized) children, each scroll
 * laid out in its own viewport, and every descendant tagged with its scroll index.
 */
describe('scroll pipeline (expand + layout)', () => {
  it('main scroll + two nested row-arranged scrolls with per-scroll region tags', () => {
    const player = { id: 'scroll-pipeline' } as unknown as Player;

    // A fixed-height row container with two <Scroll>s (the dual-scroll shape): the main
    // scroll (index 0) is the container; the two columns are scrolls 1 and 2.
    const tree = el(Panel, {
      flexDirection: 'row', width: 320, height: 210,
      children: [
        el(Scroll, {
          children: el(Panel, {
            flexDirection: 'column', gap: 4,
            children: [
              el(Panel, { height: 12, children: [] }),
              el(Panel, { height: 12, children: [] }),
            ],
          }),
        }),
        el(Scroll, {
          children: el(Panel, {
            flexDirection: 'column', gap: 4,
            children: [el(Panel, { height: 12, children: [] })],
          }),
        }),
      ],
    });

    const expanded = expandAndResolveContexts(tree, createInitialContext(), player);

    computeLayout(expanded);

    const panels: JSX.Element[] = [];

    collect(expanded, 'panel', panels);

    // Region 0 = the main container; regions 1/2 = the two columns' content.
    expect(panels.filter(p => p.props.region === 1)).toHaveLength(3); // column root + 2 rows
    expect(panels.filter(p => p.props.region === 2)).toHaveLength(2); // column root + 1 row

    // Main scroll + 2 nested, the nested side by side at half the canonical width.
    const scrolls = expanded.props.jsonUIScrolls as ScrollMetrics[];

    expect(scrolls).toHaveLength(3);
    expect(scrolls[0]).toMatchObject({ axis: 'y', x: 0, y: 0, width: 320, height: 210 });
    expect(scrolls[1].x).toBe(0);
    expect(scrolls[1].width).toBe(160);
    expect(scrolls[2].x).toBe(160);
    expect(scrolls[2].width).toBe(160);

    // Region 1's stacked rows get increasing region-local y.
    const region1 = panels.filter(p => p.props.region === 1);

    expect(region1.some(p => (p.props.jsonUIy as number) > 0)).toBe(true);
  });

  it('falls into a single root scroll when no <Scroll> is used', () => {
    const player = { id: 'scroll-root' } as unknown as Player;

    const tree = el(Panel, {
      flexDirection: 'column',
      children: [el(Panel, { height: 20, children: [] })],
    });

    const expanded = expandAndResolveContexts(tree, createInitialContext(), player);

    computeLayout(expanded);

    const scrolls = expanded.props.jsonUIScrolls as ScrollMetrics[];

    expect(scrolls).toHaveLength(1);
    expect(scrolls[0]).toMatchObject({ axis: 'y', x: 0, y: 0, width: 320, height: 210 });
  });
});
