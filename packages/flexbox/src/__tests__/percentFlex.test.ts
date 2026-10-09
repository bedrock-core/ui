import type { FlexDirection } from '../types';
import { computeLayout } from '../layout';
import { createNode } from '../node';
import { describe, expect, it } from 'vitest';

describe('percentage sizes after flex allocation', () => {
  it.each(['row', 'column'] as const)('keeps a shrunk %s percentage and lays out its descendants in that grant', direction => {
    const row = direction === 'row';
    const size = row ? 'width' : 'height';
    const cross = row ? 'height' : 'width';
    const grandchild = createNode({ [size]: '100%', [cross]: 12 });
    const first = createNode({ [size]: '75%', [cross]: 12 }, [grandchild]);
    const second = createNode({ [size]: '75%', [cross]: 12 });
    const root = createNode({ width: 120, height: 80, flexDirection: direction }, [first, second]);

    computeLayout(root);

    expect(first.layout[size]).toBe(row ? 60 : 40);
    expect(second.layout[size]).toBe(row ? 60 : 40);
    expect(grandchild.layout[size]).toBe(row ? 60 : 40);
    expect(row ? second.layout.x : second.layout.y).toBe(row ? 60 : 40);
  });

  it.each(['row', 'column'] as const)('keeps a grown %s percentage when different authored bases share zero-basis growth', direction => {
    const row = direction === 'row';
    const size = row ? 'width' : 'height';
    const cross = row ? 'height' : 'width';
    const first = createNode({ [size]: '50%', [cross]: 12, flexGrow: 1 });
    const second = createNode({ [size]: '25%', [cross]: 12, flexGrow: 1 });
    const root = createNode({ width: 120, height: 80, flexDirection: direction }, [first, second]);

    computeLayout(root);

    expect(first.layout[size]).toBe(row ? 60 : 40);
    expect(second.layout[size]).toBe(row ? 60 : 40);
    expect(row ? second.layout.x : second.layout.y).toBe(row ? 60 : 40);
  });

  it.each(['row', 'row-reverse', 'column', 'column-reverse'] satisfies FlexDirection[])('retains rounded boundaries without overlap in %s', direction => {
    const row = direction.startsWith('row');
    const size = row ? 'width' : 'height';
    const cross = row ? 'height' : 'width';
    const first = createNode({ [size]: '75%', [cross]: 12 });
    const second = createNode({ [size]: '75%', [cross]: 12 });
    const root = createNode({ width: 121, height: 81, flexDirection: direction }, [first, second]);

    computeLayout(root);

    expect(first.layout[size]).toBe(row ? 61 : 41);
    expect(second.layout[size]).toBe(row ? 60 : 40);
    const positions = [first, second].sort((a, b) => row ? a.layout.x - b.layout.x : a.layout.y - b.layout.y);
    const [leading, trailing] = positions;

    expect(row ? leading.layout.x : leading.layout.y).toBe(0);
    expect(row ? trailing.layout.x : trailing.layout.y).toBe(leading.layout[size]);
    expect(first.layout[size] + second.layout[size]).toBe(root.layout[size]);
  });

  it('keeps absolute percentages independent of neighboring flex shrink', () => {
    const absolute = createNode({ width: '75%', height: '50%', position: 'absolute', left: 4, top: 2 });
    const first = createNode({ width: '75%', height: 12 });
    const second = createNode({ width: '75%', height: 12 });
    const root = createNode({ width: 120, height: 80, flexDirection: 'row' }, [absolute, first, second]);

    computeLayout(root);

    expect(absolute.layout).toMatchObject({ x: 4, y: 2, width: 90, height: 40 });
    expect(first.layout).toMatchObject({ x: 0, width: 60 });
    expect(second.layout).toMatchObject({ x: 60, width: 60 });
  });

  it('honors disabled shrink on percentages that overflow the row', () => {
    const first = createNode({ width: '75%', height: 12, flexShrink: 0 });
    const second = createNode({ width: '75%', height: 12, flexShrink: 0 });
    const root = createNode({ width: 120, height: 80, flexDirection: 'row' }, [first, second]);

    computeLayout(root);

    expect(first.layout).toMatchObject({ x: 0, width: 90 });
    expect(second.layout).toMatchObject({ x: 90, width: 90 });
  });
});
