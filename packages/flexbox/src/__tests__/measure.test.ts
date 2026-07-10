import { describe, expect, it } from 'vitest';
import { computeLayout } from '../layout';
import { createNode } from '../node';
import type { MeasureFunc } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Synthetic wrapping text: `count` glyphs of `charW` px laid out on lines of
 * `lineH` px. Mirrors real text: unconstrained → one max-content line;
 * constrained → glyphs flow onto ⌈count / perLine⌉ lines.
 */
function textMeasure(count: number, charW = 10, lineH = 10): MeasureFunc {
  return (availableWidth) => {
    if (!Number.isFinite(availableWidth) || availableWidth >= count * charW) {
      return { width: count * charW, height: lineH };
    }

    const perLine = Math.max(1, Math.floor(availableWidth / charW));
    const lines = Math.ceil(count / perLine);

    return { width: Math.min(perLine, count) * charW, height: lines * lineH };
  };
}

// ─── Measured leaves ──────────────────────────────────────────────────────────

describe('measured leaves', () => {
  it('uses max-content size when unconstrained', () => {
    const text = createNode({}, [], textMeasure(10)); // max-content 100×10
    const root = createNode(
      { flexDirection: 'row', width: 300, height: 50, alignItems: 'flex-start' },
      [text],
    );

    computeLayout(root);

    expect(text.layout.width).toBe(100);
    expect(text.layout.height).toBe(10);
  });

  it('wraps at the column width via cross-stretch', () => {
    const text = createNode({}, [], textMeasure(30)); // max-content 300
    const root = createNode({ flexDirection: 'column', width: 100, height: 210 }, [text]);

    computeLayout(root);

    expect(text.layout.width).toBe(100);
    expect(text.layout.height).toBe(30); // 30 glyphs / 10 per line → 3 lines
  });

  it('pushes following siblings down by the wrapped height', () => {
    const text = createNode({}, [], textMeasure(30));
    const after = createNode({ height: 20 });
    const root = createNode({ flexDirection: 'column', width: 100 }, [text, after]);

    computeLayout(root);

    expect(text.layout.height).toBe(30);
    expect(after.layout.y).toBe(30);
  });

  it('wraps inside a flexGrow panel next to a fixed-width sibling (row)', () => {
    // The List-screen shape: [fixed list | flexGrow details] — the text's wrap
    // width is only knowable after flex distributes the row.
    const text = createNode({}, [], textMeasure(50)); // max-content 500
    const left = createNode({ width: 100 });
    const right = createNode({ flexGrow: 1, flexDirection: 'column' }, [text]);
    const root = createNode({ flexDirection: 'row', width: 300, height: 210 }, [left, right]);

    computeLayout(root);

    expect(right.layout.width).toBe(200);
    expect(text.layout.width).toBe(200);
    expect(text.layout.height).toBe(30); // 20 per line → 3 lines
  });

  it('wraps inside a percent-width panel', () => {
    const text = createNode({}, [], textMeasure(50));
    const panel = createNode({ width: '50%', flexDirection: 'column' }, [text]);
    const root = createNode({ flexDirection: 'row', width: 300, height: 210 }, [panel]);

    computeLayout(root);

    expect(panel.layout.width).toBe(150);
    expect(text.layout.width).toBe(150);
    expect(text.layout.height).toBe(40); // 15 per line → 4 lines
  });

  it('shrinks and re-wraps when sharing a row with a rigid sibling', () => {
    const icon = createNode({ width: 20, flexShrink: 0 });
    const text = createNode({}, [], textMeasure(50)); // max-content 500
    const root = createNode(
      { flexDirection: 'row', width: 220, height: 210, alignItems: 'flex-start' },
      [icon, text],
    );

    computeLayout(root);

    // Fit-content caps the text at the row's content width (220), then shrink
    // resolves the 20px overflow against the rigid icon → 200 granted.
    expect(text.layout.width).toBe(200);
    expect(text.layout.height).toBe(30); // 20 per line → 3 lines
    expect(icon.layout.width).toBe(20);
  });

  it('fit-content caps a non-stretched leaf (alignItems center)', () => {
    const text = createNode({}, [], textMeasure(30)); // max-content 300
    const root = createNode(
      { flexDirection: 'column', width: 100, height: 210, alignItems: 'center' },
      [text],
    );

    computeLayout(root);

    expect(text.layout.width).toBe(100);
    expect(text.layout.height).toBe(30);
    expect(text.layout.x).toBe(0); // (100 − 100) / 2 — capped box still centers
  });

  it('respects padding on the wrapping container', () => {
    const text = createNode({}, [], textMeasure(30)); // max-content 300
    const root = createNode({ flexDirection: 'column', width: 100, height: 210, padding: 10 }, [text]);

    computeLayout(root);

    expect(text.layout.width).toBe(80); // 100 − 2×10
    expect(text.layout.height).toBe(40); // 8 per line → 4 lines
    expect(text.layout.x).toBe(10);
  });

  it('explicit width wins over measurement and drives the wrapped height', () => {
    const text = createNode({ width: 50 }, [], textMeasure(30));
    const root = createNode(
      { flexDirection: 'column', width: 100, height: 210, alignItems: 'flex-start' },
      [text],
    );

    computeLayout(root);

    expect(text.layout.width).toBe(50);
    expect(text.layout.height).toBe(60); // 5 per line → 6 lines
  });

  it('explicit height wins over the measured height', () => {
    const text = createNode({ height: 12 }, [], textMeasure(30));
    const root = createNode({ flexDirection: 'column', width: 100, height: 210 }, [text]);

    computeLayout(root);

    expect(text.layout.height).toBe(12);
  });

  it('a content-sized parent hugs the wrapped height', () => {
    const text = createNode({}, [], textMeasure(30));
    const card = createNode({ flexDirection: 'column' }, [text]);
    const root = createNode({ flexDirection: 'column', width: 100, height: 210 }, [card]);

    computeLayout(root);

    expect(card.layout.height).toBe(30);
  });

  it('caps re-measure rounds for a measure that never converges', () => {
    const calls: number[] = [];

    const pathological: MeasureFunc = (w) => {
      calls.push(w);

      // Height changes on every call → never settles.
      return { width: Number.isFinite(w) ? Math.min(w, 300) : 300, height: 10 * calls.length };
    };

    const root = createNode({ flexDirection: 'column', width: 100 }, [createNode({}, [], pathological)]);

    expect(() => {
      computeLayout(root);
    }).not.toThrow();
    expect(calls.length).toBeLessThanOrEqual(3); // 1 seed + MAX_MEASURE_ROUNDS re-measures
  });

  it('trees without measured leaves behave exactly as before', () => {
    const a = createNode({ height: 40 });
    const b = createNode({ height: 60 });
    const root = createNode({ width: 320, flexDirection: 'column' }, [a, b]);

    computeLayout(root);

    expect(a.layout.y).toBe(0);
    expect(b.layout.y).toBe(40);
  });
});
