import type { JSX } from '../../../jsx';
import { type ParentState, type TraversalContext } from '../traversal';
import { toNumber, toPercent, scaleForSerialization } from '../../../util/percent';
import type { Percent } from '../../../components/control';

/**
 * Phase 3: Apply parent-child inheritance rules
 * - visible: child AND parent (if parent invisible, child is invisible)
 * - enabled: child AND parent (if parent disabled, child is disabled)
 * - x/y: convert relative percentages (0-100) to absolute screen percentages via compounding
 * - width/height: convert relative percentages (0-100) to absolute screen percentages via compounding
 *
 * Percentage compounding for relative positioning (0-100 scale):
 * - absolute_x = parent_x + (child_relative_x / 100 * parent_width)
 * - absolute_y = parent_y + (child_relative_y / 100 * parent_height)
 * - absolute_width = (child_relative_width / 100) * parent_width
 * - absolute_height = (child_relative_height / 100) * parent_height
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
    width: 100,
    height: 100,
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

  // Rule 3: Convert relative percentages to absolute screen percentages via compounding
  const position = newProps.__position ?? 'relative';

  if (position === 'relative') {
    // Convert percentage strings to numbers for calculations
    // At this point, these should already be Percent strings from withControl()
    const relativeX = toNumber((newProps.x ?? '0%') as Percent);
    const relativeY = toNumber((newProps.y ?? '0%') as Percent);
    const relativeWidth = toNumber((newProps.width ?? '100%') as Percent);
    const relativeHeight = toNumber((newProps.height ?? '100%') as Percent);

    // Position: compound relative percentage with parent's absolute position and dimensions
    const absoluteX = parentState.x + ((relativeX / 100) * parentState.width);
    const absoluteY = parentState.y + ((relativeY / 100) * parentState.height);

    // Size: compound relative percentage with parent's absolute dimensions
    const absoluteWidth = (relativeWidth / 100) * parentState.width;
    const absoluteHeight = (relativeHeight / 100) * parentState.height;

    // Scale by 100x for serialization (removes decimals: 50.25 → 5025)
    // This is required because JSON UI ignores numbers with decimal points
    newProps.x = scaleForSerialization(toPercent(absoluteX));
    newProps.y = scaleForSerialization(toPercent(absoluteY));
    newProps.width = scaleForSerialization(toPercent(absoluteWidth));
    newProps.height = scaleForSerialization(toPercent(absoluteHeight));
  } else {
    // Absolute positioning: still scale for serialization but don't compound
    newProps.x = scaleForSerialization((newProps.x ?? '0%') as Percent);
    newProps.y = scaleForSerialization((newProps.y ?? '0%') as Percent);
    newProps.width = scaleForSerialization((newProps.width ?? '100%') as Percent);
    newProps.height = scaleForSerialization((newProps.height ?? '100%') as Percent);
  }

  // Create new parent state for children using THIS element's resolved absolute properties
  // NOTE: Store unscaled values in parent state for correct inheritance calculations
  // Children will scale their own values during their inheritance phase
  const childParentState: ParentState = {
    visible: (newProps.visible ?? true) as boolean,
    enabled: (newProps.enabled ?? true) as boolean,
    // Convert scaled values back to original scale for parent state
    x: (newProps.x as number) / 100,
    y: (newProps.y as number) / 100,
    width: (newProps.width as number) / 100,
    height: (newProps.height as number) / 100,
    position: (position ?? 'relative') as 'relative' | 'absolute',
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
