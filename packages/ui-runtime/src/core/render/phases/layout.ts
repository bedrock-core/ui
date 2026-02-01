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
 * Converts JSX element tree to FlexTarget tree for layout calculation.
 * Uses funcW/funcH for percentage-based sizing relative to parent.
 * Root is always 100x100 (100% of screen), children default to fit-to-contents (0).
 */
function buildFlexTree(element: JSX.Element, parent?: FlexTarget): FlexTarget {
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

    // Min/max constraints (use funcW/funcH for percentage-based constraints)
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

  // Apply dimensions using funcW/funcH for percentage-based sizing
  // Root: always 100x100 (100% of screen)
  // Children: default to 100% of parent (fit-to-contents doesn't work in percentage-based systems)
  if (!parent) {
    // Root node: fill entire container (100x100 = 100% of screen)
    node.w = 100;
    node.h = 100;
  } else {
    // Child nodes: use relative functions for percentage-based sizing
    // Default to 100% of parent if not specified (fit-to-contents doesn't work without intrinsic sizes)
    if (props.width !== undefined) {
      const widthPercent = toNumber(props.width) / 100; // "50%" → 0.5

      node.funcW = (parentW: number): number => parentW * widthPercent;
    } else {
      // Default: 100% of parent width
      node.funcW = (parentW: number): number => parentW;
    }

    if (props.height !== undefined) {
      const heightPercent = toNumber(props.height) / 100; // "50%" → 0.5

      node.funcH = (_parentW: number, parentH: number): number => parentH * heightPercent;
    } else {
      // Default: 100% of parent height
      node.funcH = (_parentW: number, parentH: number): number => parentH;
    }
  }

  // Process children recursively
  if (Array.isArray(element.props.children)) {
    element.props.children.forEach((child) => {
      const childNode = buildFlexTree(child, node);

      node.addChild(childNode);
    });
  }

  return node;
}

/**
 * Applies computed layout values back to element tree.
 * flexbox.js returns positions relative to parent, so we accumulate
 * parent offsets to get absolute screen positions.
 *
 * @param element - JSX element to apply layout to
 * @param flexNode - Computed flexbox node with layout results
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
  // Get position relative to parent from flexbox
  const relativeX = flexNode.getLayoutX();
  const relativeY = flexNode.getLayoutY();
  const width = flexNode.getLayoutW();
  const height = flexNode.getLayoutH();

  // Convert to absolute position (screen coordinates)
  // Simply add parent's absolute position since we're in the same 0-100 scale
  const absoluteX = parentAbsX + relativeX;
  const absoluteY = parentAbsY + relativeY;

  // Store absolute coordinates for serialization
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
 * Root is always 100x100 (100% of screen), children default to fit-to-contents.
 * Uses funcW/funcH for percentage-based sizing relative to parent.
 *
 * @param element - Root JSX element to compute layout for
 * @returns Element tree with computed jsonUIx, jsonUIy, jsonUIWidth, jsonUIHeight (0-100 scale)
 */
export function computeLayout(element: JSX.Element): JSX.Element {
  // Build FlexTarget tree (root is always 100x100)
  const flexRoot = buildFlexTree(element);

  // Calculate layout
  flexRoot.update();

  // Apply computed positions back to elements
  applyLayoutToElements(element, flexRoot);

  return element;
}
