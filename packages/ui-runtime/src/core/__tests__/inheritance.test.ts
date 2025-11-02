import { describe, expect, it } from 'vitest';
import { JSX } from '../../jsx';
import { ParentState, TraversalContext, applyInheritance } from '../render';

/**
 * Helper to create a TraversalContext with a given parent state
 */
function createContext(parentState: ParentState): TraversalContext {
  return {
    parentPath: [],
    createdInstances: new Set(),
    idCounters: new Map(),
    parentState,
    currentContext: new Map(),
  };
}

describe('Parent-Child Inheritance', () => {
  describe('Visibility Inheritance', () => {
    it('child inherits parent invisibility', () => {
      const element: JSX.Element = {
        type: 'panel',
        props: {
          visible: true, // Child explicitly visible
          x: 0,
          y: 0,
          children: [],
        },
      };

      const parentState: ParentState = {
        visible: false, // Parent is invisible
        enabled: true,
        x: 0,
        y: 0,
        position: 'absolute',
      };

      const result = applyInheritance(element, createContext(parentState));

      expect(result.props.visible).toBe(false); // Child forced to invisible
    });

    it('child maintains visibility when parent visible', () => {
      const element: JSX.Element = {
        type: 'panel',
        props: {
          visible: true,
          x: 0,
          y: 0,
          children: [],
        },
      };

      const parentState: ParentState = {
        visible: true,
        enabled: true,
        x: 0,
        y: 0,
        position: 'absolute',
      };

      const result = applyInheritance(element, createContext(parentState));

      expect(result.props.visible).toBe(true);
    });

    it('child invisible stays invisible even with visible parent', () => {
      const element: JSX.Element = {
        type: 'panel',
        props: {
          visible: false,
          x: 0,
          y: 0,
          children: [],
        },
      };

      const parentState: ParentState = {
        visible: true,
        enabled: true,
        x: 0,
        y: 0,
        position: 'absolute',
      };

      const result = applyInheritance(element, createContext(parentState));

      expect(result.props.visible).toBe(false);
    });
  });

  describe('Enabled Inheritance', () => {
    it('child inherits parent disabled state', () => {
      const element: JSX.Element = {
        type: 'button',
        props: {
          enabled: true, // Child explicitly enabled
          x: 0,
          y: 0,
          children: [],
        },
      };

      const parentState: ParentState = {
        visible: true,
        enabled: false, // Parent is disabled
        x: 0,
        y: 0,
        position: 'absolute',
      };

      const result = applyInheritance(element, createContext(parentState));

      expect(result.props.enabled).toBe(false); // Child forced to disabled
    });

    it('child maintains enabled when parent enabled', () => {
      const element: JSX.Element = {
        type: 'button',
        props: {
          enabled: true,
          x: 0,
          y: 0,
          children: [],
        },
      };

      const parentState: ParentState = {
        visible: true,
        enabled: true,
        x: 0,
        y: 0,
        position: 'absolute',
      };

      const result = applyInheritance(element, createContext(parentState));

      expect(result.props.enabled).toBe(true);
    });

    it('child disabled stays disabled even with enabled parent', () => {
      const element: JSX.Element = {
        type: 'button',
        props: {
          enabled: false,
          x: 0,
          y: 0,
          children: [],
        },
      };

      const parentState: ParentState = {
        visible: true,
        enabled: true,
        x: 0,
        y: 0,
        position: 'absolute',
      };

      const result = applyInheritance(element, createContext(parentState));

      expect(result.props.enabled).toBe(false);
    });
  });

  describe('Relative Positioning', () => {
    it('child absolute positioning ignores parent coordinates', () => {
      const element: JSX.Element = {
        type: 'panel',
        props: {
          x: 50,
          y: 50,
          __position: 'absolute',
          visible: true,
          enabled: true,
          children: [],
        },
      };

      const parentState: ParentState = {
        visible: true,
        enabled: true,
        x: 100,
        y: 100,
        position: 'absolute',
      };

      const result = applyInheritance(element, createContext(parentState));

      expect(result.props.x).toBe(50); // Unchanged
      expect(result.props.y).toBe(50); // Unchanged
    });

    it('child relative positioning adds parent coordinates', () => {
      const element: JSX.Element = {
        type: 'panel',
        props: {
          x: 50,
          y: 50,
          __position: 'relative',
          visible: true,
          enabled: true,
          children: [],
        },
      };

      const parentState: ParentState = {
        visible: true,
        enabled: true,
        x: 100,
        y: 100,
        position: 'absolute',
      };

      const result = applyInheritance(element, createContext(parentState));

      expect(result.props.x).toBe(150); // 100 + 50
      expect(result.props.y).toBe(150); // 100 + 50
    });

    it('relative positioning propagates through nested parents', () => {
      // Grandparent at (100, 100) absolute
      // Parent at (20, 20) relative to grandparent → (120, 120)
      // Child at (10, 10) relative to parent → (130, 130)

      const childElement: JSX.Element = {
        type: 'text',
        props: {
          x: 10,
          y: 10,
          __position: 'relative',
          visible: true,
          enabled: true,
          value: 'Child',
        },
      };

      // First compute parent's coordinates relative to grandparent
      const parentElement: JSX.Element = {
        type: 'panel',
        props: {
          x: 20,
          y: 20,
          __position: 'relative',
          visible: true,
          enabled: true,
          children: [childElement],
        },
      };

      const grandparentState: ParentState = {
        visible: true,
        enabled: true,
        x: 100,
        y: 100,
        position: 'absolute',
      };

      // Apply to parent
      const parentResult = applyInheritance(parentElement, createContext(grandparentState));

      expect(parentResult.props.x).toBe(120); // 100 + 20
      expect(parentResult.props.y).toBe(120); // 100 + 20

      // The parent result should have updated children with new parent state
      expect(Array.isArray(parentResult.props.children)).toBe(true);
      const childResult = (parentResult.props.children as JSX.Element[])[0];

      // Child should be computed relative to parent's new coordinates
      expect(childResult.props.x).toBe(130); // 120 + 10
      expect(childResult.props.y).toBe(130); // 120 + 10
    });

    it('child relative to absolute parent computes correctly', () => {
      const element: JSX.Element = {
        type: 'panel',
        props: {
          x: 10,
          y: 10,
          __position: 'relative',
          visible: true,
          enabled: true,
          children: [],
        },
      };

      const parentState: ParentState = {
        visible: true,
        enabled: true,
        x: 50,
        y: 75,
        position: 'absolute',
      };

      const result = applyInheritance(element, createContext(parentState));

      expect(result.props.x).toBe(60); // 50 + 10
      expect(result.props.y).toBe(85); // 75 + 10
    });
  });

  describe('Combined Inheritance', () => {
    it('applies all rules together', () => {
      const element: JSX.Element = {
        type: 'button',
        props: {
          x: 30,
          y: 40,
          __position: 'relative',
          visible: true,
          enabled: true,
          children: [],
        },
      };

      const parentState: ParentState = {
        visible: false,
        enabled: false,
        x: 100,
        y: 100,
        position: 'absolute',
      };

      const result = applyInheritance(element, createContext(parentState));

      // Visibility and enabled should be inherited (forced to false)
      expect(result.props.visible).toBe(false);
      expect(result.props.enabled).toBe(false);

      // Position should be relative to parent
      expect(result.props.x).toBe(130); // 100 + 30
      expect(result.props.y).toBe(140); // 100 + 40
    });
  });

  describe('Position Mode Inheritance', () => {
    it('creates correct parent state for children', () => {
      const childElement: JSX.Element = {
        type: 'text',
        props: {
          x: 5,
          y: 5,
          __position: 'relative',
          visible: true,
          enabled: true,
          value: 'Child',
        },
      };

      const parentElement: JSX.Element = {
        type: 'panel',
        props: {
          x: 20,
          y: 20,
          __position: 'absolute',
          visible: true,
          enabled: true,
          children: [childElement],
        },
      };

      const grandparentState: ParentState = {
        visible: true,
        enabled: true,
        x: 100,
        y: 100,
        position: 'absolute',
      };

      const parentResult = applyInheritance(parentElement, createContext(grandparentState));

      // Parent with absolute positioning should not add to coordinates
      expect(parentResult.props.x).toBe(20);
      expect(parentResult.props.y).toBe(20);

      // But child should see parent at (20, 20) and be relative to that
      const childResult = (parentResult.props.children as JSX.Element[])[0];
      expect(childResult.props.x).toBe(25); // 20 + 5
      expect(childResult.props.y).toBe(25); // 20 + 5
    });
  });

  describe('Default Values', () => {
    it('applies defaults when properties not specified', () => {
      // Note: In real usage, withControl() adds all properties with defaults,
      // so this test simulates what happens during tree building
      const element: JSX.Element = {
        type: 'panel',
        props: {
          x: 0,
          y: 0,
          visible: true, // withControl adds these with defaults
          enabled: true,
          __position: 'absolute', // withControl adds this too
          children: [],
        },
      };

      const parentState: ParentState = {
        visible: true,
        enabled: true,
        x: 100,
        y: 100,
        position: 'absolute',
      };

      const result = applyInheritance(element, createContext(parentState));

      // Should maintain defaults
      expect(result.props.visible).toBe(true);
      expect(result.props.enabled).toBe(true);
      expect(result.props.__position).toBe('absolute');
      // x and y should not be added since position is absolute
      expect(result.props.x).toBe(0);
      expect(result.props.y).toBe(0);
    });
  });
});

