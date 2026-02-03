import { FlexNode } from './node.js';
import { calculateMainAxis, type MainAxisItem } from './algorithms/mainAxis.js';
import { calculateCrossAxis, type CrossAxisItem } from './algorithms/crossAxis.js';
import { wrapItems, calculateLinePositions } from './algorithms/wrap.js';

/**
 * Compute layout for a flex tree starting from the root node.
 * The root node is positioned at x=0, y=0, width=100, height=100.
 */
export function computeLayout(root: FlexNode): void {
  // Root always fills 100%
  root.layout = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  };

  computeNodeLayout(root);
}

/**
 * Recursively compute layout for a node and its children
 */
function computeNodeLayout(node: FlexNode): void {
  const children = getOrderedChildren(node);

  if (children.length === 0) {
    return;
  }

  const isRow = node.isRowDirection();
  const padding = node.getPadding();

  // Available space inside padding
  const innerWidth = node.layout.width - padding.left - padding.right;
  const innerHeight = node.layout.height - padding.top - padding.bottom;

  const availableMain = isRow ? innerWidth : innerHeight;
  const availableCross = isRow ? innerHeight : innerWidth;

  const mainGap = node.getMainGap();
  const crossGap = node.getCrossGap();

  // Step 1: Determine base sizes for each child
  const itemSizes = children.map((child) => {
    const mainSize = getChildMainSize(child, isRow, availableMain);
    const crossSize = getChildCrossSize(child, isRow, availableCross);

    return { main: mainSize, cross: crossSize };
  });

  // Step 2: Wrap items into lines
  const lines = wrapItems(node, itemSizes, availableMain, mainGap);

  // Step 3: Calculate line positions (align-content)
  const lineCrossSizes = lines.map(line => line.crossSize);
  const { positions: linePositions, sizes: lineSizes } = calculateLinePositions(
    node.getStyle('alignContent'),
    lineCrossSizes,
    availableCross,
    crossGap,
  );

  // Step 4: Process each line
  let globalChildIndex = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineCrossPos = linePositions[lineIndex];
    const lineCrossSize = lineSizes[lineIndex];

    // Build main axis items for this line
    const mainAxisItems: MainAxisItem[] = line.items.map((child, i) => {
      const childIndex = globalChildIndex + i;

      return {
        node: child,
        baseSize: itemSizes[childIndex].main,
        flexGrow: child.getStyle('flexGrow'),
        flexShrink: child.getStyle('flexShrink'),
        minSize: isRow ? child.getStyle('minWidth') : child.getStyle('minHeight'),
        maxSize: isRow ? child.getStyle('maxWidth') : child.getStyle('maxHeight'),
      };
    });

    // Calculate main axis layout
    const mainResult = calculateMainAxis(node, mainAxisItems, availableMain, mainGap);

    // Build cross axis items
    const crossAxisItems: CrossAxisItem[] = line.items.map((child, i) => {
      const childIndex = globalChildIndex + i;

      return {
        node: child,
        size: itemSizes[childIndex].cross,
        minSize: isRow ? child.getStyle('minHeight') : child.getStyle('minWidth'),
        maxSize: isRow ? child.getStyle('maxHeight') : child.getStyle('maxWidth'),
      };
    });

    // Calculate cross axis layout
    const crossResult = calculateCrossAxis(node, crossAxisItems, lineCrossSize, lineCrossPos);

    // Apply layout to children
    for (let i = 0; i < line.items.length; i++) {
      const child = line.items[i];
      const mainPos = mainResult.positions[i];
      const mainSize = mainResult.sizes[i];
      const crossPos = crossResult.positions[i];
      const crossSize = crossResult.sizes[i];

      // Convert to x/y/width/height based on direction
      if (isRow) {
        child.layout = {
          x: padding.left + mainPos,
          y: padding.top + crossPos,
          width: mainSize,
          height: crossSize,
        };
      } else {
        child.layout = {
          x: padding.left + crossPos,
          y: padding.top + mainPos,
          width: crossSize,
          height: mainSize,
        };
      }

      // Apply margins to final position
      const margin = child.getMargin();

      child.layout.x += margin.left;
      child.layout.y += margin.top;
      child.layout.width -= margin.left + margin.right;
      child.layout.height -= margin.top + margin.bottom;

      // Clamp to valid range
      child.layout.width = Math.max(0, child.layout.width);
      child.layout.height = Math.max(0, child.layout.height);

      // Recursively compute layout for children
      computeNodeLayout(child);
    }

    globalChildIndex += line.items.length;
  }
}

/**
 * Get children sorted by order property
 */
function getOrderedChildren(node: FlexNode): FlexNode[] {
  return [...node.children].sort((a, b) => a.getStyle('order') - b.getStyle('order'));
}

/**
 * Get the main axis size for a child
 */
function getChildMainSize(child: FlexNode, isRow: boolean, availableSize: number): number {
  const flexBasis = child.getStyle('flexBasis');
  const explicitSize = isRow ? child.style.width : child.style.height;

  // flexBasis takes priority
  if (flexBasis !== 'auto') {
    return flexBasis;
  }

  // Then explicit width/height
  if (explicitSize !== undefined && explicitSize !== 'auto') {
    return explicitSize;
  }

  // Auto: use a default proportion (will be distributed by flex-grow)
  // For percentage-based system, default to 0 so flex-grow can distribute
  return 0;
}

/**
 * Get the cross axis size for a child
 */
function getChildCrossSize(child: FlexNode, isRow: boolean, availableSize: number): number {
  const explicitSize = isRow ? child.style.height : child.style.width;

  if (explicitSize !== undefined && explicitSize !== 'auto') {
    return explicitSize;
  }

  // Auto on cross axis defaults to stretch (handled in cross axis algorithm)
  // Return availableSize as base for stretch, actual alignment handles rest
  return availableSize;
}
