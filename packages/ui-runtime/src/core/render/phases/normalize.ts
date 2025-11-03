import type { JSX } from '../../../jsx';
import type { TraversalContext } from '../traversal';

/**
 * Phase 2: Normalize children to ensure clean Element structure
 * Handles arrays, nulls, and ensures all children are proper Elements
 *
 * This phase runs after expandAndResolveContexts to clean up the tree structure.
 * It ensures all elements have properly normalized children arrays.
 *
 * @param element - Element with possibly messy children (arrays, nulls, mixed types)
 * @param context - Traversal context
 * @returns Element with clean children structure
 */
export function normalizeChildren(element: JSX.Element, context: TraversalContext): JSX.Element {
  if (!element.props.children) {
    return element;
  }

  const children = element.props.children;

  // Handle array of children
  if (Array.isArray(children)) {
    const normalizedChildren = children
      .map((child: JSX.Node): JSX.Element | null => {
        if (!child || typeof child !== 'object' || !('type' in child)) {
          // Filter out null/undefined
          return null;
        }

        // Recursively normalize child's children
        return normalizeChildren(child, context);
      })
      .filter((child: JSX.Element | null): child is JSX.Element => child !== null);

    return {
      type: element.type,
      props: {
        ...element.props,
        children: normalizedChildren.length === 0 ? [] : normalizedChildren,
      },
    };
  }

  // Handle single child element
  if (children && typeof children === 'object' && 'type' in children) {
    return {
      type: element.type,
      props: {
        ...element.props,
        children: normalizeChildren(children, context),
      },
    };
  }

  // Handle null/undefined children
  if (children === null || children === undefined) {
    return {
      type: element.type,
      props: {
        ...element.props,
        children: [],
      },
    };
  }

  return element;
}
