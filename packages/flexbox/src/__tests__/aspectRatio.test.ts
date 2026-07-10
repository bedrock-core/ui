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
});
