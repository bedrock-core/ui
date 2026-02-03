import { describe, it, expect } from 'vitest';
import { createNode, computeLayout } from '../index.js';

describe('alignItems', () => {
  describe('stretch (default)', () => {
    it('should stretch items to fill cross axis', () => {
      const root = createNode({ flexDirection: 'row', alignItems: 'stretch' });

      root.addChild(createNode({ width: 50 }));

      computeLayout(root);

      expect(root.children[0].layout.height).toBe(100);
    });
  });

  describe('flex-start', () => {
    it('should align items at cross axis start', () => {
      const root = createNode({ flexDirection: 'row', alignItems: 'flex-start' });

      root.addChild(createNode({ width: 50, height: 30 }));

      computeLayout(root);

      expect(root.children[0].layout.x).toBe(0);
      expect(root.children[0].layout.y).toBe(0);
      expect(root.children[0].layout.width).toBe(50);
      expect(root.children[0].layout.height).toBe(30);
    });
  });

  describe('flex-end', () => {
    it('should align items at cross axis end', () => {
      const root = createNode({ flexDirection: 'row', alignItems: 'flex-end' });

      root.addChild(createNode({ width: 50, height: 30 }));

      computeLayout(root);

      expect(root.children[0].layout.y).toBe(70);
      expect(root.children[0].layout.height).toBe(30);
    });
  });

  describe('center', () => {
    it('should center items on cross axis', () => {
      const root = createNode({ flexDirection: 'row', alignItems: 'center' });

      root.addChild(createNode({ width: 50, height: 30 }));

      computeLayout(root);

      expect(root.children[0].layout.y).toBe(35);
      expect(root.children[0].layout.height).toBe(30);
    });
  });

  describe('column direction', () => {
    it('should apply align-items to horizontal axis', () => {
      const root = createNode({ flexDirection: 'column', alignItems: 'center' });

      root.addChild(createNode({ width: 30, height: 50 }));

      computeLayout(root);

      expect(root.children[0].layout.x).toBe(35);
      expect(root.children[0].layout.width).toBe(30);
    });
  });
});

describe('alignSelf', () => {
  it('should override container alignItems', () => {
    const root = createNode({ flexDirection: 'row', alignItems: 'flex-start' });

    root.addChild(createNode({ width: 30, height: 30 }));
    root.addChild(createNode({ width: 30, height: 30, alignSelf: 'flex-end' }));
    root.addChild(createNode({ width: 30, height: 30, alignSelf: 'center' }));

    computeLayout(root);

    expect(root.children[0].layout.y).toBe(0); // flex-start from container
    expect(root.children[1].layout.y).toBe(70); // flex-end override
    expect(root.children[2].layout.y).toBe(35); // center override
  });

  it('should use auto to inherit from container', () => {
    const root = createNode({ flexDirection: 'row', alignItems: 'center' });

    root.addChild(createNode({ width: 30, height: 30, alignSelf: 'auto' }));

    computeLayout(root);

    expect(root.children[0].layout.y).toBe(35); // inherits center
  });

  it('should allow stretch override', () => {
    const root = createNode({ flexDirection: 'row', alignItems: 'flex-start' });

    root.addChild(createNode({ width: 30, alignSelf: 'stretch' }));

    computeLayout(root);

    expect(root.children[0].layout.height).toBe(100);
  });
});
