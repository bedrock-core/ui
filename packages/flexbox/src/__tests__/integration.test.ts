import { describe, it, expect } from 'vitest';
import { createNode, computeLayout } from '../index.js';

describe('padding', () => {
  it('should reduce available space for children', () => {
    const root = createNode({ flexDirection: 'row', padding: 10 });
    const child = createNode({ flexGrow: 1 });

    root.addChild(child);

    computeLayout(root);

    // Child should be positioned after padding and have reduced size
    expect(child.layout.x).toBe(10);
    expect(child.layout.y).toBe(10);
    expect(child.layout.width).toBe(80); // 100 - 10 - 10
    expect(child.layout.height).toBe(80);
  });

  it('should support individual padding values', () => {
    const root = createNode({
      flexDirection: 'row',
      paddingTop: 5,
      paddingRight: 10,
      paddingBottom: 15,
      paddingLeft: 20,
    });
    const child = createNode({ flexGrow: 1 });

    root.addChild(child);

    computeLayout(root);

    expect(child.layout.x).toBe(20);
    expect(child.layout.y).toBe(5);
    expect(child.layout.width).toBe(70); // 100 - 20 - 10
    expect(child.layout.height).toBe(80); // 100 - 5 - 15
  });
});

describe('margin', () => {
  it('should offset child position and reduce size', () => {
    const root = createNode({ flexDirection: 'row', alignItems: 'flex-start' });
    const child = createNode({ flexBasis: 50, height: 50, margin: 5 });

    root.addChild(child);

    computeLayout(root);

    // Child is offset by margin
    expect(child.layout.x).toBe(5);
    expect(child.layout.y).toBe(5);
    // Size is reduced by margin
    expect(child.layout.width).toBe(40); // 50 - 5 - 5
    expect(child.layout.height).toBe(40);
  });

  it('should support individual margin values', () => {
    const root = createNode({ flexDirection: 'row', alignItems: 'flex-start' });
    const child = createNode({
      flexBasis: 50,
      height: 50,
      marginTop: 5,
      marginRight: 10,
      marginBottom: 15,
      marginLeft: 20,
    });

    root.addChild(child);

    computeLayout(root);

    expect(child.layout.x).toBe(20);
    expect(child.layout.y).toBe(5);
    expect(child.layout.width).toBe(20); // 50 - 20 - 10
    expect(child.layout.height).toBe(30); // 50 - 5 - 15
  });
});

describe('min/max constraints', () => {
  it('should respect minWidth', () => {
    const root = createNode({ flexDirection: 'row' });

    root.addChild(createNode({ flexBasis: 80, flexShrink: 1, minWidth: 50 }));
    root.addChild(createNode({ flexBasis: 80, flexShrink: 1, minWidth: 50 }));

    computeLayout(root);

    // Both would shrink to 50, but minWidth prevents going below
    expect(root.children[0].layout.width).toBeGreaterThanOrEqual(50);
    expect(root.children[1].layout.width).toBeGreaterThanOrEqual(50);
  });

  it('should respect maxWidth', () => {
    const root = createNode({ flexDirection: 'row' });

    root.addChild(createNode({ flexGrow: 1, maxWidth: 30 }));
    root.addChild(createNode({ flexGrow: 1 }));

    computeLayout(root);

    expect(root.children[0].layout.width).toBeLessThanOrEqual(30);
  });

  it('should respect minHeight', () => {
    const root = createNode({ flexDirection: 'row', alignItems: 'stretch' });

    root.addChild(createNode({ width: 50, minHeight: 30 }));

    computeLayout(root);

    // With stretch, height fills container, respecting minHeight
    expect(root.children[0].layout.height).toBeGreaterThanOrEqual(30);
  });

  it('should respect maxHeight', () => {
    const root = createNode({ flexDirection: 'row', alignItems: 'stretch' });

    root.addChild(createNode({ width: 50, maxHeight: 50 }));

    computeLayout(root);

    expect(root.children[0].layout.height).toBeLessThanOrEqual(50);
  });
});

describe('order property', () => {
  it('should store order value on nodes', () => {
    const child0 = createNode({ order: 3 });
    const child1 = createNode({ order: 1 });
    const child2 = createNode({ order: 2 });

    // Order values are stored correctly
    expect(child0.getStyle('order')).toBe(3);
    expect(child1.getStyle('order')).toBe(1);
    expect(child2.getStyle('order')).toBe(2);

    // Default order is 0
    const defaultOrder = createNode();

    expect(defaultOrder.getStyle('order')).toBe(0);
  });
});

describe('nested containers', () => {
  it('should compute layout recursively', () => {
    const root = createNode({ flexDirection: 'column' });
    const header = createNode({ height: 20 });
    const body = createNode({ flexGrow: 1, flexDirection: 'row' });
    const footer = createNode({ height: 20 });

    const sidebar = createNode({ width: 30 });
    const content = createNode({ flexGrow: 1 });

    root.addChildren(header, body, footer);
    body.addChildren(sidebar, content);

    computeLayout(root);

    // Root layout
    expect(root.layout).toEqual({ x: 0, y: 0, width: 100, height: 100 });

    // Header at top
    expect(header.layout.y).toBe(0);
    expect(header.layout.height).toBe(20);

    // Body fills middle
    expect(body.layout.y).toBe(20);
    expect(body.layout.height).toBe(60);

    // Footer at bottom
    expect(footer.layout.y).toBe(80);
    expect(footer.layout.height).toBe(20);

    // Sidebar and content inside body
    // Their x/y are relative to body's content area
    expect(sidebar.layout.width).toBe(30);
    expect(content.layout.width).toBe(70);
  });

  it('should handle deeply nested containers', () => {
    const root = createNode({ padding: 10 });
    const level1 = createNode({ padding: 10, flexGrow: 1 });
    const level2 = createNode({ padding: 10, flexGrow: 1 });
    const leaf = createNode({ flexGrow: 1 });

    root.addChild(level1);
    level1.addChild(level2);
    level2.addChild(leaf);

    computeLayout(root);

    // Each level should have proper sizing
    expect(root.layout.width).toBe(100);
    expect(level1.layout.width).toBe(80); // 100 - 10 - 10
    expect(level2.layout.width).toBe(60); // 80 - 10 - 10
    expect(leaf.layout.width).toBe(40); // 60 - 10 - 10
  });
});
