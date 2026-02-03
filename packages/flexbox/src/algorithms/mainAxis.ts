import type { FlexNode } from '../node.js';
import type { JustifyContent } from '../types.js';

interface MainAxisItem {
  node: FlexNode;
  baseSize: number;
  flexGrow: number;
  flexShrink: number;
  minSize: number;
  maxSize: number;
}

interface MainAxisResult {
  positions: number[];
  sizes: number[];
}

/**
 * Calculate main axis layout for a flex container
 */
export function calculateMainAxis(
  container: FlexNode,
  items: MainAxisItem[],
  availableSize: number,
  gap: number,
): MainAxisResult {
  const itemCount = items.length;

  if (itemCount === 0) {
    return { positions: [], sizes: [] };
  }

  // Calculate total gap space
  const totalGapSpace = gap * (itemCount - 1);
  const availableForItems = availableSize - totalGapSpace;

  // Calculate initial sizes and remaining space
  let sizes = items.map(item => item.baseSize);
  const totalBaseSize = sizes.reduce((a, b) => a + b, 0);
  const remainingSpace = availableForItems - totalBaseSize;

  // Distribute remaining space using flex-grow or flex-shrink
  if (remainingSpace > 0) {
    sizes = distributeGrow(items, sizes, remainingSpace);
  } else if (remainingSpace < 0) {
    sizes = distributeShrink(items, sizes, -remainingSpace);
  }

  // Apply min/max constraints
  sizes = sizes.map((size, i) => {
    const { minSize, maxSize } = items[i];

    return Math.min(Math.max(size, minSize), maxSize);
  });

  // Calculate positions based on justifyContent
  const totalUsedSpace = sizes.reduce((a, b) => a + b, 0);
  const freeSpace = availableForItems - totalUsedSpace;
  const positions = calculatePositions(
    container.getStyle('justifyContent'),
    sizes,
    freeSpace,
    gap,
    container.isReversed(),
  );

  return { positions, sizes };
}

/**
 * Distribute positive remaining space using flex-grow
 */
function distributeGrow(
  items: MainAxisItem[],
  sizes: number[],
  remainingSpace: number,
): number[] {
  const totalGrow = items.reduce((sum, item) => sum + item.flexGrow, 0);

  if (totalGrow === 0) {
    return sizes;
  }

  return sizes.map((size, i) => {
    const growFactor = items[i].flexGrow / totalGrow;

    return size + remainingSpace * growFactor;
  });
}

/**
 * Distribute negative space (shrink items) using flex-shrink
 */
function distributeShrink(
  items: MainAxisItem[],
  sizes: number[],
  overflow: number,
): number[] {
  // Scaled flex shrink: flexShrink * baseSize
  const scaledShrinks = items.map((item, i) => item.flexShrink * sizes[i]);
  const totalScaledShrink = scaledShrinks.reduce((a, b) => a + b, 0);

  if (totalScaledShrink === 0) {
    return sizes;
  }

  return sizes.map((size, i) => {
    const shrinkFactor = scaledShrinks[i] / totalScaledShrink;
    const shrinkAmount = overflow * shrinkFactor;

    return Math.max(0, size - shrinkAmount);
  });
}

/**
 * Calculate positions based on justify-content
 */
function calculatePositions(
  justifyContent: JustifyContent,
  sizes: number[],
  freeSpace: number,
  gap: number,
  isReversed: boolean,
): number[] {
  const itemCount = sizes.length;
  const positions: number[] = [];

  // For reversed layouts, we'll build positions normally then reverse
  let offset = 0;

  switch (justifyContent) {
    case 'flex-start':
      offset = 0;
      break;
    case 'flex-end':
      offset = freeSpace;
      break;
    case 'center':
      offset = freeSpace / 2;
      break;
    case 'space-between':
      offset = 0;
      break;
    case 'space-around':
      offset = freeSpace / (itemCount * 2);
      break;
    case 'space-evenly':
      offset = freeSpace / (itemCount + 1);
      break;
  }

  let currentPos = offset;

  for (let i = 0; i < itemCount; i++) {
    positions.push(currentPos);
    currentPos += sizes[i];

    // Add gap/spacing
    if (i < itemCount - 1) {
      switch (justifyContent) {
        case 'space-between':
          currentPos += freeSpace / (itemCount - 1) + gap;
          break;
        case 'space-around':
          currentPos += (freeSpace / itemCount) + gap;
          break;
        case 'space-evenly':
          currentPos += (freeSpace / (itemCount + 1)) + gap;
          break;
        default:
          currentPos += gap;
      }
    }
  }

  // Handle reversed direction
  if (isReversed) {
    const reversedPositions: number[] = [];
    const totalExtent = positions[itemCount - 1] + sizes[itemCount - 1];

    for (let i = itemCount - 1; i >= 0; i--) {
      reversedPositions.push(totalExtent - positions[i] - sizes[i]);
    }

    return reversedPositions;
  }

  return positions;
}

export type { MainAxisItem, MainAxisResult };
