import type { FlexNode } from '../node.js';
import type { AlignItems } from '../types.js';

interface CrossAxisItem {
  node: FlexNode;
  size: number; // Current cross-axis size
  minSize: number;
  maxSize: number;
}

interface CrossAxisResult {
  positions: number[];
  sizes: number[];
}

/**
 * Calculate cross axis layout for items in a single flex line
 */
export function calculateCrossAxis(
  container: FlexNode,
  items: CrossAxisItem[],
  availableSize: number,
  lineOffset: number = 0,
): CrossAxisResult {
  const itemCount = items.length;

  if (itemCount === 0) {
    return { positions: [], sizes: [] };
  }

  const containerAlign = container.getStyle('alignItems');
  const positions: number[] = [];
  const sizes: number[] = [];

  for (let i = 0; i < itemCount; i++) {
    const item = items[i];
    const alignSelf = item.node.getStyle('alignSelf');
    const effectiveAlign: AlignItems = alignSelf === 'auto' ? containerAlign : alignSelf;

    let itemSize = item.size;
    let itemPosition = lineOffset;

    switch (effectiveAlign) {
      case 'flex-start':
        itemPosition = lineOffset;
        break;

      case 'flex-end':
        itemPosition = lineOffset + availableSize - itemSize;
        break;

      case 'center':
        itemPosition = lineOffset + (availableSize - itemSize) / 2;
        break;

      case 'stretch':
        // Stretch to fill available space (respecting min/max)
        itemSize = Math.min(Math.max(availableSize, item.minSize), item.maxSize);
        itemPosition = lineOffset;
        break;
    }

    positions.push(itemPosition);
    sizes.push(itemSize);
  }

  return { positions, sizes };
}

export type { CrossAxisItem, CrossAxisResult };
