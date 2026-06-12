import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { isControlled } from '../../../components/control';
import type { JSX } from '../../../jsx';
import { isElement } from '../../guards';
import { type ParentState, type TraversalContext } from '../traversal';

function toPocketUnit(value: number): number {
  return Math.round(value);
}

/**
 * Phase 3: Apply parent-child inheritance rules
 * - visible: child AND parent (if parent invisible, child is invisible)
 * - enabled: child AND parent (if parent disabled, child is disabled)
 * - x/y/width/height: already resolved to absolute Pocket-space texels by the layout phase;
 *   this phase only quantizes them to integers for stable JSON UI behavior.
 *
 * This must run AFTER tree expansion and layout so all properties are set.
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
    width: CANONICAL_SCREEN.width,
    height: CANONICAL_SCREEN.height,
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
        newProps.children = props.children.filter(isElement).map(child => applyInheritance(child, childContext));
      } else if (isElement(props.children)) {
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

  let newProps = { ...props };

  if (isControlled(props)) {
    // Apply inheritance rules to this element
    newProps = { ...props };

    // Rule 1: visible = child_visible AND parent_visible
    if (!parentState.visible) {
      newProps.visible = false; // Force invisible if parent is invisible
    }

    // Rule 2: enabled = child_enabled AND parent_enabled
    if (!parentState.enabled) {
      newProps.enabled = false; // Force disabled if parent is disabled
    }

    // Rule 3: Layout phase has already computed absolute Pocket-space coordinates.
    // Quantize to integer texels for stable JSON UI behavior.
    const xValue = props.jsonUIx ?? 0;
    const yValue = props.jsonUIy ?? 0;
    const widthValue = props.jsonUIWidth ?? 100;
    const heightValue = props.jsonUIHeight ?? 100;

    newProps.jsonUIx = toPocketUnit(xValue);
    newProps.jsonUIy = toPocketUnit(yValue);
    newProps.jsonUIWidth = toPocketUnit(widthValue);
    newProps.jsonUIHeight = toPocketUnit(heightValue);

    // Create parent state for children using THIS element's absolute properties
    // Store unscaled values in parent state for visibility/enabled inheritance
    const childParentState: ParentState = {
      visible: newProps.visible ?? true,
      enabled: newProps.enabled ?? true,
      x: xValue,
      y: yValue,
      width: widthValue,
      height: heightValue,
      position: 'relative',
    };

    const childContext: TraversalContext = {
      ...context,
      parentState: childParentState,
    };

    // Process children with new parent state
    if (newProps.children) {
      if (Array.isArray(newProps.children)) {
        newProps.children = newProps.children.filter(isElement).map(child => applyInheritance(child, childContext));
      } else if (isElement(newProps.children)) {
        newProps.children = applyInheritance(newProps.children, childContext);
      }
    }
  }

  return {
    type: element.type,
    props: newProps,
  };
}
