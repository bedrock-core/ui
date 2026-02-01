import { FlexTarget } from 'flexbox.js';
import type { LayoutProps } from '../../../components/layout';
import type { JSX } from '../../../jsx';
import type { Percent } from '../../../util';
import { resolvePercent } from '../../../util';

/**
 * Resolves individual padding/margin properties, with fallback to shorthand.
 * Priority: specific side (paddingTop) > shorthand (padding) > 0
 */
function resolveSide(
  specific: Percent | undefined,
  shorthand: Percent | undefined,
  parentSize: number,
): number {
  if (specific !== undefined) {
    return resolvePercent(specific, parentSize);
  }

  if (shorthand !== undefined) {
    return resolvePercent(shorthand, parentSize);
  }

  return 0;
}

/**
 * Converts JSX element tree to FlexTarget tree for layout calculation
 */
function buildFlexTree(
  element: JSX.Element,
  parent?: FlexTarget,
  parentWidth: number = 100,
  parentHeight: number = 100,
): FlexTarget {
  const node = new FlexTarget();
  const props = element.props;
  const layout = (props.__layout || {}) as Partial<LayoutProps>;

  // Apply display mode
  if (layout.display === 'flex') {
    node.flex.enabled = true;
    node.flex.direction = layout.flexDirection ?? 'row';
    node.flex.justifyContent = layout.justifyContent ?? 'flex-start';
    node.flex.alignItems = layout.alignItems ?? 'stretch';

    if (layout.alignContent) {
      node.flex.alignContent = layout.alignContent;
    }

    node.flex.wrap = layout.wrap ?? false;

    // Apply padding (individual properties take priority over shorthand)
    node.flex.paddingTop = resolveSide(layout.paddingTop, layout.padding, parentWidth);
    node.flex.paddingRight = resolveSide(layout.paddingRight, layout.padding, parentWidth);
    node.flex.paddingBottom = resolveSide(layout.paddingBottom, layout.padding, parentWidth);
    node.flex.paddingLeft = resolveSide(layout.paddingLeft, layout.padding, parentWidth);
  }

  // Apply flex item props (if parent is flex)
  if (parent?.flex.enabled) {
    node.flexItem.grow = layout.flexGrow ?? 0;
    node.flexItem.shrink = layout.flexShrink ?? 0;

    if (layout.alignSelf && layout.alignSelf !== 'auto') {
      node.flexItem.alignSelf = layout.alignSelf;
    }

    // Apply margin (individual properties take priority over shorthand)
    node.flexItem.marginTop = resolveSide(layout.marginTop, layout.margin, parentWidth);
    node.flexItem.marginRight = resolveSide(layout.marginRight, layout.margin, parentWidth);
    node.flexItem.marginBottom = resolveSide(layout.marginBottom, layout.margin, parentWidth);
    node.flexItem.marginLeft = resolveSide(layout.marginLeft, layout.margin, parentWidth);

    // Min/max constraints
    if (layout.minWidth !== undefined) {
      node.flexItem.minWidth = resolvePercent(layout.minWidth, parentWidth);
    }

    if (layout.minHeight !== undefined) {
      node.flexItem.minHeight = resolvePercent(layout.minHeight, parentHeight);
    }

    if (layout.maxWidth !== undefined) {
      node.flexItem.maxWidth = resolvePercent(layout.maxWidth, parentWidth);
    }

    if (layout.maxHeight !== undefined) {
      node.flexItem.maxHeight = resolvePercent(layout.maxHeight, parentHeight);
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
      const childNode = buildFlexTree(child, node, nodeWidth, nodeHeight);

      node.addChild(childNode);
    });
  }

  return node;
}

/**
 * Applies computed layout values back to element tree
 */
function applyLayoutToElements(element: JSX.Element, flexNode: FlexTarget): void {
  // Set computed layout as percentage strings (0-100 scale)
  // These will be serialized to the fixed-width protocol
  element.props.x = `${flexNode.getLayoutX()}%`;
  element.props.y = `${flexNode.getLayoutY()}%`;
  element.props.width = `${flexNode.getLayoutW()}%`;
  element.props.height = `${flexNode.getLayoutH()}%`;

  // Process children
  if (Array.isArray(element.props.children)) {
    const children = flexNode.getChildren();

    element.props.children.forEach((child, index) => {
      applyLayoutToElements(child, children[index]);
    });
  }
}

/**
 * Computes layout for element tree using flexbox algorithm.
 * Converts Percent values to numbers on 0-100 scale and calculates final positions.
 *
 * @param element - Root JSX element to compute layout for
 * @param containerWidth - Container width as percentage (default: 100 for 100%)
 * @param containerHeight - Container height as percentage (default: 100 for 100%)
 * @returns Element tree with computed x, y, width, height as percentage values (0-100)
 */
export function computeLayout(
  element: JSX.Element,
  containerWidth: number = 100,
  containerHeight: number = 100,
): JSX.Element {
  // Build FlexTarget tree
  const flexRoot = buildFlexTree(element, undefined, containerWidth, containerHeight);

  // Calculate layout
  flexRoot.update();

  // Apply computed positions back to elements (as numbers now)
  applyLayoutToElements(element, flexRoot);

  return element;
}
