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

// ─── Flex shrink ──────────────────────────────────────────────────────────────

describe('flex shrink', () => {
  it('items with default shrink:1 compress proportionally to fit', () => {
    // Three children of 100 each = 300 needed, container is 200 → 100 deficit.
    // Equal shrink × basis weights, so each shrinks by 100/3.
    const root = createNode({ width: 200, height: 50, flexDirection: 'row' }, [
      createNode({ width: 100, height: 50 }),
      createNode({ width: 100, height: 50 }),
      createNode({ width: 100, height: 50 }),
    ]);

    computeLayout(root);

    const widths = root.children.map(c => c.layout.width);

    // Sum should equal container width (allow ±1 for rounding).
    expect(widths.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(199);
    expect(widths.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(201);

    // Each child should shrink to ~67 (200/3 rounded).
    for (const w of widths) {
      expect(w).toBeGreaterThanOrEqual(66);
      expect(w).toBeLessThanOrEqual(67);
    }
  });

  it('flexShrink:0 prevents shrinking', () => {
    const root = createNode({ width: 200, height: 50, flexDirection: 'row' }, [
      createNode({ width: 100, height: 50, flexShrink: 0 }),
      createNode({ width: 100, height: 50, flexShrink: 0 }),
      createNode({ width: 100, height: 50, flexShrink: 0 }),
    ]);

    computeLayout(root);

    // No shrink applied → children retain 100 each, overflow.
    expect(root.children[0].layout.width).toBe(100);
    expect(root.children[1].layout.width).toBe(100);
    expect(root.children[2].layout.width).toBe(100);
  });

  it('shrink weight is proportional to flexShrink × basis', () => {
    // Container 100, two children of 100 each = 100 deficit.
    // a has shrink=1, basis=100 → weight 100. b has shrink=3, basis=100 → weight 300.
    // a shrinks by 100/4 = 25 → 75. b shrinks by 300/4 = 75 → 25.
    const root = createNode({ width: 100, height: 50, flexDirection: 'row' }, [
      createNode({ width: 100, height: 50, flexShrink: 1 }),
      createNode({ width: 100, height: 50, flexShrink: 3 }),
    ]);

    computeLayout(root);

    expect(root.children[0].layout.width).toBe(75);
    expect(root.children[1].layout.width).toBe(25);
  });

  it('column flex-shrink works on heights', () => {
    // Three 100-tall items in a 200-tall column → shrink to ~67 each.
    const root = createNode({ width: 50, height: 200, flexDirection: 'column' }, [
      createNode({ width: 50, height: 100 }),
      createNode({ width: 50, height: 100 }),
      createNode({ width: 50, height: 100 }),
    ]);

    computeLayout(root);

    const heights = root.children.map(c => c.layout.height);
    const total = heights.reduce((a, b) => a + b, 0);

    expect(total).toBeGreaterThanOrEqual(199);
    expect(total).toBeLessThanOrEqual(201);
  });
});

// ─── Percent spacing (gap, padding, margin) ───────────────────────────────────

describe('percent spacing', () => {
  it('"10%" gap on a 200-wide row resolves against own content width', () => {
    // 10% of 200 = 20 texel gap between siblings
    const root = createNode({ width: 200, height: 100, flexDirection: 'row', gap: '10%' }, [
      createNode({ width: 50, height: 50 }),
      createNode({ width: 50, height: 50 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.x).toBe(0);
    expect(root.children[1].layout.x).toBe(70); // 50 + 20
  });

  it('"5%" gap on a 200-tall column resolves against own content height', () => {
    // 5% of 200 = 10 texel gap between siblings
    const root = createNode({ width: 100, height: 200, flexDirection: 'column', gap: '5%' }, [
      createNode({ width: 100, height: 40 }),
      createNode({ width: 100, height: 40 }),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.y).toBe(0);
    expect(root.children[1].layout.y).toBe(50); // 40 + 10
  });

  it('"10%" padding on a 200-wide root resolves all sides against root width', () => {
    // CSS rule: padding % uses parent (here: ref/root) width for ALL sides.
    // Root reference width is CANONICAL_SCREEN.width = 320 → 32 texels.
    const root = createNode({ width: 200, height: 100, padding: '10%' }, [
      createNode({ width: 50, height: 50 }),
    ]);

    computeLayout(root);
    // padding % on root resolves against refWidth (320), so 10% = 32
    expect(root.children[0].layout.x).toBe(32);
    expect(root.children[0].layout.y).toBe(32);
  });

  it('"10%" padding on a nested 200-wide parent resolves against parent width', () => {
    const root = createNode({ width: 320, height: 200 }, [
      createNode({ width: 200, height: 100, padding: '10%' }, [
        createNode({ width: 50, height: 50 }),
      ]),
    ]);

    computeLayout(root);
    // Nested padding % resolves against the *grandparent* (root) width via the
    // call site that passes pW; 10% of 320 = 32. Verify by checking
    // child's offset inside the padded panel.
    const inner = root.children[0].children[0];

    // Inner panel's x starts at 0 within root, inner child x = 0 + 32 = 32
    expect(inner.layout.x).toBe(32);
  });

  it('"5%" margin on a child inside a 200-wide row parent resolves against parent width', () => {
    // 5% of 200 = 10 texels each side for the child's margins.
    const root = createNode({ width: 200, height: 100, flexDirection: 'row' }, [
      createNode({ width: 50, height: 50, margin: '5%' }),
      createNode({ width: 50, height: 50 }),
    ]);

    computeLayout(root);
    // First child: margin-left 10 → x = 10
    expect(root.children[0].layout.x).toBe(10);
    // Second child: starts after first child's right margin
    // cursor after first child = 10 + 50 + 10 = 70 (no main gap)
    expect(root.children[1].layout.x).toBe(70);
  });

  it('mixed numeric and percent spacing both resolve correctly', () => {
    const root = createNode({
      width: 200,
      height: 100,
      flexDirection: 'row',
      padding: 5,
      gap: '10%',
    }, [
      createNode({ width: 50, height: 50 }),
      createNode({ width: 50, height: 50 }),
    ]);

    computeLayout(root);
    // padding 5 (numeric) → first child x = 5
    expect(root.children[0].layout.x).toBe(5);
    // content width = 200 - 5 - 5 = 190; gap = 10% of 190 = 19
    // second child x = 5 + 50 + 19 = 74
    expect(root.children[1].layout.x).toBe(74);
  });

  it('flextest-8b reproduction: card with content-derived width contains row with percent padding', () => {
    // Mirrors the exact FlexTest 8b shape:
    //   root (column, padding=6, gap=6, width=320)
    //   └── card (column, padding=4, gap=2)  ← width derived from content
    //       ├── title text (intrinsic)
    //       ├── row panel (row, padding='10%')   ← percent padding here
    //       │   └── inner box (w=50, h=14)
    //       └── expect text (intrinsic)
    // Card width should grow to fill root content (308) via cross-stretch.
    // Then row panel padding should resolve = 10% × 308 = 30.8 each side.
    // Row panel height = 14 + 61.6 ≈ 76.
    const root = createNode({ width: 320, flexDirection: 'column', padding: 6, gap: 6 }, [
      createNode({ flexDirection: 'column', padding: 4, gap: 2 }, [
        createNode({ width: 236, height: 10 }), // title text
        createNode({ flexDirection: 'row', padding: '10%' }, [
          createNode({ width: 50, height: 14 }),
        ]),
        createNode({ width: 192, height: 10 }), // expect text
      ]),
    ]);

    computeLayout(root);

    const card = root.children[0];
    const rowPanel = card.children[1];
    const innerBox = rowPanel.children[0];

    // Card should fill root width minus root padding
    expect(card.layout.width).toBe(308);
    // Row panel should be ~76 tall
    expect(rowPanel.layout.height).toBeGreaterThanOrEqual(75);
    expect(rowPanel.layout.height).toBeLessThanOrEqual(77);
    // Inner box should be inset by ~31 from row panel top
    const inset = innerBox.layout.y - rowPanel.layout.y;

    expect(inset).toBeGreaterThanOrEqual(30);
    expect(inset).toBeLessThanOrEqual(32);
  });

  it('percent padding contributes to content-derived parent height', () => {
    // Regression: when a parent has percent padding and no explicit height,
    // its derived height must include the padding contribution. Pass 2's
    // first reverse iteration sees parent.layout.width=0 so percent padding
    // collapses to 0; the second iteration must fix it once parent widths
    // are known.
    const root = createNode({ width: 300, flexDirection: 'column' }, [
      createNode({ flexDirection: 'row', padding: '10%' }, [
        createNode({ width: 50, height: 14 }),
      ]),
    ]);

    computeLayout(root);

    const inner = root.children[0];

    // padding 10% of root width 300 = 30 each side (top+bottom = 60)
    // inner height should be max child height (14) + 60 = 74
    expect(inner.layout.height).toBeGreaterThanOrEqual(73);
    expect(inner.layout.height).toBeLessThanOrEqual(75);
    // The single child should be inset 30 from top
    expect(root.children[0].children[0].layout.y).toBeGreaterThanOrEqual(29);
    expect(root.children[0].children[0].layout.y).toBeLessThanOrEqual(31);
  });

  it('percent gap, padding, and margin all together produce no NaN', () => {
    // Mirror the FlexTest fixture shape: column root, 5% gap, three flex:1 row children.
    const root = createNode(
      { width: 320, flexDirection: 'column', gap: '5%' },
      [
        createNode({ flexDirection: 'row', gap: '5%', flexGrow: 1 }, [
          createNode({ flexGrow: 1 }, [createNode({ width: 26, height: 10 })]),
          createNode({ flexGrow: 1 }, [createNode({ width: 26, height: 10 })]),
          createNode({ flexGrow: 1 }, [createNode({ width: 26, height: 10 })]),
        ]),
      ],
    );

    computeLayout(root);

    function assertNoNaN(node: ReturnType<typeof createNode>): void {
      expect(Number.isFinite(node.layout.x)).toBe(true);
      expect(Number.isFinite(node.layout.y)).toBe(true);
      expect(Number.isFinite(node.layout.width)).toBe(true);
      expect(Number.isFinite(node.layout.height)).toBe(true);

      for (const child of node.children) {
        assertNoNaN(child);
      }
    }

    assertNoNaN(root);
  });
});

// ─── Wrap layout ─────────────────────────────────────────────────────────────

describe('wrap layout', () => {
  it('all children fit on one line: height equals single line cross-size', () => {
    // Two 40×40 cards in a 200-wide wrap row → both fit (40+8+40=88 < 200)
    // Expected row height: 40 (single line)
    const root = createNode({ width: 200, flexDirection: 'column' }, [
      createNode({ flexDirection: 'row', wrap: 'wrap', gap: 8 }, [
        createNode({ width: 40, height: 40 }),
        createNode({ width: 40, height: 40 }),
      ]),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.height).toBe(40);
  });

  it('overflow children wrap to second line: height = sum of line heights + cross-gap', () => {
    // 3 children 80px wide each, gap=8, in a 200-wide row.
    // Line 1: 80+8+80=168 fits (≤200). Adding 3rd: 168+8+80=256 > 200 → wrap.
    // Line 2: just child 3 (80×30).
    // Row height = max(40,40) + 8 + 30 = 78  (columnGap defaults to 0, but gap applies both axes here)
    // Using gap=8 for both axes: 40 + 8 + 30 = 78
    const root = createNode({ width: 200, flexDirection: 'column' }, [
      createNode({ flexDirection: 'row', wrap: 'wrap', gap: 8 }, [
        createNode({ width: 80, height: 40 }),
        createNode({ width: 80, height: 40 }),
        createNode({ width: 80, height: 30 }),
      ]),
    ]);

    computeLayout(root);
    // Line 1: children 0+1 (40 tall), line 2: child 2 (30 tall), cross-gap=8
    expect(root.children[0].layout.height).toBe(40 + 8 + 30);
  });

  it('wrap row stretches to parent width via cross-stretch: correct wrapMainAvail', () => {
    // No explicit width on the wrap row → it stretches to parent content width (200).
    // Children: one 180px card that forces 2nd card to wrap.
    const root = createNode({ width: 200, flexDirection: 'column' }, [
      createNode({ flexDirection: 'row', wrap: 'wrap', gap: 8 }, [
        createNode({ width: 180, height: 40 }),
        createNode({ width: 80, height: 40 }),
      ]),
    ]);

    computeLayout(root);
    const row = root.children[0];

    expect(row.layout.width).toBe(200);
    // 180 on line 1, 80 wraps to line 2 → height = 40 + 8 + 40 = 88
    expect(row.layout.height).toBe(88);
  });

  it('wrap row height feeds correctly into parent column height', () => {
    // Reproduces the OreStyled cards-row bug:
    //   column (width=304, padding=8, gap=12)
    //   ├── label text  (height=10)
    //   └── cards row   (wrap, gap=8)
    //       ├── card1   width=304, height=64   → line 1 alone (fills row)
    //       ├── card2   width=101, height=64   → line 2
    //       ├── card3   width=64,  height=64   → line 2
    //       └── card4   width=16,  height=64   → line 2
    //
    // Expected card-section height: 10 + 4(gap) + 136(cards) = 150
    // The bug was that deriveSize summed all 4 widths → wrapMainAvail=509 →
    // all cards "fit" on one line → height=64 → section height=78 → next
    // sibling was placed overlapping the second wrap line.
    const column = createNode({ width: 304, flexDirection: 'column', gap: 4 }, [
      createNode({ width: 163, height: 10 }), // label
      createNode({ flexDirection: 'row', wrap: 'wrap', gap: 8 }, [
        createNode({ width: 304, height: 64 }), // card1 – 1 line alone
        createNode({ width: 101, height: 64 }), // card2
        createNode({ width: 64, height: 64 }), // card3
        createNode({ width: 16, height: 64 }), // card4
      ]),
    ]);

    computeLayout(column);

    const cardsRow = column.children[1];

    // Cards row: card1 on line1 (64), cards2-4 on line2 (64), cross-gap=8
    expect(cardsRow.layout.height).toBe(64 + 8 + 64);

    // Cards row starts at y = paddingTop(0) + label(10) + gap(4) = 14
    expect(cardsRow.layout.y).toBe(14);
  });

  it('explicit width on wrap row is never overridden by min-content', () => {
    // If the user sets an explicit width, min-content from deriveSize is irrelevant
    // because Pass 2 uses the explicit value (s.width === 'number' → not deriveSize).
    const root = createNode({ width: 300, flexDirection: 'column' }, [
      createNode({ width: 150, flexDirection: 'row', wrap: 'wrap', gap: 8 }, [
        createNode({ width: 80, height: 40 }),
        createNode({ width: 80, height: 40 }),
      ]),
    ]);

    computeLayout(root);
    expect(root.children[0].layout.width).toBe(150);
    // 80+8+80=168 > 150 → card2 wraps → height = 40 + 8 + 40 = 88
    expect(root.children[0].layout.height).toBe(88);
  });

  it('second-line children are positioned below first line', () => {
    // Verify x/y positions of wrapped children are correct.
    const root = createNode({ width: 200, flexDirection: 'column' }, [
      createNode({ flexDirection: 'row', wrap: 'wrap', gap: 8 }, [
        createNode({ width: 80, height: 40 }),
        createNode({ width: 80, height: 40 }),
        createNode({ width: 80, height: 40 }),
      ]),
    ]);

    computeLayout(root);
    const row = root.children[0];
    const [c0, c1, c2] = row.children;

    // Line 1: c0 at x=0, c1 at x=88
    expect(c0.layout.x).toBe(0);
    expect(c0.layout.y).toBe(0);
    expect(c1.layout.x).toBe(88); // 80 + 8
    expect(c1.layout.y).toBe(0);

    // Line 2: c2 at x=0, y=48 (40 + 8 cross-gap)
    expect(c2.layout.x).toBe(0);
    expect(c2.layout.y).toBe(48);
  });
  it('implicit-height children in wrap row: no Pass-2 height bloat', () => {
    // Children have NO explicit height — heights come from their content.
    // Without the wrap-skip guard in Pass 2 cross-stretch, each iteration
    // inflates all card heights to the container's total cross-size, then
    // the container grows from that, and the next iteration inflates again
    // → exponential bloat (e.g., 98 → 204 → 416 → …).
    //
    // With the fix, Pass 2 cross-stretch skips wrap containers entirely.
    // Pass 3 handles per-line stretch correctly (each child stretches to
    // its *line's* tallest sibling, not the whole container's height).
    //
    //  wrap row (width=200, no explicit height)
    //  ├── card1 (width=180): content child h=60 → natural height 60, alone on line 1
    //  └── card2 (width=80):  content child h=40 → natural height 40, wraps to line 2
    //
    //  Expected row height: 60 + 8 (cross-gap) + 40 = 108 (stable, no bloat)
    const root = createNode({ width: 200, flexDirection: 'column' }, [
      createNode({ flexDirection: 'row', wrap: 'wrap', gap: 8 }, [
        createNode({ width: 180 }, [createNode({ width: 160, height: 60 })]),
        createNode({ width: 80 }, [createNode({ width: 60, height: 40 })]),
      ]),
    ]);

    computeLayout(root);

    const row = root.children[0];
    const [card1, card2] = row.children;

    // Per-line cross-stretch (Pass 3):
    //   line1: only card1 → lineCrossSize=60 → card1 stretches to 60 (unchanged)
    //   line2: only card2 → lineCrossSize=40 → card2 stretches to 40 (unchanged)
    expect(card1.layout.height).toBe(60);
    expect(card2.layout.height).toBe(40);

    // Row height = 60 + 8 + 40 = 108 (no exponential bloat)
    expect(row.layout.height).toBe(108);
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
