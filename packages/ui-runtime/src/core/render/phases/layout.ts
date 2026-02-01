import { FlexTarget } from 'flexbox.js';
import type { LayoutProps } from '../../../components/layout';
import type { JSX } from '../../../jsx';
import type { Percent } from '../../../util';
import { Logger, toNumber } from '../../../util';

/**
 * Resolves individual padding/margin properties, with fallback to shorthand.
 * Priority: specific side (paddingTop) > shorthand (padding) > 0
 */
function resolveSide(specific: Percent | undefined, shorthand: Percent | undefined): number {
  if (specific !== undefined) {
    return toNumber(specific);
  }

  if (shorthand !== undefined) {
    return toNumber(shorthand);
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
    node.flex.paddingTop = resolveSide(layout.paddingTop, layout.padding);
    node.flex.paddingRight = resolveSide(layout.paddingRight, layout.padding);
    node.flex.paddingBottom = resolveSide(layout.paddingBottom, layout.padding);
    node.flex.paddingLeft = resolveSide(layout.paddingLeft, layout.padding);
  }

  // Apply flex item props (if parent is flex)
  if (parent?.flex.enabled) {
    node.flexItem.grow = layout.flexGrow ?? 0;
    node.flexItem.shrink = layout.flexShrink ?? 0;

    if (layout.alignSelf && layout.alignSelf !== 'auto') {
      node.flexItem.alignSelf = layout.alignSelf;
    }

    // Apply margin (individual properties take priority over shorthand)
    node.flexItem.marginTop = resolveSide(layout.marginTop, layout.margin);
    node.flexItem.marginRight = resolveSide(layout.marginRight, layout.margin);
    node.flexItem.marginBottom = resolveSide(layout.marginBottom, layout.margin);
    node.flexItem.marginLeft = resolveSide(layout.marginLeft, layout.margin);

    // Min/max constraints
    if (layout.minWidth !== undefined) {
      node.flexItem.minWidth = toNumber(layout.minWidth);
    }

    if (layout.minHeight !== undefined) {
      node.flexItem.minHeight = toNumber(layout.minHeight);
    }

    if (layout.maxWidth !== undefined) {
      node.flexItem.maxWidth = toNumber(layout.maxWidth);
    }

    if (layout.maxHeight !== undefined) {
      node.flexItem.maxHeight = toNumber(layout.maxHeight);
    }
  }

  // Apply base dimensions (convert Percent to number, 0 = fit-to-contents)
  node.w = toNumber(props.width || `${parentWidth}%`);
  node.h = toNumber(props.height || `${parentHeight}%`);

  // Calculate node dimensions for children percentage resolution
  const nodeWidth = node.w;
  const nodeHeight = node.h;

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
 * Applies computed layout values back to element tree.
 * Converts relative (parent-based) coordinates from flexbox to absolute (screen-origin) coordinates
 * by accumulating parent offsets.
 *
 * @param element - JSX element to apply layout to
 * @param flexNode - Computed flexbox node
 * @param parentAbsX - Parent's absolute X position (default: 0)
 * @param parentAbsY - Parent's absolute Y position (default: 0)
 */
function applyLayoutToElements(
  element: JSX.Element,
  flexNode: FlexTarget,
  parentAbsX: number = 0,
  parentAbsY: number = 0,
): void {
  Logger.error(`Flex Node: ${flexNode.toString()}`);

  // Get relative position from flexbox (relative to parent, 0-100 scale)
  const relativeX = flexNode.getLayoutX();
  const relativeY = flexNode.getLayoutY();
  const width = flexNode.getLayoutW();
  const height = flexNode.getLayoutH();

  // Convert to absolute position (relative to screen origin)
  // Child's absolute position = parent's absolute position + (child's relative position as fraction of parent size)
  const absoluteX = parentAbsX + (relativeX / 100) * width;
  const absoluteY = parentAbsY + (relativeY / 100) * height;

  // Store absolute coordinates (0-100 scale) for serialization
  element.props.jsonUIx = absoluteX;
  element.props.jsonUIy = absoluteY;
  element.props.jsonUIWidth = width;
  element.props.jsonUIHeight = height;

  // Process children - pass this element's absolute position as parent offset
  if (Array.isArray(element.props.children)) {
    const children = flexNode.getChildren();

    element.props.children.forEach((child, index) => {
      applyLayoutToElements(child, children[index], absoluteX, absoluteY);
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
