import { isControlled } from '../../../components/control';
import type { JSX } from '../../../jsx';
import { scaleForSerialization, toPercent } from '../../../util/percent';
import { type ParentState, type TraversalContext } from '../traversal';

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

  const newProps = { ...props };

  if (isControlled(props)) {
    // Apply inheritance rules to this element
    // Reassign to infer type
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
    // Phase 2 outputs parent-relative coordinates as Percent strings

    const position = 'relative';

    if (position === 'relative') {
    // Extract numeric values from Percent strings ("50%" → 50)
      const xValue = props.jsonUIx ?? 0;
      const yValue = props.jsonUIy ?? 0;
      const widthValue = props.jsonUIWidth ?? 100;
      const heightValue = props.jsonUIHeight ?? 100;

      // Position: compound relative percentage with parent's absolute position and dimensions
      const absoluteX = parentState.x + ((xValue / 100) * parentState.width);
      const absoluteY = parentState.y + ((yValue / 100) * parentState.height);

      // Size: compound relative percentage with parent's absolute dimensions
      const absoluteWidth = (widthValue / 100) * parentState.width;
      const absoluteHeight = (heightValue / 100) * parentState.height;

      // Scale by 100x for serialization (removes decimals: 50.25 → 5025)
      // This is required because JSON UI ignores numbers with decimal points
      // Store in regular properties for serialization
      newProps.jsonUIx = scaleForSerialization(toPercent(absoluteX));
      newProps.jsonUIy = scaleForSerialization(toPercent(absoluteY));
      newProps.jsonUIWidth = scaleForSerialization(toPercent(absoluteWidth));
      newProps.jsonUIHeight = scaleForSerialization(toPercent(absoluteHeight));
    }

    // Create new parent state for children using THIS element's resolved absolute properties
    // NOTE: Store unscaled values in parent state for correct inheritance calculations
    // Children will scale their own values during their inheritance phase
    const childParentState: ParentState = {
      visible: newProps.visible ?? true,
      enabled: newProps.enabled ?? true,
      // Convert scaled values back to original scale for parent state
      // newProps.x/y/width/height are now numbers after scaleForSerialization
      x: newProps.jsonUIx / 100,
      y: newProps.jsonUIy / 100,
      width: newProps.jsonUIWidth / 100,
      height: newProps.jsonUIHeight / 100,
      position: 'relative',
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
  }

  return {
    type: element.type,
    props: newProps,
  };
}
