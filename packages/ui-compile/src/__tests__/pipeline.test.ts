import {
  CompileTimeHookError,
  computeLayout,
  Container,
  expandStatic,
  Progress,
  Slot,
  SlotGrid,
} from '@bedrock-core/ui-runtime/compile';
import { Panel, Text, useState } from '@bedrock-core/ui-runtime';
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
            Progress({ name: 'charge', flexGrow: 1 }),
            Slot({ name: 'toggle' }),
          ],
        }),
        SlotGrid({ name: 'bay', rows: 1, cols: 4 }),
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

  it('names grid cells positionally so a script can address one', () => {
    const ir = toIr(
      computeLayout(expandStatic(Reactor() as never)) as LaidOutElement,
      { namespace: 'test', collection: 'container_items' },
    );

    const names: string[] = [];
    const walk = (node: { kind: string; name: string; children?: unknown[] }): void => {
      if (node.kind === 'slot') {
        names.push(node.name);
      }

      for (const child of node.children ?? []) {
        walk(child as never);
      }
    };

    walk(ir.root);

    expect(names).toEqual(['toggle', 'bay_0', 'bay_1', 'bay_2', 'bay_3']);
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

    // 176 x 83 is vanilla's chest top half. Solving against the 320 x 210
    // canonical screen instead would put every offset subtly wrong.
    expect(ir.root.rect.width).toBe(176);
    expect(ir.root.rect.height).toBe(83);
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

  it('rejects a runtime-only hook from the top of the pipeline', () => {
    const Stateful = (): JSX.Element => {
      useState(0);

      return Text({ children: 'never gets here' });
    };

    const Screen = (): unknown => Container({ children: [{ type: Stateful, props: {} }] });

    expect(() => compile(Screen)).toThrow(CompileTimeHookError);
    expect(() => compile(Screen)).toThrow(/declare a channel the screen reads/);
  });
});
