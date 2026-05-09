import { describe, expect, it } from 'vitest';
import { CANONICAL_SCREEN } from '../constants';
import { computeLayout } from '../layout';
import { createNode } from '../node';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Run computeLayout and return the root node for chaining. */
function lay(root: ReturnType<typeof createNode>): ReturnType<typeof createNode> {
  computeLayout(root);

  return root;
}

// ─── Root defaults ────────────────────────────────────────────────────────────

describe('root defaults', () => {
  it('fills canonical screen when no size is set', () => {
    const root = lay(createNode());

    expect(root.layout.width).toBe(CANONICAL_SCREEN.width); // 320
    expect(root.layout.height).toBe(CANONICAL_SCREEN.height); // 210
    expect(root.layout.x).toBe(0);
    expect(root.layout.y).toBe(0);
  });

  it('respects explicit texel size on root', () => {
    const root = lay(createNode({ width: 200, height: 100 }));

    expect(root.layout.width).toBe(200);
    expect(root.layout.height).toBe(100);
  });

  it('resolves "100%" on root against canonical screen', () => {
    const root = lay(createNode({ width: '100%', height: '100%' }));

    expect(root.layout.width).toBe(CANONICAL_SCREEN.width);
    expect(root.layout.height).toBe(CANONICAL_SCREEN.height);
  });

  it('resolves "50%" on root to half the canonical screen', () => {
    const root = lay(createNode({ width: '50%', height: '50%' }));

    expect(root.layout.width).toBe(160); // 320 * 0.5
    expect(root.layout.height).toBe(105); // 210 * 0.5
  });

  it('derives root height from children when root height is omitted but floors to canonical viewport', () => {
    // 40 + 60 = 100 px of content, but canonical viewport height (210) is the minimum floor.
    const root = lay(createNode({ width: 320, flexDirection: 'column' }, [
      createNode({ height: 40 }),
      createNode({ height: 60 }),
    ]));

    expect(root.layout.width).toBe(320);
    expect(root.layout.height).toBe(CANONICAL_SCREEN.height); // floor: 210
  });

  it('grows beyond canonical viewport when content is taller', () => {
    // 150 + 150 = 300 px > canonical height (210): content-driven growth wins.
    const root = lay(createNode({ width: 320, flexDirection: 'column' }, [
      createNode({ height: 150 }),
      createNode({ height: 150 }),
    ]));

    expect(root.layout.height).toBe(300);
  });

  it('tiny content still floors to canonical viewport height', () => {
    // A single text-like node with small intrinsic height should not collapse the root.
    const root = lay(createNode({ width: 320, flexDirection: 'column' }, [
      createNode({ width: 26, height: 10 }),
    ]));

    expect(root.layout.height).toBe(CANONICAL_SCREEN.height); // floor: 210
  });
});

// ─── Row layout ───────────────────────────────────────────────────────────────

describe('row layout', () => {
  it('places two fixed children sequentially on x axis', () => {
    const root = createNode({ width: 200, height: 100, flexDirection: 'row' }, [
      createNode({ width: 50, height: 50 }),
      createNode({ width: 80, height: 50 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.x).toBe(0);
    expect(root.children[1].layout.x).toBe(50);
  });

  it('applies gap between children', () => {
    const root = createNode({ width: 200, height: 100, flexDirection: 'row', gap: 10 }, [
      createNode({ width: 50, height: 50 }),
      createNode({ width: 50, height: 50 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.x).toBe(0);
    expect(root.children[1].layout.x).toBe(60); // 50 + 10
  });
});

// ─── Column layout ────────────────────────────────────────────────────────────

describe('column layout', () => {
  it('places two fixed children sequentially on y axis', () => {
    const root = createNode({ width: 200, height: 200, flexDirection: 'column' }, [
      createNode({ width: 100, height: 40 }),
      createNode({ width: 100, height: 60 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.y).toBe(0);
    expect(root.children[1].layout.y).toBe(40);
  });

  it('applies gap between column children', () => {
    const root = createNode({ width: 200, height: 200, flexDirection: 'column', gap: 8 }, [
      createNode({ width: 100, height: 40 }),
      createNode({ width: 100, height: 40 }),
    ]);

    computeLayout(root);
    expect(root.children[1].layout.y).toBe(48); // 40 + 8
  });
});

// ─── Flex distribution ────────────────────────────────────────────────────────

describe('flex distribution', () => {
  it('flex:1 child fills remaining row space', () => {
    const root = createNode({ width: 200, height: 100, flexDirection: 'row' }, [
      createNode({ width: 50, height: 50 }),
      createNode({ flex: 1, height: 50 }),
    ]);

    computeLayout(root);
    expect(root.children[1].layout.width).toBe(150); // 200 - 50
  });

  it('two flex:1 children share space equally', () => {
    const root = createNode({ width: 200, height: 100, flexDirection: 'row' }, [
      createNode({ flex: 1, height: 50 }),
      createNode({ flex: 1, height: 50 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.width).toBe(100);
    expect(root.children[1].layout.width).toBe(100);
  });

  it('flex:2 gets twice as much space as flex:1', () => {
    const root = createNode({ width: 300, height: 100, flexDirection: 'row' }, [
      createNode({ flex: 1, height: 50 }),
      createNode({ flex: 2, height: 50 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.width).toBe(100);
    expect(root.children[1].layout.width).toBe(200);
  });
});

// ─── justifyContent ───────────────────────────────────────────────────────────

describe('justifyContent', () => {
  it('center shifts children to the middle', () => {
    const root = createNode({
      width: 200,
      height: 100,
      flexDirection: 'row',
      justifyContent: 'center',
    }, [
      createNode({ width: 40, height: 40 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.x).toBe(80); // (200 - 40) / 2
  });

  it('flex-end shifts children to the right', () => {
    const root = createNode({
      width: 200,
      height: 100,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    }, [
      createNode({ width: 60, height: 40 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.x).toBe(140); // 200 - 60
  });

  it('space-between: first at 0, last at end', () => {
    const root = createNode({
      width: 200,
      height: 100,
      flexDirection: 'row',
      justifyContent: 'space-between',
    }, [
      createNode({ width: 40, height: 40 }),
      createNode({ width: 40, height: 40 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.x).toBe(0);
    expect(root.children[1].layout.x).toBe(160); // 200 - 40
  });

  it('space-evenly: equal gaps on all sides', () => {
    const root = createNode({
      width: 200,
      height: 100,
      flexDirection: 'row',
      justifyContent: 'space-evenly',
    }, [
      createNode({ width: 40, height: 40 }),
      createNode({ width: 40, height: 40 }),
    ]);

    computeLayout(root);
    // free = 200 - 80 = 120; spacingGap = 120 / 3 = 40; start = 40
    expect(root.children[0].layout.x).toBe(40);
    expect(root.children[1].layout.x).toBe(120); // 40 + 40 + 40
  });
});

// ─── alignItems ───────────────────────────────────────────────────────────────

describe('alignItems', () => {
  it('stretch (default) fills cross axis', () => {
    const root = createNode({ width: 200, height: 100, flexDirection: 'row' }, [
      createNode({ width: 50 }), // no height → stretch
    ]);

    computeLayout(root);
    expect(root.children[0].layout.height).toBe(100);
  });

  it('center aligns child on cross axis', () => {
    const root = createNode({
      width: 200,
      height: 100,
      flexDirection: 'row',
      alignItems: 'center',
    }, [
      createNode({ width: 50, height: 40 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.y).toBe(30); // (100 - 40) / 2
  });

  it('flex-end aligns child to cross-axis end', () => {
    const root = createNode({
      width: 200,
      height: 100,
      flexDirection: 'row',
      alignItems: 'flex-end',
    }, [
      createNode({ width: 50, height: 40 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.y).toBe(60); // 100 - 40
  });
});

// ─── Percentage resolution ────────────────────────────────────────────────────

describe('percentage resolution', () => {
  it('"50%" child width resolves against parent', () => {
    const root = createNode({ width: 200, height: 100, flexDirection: 'row' }, [
      createNode({ width: '50%', height: 50 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.width).toBe(100); // 200 * 0.5
  });

  it('nested "50%" resolves against immediate parent, not screen', () => {
    const outer = createNode({ width: 160, height: 100, flexDirection: 'row' }, [
      createNode({ width: '50%', height: 50 }),
    ]);

    computeLayout(outer);
    expect(outer.children[0].layout.width).toBe(80); // 160 * 0.5
  });
});

// ─── position absolute ────────────────────────────────────────────────────────

describe('position absolute', () => {
  it('absolute child is excluded from flow', () => {
    const root = createNode({ width: 200, height: 100, flexDirection: 'row' }, [
      createNode({ width: 50, height: 50 }),
      createNode({ width: 50, height: 50, position: 'absolute' }),
      createNode({ width: 50, height: 50 }),
    ]);

    computeLayout(root);
    // Only the two relative children contribute to flow, so second relative child is at x=50
    expect(root.children[2].layout.x).toBe(50);
  });

  it('absolute child uses top/left for positioning', () => {
    const root = createNode({ width: 200, height: 100 }, [
      createNode({ width: 40, height: 40, position: 'absolute', top: 10, left: 20 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.x).toBe(20);
    expect(root.children[0].layout.y).toBe(10);
  });

  it('absolute child with left+right stretches width', () => {
    const root = createNode({ width: 200, height: 100 }, [
      createNode({ height: 40, position: 'absolute', left: 10, right: 10 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.width).toBe(180); // 200 - 10 - 10
    expect(root.children[0].layout.x).toBe(10);
  });
});

// ─── display none ─────────────────────────────────────────────────────────────

describe('display none', () => {
  it('display:none child is excluded from layout', () => {
    const root = createNode({ width: 200, height: 100, flexDirection: 'row' }, [
      createNode({ width: 50, height: 50, display: 'none' }),
      createNode({ width: 60, height: 50 }),
    ]);

    computeLayout(root);
    expect(root.children[1].layout.x).toBe(0); // not offset by hidden child
  });
});

// ─── Integer outputs ──────────────────────────────────────────────────────────

describe('integer outputs', () => {
  it('all layout values are integers', () => {
    const root = createNode({ flexDirection: 'row' }, [
      createNode({ flex: 1 }),
      createNode({ flex: 1 }),
      createNode({ flex: 1 }),
    ]);

    computeLayout(root);

    for (const child of root.children) {
      expect(Number.isInteger(child.layout.x)).toBe(true);
      expect(Number.isInteger(child.layout.y)).toBe(true);
      expect(Number.isInteger(child.layout.width)).toBe(true);
      expect(Number.isInteger(child.layout.height)).toBe(true);
    }
  });
});

// ─── Padding ──────────────────────────────────────────────────────────────────

describe('padding', () => {
  it('padding offsets child positions', () => {
    const root = createNode({
      width: 200,
      height: 100,
      flexDirection: 'row',
      padding: 10,
    }, [
      createNode({ width: 50, height: 50 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.x).toBe(10);
    expect(root.children[0].layout.y).toBe(10);
  });

  it('individual padding sides are respected', () => {
    const root = createNode({
      width: 200,
      height: 100,
      flexDirection: 'row',
      paddingLeft: 20,
      paddingTop: 5,
    }, [
      createNode({ width: 50, height: 50 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.x).toBe(20);
    expect(root.children[0].layout.y).toBe(5);
  });
});

// ─── zIndex ───────────────────────────────────────────────────────────────────

describe('zIndex', () => {
  it('inherits parent zIndex when not set', () => {
    const root = createNode({ zIndex: 5 }, [
      createNode({ width: 50, height: 50 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.zIndex).toBe(5);
  });

  it('own zIndex overrides parent', () => {
    const root = createNode({ zIndex: 5 }, [
      createNode({ width: 50, height: 50, zIndex: 10 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.zIndex).toBe(10);
  });
});
