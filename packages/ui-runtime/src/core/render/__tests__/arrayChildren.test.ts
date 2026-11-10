import { afterEach, describe, expect, it } from 'vitest';
import { DirectArrayChildren, FragmentArrayChildren, MixedArrayChildren, NestedArrayChildren } from '../../../__fixtures__/ArrayChildren';
import { BUILD_OWNER } from '../../fabric';
import { childElements, isNode } from '../../guards';
import { Panel } from '../../../components/Panel';
import { Text } from '../../../components/Text';
import { useState } from '../../../hooks';
import { createInitialContext } from '../traversal';
import { expandAndResolveContexts } from '../phases/expand';
import { cleanupComponentTree } from '../tree';
import type { JSX } from '../../../jsx';

function labels(root: JSX.Element): unknown[] {
  const value = root.props.value;

  return [
    ...root.type === 'text' && typeof value === 'object' && value !== null && 'tail' in value
      ? [String(value.tail).replaceAll('§r', '')] : [],
    ...childElements(root.props.children).flatMap(labels),
  ];
}

afterEach(() => cleanupComponentTree(BUILD_OWNER));

describe('array-valued JSX children', () => {
  it.each([
    { name: 'direct arrays', component: DirectArrayChildren, expected: ['One', 'Two'] },
    { name: 'arrays with siblings', component: MixedArrayChildren, expected: ['Before', 'One', 'Two', 'After'] },
    { name: 'fragment-wrapped arrays', component: FragmentArrayChildren, expected: ['Before', 'One', 'Two', 'After'] },
    { name: 'nested arrays', component: NestedArrayChildren, expected: ['Before', 'One', 'Two', 'After'] },
  ])('expands $name in document order', ({ component, expected }) => {
    const root = expandAndResolveContexts({ type: component, props: {} }, createInitialContext(), BUILD_OWNER);

    expect(labels(root)).toEqual(expected);
  });

  it('keeps keyed component state when mapped groups are reordered', () => {
    const Row = ({ label }: JSX.Props): JSX.Element => {
      const [initial] = useState(String(label));

      return Text({ children: initial });
    };
    const root = (items: string[]): JSX.Element => Panel({ children: [
      Text({ children: 'Before' }),
      items.map(label => [{ type: Row, props: { key: label, label } }]),
      Text({ children: 'After' }),
    ] });
    const expand = (items: string[]): JSX.Element =>
      expandAndResolveContexts(root(items), createInitialContext(), BUILD_OWNER);

    expect(labels(expand(['One', 'Two']))).toEqual(['Before', 'One', 'Two', 'After']);
    expect(labels(expand(['Two', 'One']))).toEqual(['Before', 'Two', 'One', 'After']);
  });

  it('flattens deeply nested arrays without consuming the JavaScript call stack', () => {
    const leaf: JSX.Element = { type: 'panel', props: {} };
    let children: JSX.Node = leaf;

    for (let index = 0; index < 10_000; index++) {
      children = [children];
    }

    expect(childElements(children)).toEqual([leaf]);
  });

  it('recognizes nested child nodes and rejects non-node values', () => {
    expect(isNode(['ignored', true, [false, null, undefined, { type: 'panel', props: {} }]])).toBe(true);
    expect(isNode([[1]])).toBe(false);
    expect(isNode([[{}]])).toBe(false);
  });
});
