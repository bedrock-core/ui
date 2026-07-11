import { describe, expect, it } from 'vitest';
import { computeLayout } from '../layout';
import { createNode } from '../node';

describe('aspectRatio', () => {
  it('derives height from an explicit width', () => {
    const box = createNode({ width: 160, aspectRatio: 16 / 9 });
    const root = createNode({ flexDirection: 'column', width: 320, height: 210 }, [box]);

    computeLayout(root);

    expect(box.layout.width).toBe(160);
    expect(box.layout.height).toBe(90);
  });

  it('derives width from an explicit height', () => {
    const box = createNode({ height: 50, aspectRatio: 2 });
    const root = createNode(
      { flexDirection: 'column', width: 320, height: 210, alignItems: 'flex-start' },
      [box],
    );

    computeLayout(root);

    expect(box.layout.width).toBe(100);
    expect(box.layout.height).toBe(50);
  });

  it('is ignored when both axes are explicit (CSS behavior)', () => {
    const box = createNode({ width: 100, height: 100, aspectRatio: 16 / 9 });
    const root = createNode({ flexDirection: 'column', width: 320, height: 210 }, [box]);

    computeLayout(root);

    expect(box.layout.width).toBe(100);
    expect(box.layout.height).toBe(100);
  });

  it('derives height from a percent width', () => {
    const box = createNode({ width: '50%', aspectRatio: 2 });
    const root = createNode({ flexDirection: 'column', width: 320, height: 210 }, [box]);

    computeLayout(root);

    expect(box.layout.width).toBe(160);
    expect(box.layout.height).toBe(80);
  });

  it('derives height from the column-stretched width (both axes auto)', () => {
    const box = createNode({ aspectRatio: 4 });
    const root = createNode({ flexDirection: 'column', width: 200, height: 210 }, [box]);

    computeLayout(root);

    expect(box.layout.width).toBe(200);
    expect(box.layout.height).toBe(50);
  });

  it('derives height from a flex-grown row width', () => {
    const left = createNode({ width: 100 });
    const box = createNode({ flexGrow: 1, aspectRatio: 2, alignSelf: 'flex-start' });
    const root = createNode({ flexDirection: 'row', width: 300, height: 210 }, [left, box]);

    computeLayout(root);

    expect(box.layout.width).toBe(200);
    expect(box.layout.height).toBe(100);
  });

  it('pushes following siblings down by the derived height', () => {
    const box = createNode({ aspectRatio: 4 }); // stretched to 200 → height 50
    const after = createNode({ height: 20 });
    const root = createNode({ flexDirection: 'column', width: 200 }, [box, after]);

    computeLayout(root);

    expect(after.layout.y).toBe(50);
  });

  it('absolute left+right insets drive the height (the thumbnail case)', () => {
    const banner = createNode({ position: 'absolute', left: 0, right: 1, top: 0, aspectRatio: 16 / 6 });
    const root = createNode({ flexDirection: 'column', width: 213, height: 210 }, [banner]);

    computeLayout(root);

    expect(banner.layout.width).toBe(212); // 213 − 0 − 1
    expect(banner.layout.height).toBe(80); // 212 / (16/6) = 79.5 → rounded
  });

  it('absolute left+right height positions a bottom anchor correctly', () => {
    const banner = createNode({ position: 'absolute', left: 0, right: 0, bottom: 10, aspectRatio: 2 });
    const root = createNode({ flexDirection: 'column', width: 100, height: 210 }, [banner]);

    computeLayout(root);

    expect(banner.layout.height).toBe(50);
    expect(banner.layout.y).toBe(150); // 210 − 10 − 50
  });

  it('absolute top+bottom insets drive the width', () => {
    const box = createNode({ position: 'absolute', top: 10, bottom: 10, right: 0, aspectRatio: 0.5 });
    const root = createNode({ flexDirection: 'column', width: 320, height: 210 }, [box]);

    computeLayout(root);

    expect(box.layout.height).toBe(190); // 210 − 10 − 10
    expect(box.layout.width).toBe(95); // 190 × 0.5
    expect(box.layout.x).toBe(225); // right-anchored with the derived width
  });

  it('min/max clamps still apply after the transfer', () => {
    const box = createNode({ width: 160, aspectRatio: 16 / 9, maxHeight: 60 });
    const root = createNode({ flexDirection: 'column', width: 320, height: 210 }, [box]);

    computeLayout(root);

    expect(box.layout.height).toBe(60);
  });

  // Percent sizes are parked at 0 during Pass 2 (resolved in Pass 3). The ratio
  // transfer must NOT treat that placeholder 0 as definite: doing so zeroed the
  // other axis's content-derived size, and auto-sized ANCESTORS (whose Pass-2
  // deriveSize reads it) finalized too small — even though the box itself was
  // fixed later in Pass 3.
  it('does not clobber the content-derived height of an unresolved percent width (auto-height ancestor)', () => {
    const inner = createNode({ width: 30, height: 30 });
    const box = createNode({ width: '50%', aspectRatio: 2, alignItems: 'flex-start' }, [inner]);
    const after = createNode({ height: 20 });
    const wrapper = createNode({ flexDirection: 'column', width: 200, alignItems: 'flex-start' }, [box, after]);
    const root = createNode({ flexDirection: 'column', width: 200, height: 210 }, [wrapper]);

    computeLayout(root);

    // The box itself resolves in Pass 3: 50% of 200 → 100, ratio → 50.
    expect(box.layout.width).toBe(100);
    expect(box.layout.height).toBe(50);
    expect(after.layout.y).toBe(50);
    // The auto-height wrapper must count the box's Pass-2 content height (30),
    // not a ratio-zeroed 0: 30 + 20 = 50 (was 20 before the fix).
    expect(wrapper.layout.height).toBe(50);
  });

  it('does not clobber the content-derived width of an unresolved percent height (auto-width ancestor)', () => {
    const inner = createNode({ width: 40, height: 10 });
    const box = createNode({ height: '50%', aspectRatio: 2 }, [inner]);
    const sibling = createNode({ width: 20 });
    const wrapper = createNode({ flexDirection: 'row', height: 100, alignItems: 'flex-start' }, [box, sibling]);
    const root = createNode(
      { flexDirection: 'column', width: 320, height: 210, alignItems: 'flex-start' },
      [wrapper],
    );

    computeLayout(root);

    // The box itself resolves in Pass 3: 50% of 100 → 50, ratio → width 100.
    expect(box.layout.height).toBe(50);
    expect(box.layout.width).toBe(100);
    // The auto-width wrapper must count the box's Pass-2 content width (40),
    // not a ratio-zeroed 0: 40 + 20 = 60 (was 20 before the fix).
    expect(wrapper.layout.width).toBe(60);
  });
});
