import { describe, expect, it } from 'vitest';
import { computeLayout } from '../layout';
import { createNode } from '../node';
import type { FlexDirection } from '../types';

describe('subpixel layout', () => {
  it.each(['row', 'row-reverse', 'column', 'column-reverse'] satisfies FlexDirection[])('keeps odd and even sizes centered in %s', flexDirection => {
    const first = createNode({ width: 18, height: 18 });
    const second = createNode({ width: 21, height: 21 });
    const root = createNode({ width: 60, height: 60, padding: 2, flexDirection, alignItems: 'center' }, [first, second]);

    computeLayout(root, 320, 210, { roundToPixel: false });

    const row = flexDirection.startsWith('row');
    const center = (child: typeof root): number => row
      ? child.layout.y + child.layout.height / 2
      : child.layout.x + child.layout.width / 2;
    expect(center(first)).toBe(30);
    expect(center(second)).toBe(30);
  });

  it('preserves fractional ancestor origins through nested centering', () => {
    const child = createNode({ width: 21, height: 21 });
    const panel = createNode({ width: 58, height: 28, justifyContent: 'center', alignItems: 'center' }, [child]);
    const root = createNode({ width: 59, height: 29, justifyContent: 'center', alignItems: 'center' }, [panel]);

    computeLayout(root, 320, 210, { roundToPixel: false });

    expect(panel.layout).toMatchObject({ x: 0.5, y: 0.5 });
    expect(child.layout.x + child.layout.width / 2).toBe(29.5);
    expect(child.layout.y + child.layout.height / 2).toBe(14.5);
  });
});
