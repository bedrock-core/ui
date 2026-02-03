import type { FlexNode } from '../node.js';
import type { AlignContent } from '../types.js';

interface FlexLine {
  items: FlexNode[];
  mainSize: number; // Total size on main axis
  crossSize: number; // Size on cross axis (max item cross size)
}

interface WrapResult {
  lines: FlexLine[];
  linePositions: number[]; // Cross-axis position for each line
  lineSizes: number[]; // Cross-axis size for each line
}

/**
 * Wrap items into multiple flex lines based on available space
 */
export function wrapItems(
  container: FlexNode,
  itemSizes: { main: number; cross: number }[],
  availableMainSize: number,
  gap: number,
): FlexLine[] {
  const flexWrap = container.getStyle('flexWrap');
  const children = container.children;

  if (flexWrap === 'nowrap' || children.length === 0) {
    // No wrapping - single line
    const totalMain = itemSizes.reduce((sum, s) => sum + s.main, 0)
      + gap * (itemSizes.length - 1);
    const maxCross = Math.max(...itemSizes.map(s => s.cross), 0);

    return [{
      items: [...children],
      mainSize: totalMain,
      crossSize: maxCross,
    }];
  }

  const lines: FlexLine[] = [];
  let currentLine: FlexNode[] = [];
  let currentLineMain = 0;
  let currentLineCross = 0;

  for (let i = 0; i < children.length; i++) {
    const { main, cross } = itemSizes[i];
    const gapBefore = currentLine.length > 0 ? gap : 0;
    const projectedSize = currentLineMain + gapBefore + main;

    // Check if item fits in current line
    if (currentLine.length > 0 && projectedSize > availableMainSize) {
      // Start new line
      lines.push({
        items: currentLine,
        mainSize: currentLineMain,
        crossSize: currentLineCross,
      });
      currentLine = [];
      currentLineMain = 0;
      currentLineCross = 0;
    }

    currentLine.push(children[i]);
    currentLineMain += (currentLine.length > 1 ? gap : 0) + main;
    currentLineCross = Math.max(currentLineCross, cross);
  }

  // Add last line
  if (currentLine.length > 0) {
    lines.push({
      items: currentLine,
      mainSize: currentLineMain,
      crossSize: currentLineCross,
    });
  }

  // Handle wrap-reverse
  if (flexWrap === 'wrap-reverse') {
    lines.reverse();
  }

  return lines;
}

/**
 * Calculate line positions based on align-content
 */
export function calculateLinePositions(
  alignContent: AlignContent,
  lineSizes: number[],
  availableCrossSize: number,
  crossGap: number,
): { positions: number[]; sizes: number[] } {
  const lineCount = lineSizes.length;

  if (lineCount === 0) {
    return { positions: [], sizes: [] };
  }

  const totalGapSpace = crossGap * (lineCount - 1);
  const totalLineSize = lineSizes.reduce((a, b) => a + b, 0);
  const freeSpace = availableCrossSize - totalLineSize - totalGapSpace;

  const positions: number[] = [];
  const sizes = [...lineSizes];
  let offset = 0;

  switch (alignContent) {
    case 'flex-start':
      offset = 0;
      break;
    case 'flex-end':
      offset = freeSpace;
      break;
    case 'center':
      offset = freeSpace / 2;
      break;
    case 'stretch':
      // Distribute free space equally among lines
      offset = 0;

      if (freeSpace > 0) {
        const extraPerLine = freeSpace / lineCount;

        for (let i = 0; i < lineCount; i++) {
          sizes[i] += extraPerLine;
        }
      }

      break;
    case 'space-between':
      offset = 0;
      break;
    case 'space-around':
      offset = freeSpace / (lineCount * 2);
      break;
  }

  let currentPos = offset;

  for (let i = 0; i < lineCount; i++) {
    positions.push(currentPos);
    currentPos += sizes[i];

    if (i < lineCount - 1) {
      switch (alignContent) {
        case 'space-between':
          currentPos += freeSpace / (lineCount - 1) + crossGap;
          break;
        case 'space-around':
          currentPos += (freeSpace / lineCount) + crossGap;
          break;
        default:
          currentPos += crossGap;
      }
    }
  }

  return { positions, sizes };
}

export type { FlexLine, WrapResult };
