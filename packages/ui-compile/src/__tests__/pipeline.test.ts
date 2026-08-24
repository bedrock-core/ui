import {
  CompileTimeHookError,
  computeLayout,
  Button,
  Container,
  expandStatic,
  Progress,
  SlotGrid,
} from '@bedrock-core/ui-runtime/compile';
import { Panel, Text, usePlayer, useState } from '@bedrock-core/ui-runtime';
import type { JSX } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { emit } from '../emit';
import type { Control, ControlEntry } from '../jsonui';
import { type LaidOutElement, toIr } from '../toIr';

/**
 * The whole compiler, end to end: components in, JSON UI out.
 *
 * This is the test that would have caught every mistake the hand-written target
 * surfaced in game, which is why it exists at the seam rather than inside any
 * one phase.
 */
const compile = (screen: () => unknown): ReturnType<typeof emit> => {
  const expanded = expandStatic(screen() as never);
  const laidOut = computeLayout(expanded);
  const ir = toIr(laidOut as LaidOutElement, {
    namespace: 'test',
    collection: 'container_items',
  });

  return emit(ir);
};

const entries = (control: Control): [string, Control][] =>
  (control.controls ?? []).flatMap(entry => Object.entries(entry as ControlEntry));

describe('the compiler, end to end', () => {
  const Reactor = (): unknown =>
    Container({
      children: [
        Text({ children: 'Reactor' }),
        Panel({
          flexDirection: 'row',
          children: [
            Progress({ value: 0.5, flexGrow: 1 }),
            Button({ onPress: () => undefined, children: 'Go' }),
          ],
        }),
        SlotGrid({ rows: 1, cols: 4 }),
      ],
    });

  it('turns components into a JSON UI document', () => {
    const doc = compile(Reactor);

    expect(doc.namespace).toBe('test');
    expect(doc.screen).toBeDefined();
  });

  it('allocates a slot per cell, in document order, after the sentinel', () => {
    const ir = toIr(
      computeLayout(expandStatic(Reactor() as never)) as LaidOutElement,
      { namespace: 'test', collection: 'container_items' },
    );

    // One <Slot> plus a 1x4 <SlotGrid> is five cells, then one channel.
    expect(ir.allocation).toEqual({ sentinel: 0, drawn: 5, channels: 1, size: 7 });
  });

  it('expands a grid into individual slots, each with its own index', () => {
    // A grid is a plain component: the compiler sees `rows * cols` slots and
    // allocates each an index, exactly as if they had been written out. Nothing
    // is named — the runtime matches handlers to slots by position.
    const doc = compile(Reactor);
    const indices: unknown[] = [];
    const visit = (control: Control): void => {
      if (control.$slot !== undefined) {
        indices.push(control.$slot);
      }

      for (const [, child] of entries(control)) {
        visit(child);
      }
    };

    visit(doc.screen as Control);

    // One button, then four grid cells, after the sentinel.
    expect(indices).toEqual([1, 2, 3, 4, 5]);
  });

  it('solves geometry rather than taking coordinates', () => {
    const ir = toIr(
      computeLayout(expandStatic(Reactor() as never)) as LaidOutElement,
      { namespace: 'test', collection: 'container_items' },
    );

    // Nothing in the source said where anything goes; the flexbox pass did.
    const rects: { x: number; y: number }[] = [];
    const walk = (node: { rect: { x: number; y: number }; children?: unknown[] }): void => {
      rects.push(node.rect);

      for (const child of node.children ?? []) {
        walk(child as never);
      }
    };

    walk(ir.root);

    expect(rects.length).toBeGreaterThan(5);
    expect(rects.some(rect => rect.x !== 0 || rect.y !== 0)).toBe(true);
  });

  it('honours the container canvas, not the canonical screen', () => {
    const ir = toIr(
      computeLayout(expandStatic(Reactor() as never)) as LaidOutElement,
      { namespace: 'test', collection: 'container_items' },
    );

    // 176 x 166 is `common.root_panel`, the whole chest screen: a compiled
    // screen replaces `chest.small_chest_panel` outright rather than filling
    // the strip above the player's inventory. Solving against the 320 x 210
    // canonical screen instead would put every offset subtly wrong.
    expect(ir.root.rect.width).toBe(176);
    expect(ir.root.rect.height).toBe(166);
  });

  it('obeys the host rule it learned in game', () => {
    const doc = compile(Reactor);
    const hosts: Control[] = [];
    const visit = (control: Control): void => {
      if (control.collection_name !== undefined) {
        hosts.push(control);
      }

      for (const [, child] of entries(control)) {
        visit(child);
      }
    };

    for (const [, control] of Object.entries(doc)) {
      if (typeof control !== 'string') {
        visit(control);
      }
    }

    expect(hosts.length).toBeGreaterThan(0);

    for (const host of hosts) {
      expect(['stack_panel', 'grid']).toContain(host.type);

      for (const [, child] of entries(host)) {
        expect(child.collection_index).toBeDefined();
      }
    }
  });

  it(`builds the layout from a hook's INITIAL value`, () => {
    // State is how a value reaches a channel, so hooks work at build time and
    // hand back what they started with. The shape they produce is the shape
    // every player gets; only the values move afterwards.
    const Stateful = (): JSX.Element => {
      const [label] = useState('start');

      return Text({ children: label });
    };

    const Screen = (): unknown => Container({ children: [{ type: Stateful, props: {} }] });

    expect(() => compile(Screen)).not.toThrow();
  });

  it('still rejects a hook that needs a player, because there is not one', () => {
    const PerPlayer = (): JSX.Element => {
      usePlayer();

      return Text({ children: 'never gets here' });
    };

    const Screen = (): unknown => Container({ children: [{ type: PerPlayer, props: {} }] });

    expect(() => compile(Screen)).toThrow(CompileTimeHookError);
    expect(() => compile(Screen)).toThrow(/reaches the screen on a channel/);
  });
});
