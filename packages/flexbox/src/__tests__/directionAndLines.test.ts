import { describe, expect, it } from 'vitest';
import { computeLayout } from '../layout';
import { createNode } from '../node';
import type { AlignContent, FlexDirection, JustifyContent } from '../types';

describe('reversed flex directions', () => {
  it.each([
    ['row-reverse', [96, 79]],
    ['column-reverse', [54, 37]],
  ] as const)('places %s from the far edge with physical margins and padding', (flexDirection, positions) => {
    const row = flexDirection === 'row-reverse';
    const root = createNode({ width: 120, height: 80, flexDirection, gap: 4,
      paddingLeft: 3, paddingRight: 7, paddingTop: 5, paddingBottom: 9 }, [
      createNode({ width: 12, height: 12, ...row ? { marginLeft: 1, marginRight: 5 } : { marginTop: 1, marginBottom: 5 } }),
      createNode({ width: 12, height: 12, ...row ? { marginLeft: 2 } : { marginTop: 2 } }),
    ]);
    computeLayout(root);
    expect(root.children.map(child => row ? child.layout.x : child.layout.y)).toEqual(positions);
  });

  it('keeps descendants inside their reversed parent', () => {
    const leaf = createNode({ width: 4, height: 4 });
    const item = createNode({ width: 12, height: 12 }, [leaf]);
    const parent = createNode({ width: 120, height: 80, flexDirection: 'row-reverse' }, [item]);
    computeLayout(createNode({ width: 180, height: 110, padding: 11 }, [parent]));
    expect(item.layout.x).toBe(119);
    expect(leaf.layout.x).toBe(119);
    expect(leaf.layout.y).toBe(11);
  });

  it('keeps integer flex widths separated by the declared gap when reversed', () => {
    const root = createNode({ width: 120, height: 20, flexDirection: 'row-reverse', gap: 4 },
      Array.from({ length: 3 }, () => createNode({ flex: 1, height: 12 })));
    computeLayout(root);
    expect(root.children.map(child => [child.layout.x, child.layout.width])).toEqual([[83, 37], [41, 38], [0, 37]]);
  });
});

describe('wrapped line alignment', () => {
  const alignments: Array<[AlignContent, number, number]> = [
    ['flex-start', 0, 16], ['flex-end', 52, 68], ['center', 26, 42],
    ['stretch', 0, 42], ['space-between', 0, 68], ['space-around', 13, 55],
  ];

  it.each(alignments)('aligns horizontal lines with %s', (alignContent, first, second) => {
    const root = createNode({ width: 120, height: 80, flexDirection: 'row', wrap: 'wrap', gap: 4, alignContent },
      Array.from({ length: 3 }, () => createNode({ width: 52, height: 12 })));
    computeLayout(root);
    expect(root.children.map(child => [child.layout.x, child.layout.y])).toEqual([[0, first], [56, first], [0, second]]);
  });

  it.each(alignments)('aligns vertical lines with %s', (alignContent, first, second) => {
    const root = createNode({ width: 80, height: 120, flexDirection: 'column', wrap: 'wrap', gap: 4, alignContent },
      Array.from({ length: 3 }, () => createNode({ width: 12, height: 52 })));
    computeLayout(root);
    expect(root.children.map(child => [child.layout.x, child.layout.y])).toEqual([[first, 0], [first, 56], [second, 0]]);
  });

  it.each(['row', 'row-reverse'] as FlexDirection[])('reverses wrapped lines independently of %s item direction', flexDirection => {
    const root = createNode({ width: 120, height: 80, flexDirection, wrap: 'wrap-reverse', gap: 4, alignContent: 'flex-start' },
      Array.from({ length: 3 }, () => createNode({ width: 52, height: 12 })));
    computeLayout(root);
    const x = flexDirection === 'row' ? [0, 56, 0] : [68, 12, 68];
    expect(root.children.map(child => [child.layout.x, child.layout.y])).toEqual([[x[0], 68], [x[1], 68], [x[2], 52]]);
  });

  it('derives an automatic wrap height from natural line sizes', () => {
    const row = createNode({ width: 120, flexDirection: 'row', wrap: 'wrap', gap: 4, alignContent: 'center' },
      Array.from({ length: 3 }, () => createNode({ width: 52, height: 12 })));
    computeLayout(createNode({ width: 160, height: 120 }, [row]));
    expect(row.layout.height).toBe(28);
    expect(row.children.map(child => child.layout.y)).toEqual([0, 0, 16]);
  });

  it('ignores line alignment on an unwrapped container', () => {
    const root = createNode({ width: 120, height: 80, flexDirection: 'row', alignContent: 'flex-end' }, [createNode({ width: 12, height: 12 })]);
    computeLayout(root);
    expect(root.children[0].layout.y).toBe(0);
  });
});

describe('gaps with distributed justification', () => {
  it.each(['row', 'row-reverse', 'column', 'column-reverse'] as FlexDirection[])('preserves fixed box sizes with fractional space-around in %s', flexDirection => {
    const row = flexDirection.startsWith('row');
    const root = createNode({ width: row ? 208 : 128, height: row ? 128 : 208, flexDirection, justifyContent: 'space-around' },
      Array.from({ length: 3 }, () => createNode({ width: 12, height: 12 })));
    computeLayout(root);
    const positions = flexDirection.endsWith('reverse') ? [167, 98, 29] : [29, 98, 167];
    expect(root.children.map(child => [row ? child.layout.x : child.layout.y, row ? child.layout.width : child.layout.height]))
      .toEqual(positions.map(position => [position, 12]));
  });

  it.each(['space-between', 'space-around', 'space-evenly'] as JustifyContent[])('reserves the gap before flex growth with %s', justifyContent => {
    const root = createNode({ width: 120, height: 20, flexDirection: 'row', justifyContent, gap: 4 },
      Array.from({ length: 2 }, () => createNode({ flex: 1, height: 12 })));
    computeLayout(root);
    expect(root.children.map(child => [child.layout.x, child.layout.width])).toEqual([[0, 58], [62, 58]]);
  });
});
