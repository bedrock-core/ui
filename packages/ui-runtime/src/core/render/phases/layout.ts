import { FlexTarget } from 'flexbox.js';
import type { JSX } from '../../../jsx';
import { resolvePercent } from '../../../util';
import type { Spacing } from '../../../components/control';

/**
 * Resolves spacing value (can be single value or object with sides)
 */
function resolveSpacing(
  value: Spacing | undefined,
  parentSize: number,
): number | { top: number; right: number; bottom: number; left: number } {
  if (value === undefined) {
    return 0;
  }

  if (typeof value === 'object' && 'top' in value) {
    // Object with sides
    return {
      top: resolvePercent(value.top, parentSize),
      right: resolvePercent(value.right, parentSize),
      bottom: resolvePercent(value.bottom, parentSize),
      left: resolvePercent(value.left, parentSize),
    };
  }

  // Single value (number or percentage string) - TypeScript knows it's not an object at this point
  return resolvePercent(value as number | `${number}%`, parentSize);
}

/**
 * Converts JSX element tree to FlexTarget tree for layout calculation
 */
function buildFlexTree(
  element: JSX.Element,
  parent?: FlexTarget,
  parentWidth: number = 0,
  parentHeight: number = 0,
): FlexTarget {
  const node = new FlexTarget();
  const props = element.props as any; // Type cast for __ prefixed internal props

  // Apply display mode
  if (props.__display === 'flex') {
    node.flex.enabled = true;
    node.flex.direction = props.__flexDirection ?? 'row';
    node.flex.justifyContent = props.__justifyContent ?? 'flex-start';
    node.flex.alignItems = props.__alignItems ?? 'stretch';

    if (props.__alignContent) {
      node.flex.alignContent = props.__alignContent;
    }

    node.flex.wrap = props.__wrap ?? false;

    // Apply padding (convert Percent to number)
    const padding = resolveSpacing(props.__padding, parentWidth);

    if (typeof padding === 'number') {
      node.flex.padding = padding;
    } else {
      node.flex.paddingTop = padding.top;
      node.flex.paddingRight = padding.right;
      node.flex.paddingBottom = padding.bottom;
      node.flex.paddingLeft = padding.left;
    }
  }

  // Apply flex item props (if parent is flex)
  if (parent?.flex.enabled) {
    node.flexItem.grow = props.__flexGrow ?? 0;
    node.flexItem.shrink = props.__flexShrink ?? 0;

    if (props.__alignSelf) {
      node.flexItem.alignSelf = props.__alignSelf;
    }

    // Apply margin (convert Percent to number)
    const margin = resolveSpacing(props.__margin, parentWidth);

    if (typeof margin === 'number') {
      node.flexItem.margin = margin;
    } else {
      node.flexItem.marginTop = margin.top;
      node.flexItem.marginRight = margin.right;
      node.flexItem.marginBottom = margin.bottom;
      node.flexItem.marginLeft = margin.left;
    }

    // Min/max constraints
    if (props.__minWidth !== undefined) {
      node.flexItem.minWidth = resolvePercent(props.__minWidth, parentWidth);
    }

    if (props.__minHeight !== undefined) {
      node.flexItem.minHeight = resolvePercent(props.__minHeight, parentHeight);
    }

    if (props.__maxWidth !== undefined) {
      node.flexItem.maxWidth = resolvePercent(props.__maxWidth, parentWidth);
    }

    if (props.__maxHeight !== undefined) {
      node.flexItem.maxHeight = resolvePercent(props.__maxHeight, parentHeight);
    }
  }

  // Apply base dimensions (convert Percent to number, 0 = fit-to-contents)
  node.w = resolvePercent(props.width, parentWidth);
  node.h = resolvePercent(props.height, parentHeight);

  // Calculate node dimensions for children percentage resolution
  const nodeWidth = node.w || parentWidth;
  const nodeHeight = node.h || parentHeight;

  // Process children recursively
  if (Array.isArray(element.props.children)) {
    element.props.children.forEach((child) => {
      if (child && typeof child === 'object' && 'type' in child) {
        const childNode = buildFlexTree(child, node, nodeWidth, nodeHeight);

        node.addChild(childNode);
      }
    });
  }

  return node;
}

/**
 * Applies computed layout values back to element tree
 */
function applyLayoutToElements(element: JSX.Element, flexNode: FlexTarget): void {
  // Set computed layout as number values (pixels)
  // These will be serialized to the fixed-width protocol
  element.props.x = flexNode.getLayoutX();
  element.props.y = flexNode.getLayoutY();
  element.props.width = flexNode.getLayoutW();
  element.props.height = flexNode.getLayoutH();

  // Process children
  if (Array.isArray(element.props.children)) {
    const children = flexNode.getChildren();

    element.props.children.forEach((child, index) => {
      if (child && typeof child === 'object' && 'type' in child) {
        applyLayoutToElements(child, children[index]);
      }
    });
  }
}

/**
 * Computes layout for element tree using flexbox algorithm.
 * Converts Percent values to pixels and calculates final positions.
 *
 * @param element - Root JSX element to compute layout for
 * @param containerWidth - Container width in pixels (default: 512 for Minecraft forms)
 * @param containerHeight - Container height in pixels (default: 512 for Minecraft forms)
 * @returns Element tree with computed x, y, width, height as numbers
 */
export function computeLayout(
  element: JSX.Element,
  containerWidth: number = 512,
  containerHeight: number = 512,
): JSX.Element {
  // Build FlexTarget tree
  const flexRoot = buildFlexTree(element, undefined, containerWidth, containerHeight);

  // Calculate layout
  flexRoot.update();

  // Apply computed positions back to elements (as numbers now)
  applyLayoutToElements(element, flexRoot);

  return element;
}
