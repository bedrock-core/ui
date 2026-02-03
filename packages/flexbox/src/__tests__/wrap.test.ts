import { describe, it, expect } from 'vitest';
import { createNode, computeLayout } from '../index.js';

describe('flexWrap', () => {
  describe('nowrap (default)', () => {
    it('should not wrap items', () => {
      const root = createNode({ flexDirection: 'row', flexWrap: 'nowrap' });

      root.addChild(createNode({ width: 60 }));
      root.addChild(createNode({ width: 60 }));

      computeLayout(root);

      // Items should be on same line, shrunk to fit
      expect(root.children[0].layout.y).toBe(0);
      expect(root.children[1].layout.y).toBe(0);
    });
  });

  describe('wrap', () => {
    it('should wrap items to next line when overflow', () => {
      const root = createNode({ flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' });

      root.addChild(createNode({ width: 60, height: 40 }));
      root.addChild(createNode({ width: 60, height: 40 }));

      computeLayout(root);

      // Second item should wrap to next line
      expect(root.children[0].layout.y).toBe(0);
      expect(root.children[1].layout.y).toBe(40);
    });

    it('should handle multiple lines', () => {
      const root = createNode({ flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' });

      for (let i = 0; i < 6; i++) {
        root.addChild(createNode({ width: 40, height: 30 }));
      }

      computeLayout(root);

      // 2 items per line (40 + 40 = 80, fits in 100)
      // Line 1: items 0, 1 at y=0
      // Line 2: items 2, 3 at y=30
      // Line 3: items 4, 5 at y=60
      expect(root.children[0].layout.y).toBe(0);
      expect(root.children[1].layout.y).toBe(0);
      expect(root.children[2].layout.y).toBe(30);
      expect(root.children[3].layout.y).toBe(30);
      expect(root.children[4].layout.y).toBe(60);
      expect(root.children[5].layout.y).toBe(60);
    });

    it('should work with column direction', () => {
      const root = createNode({ flexDirection: 'column', flexWrap: 'wrap', alignContent: 'flex-start' });

      root.addChild(createNode({ width: 40, height: 60 }));
      root.addChild(createNode({ width: 40, height: 60 }));

      computeLayout(root);

      // Second item should wrap to next column
      expect(root.children[0].layout.x).toBe(0);
      expect(root.children[1].layout.x).toBe(40);
    });
  });

  describe('wrap-reverse', () => {
    it('should wrap in reverse cross-axis direction', () => {
      const root = createNode({ flexDirection: 'row', flexWrap: 'wrap-reverse' });

      root.addChild(createNode({ width: 60, height: 40 }));
      root.addChild(createNode({ width: 60, height: 40 }));

      computeLayout(root);

      // Lines should be reversed - second line appears first
      expect(root.children[1].layout.y).toBeLessThan(root.children[0].layout.y);
    });
  });
});

describe('alignContent', () => {
  describe('stretch (default)', () => {
    it('should stretch lines to fill container', () => {
      const root = createNode({ flexDirection: 'row', flexWrap: 'wrap', alignContent: 'stretch' });

      root.addChild(createNode({ width: 60, height: 30 }));
      root.addChild(createNode({ width: 60, height: 30 }));

      computeLayout(root);

      // Two lines, each should get 50% height
      expect(root.children[0].layout.height).toBe(50);
      expect(root.children[1].layout.height).toBe(50);
    });
  });

  describe('flex-start', () => {
    it('should align lines at start', () => {
      const root = createNode({ flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' });

      root.addChild(createNode({ width: 60, height: 30 }));
      root.addChild(createNode({ width: 60, height: 30 }));

      computeLayout(root);

      expect(root.children[0].layout.y).toBe(0);
      expect(root.children[1].layout.y).toBe(30);
    });
  });

  describe('flex-end', () => {
    it('should align lines at end', () => {
      const root = createNode({ flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-end' });

      root.addChild(createNode({ width: 60, height: 30 }));
      root.addChild(createNode({ width: 60, height: 30 }));

      computeLayout(root);

      expect(root.children[0].layout.y).toBe(40);
      expect(root.children[1].layout.y).toBe(70);
    });
  });

  describe('center', () => {
    it('should center lines', () => {
      const root = createNode({ flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center' });

      root.addChild(createNode({ width: 60, height: 30 }));
      root.addChild(createNode({ width: 60, height: 30 }));

      computeLayout(root);

      expect(root.children[0].layout.y).toBe(20);
      expect(root.children[1].layout.y).toBe(50);
    });
  });

  describe('space-between', () => {
    it('should distribute space between lines', () => {
      const root = createNode({ flexDirection: 'row', flexWrap: 'wrap', alignContent: 'space-between' });

      root.addChild(createNode({ width: 60, height: 30 }));
      root.addChild(createNode({ width: 60, height: 30 }));

      computeLayout(root);

      expect(root.children[0].layout.y).toBe(0);
      expect(root.children[1].layout.y).toBe(70);
    });
  });

  describe('space-around', () => {
    it('should distribute space around lines', () => {
      const root = createNode({ flexDirection: 'row', flexWrap: 'wrap', alignContent: 'space-around' });

      root.addChild(createNode({ width: 60, height: 30 }));
      root.addChild(createNode({ width: 60, height: 30 }));

      computeLayout(root);

      // Free space = 40, lines = 2
      // Space around each = 40 / 4 = 10
      expect(root.children[0].layout.y).toBe(10);
      expect(root.children[1].layout.y).toBe(60);
    });
  });
});
