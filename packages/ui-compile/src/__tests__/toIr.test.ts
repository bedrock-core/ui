import { describe, expect, it } from 'vitest';
import type { PanelNode } from '../ir';
import { type LaidOutElement, toIr, UnsupportedNodeError } from '../toIr';

/** Builds an element the way `computeLayout` leaves it: absolute texels on props. */
const at = (
  type: string,
  [x, y, width, height]: [number, number, number, number],
  props: Record<string, unknown> = {},
): LaidOutElement => ({
  type,
  props: {
    jsonUIx: x,
    jsonUIy: y,
    jsonUIWidth: width,
    jsonUIHeight: height,
    ...props,
  },
});

const options = { namespace: 'demo', collection: 'container_items' };

describe('toIr', () => {
  it('converts absolute layout coordinates to parent-relative offsets', () => {
    // The solver places the screen at (40, 20); a label sits at (47, 24).
    // Relative to its parent that is (7, 4), which is what JSON UI wants.
    const tree = at('panel', [40, 20, 176, 83], {
      children: [at('text', [47, 24, 162, 10], { text: 'hi' })],
    });

    const doc = toIr(tree, options);

    expect(doc.root.rect).toEqual({ x: 0, y: 0, width: 176, height: 83 });
    expect(doc.root.children[0]?.rect).toEqual({ x: 7, y: 4, width: 162, height: 10 });
  });

  it('nests relative to the nearest panel, not the screen', () => {
    const tree = at('panel', [0, 0, 176, 83], {
      children: [
        at('panel', [10, 10, 100, 40], {
          children: [at('text', [30, 20, 50, 10], { text: 'inner' })],
        }),
      ],
    });

    const inner = (toIr(tree, options).root.children[0] as PanelNode).children[0];

    expect(inner?.rect).toEqual({ x: 20, y: 10, width: 50, height: 10 });
  });

  it('splices fragments away, so a component boundary costs nothing', () => {
    const tree = at('panel', [0, 0, 176, 83], {
      children: [
        at('fragment', [0, 0, 0, 0], {
          children: [
            at('text', [0, 0, 10, 10], { text: 'a' }),
            at('text', [0, 12, 10, 10], { text: 'b' }),
          ],
        }),
      ],
    });

    expect(toIr(tree, options).root.children).toHaveLength(2);
  });

  it('maps every text variant to a label', () => {
    for (const type of ['text', 'text_shadow', 'text_wrap', 'text_shadow_wrap']) {
      const tree = at('panel', [0, 0, 10, 10], {
        children: [at(type, [0, 0, 10, 10], { text: 'x' })],
      });

      expect(toIr(tree, options).root.children[0]?.kind).toBe('label');
    }
  });

  describe('allocation', () => {
    const screen = (): LaidOutElement => at('panel', [0, 0, 176, 83], {
      children: [
        at('container_slot', [7, 40, 18, 18], { name: 'fuel' }),
        at('container_bar', [7, 20, 110, 6], {
          name: 'charge',
          trackTexture: 'a',
          fillTexture: 'b',
          direction: 'left',
        }),
        at('container_slot', [25, 40, 18, 18], { name: 'ingot' }),
      ],
    });

    it('hands out slot indices in document order, after the sentinel', () => {
      const [fuel, , ingot] = toIr(screen(), options).root.children;

      expect(fuel).toMatchObject({ kind: 'slot', name: 'fuel', slot: 1 });
      expect(ingot).toMatchObject({ kind: 'slot', name: 'ingot', slot: 2 });
    });

    it('puts channels past the drawn range, where nothing on screen reaches', () => {
      const doc = toIr(screen(), options);
      const bar = doc.root.children[1];

      // Two drawn slots occupy 1 and 2, so the bank opens at 3.
      expect(bar).toMatchObject({ kind: 'bar', name: 'charge', channel: 3 });
      expect(bar).toMatchObject({ channel: doc.allocation.drawn + 1 });
    });

    it('reports the inventory size the entity needs', () => {
      expect(toIr(screen(), options).allocation)
        .toEqual({ sentinel: 0, drawn: 2, channels: 1, size: 4 });
    });

    it('ignores any index the author tried to set', () => {
      const tree = at('panel', [0, 0, 10, 10], {
        children: [at('container_slot', [0, 0, 18, 18], { name: 'fuel', slot: 99 })],
      });

      expect(toIr(tree, options).root.children[0]).toMatchObject({ slot: 1 });
    });
  });

  describe('naming', () => {
    it('prefers an explicit name, because the runtime handle keys on it', () => {
      const tree = at('panel', [0, 0, 10, 10], {
        children: [at('container_slot', [0, 0, 18, 18], { name: 'fuel' })],
      });

      expect(toIr(tree, options).root.children[0]?.name).toBe('fuel');
    });

    it('generates stable names for anything unnamed', () => {
      const tree = at('panel', [0, 0, 10, 10], {
        children: [
          at('text', [0, 0, 10, 10], { text: 'a' }),
          at('text', [0, 12, 10, 10], { text: 'b' }),
        ],
      });

      expect(toIr(tree, options).root.children.map(child => child.name))
        .toEqual(['label_1', 'label_2']);
    });

    it('refuses duplicate explicit names rather than silently losing one', () => {
      const tree = at('panel', [0, 0, 10, 10], {
        children: [
          at('container_slot', [0, 0, 18, 18], { name: 'fuel' }),
          at('container_slot', [18, 0, 18, 18], { name: 'fuel' }),
        ],
      });

      expect(() => toIr(tree, options)).toThrow(/Duplicate name "fuel"/);
    });
  });

  it('names the control it cannot compile, and what it can', () => {
    const tree = at('panel', [0, 0, 10, 10], {
      children: [at('slider', [0, 0, 10, 10])],
    });

    expect(() => toIr(tree, options)).toThrow(UnsupportedNodeError);
    expect(() => toIr(tree, options)).toThrow(/<slider> has no compiled form yet/);
  });

  it('wraps a non-panel root so the document always has one', () => {
    const doc = toIr(at('text', [0, 0, 100, 10], { text: 'only' }), options);

    expect(doc.root.kind).toBe('panel');
    expect(doc.root.children[0]?.kind).toBe('label');
  });

  it('refuses an empty screen', () => {
    expect(() => toIr(at('fragment', [0, 0, 0, 0], { children: [] }), options))
      .toThrow(/must render at least one control/);
  });
});
