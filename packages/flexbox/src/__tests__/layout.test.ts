import { describe, it, expect } from 'vitest';
import { createNode, computeLayout } from '../index.js';

describe('computeLayout', () => {
  describe('root node', () => {
    it('should set root to 100x100 at origin', () => {
      const root = createNode();

      computeLayout(root);

      expect(root.layout).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    });

    it('should handle empty container', () => {
      const root = createNode({ flexDirection: 'row' });

      computeLayout(root);

      expect(root.layout).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    });
  });

  describe('single child', () => {
    it('should stretch single child to fill container (row)', () => {
      const root = createNode({ flexDirection: 'row' });
      const child = createNode();

      root.addChild(child);

      computeLayout(root);

      expect(child.layout.x).toBe(0);
      expect(child.layout.y).toBe(0);
      expect(child.layout.height).toBe(100); // stretch on cross axis
    });

    it('should stretch single child to fill container (column)', () => {
      const root = createNode({ flexDirection: 'column' });
      const child = createNode();

      root.addChild(child);

      computeLayout(root);

      expect(child.layout.x).toBe(0);
      expect(child.layout.y).toBe(0);
      expect(child.layout.width).toBe(100); // stretch on cross axis
    });

    it('should respect explicit width/height', () => {
      const root = createNode({ flexDirection: 'row', alignItems: 'flex-start' });
      const child = createNode({ width: 50, height: 50 });

      root.addChild(child);

      computeLayout(root);

      expect(child.layout.width).toBe(50);
      expect(child.layout.height).toBe(50);
    });
  });

  describe('flexGrow', () => {
    it('should distribute space equally with equal flexGrow', () => {
      const root = createNode({ flexDirection: 'row' });

      root.addChild(createNode({ flexGrow: 1 }));
      root.addChild(createNode({ flexGrow: 1 }));

      computeLayout(root);

      expect(root.children[0].layout.width).toBe(50);
      expect(root.children[1].layout.width).toBe(50);
    });

    it('should distribute space proportionally with different flexGrow', () => {
      const root = createNode({ flexDirection: 'row' });

      root.addChild(createNode({ flexGrow: 1 }));
      root.addChild(createNode({ flexGrow: 2 }));

      computeLayout(root);

      expect(root.children[0].layout.width).toBeCloseTo(33.33, 1);
      expect(root.children[1].layout.width).toBeCloseTo(66.67, 1);
    });

    it('should distribute remaining space after flexBasis', () => {
      const root = createNode({ flexDirection: 'row' });

      root.addChild(createNode({ flexBasis: 20 }));
      root.addChild(createNode({ flexGrow: 1 }));

      computeLayout(root);

      expect(root.children[0].layout.width).toBe(20);
      expect(root.children[1].layout.width).toBe(80);
    });
  });

  describe('flexShrink', () => {
    it('should shrink items when they overflow', () => {
      const root = createNode({ flexDirection: 'row' });

      root.addChild(createNode({ flexBasis: 60, flexShrink: 1 }));
      root.addChild(createNode({ flexBasis: 60, flexShrink: 1 }));

      computeLayout(root);

      // Total is 120%, need to shrink by 20%
      expect(root.children[0].layout.width).toBe(50);
      expect(root.children[1].layout.width).toBe(50);
    });

    it('should shrink proportionally based on flexShrink * baseSize', () => {
      const root = createNode({ flexDirection: 'row' });

      root.addChild(createNode({ flexBasis: 80, flexShrink: 1 }));
      root.addChild(createNode({ flexBasis: 40, flexShrink: 1 }));

      computeLayout(root);

      // Total is 120%, need to shrink by 20%
      // Scaled shrink: 80*1=80, 40*1=40, total=120
      // First shrinks by 20 * (80/120) = 13.33
      // Second shrinks by 20 * (40/120) = 6.67
      expect(root.children[0].layout.width).toBeCloseTo(66.67, 1);
      expect(root.children[1].layout.width).toBeCloseTo(33.33, 1);
    });

    it('should not shrink items with flexShrink: 0', () => {
      const root = createNode({ flexDirection: 'row' });

      root.addChild(createNode({ flexBasis: 60, flexShrink: 0 }));
      root.addChild(createNode({ flexBasis: 60, flexShrink: 1 }));

      computeLayout(root);

      expect(root.children[0].layout.width).toBe(60);
      expect(root.children[1].layout.width).toBe(40);
    });
  });

  describe('flexBasis', () => {
    it('should use flexBasis as initial size', () => {
      const root = createNode({ flexDirection: 'row' });

      root.addChild(createNode({ flexBasis: 30 }));
      root.addChild(createNode({ flexBasis: 70 }));

      computeLayout(root);

      expect(root.children[0].layout.width).toBe(30);
      expect(root.children[1].layout.width).toBe(70);
    });

    it('should prioritize flexBasis over width', () => {
      const root = createNode({ flexDirection: 'row' });

      root.addChild(createNode({ width: 40, flexBasis: 30 }));

      computeLayout(root);

      expect(root.children[0].layout.width).toBe(30);
    });
  });
});
