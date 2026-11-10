import { describe, expect, it } from 'vitest';
import { computeLayout } from '../layout';
import { createNode } from '../node';
import type { JustifyContent, LayoutNode } from '../types';

function rectangle(node: LayoutNode): [number, number, number, number] {
  const { x, y, width, height } = node.layout;

  return [x, y, width, height];
}

describe.each(['row', 'column'] as const)('wrapped %s items', direction => {
  const row = direction === 'row';
  const justifications: Array<[JustifyContent, [number, number, number]]> = [
    ['space-between', [10, 82, 10]],
    ['space-around', [16, 76, 46]],
    ['space-evenly', [18, 74, 46]],
    ['center', [22, 70, 46]],
    ['flex-end', [34, 82, 82]],
  ];

  it.each(justifications)('justifies each line independently with %s', (justifyContent, mainPositions) => {
    const children = Array.from({ length: 3 }, () => createNode({
      width: row ? 40 : 12,
      height: row ? 12 : 40,
      padding: 2,
    }, [createNode({ width: 3, height: 4 })]));
    const container = createNode({
      width: row ? 124 : 78,
      height: row ? 78 : 124,
      padding: 6,
      flexDirection: direction,
      wrap: 'wrap',
      rowGap: row ? 8 : 10,
      columnGap: row ? 10 : 8,
      alignContent: 'flex-start',
      justifyContent,
    }, children);

    computeLayout(createNode({ width: 200, height: 200, padding: 4 }, [container]));

    const crossPositions = [10, 10, 32];
    const expected = mainPositions.map((main, index) => row
      ? [main, crossPositions[index], 40, 12]
      : [crossPositions[index], main, 12, 40]);

    expect(children.map(rectangle)).toEqual(expected);
    for (const [index, child] of children.entries()) {
      const [x, y] = expected[index];

      expect(rectangle(child.children[0])).toEqual([x + 2, y + 2, 3, 4]);
    }
  });

  it.each([
    ['center', 18, 69],
    ['flex-end', 28, 62],
  ] as const)('aligns margin boxes within their own line with %s and alignSelf', (alignItems, secondCross, fourthCross) => {
    const children = [
      createNode({ width: 40, height: 40, alignSelf: 'flex-start' }),
      createNode({
        width: row ? 40 : 12,
        height: row ? 12 : 40,
        ...row ? { marginTop: 3, marginBottom: 5 } : { marginLeft: 3, marginRight: 5 },
      }),
      createNode({ width: row ? 40 : 30, height: row ? 30 : 40, alignSelf: 'flex-start' }),
      createNode({
        width: row ? 40 : 10,
        height: row ? 10 : 40,
        padding: 1,
        alignSelf: alignItems === 'center' ? 'flex-end' : 'center',
        ...row ? { marginTop: 2, marginBottom: 4 } : { marginLeft: 2, marginRight: 4 },
      }, [createNode({ width: 3, height: 3 })]),
    ];
    const container = createNode({
      width: 100,
      height: 100,
      padding: 5,
      flexDirection: direction,
      wrap: 'wrap',
      rowGap: row ? 10 : 8,
      columnGap: row ? 8 : 10,
      alignContent: 'flex-start',
      alignItems,
    }, children);

    computeLayout(container);

    const expected = row
      ? [[5, 5, 40, 40], [55, secondCross, 40, 12], [5, 53, 40, 30], [55, fourthCross, 40, 10]]
      : [[5, 5, 40, 40], [secondCross, 55, 12, 40], [53, 5, 30, 40], [fourthCross, 55, 10, 40]];

    expect(children.map(rectangle)).toEqual(expected);
    const [x, y] = expected[3];

    expect(rectangle(children[3].children[0])).toEqual([x + 1, y + 1, 3, 3]);
  });
});

describe('wrapped columns', () => {
  it('derives automatic width from all columns, their gap, and physical padding', () => {
    const children = [
      createNode({ width: 10, height: 40 }),
      createNode({ width: 20, height: 40 }),
      createNode({ width: 30, height: 40, padding: 2 }, [createNode({ width: 5, height: 6 })]),
    ];
    const container = createNode({
      height: 100,
      flexDirection: 'column',
      wrap: 'wrap',
      rowGap: 6,
      columnGap: 8,
      paddingLeft: 3,
      paddingRight: 5,
      paddingTop: 4,
      paddingBottom: 6,
      alignItems: 'flex-start',
      alignContent: 'flex-start',
    }, children);

    computeLayout(createNode({ width: 200, height: 160, padding: 7, flexDirection: 'row', alignItems: 'flex-start' }, [container]));

    expect(rectangle(container)).toEqual([7, 7, 64, 100]);
    expect(children.map(rectangle)).toEqual([[10, 11, 10, 40], [10, 59, 20, 40], [36, 11, 30, 40]]);
    expect(rectangle(children[2].children[0])).toEqual([38, 13, 5, 6]);
  });

  it('stretches implicit widths within each allocated column without changing explicit widths', () => {
    const first = createNode({ height: 40, paddingLeft: 2, paddingRight: 3, marginLeft: 2, marginRight: 4 },
      [createNode({ width: 10, height: 10 })]);
    const second = createNode({ width: 30, height: 40, marginLeft: 1, marginRight: 2 });
    const third = createNode({ height: 40, paddingLeft: 1, paddingRight: 2, marginLeft: 3, marginRight: 1 },
      [createNode({ width: 17, height: 8 })]);
    const container = createNode({
      width: 113,
      height: 100,
      padding: 6,
      flexDirection: 'column',
      wrap: 'wrap',
      rowGap: 6,
      columnGap: 8,
      alignItems: 'stretch',
      alignContent: 'stretch',
    }, [first, second, third]);

    computeLayout(container);

    expect(container.children.map(rectangle)).toEqual([[8, 6, 46, 40], [7, 54, 30, 40], [67, 6, 39, 40]]);
    expect(rectangle(first.children[0])).toEqual([10, 6, 10, 10]);
    expect(rectangle(third.children[0])).toEqual([68, 6, 17, 8]);
  });

  it.each([
    ['column', [11, 73, 11]],
    ['column-reverse', [77, 15, 77]],
  ] as const)('reverses column bands independently of %s item direction', (flexDirection, yPositions) => {
    const children = Array.from({ length: 3 }, () => createNode({
      width: 20,
      height: 50,
      padding: 2,
      marginLeft: 3,
      marginRight: 5,
      marginTop: 2,
      marginBottom: 4,
    }, [createNode({ width: 5, height: 6 })]));
    const container = createNode({
      width: 120,
      height: 136,
      paddingLeft: 7,
      paddingRight: 11,
      paddingTop: 5,
      paddingBottom: 9,
      flexDirection,
      wrap: 'wrap-reverse',
      rowGap: 8,
      columnGap: 6,
      alignItems: 'flex-start',
      alignContent: 'flex-start',
    }, children);

    computeLayout(createNode({ width: 200, height: 200, padding: 4 }, [container]));

    const xPositions = [88, 88, 52];

    expect(children.map(rectangle)).toEqual(xPositions.map((x, index) => [x, yPositions[index], 20, 50]));
    for (const [index, child] of children.entries()) {
      expect(rectangle(child.children[0])).toEqual([xPositions[index] + 2, yPositions[index] + 2, 5, 6]);
    }
  });
});
