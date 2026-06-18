import { describe, expect, it } from 'vitest';
import type { Player } from '@minecraft/server';
import { Panel } from '../../components/Panel';
import { DualScroll, DUAL_SCROLL_REGION_WIDTH } from '../../screens/DualScroll';
import { isElement } from '../guards';
import { expandAndResolveContexts } from '../render/phases/expand';
import { computeLayout } from '../render/phases/layout';
import { createInitialContext } from '../render/traversal';
import type { JSX } from '../../jsx';

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
 * Regression for the full expand → layout pipeline: `expand` normalizes a slot's
 * children to an array, so the region layout must collect concrete roots across that
 * array (an earlier bug passed the array straight to collectConcrete, which expects a
 * single node, yielding no roots → every element collapsed to 0,0 / region 0).
 */
describe('region pipeline (expand + layout)', () => {
  it('applies region-local coordinates and region tags through the real pipeline', () => {
    const player = { id: 'region-pipeline' } as unknown as Player;

    // No explicit widths: columns must stretch to the region width.
    const tree = el(DualScroll, {
      children: [
        el(DualScroll.Left, {
          children: el(Panel, {
            flexDirection: 'column', gap: 4,
            children: [
              el(Panel, { height: 12, children: [] }),
              el(Panel, { height: 12, children: [] }),
            ],
          }),
        }),
        el(DualScroll.Right, {
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

    // 3 panels in region 0 (column root + 2 rows), 2 in region 1 (column root + 1 row).
    const region0 = panels.filter(p => p.props.region === 0);
    const region1 = panels.filter(p => p.props.region === 1);

    expect(region0).toHaveLength(3);
    expect(region1).toHaveLength(2);

    // Each region's column stretches to the region width (not the full screen).
    expect(region0[0].props.jsonUIWidth).toBe(DUAL_SCROLL_REGION_WIDTH);
    expect(region1[0].props.jsonUIWidth).toBe(DUAL_SCROLL_REGION_WIDTH);

    // Region 0 rows are stacked: at least one panel sits below the top (non-zero y).
    expect(region0.some(p => (p.props.jsonUIy as number) > 0)).toBe(true);

    // Two regions, two extents.
    expect(expanded.props.jsonUIRegionExtents).toHaveLength(2);
  });
});
