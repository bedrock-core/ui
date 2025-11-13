import type { JSX } from '../../../jsx';
import { type ParentState, type TraversalContext } from '../traversal';

/**
 * Phase 3: Apply parent-child inheritance rules
 * - visible: child AND parent (if parent invisible, child is invisible)
 * - enabled: child AND parent (if parent disabled, child is disabled)
 * - x/y: adjust for relative positioning mode (add parent coordinates if relative)
 *
 * This must run AFTER tree expansion and normalization so all properties are set.
 *
 * @param element - Element to apply inheritance to
 * @param context - Traversal context with parentState
 * @returns Element with inherited properties applied
 */
export function applyInheritance(element: JSX.Element, context: TraversalContext): JSX.Element {
  const parentState = context.parentState ?? {
    visible: true,
    enabled: true,
    x: 0,
    y: 0,
    position: 'relative',
  };

  const props = element.props;

  // Skip for fragments and context providers (they don't render but propagate parent state)
  if (element.type === 'fragment' || element.type === 'context-provider') {
    // Still process children with parent state propagated
    const childContext: TraversalContext = {
      ...context,
      parentState, // Pass parent state through transparent components
    };

    const newProps = { ...props };

    if (props.children) {
      if (Array.isArray(props.children)) {
        newProps.children = props.children.map((child: JSX.Element) => applyInheritance(child, childContext));
      } else if (typeof props.children === 'object' && props.children !== null) {
        newProps.children = applyInheritance(props.children, childContext);
      } else {
        newProps.children = props.children;
      }
    }

    return {
      type: element.type,
      props: newProps,
    };
  }

  // Apply inheritance rules to this element
  const newProps = { ...props };

  // Rule 1: visible = child_visible AND parent_visible
  if (!parentState.visible) {
    newProps.visible = false; // Force invisible if parent is invisible
  }

  // Rule 2: enabled = child_enabled AND parent_enabled
  if (!parentState.enabled) {
    newProps.enabled = false; // Force disabled if parent is disabled
  }

  // Rule 3: Handle relative positioning
  const position = newProps.__position ?? 'relative';

  if (position === 'relative') {
    const x = newProps.x as number ?? 0;
    const y = newProps.y as number ?? 0;
    newProps.x = x + parentState.x;
    newProps.y = y + parentState.y;
  }

  // Create new parent state for children using THIS element's resolved properties
  const childParentState: ParentState = {
    visible: newProps.visible as boolean ?? true,
    enabled: newProps.enabled as boolean ?? true,
    x: newProps.x as number ?? 0,
    y: newProps.y as number ?? 0,
    position: position as 'relative' | 'absolute' ?? 'relative',
  };

  const childContext: TraversalContext = {
    ...context,
    parentState: childParentState,
  };

  // Process children with new parent state
  if (newProps.children) {
    if (Array.isArray(newProps.children)) {
      newProps.children = newProps.children.map((child: JSX.Element) => applyInheritance(child, childContext));
    } else if (typeof newProps.children === 'object' && newProps.children !== null) {
      newProps.children = applyInheritance(newProps.children, childContext);
    }
  }

  return {
    type: element.type,
    props: newProps,
  };
}
