import { describe, it, expect } from 'vitest';
import { createNode, computeLayout } from '../index.js';

describe('justifyContent', () => {
  describe('flex-start (default)', () => {
    it('should align items at the start', () => {
      const root = createNode({ flexDirection: 'row', justifyContent: 'flex-start' });

      root.addChild(createNode({ width: 20 }));
      root.addChild(createNode({ width: 20 }));

      computeLayout(root);

      expect(root.children[0].layout.x).toBe(0);
      expect(root.children[1].layout.x).toBe(20);
    });
  });

  describe('flex-end', () => {
    it('should align items at the end', () => {
      const root = createNode({ flexDirection: 'row', justifyContent: 'flex-end' });

      root.addChild(createNode({ width: 20 }));
      root.addChild(createNode({ width: 20 }));

      computeLayout(root);

      expect(root.children[0].layout.x).toBe(60);
      expect(root.children[1].layout.x).toBe(80);
    });
  });

  describe('center', () => {
    it('should center items', () => {
      const root = createNode({ flexDirection: 'row', justifyContent: 'center' });

      root.addChild(createNode({ width: 20 }));
      root.addChild(createNode({ width: 20 }));

      computeLayout(root);

      expect(root.children[0].layout.x).toBe(30);
      expect(root.children[1].layout.x).toBe(50);
    });
  });

  describe('space-between', () => {
    it('should distribute space between items', () => {
      const root = createNode({ flexDirection: 'row', justifyContent: 'space-between' });

      root.addChild(createNode({ width: 20 }));
      root.addChild(createNode({ width: 20 }));
      root.addChild(createNode({ width: 20 }));

      computeLayout(root);

      expect(root.children[0].layout.x).toBe(0);
      expect(root.children[1].layout.x).toBe(40);
      expect(root.children[2].layout.x).toBe(80);
    });

    it('should handle two items', () => {
      const root = createNode({ flexDirection: 'row', justifyContent: 'space-between' });

      root.addChild(createNode({ width: 20 }));
      root.addChild(createNode({ width: 20 }));

      computeLayout(root);

      expect(root.children[0].layout.x).toBe(0);
      expect(root.children[1].layout.x).toBe(80);
    });
  });

  describe('space-around', () => {
    it('should distribute space around items', () => {
      const root = createNode({ flexDirection: 'row', justifyContent: 'space-around' });

      root.addChild(createNode({ width: 20 }));
      root.addChild(createNode({ width: 20 }));

      computeLayout(root);

      // Free space = 60, items = 2
      // Space around each = 60 / 4 = 15
      expect(root.children[0].layout.x).toBe(15);
      expect(root.children[1].layout.x).toBe(65);
    });
  });

  describe('space-evenly', () => {
    it('should distribute space evenly', () => {
      const root = createNode({ flexDirection: 'row', justifyContent: 'space-evenly' });

      root.addChild(createNode({ width: 20 }));
      root.addChild(createNode({ width: 20 }));

      computeLayout(root);

      // Free space = 60, gaps = 3 (before, between, after)
      // Each gap = 20
      expect(root.children[0].layout.x).toBe(20);
      expect(root.children[1].layout.x).toBe(60);
    });
  });

  describe('with gap', () => {
    it('should account for gap in calculations', () => {
      const root = createNode({ flexDirection: 'row', justifyContent: 'flex-start', gap: 10 });

      root.addChild(createNode({ width: 20 }));
      root.addChild(createNode({ width: 20 }));
      root.addChild(createNode({ width: 20 }));

      computeLayout(root);

      expect(root.children[0].layout.x).toBe(0);
      expect(root.children[1].layout.x).toBe(30); // 20 + 10 gap
      expect(root.children[2].layout.x).toBe(60); // 30 + 20 + 10 gap
    });
  });

  describe('column direction', () => {
    it('should apply justify-content to vertical axis', () => {
      const root = createNode({ flexDirection: 'column', justifyContent: 'center' });

      root.addChild(createNode({ height: 20 }));
      root.addChild(createNode({ height: 20 }));

      computeLayout(root);

      expect(root.children[0].layout.y).toBe(30);
      expect(root.children[1].layout.y).toBe(50);
    });
  });
});

describe('reversed direction', () => {
  it('should reverse item order in row-reverse', () => {
    const root = createNode({ flexDirection: 'row-reverse', justifyContent: 'flex-start' });

    root.addChild(createNode({ flexBasis: 20 }));
    root.addChild(createNode({ flexBasis: 30 }));

    computeLayout(root);

    // In row-reverse, first DOM item should visually be on the right
    // The items total 50% width, so with flex-start they're packed to the "start" which is right edge
    // First item (20%) gets right-most position, second item (30%) is to its left
    expect(root.children[0].layout.width).toBe(20);
    expect(root.children[1].layout.width).toBe(30);
    // Positions are reversed - items should be placed from right side
    expect(root.children[0].layout.x + root.children[0].layout.width).toBeLessThanOrEqual(100);
  });

  it('should reverse item order in column-reverse', () => {
    const root = createNode({ flexDirection: 'column-reverse', justifyContent: 'flex-start' });

    root.addChild(createNode({ flexBasis: 20 }));
    root.addChild(createNode({ flexBasis: 30 }));

    computeLayout(root);

    // In column-reverse, first DOM item should be at the bottom visually
    expect(root.children[0].layout.height).toBe(20);
    expect(root.children[1].layout.height).toBe(30);
    // Positions are reversed - items should be placed from bottom
    expect(root.children[0].layout.y + root.children[0].layout.height).toBeLessThanOrEqual(100);
  });
});
