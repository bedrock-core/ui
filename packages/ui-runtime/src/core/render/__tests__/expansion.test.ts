import type { Player } from '@minecraft/server';
import { afterEach, describe, expect, it } from 'vitest';
import { Panel } from '../../../components/Panel';
import { Screen } from '../../../components/Screen';
import { Text } from '../../../components/Text';
import { useState } from '../../../hooks';
import type { JSX } from '../../../jsx';
import { getFibersForOwner, playerOwner } from '../../fabric';
import { isElement } from '../../guards';
import { buildTree, cleanupComponentTree } from '../tree';

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- tree expansion only reads the fake player's identity
const owner = playerOwner({ id: 'expansion-player' } as Player);

function labels(tree: JSX.Element): string[] {
  const result: string[] = [];
  const pending = [tree];

  while (pending.length) {
    const node = pending.pop()!;
    const value = node.props.value;

    if (node.type === 'text' && typeof value === 'object' && value !== null && 'tail' in value && typeof value.tail === 'string') {
      result.push(value.tail.replaceAll('§r', ''));
    }

    const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];

    pending.push(...children.filter(isElement).reverse());
  }

  return result;
}

afterEach(() => { cleanupComponentTree(owner); });

describe('component expansion', () => {
  it('keeps JavaScript call depth bounded while expanding deeply composed components', () => {
    const previousLimit = Error.stackTraceLimit;
    const depths: number[] = [];

    const Leaf = (): JSX.Element => {
      depths.push(new Error().stack!.split('\n').length);

      return Text({ children: 'leaf' });
    };

    const Layer = ({ depth }: JSX.Props): JSX.Element => {
      const remaining = typeof depth === 'number' ? depth : 0;

      return remaining === 0 ? { type: Leaf, props: {} } : { type: Layer, props: { depth: remaining - 1 } };
    };

    Error.stackTraceLimit = 1_000;

    try {
      buildTree(Screen({ children: { type: Layer, props: { depth: 0 } } }), owner, true);
      cleanupComponentTree(owner);
      const deep = buildTree(Screen({ children: { type: Layer, props: { depth: 384 } } }), owner, true);

      expect(labels(deep)).toEqual(['leaf']);
      expect(depths[1]).toBeLessThanOrEqual(depths[0] + 8);
    } finally {
      Error.stackTraceLimit = previousLimit;
    }
  });

  it('isolates keyed descendants under distinct instances of the same parent component', () => {
    const Child = ({ label }: JSX.Props): JSX.Element => {
      const [initial] = useState(String(label));

      return Text({ children: initial });
    };

    const Parent = ({ label }: JSX.Props): JSX.Element => ({ type: Child, props: { key: 'shared', label } });
    const root = (reversed = false): JSX.Element => Screen({ children: Panel({ children: reversed
      ? [{ type: Parent, props: { key: 'b', label: 'B' } }, { type: Parent, props: { key: 'a', label: 'A' } }]
      : [{ type: Parent, props: { key: 'a', label: 'A' } }, { type: Parent, props: { key: 'b', label: 'B' } }] }) });

    expect(labels(buildTree(root(), owner, true))).toEqual(['A', 'B']);
    expect(labels(buildTree(root(true), owner, true))).toEqual(['B', 'A']);
  });

  it('links wide sibling lists once in render order across rebuilds', () => {
    const Row = ({ index }: JSX.Props): JSX.Element => Text({ children: String(index) });
    const Rows = (): JSX.Element => ({ type: 'fragment', props: { children: Array.from({ length: 512 }, (_, index) => ({ type: Row, props: { key: index, index } })) } });
    const root = (): JSX.Element => Screen({ children: { type: Rows, props: {} } });

    for (let pass = 0; pass < 2; pass++) {
      const tree = buildTree(root(), owner, true);
      const parent = getFibersForOwner(owner).find(fiber => fiber.id.endsWith('Rows:__auto_0'))!;
      const indices: number[] = [];

      for (let child = parent.child; child; child = child.sibling) {
        indices.push(child.index);
      }

      expect(labels(tree)).toEqual(Array.from({ length: 512 }, (_, index) => String(index)));
      expect(indices).toEqual(Array.from({ length: 512 }, (_, index) => index));
    }
  });

  it('rejects an unbounded component definition before the native call stack overflows', () => {
    const Recursive = (): JSX.Element => ({ type: Recursive, props: {} });

    expect(() => buildTree(Screen({ children: { type: Recursive, props: {} } }), owner, true))
      .toThrow(/Component nesting exceeds.*rendering itself recursively/);
  });
});
