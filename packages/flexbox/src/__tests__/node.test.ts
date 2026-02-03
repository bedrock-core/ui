import { describe, expect, it } from 'vitest';
import { createNode } from '../index.js';

describe('FlexNode', () => {
  describe('createNode', () => {
    it('should create a node with default style', () => {
      const node = createNode();

      expect(node.style).toEqual({});
      expect(node.children).toEqual([]);
      expect(node.parent).toBeNull();
    });

    it('should create a node with custom style', () => {
      const node = createNode({ flexDirection: 'column', gap: 5 });

      expect(node.style.flexDirection).toBe('column');
      expect(node.style.gap).toBe(5);
    });

    it('should create a node with custom id', () => {
      const node = createNode({}, 'my-custom-id');

      expect(node.id).toBe('my-custom-id');
    });

    it('should auto-generate unique ids', () => {
      const node1 = createNode();
      const node2 = createNode();

      expect(node1.id).not.toBe(node2.id);
    });
  });

  describe('addChild', () => {
    it('should add a child and set parent', () => {
      const parent = createNode();
      const child = createNode();

      parent.addChild(child);

      expect(parent.children).toContain(child);
      expect(child.parent).toBe(parent);
    });

    it('should return this for chaining', () => {
      const parent = createNode();
      const result = parent.addChild(createNode());

      expect(result).toBe(parent);
    });
  });

  describe('addChildren', () => {
    it('should add multiple children', () => {
      const parent = createNode();
      const child1 = createNode();
      const child2 = createNode();
      const child3 = createNode();

      parent.addChildren(child1, child2, child3);

      expect(parent.children.length).toBe(3);
      expect(child1.parent).toBe(parent);
      expect(child2.parent).toBe(parent);
      expect(child3.parent).toBe(parent);
    });
  });

  describe('removeChild', () => {
    it('should remove a child and clear parent', () => {
      const parent = createNode();
      const child = createNode();

      parent.addChild(child);

      const result = parent.removeChild(child);

      expect(result).toBe(true);
      expect(parent.children).not.toContain(child);
      expect(child.parent).toBeNull();
    });

    it('should return false for non-existent child', () => {
      const parent = createNode();
      const notChild = createNode();

      const result = parent.removeChild(notChild);

      expect(result).toBe(false);
    });
  });

  describe('getStyle', () => {
    it('should return style value when set', () => {
      const node = createNode({ flexGrow: 2 });

      expect(node.getStyle('flexGrow')).toBe(2);
    });

    it('should return default value when not set', () => {
      const node = createNode();

      expect(node.getStyle('flexGrow')).toBe(0);
      expect(node.getStyle('flexShrink')).toBe(1);
      expect(node.getStyle('flexDirection')).toBe('row');
    });
  });

  describe('isRoot', () => {
    it('should return true for root node', () => {
      const node = createNode();

      expect(node.isRoot()).toBe(true);
    });

    it('should return false for child node', () => {
      const parent = createNode();
      const child = createNode();

      parent.addChild(child);
      expect(child.isRoot()).toBe(false);
    });
  });

  describe('isRowDirection', () => {
    it('should return true for row', () => {
      const node = createNode({ flexDirection: 'row' });

      expect(node.isRowDirection()).toBe(true);
    });

    it('should return true for row-reverse', () => {
      const node = createNode({ flexDirection: 'row-reverse' });

      expect(node.isRowDirection()).toBe(true);
    });

    it('should return false for column', () => {
      const node = createNode({ flexDirection: 'column' });

      expect(node.isRowDirection()).toBe(false);
    });
  });

  describe('isReversed', () => {
    it('should return true for row-reverse', () => {
      const node = createNode({ flexDirection: 'row-reverse' });

      expect(node.isReversed()).toBe(true);
    });

    it('should return true for column-reverse', () => {
      const node = createNode({ flexDirection: 'column-reverse' });

      expect(node.isReversed()).toBe(true);
    });

    it('should return false for row', () => {
      const node = createNode({ flexDirection: 'row' });

      expect(node.isReversed()).toBe(false);
    });
  });

  describe('getPadding', () => {
    it('should return individual padding values', () => {
      const node = createNode({
        paddingTop: 1,
        paddingRight: 2,
        paddingBottom: 3,
        paddingLeft: 4,
      });

      expect(node.getPadding()).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
    });

    it('should use shorthand padding as fallback', () => {
      const node = createNode({ padding: 5 });

      expect(node.getPadding()).toEqual({ top: 5, right: 5, bottom: 5, left: 5 });
    });
  });

  describe('getMargin', () => {
    it('should return individual margin values', () => {
      const node = createNode({
        marginTop: 1,
        marginRight: 2,
        marginBottom: 3,
        marginLeft: 4,
      });

      expect(node.getMargin()).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
    });

    it('should use shorthand margin as fallback', () => {
      const node = createNode({ margin: 5 });

      expect(node.getMargin()).toEqual({ top: 5, right: 5, bottom: 5, left: 5 });
    });
  });

  describe('gap helpers', () => {
    it('should return columnGap for row direction main gap', () => {
      const node = createNode({ flexDirection: 'row', gap: 5, columnGap: 10 });

      expect(node.getMainGap()).toBe(10);
    });

    it('should return rowGap for column direction main gap', () => {
      const node = createNode({ flexDirection: 'column', gap: 5, rowGap: 10 });

      expect(node.getMainGap()).toBe(10);
    });

    it('should fallback to gap when specific gap not set', () => {
      const node = createNode({ flexDirection: 'row', gap: 5 });

      expect(node.getMainGap()).toBe(5);
      expect(node.getCrossGap()).toBe(5);
    });
  });
});
