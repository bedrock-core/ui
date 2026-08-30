import { describe, expect, it } from 'vitest';
import { Panel } from '../../../components/Panel';
import { Text } from '../../../components/Text';
import { bakedTexts, shapeOf } from '../../../core/ir/probe';
import type { JSX } from '../../../jsx';
import { debugDiff } from '../debug';

/** The snapshot a build of this tree would record, with no carried visibles. */
const snapshotOf = (tree: JSX.Element): { shape: string; baked: string[]; vis: number[] } => ({
  shape: shapeOf(tree),
  baked: bakedTexts(tree),
  vis: [],
});

describe('debugDiff', () => {
  it('says nothing when the render matches the bake', () => {
    const tree = Panel({ children: [Text({ children: 'STABLE' })] });

    expect(debugDiff(tree, snapshotOf(tree), 'screen')).toEqual([]);
  });

  it('names a baked string that drifted from the bake', () => {
    const baked = Panel({ children: [Text({ children: 'count 0' })] });
    const drifted = Panel({ children: [Text({ children: 'count 7' })] });

    const lines = debugDiff(drifted, snapshotOf(baked), 'counter');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('counter');
    expect(lines[0]).toContain('"count 7"');
    expect(lines[0]).toContain('maxLength');
  });

  it('reports a shape that no longer matches the compiled one', () => {
    const baked = Panel({ children: [Text({ children: 'A' })] });
    const grown = Panel({ children: [Text({ children: 'A' }), Panel({})] });

    const lines = debugDiff(grown, snapshotOf(baked), 'screen');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('shape');
  });

  it('leaves live text alone: the component already sliced it to its reservation', () => {
    const tree = Panel({ children: [Text({ maxLength: 4, children: 'OVERFLOWING' })] });

    expect(debugDiff(tree, snapshotOf(tree), 'screen')).toEqual([]);
  });
});
