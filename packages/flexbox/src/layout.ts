import { CANONICAL_SCREEN } from './constants';
import type { FlexStyle, LayoutNode } from './types';
import {
  isPercent,
  resolveAlignSelf,
  resolveColumnGap,
  resolveFlexGrow,
  resolveMargin,
  resolvePadding,
  resolveRowGap,
  resolveSize,
  type ResolvedEdges,
} from './utils';

// ─── Small helpers ─────────────────────────────────────────────────────────────

function visible(node: LayoutNode): boolean {
  return node.style.display !== 'none';
}

function relative(node: LayoutNode): boolean {
  return (node.style.position ?? 'relative') === 'relative';
}

/** Resolve the primary flex axis from the flexDirection style. */
function mainAxis(style: FlexStyle): 'row' | 'column' {
  const d = style.flexDirection ?? 'row';

  return d === 'row' || d === 'row-reverse' ? 'row' : 'column';
}

/** Clamp a node's width/height to its min/max constraints (texels or % of parent). */
function clamp(node: LayoutNode, parentW: number, parentH: number): void {
  const s = node.style;
  const minW = resolveSize(s.minWidth, parentW);
  const maxW = resolveSize(s.maxWidth, parentW);
  const minH = resolveSize(s.minHeight, parentH);
  const maxH = resolveSize(s.maxHeight, parentH);

  if (minW !== undefined) {
    node.layout.width = Math.max(node.layout.width, minW);
  }

  if (maxW !== undefined) {
    node.layout.width = Math.min(node.layout.width, maxW);
  }

  if (minH !== undefined) {
    node.layout.height = Math.max(node.layout.height, minH);
  }

  if (maxH !== undefined) {
    node.layout.height = Math.min(node.layout.height, maxH);
  }
}

// ─── Pass 2 helper: content-driven size ────────────────────────────────────────

/**
 * Derive the intrinsic size along `axis` from the node's children.
 *
 * When the axis is the main axis → sum up child sizes + padding + gaps.
 * When the axis is the cross axis → use the widest/tallest child + padding.
 *
 * Only children with FIXED sizes (number, already resolved in pass 2) that are
 * relative-positioned and visible contribute to the parent's size. Flex children
 * and percentage-sized children are excluded (their size depends on the parent).
 */
function deriveSize(node: LayoutNode, axis: 'width' | 'height'): number {
  const s = node.style;
  const dir = mainAxis(s);
  const isMainAxis = (axis === 'width') === (dir === 'row');

  const pad = resolvePadding(s);
  const paddingMain = axis === 'width' ? pad.left + pad.right : pad.top + pad.bottom;
  const gap = axis === 'width' ? resolveRowGap(s) : resolveColumnGap(s);

  const kids = node.children.filter(c => visible(c) && relative(c));

  if (isMainAxis) {
    let total = paddingMain;
    let count = 0;

    for (const child of kids) {
      // Skip flex children and percent-sized children — they need parent size first
      if (resolveFlexGrow(child.style) > 0) {
        continue;
      }

      const styleSize = axis === 'width' ? child.style.width : child.style.height;

      if (isPercent(styleSize)) {
        continue;
      }

      const childSize = axis === 'width' ? child.layout.width : child.layout.height;
      const cm = resolveMargin(child.style);
      const childMargin = axis === 'width' ? cm.left + cm.right : cm.top + cm.bottom;

      total += childSize + childMargin;
      count++;
    }

    if (count > 1) {
      total += (count - 1) * gap;
    }

    return total;
  } else {
    // Cross axis: take the max child size
    let max = 0;

    for (const child of kids) {
      const styleSize = axis === 'width' ? child.style.width : child.style.height;

      if (isPercent(styleSize)) {
        continue;
      }

      const childSize = axis === 'width' ? child.layout.width : child.layout.height;
      const cm = resolveMargin(child.style);
      const childMargin = axis === 'width' ? cm.left + cm.right : cm.top + cm.bottom;

      max = Math.max(max, childSize + childMargin);
    }

    return max + paddingMain;
  }
}

// ─── Pass 3 helper: position children ──────────────────────────────────────────

/**
 * Apply cross-axis alignment to a child.
 * The child's cross-axis position (`x` for column, `y` for row) is set here.
 */
function applyCrossAlign(
  child: LayoutNode,
  pad: ResolvedEdges,
  parent: LayoutNode,
  dir: 'row' | 'column',
  effectiveAlign: string,
): void {
  const cm = resolveMargin(child.style);

  if (dir === 'row') {
    // Cross axis is vertical (y)
    const crossStart = parent.layout.y + pad.top;
    const crossAvail = parent.layout.height - pad.top - pad.bottom;

    if (effectiveAlign === 'flex-start' || effectiveAlign === 'stretch') {
      child.layout.y = crossStart + cm.top;
    } else if (effectiveAlign === 'center') {
      child.layout.y = crossStart + (crossAvail - child.layout.height) / 2;
    } else if (effectiveAlign === 'flex-end') {
      child.layout.y = crossStart + crossAvail - child.layout.height - cm.bottom;
    }
  } else {
    // Cross axis is horizontal (x)
    const crossStart = parent.layout.x + pad.left;
    const crossAvail = parent.layout.width - pad.left - pad.right;

    if (effectiveAlign === 'flex-start' || effectiveAlign === 'stretch') {
      child.layout.x = crossStart + cm.left;
    } else if (effectiveAlign === 'center') {
      child.layout.x = crossStart + (crossAvail - child.layout.width) / 2;
    } else if (effectiveAlign === 'flex-end') {
      child.layout.x = crossStart + crossAvail - child.layout.width - cm.right;
    }
  }
}

// ─── Main entry point ───────────────────────────────────────────────────────────

/**
 * Compute absolute texel positions and sizes for all nodes in the tree.
 *
 * Uses a 3-pass algorithm:
 *  Pass 1 (BFS top-down)  — build level-order list and parent map.
 *  Pass 2 (reverse BFS)   — resolve sizes driven by content / explicit values.
 *  Pass 3 (BFS top-down)  — resolve % sizes, distribute flex, position children.
 *
 * After this call every `node.layout` holds absolute texel values:
 *  - `x`, `y`       — top-left corner from screen origin (0,0)
 *  - `width`, `height` — dimensions in texels
 *  - `zIndex`       — resolved (inherits from parent when not explicitly set)
 *
 * @param root     Root layout node. Its x/y default to 0,0.
 * @param refWidth  Reference width for the root's percentage resolution (default: pocket screen).
 * @param refHeight Reference height for the root's percentage resolution (default: pocket screen).
 */
export function computeLayout(
  root: LayoutNode,
  refWidth = CANONICAL_SCREEN.width,
  refHeight = CANONICAL_SCREEN.height,
): void {
  // ── Root initialisation ─────────────────────────────────────────────────────
  const explicitRootWidth = resolveSize(root.style.width, refWidth);
  const explicitRootHeight = resolveSize(root.style.height, refHeight);
  const hasVisibleRootChildren = root.children.some(visible);

  root.layout.x = 0;
  root.layout.y = 0;
  root.layout.width = explicitRootWidth ?? refWidth;
  root.layout.height = explicitRootHeight ?? (hasVisibleRootChildren ? 0 : refHeight);
  root.layout.zIndex = root.style.zIndex ?? 0;
  clamp(root, refWidth, refHeight);

  // ── Pass 1: BFS — build level-order list ───────────────────────────────────
  const levelOrder: LayoutNode[] = [];
  const parentOf = new Map<LayoutNode, LayoutNode>();

  const bfsQueue: LayoutNode[] = [root];

  while (bfsQueue.length > 0) {
    const node = bfsQueue.shift()!;

    levelOrder.push(node);

    for (const child of node.children) {
      parentOf.set(child, node);

      if (visible(child)) {
        bfsQueue.push(child);
      }
    }
  }

  // ── Pass 2: Bottom-up — resolve content-driven sizes ──────────────────────
  // Iterate from deepest nodes back to root (skip root at index 0)
  for (let i = levelOrder.length - 1; i >= 1; i--) {
    const node = levelOrder[i];
    const parent = parentOf.get(node)!;
    const pW = parent.layout.width;
    const pH = parent.layout.height;
    const s = node.style;

    // Width
    if (typeof s.width === 'number') {
      node.layout.width = s.width;
    } else if (isPercent(s.width)) {
      node.layout.width = 0; // deferred to pass 3
    } else {
      node.layout.width = deriveSize(node, 'width');
    }

    // Height
    if (typeof s.height === 'number') {
      node.layout.height = s.height;
    } else if (isPercent(s.height)) {
      node.layout.height = 0; // deferred to pass 3
    } else {
      node.layout.height = deriveSize(node, 'height');
    }

    clamp(node, pW, pH);
  }

  // Derive root height from content when no explicit height is provided.
  // Behaves like HTML document auto-height: grows to fit content but never
  // shrinks below the canonical viewport (refHeight), so tiny/empty trees
  // never produce an unusably small scroll container.
  if (root.style.height === undefined) {
    const derivedRootHeight = deriveSize(root, 'height');

    root.layout.height = Math.max(derivedRootHeight, refHeight);
    clamp(root, refWidth, refHeight);
  }

  // ── Pass 3: Top-down — resolve %, distribute flex, position children ───────
  for (const node of levelOrder) {
    const parent = parentOf.get(node);
    const pW = parent?.layout.width ?? refWidth;
    const pH = parent?.layout.height ?? refHeight;
    // % sizes resolve against parent *content* box (outer minus padding)
    const parentPad = parent ? resolvePadding(parent.style) : null;
    const contentPW = parentPad ? Math.max(0, pW - parentPad.left - parentPad.right) : pW;
    const contentPH = parentPad ? Math.max(0, pH - parentPad.top - parentPad.bottom) : pH;
    const s = node.style;

    // Resolve own % sizes now that parent dimensions are final
    if (isPercent(s.width)) {
      node.layout.width = (parseFloat(s.width) / 100) * contentPW;
    }

    if (isPercent(s.height)) {
      node.layout.height = (parseFloat(s.height) / 100) * contentPH;
    }

    clamp(node, pW, pH);

    // Inherit zIndex from parent
    node.layout.zIndex = s.zIndex ?? (parent?.layout.zIndex ?? 0);

    const pad = resolvePadding(s);
    const dir = mainAxis(s);
    const mainGap = dir === 'row' ? resolveRowGap(s) : resolveColumnGap(s);
    const alignItems = s.alignItems ?? 'stretch';
    const jc = s.justifyContent ?? 'flex-start';
    const isSpaced = jc === 'space-between' || jc === 'space-around' || jc === 'space-evenly';

    const relKids = node.children.filter(c => visible(c) && relative(c));
    const absKids = node.children.filter(c => visible(c) && !relative(c));

    // ── Resolve children's % sizes against this node's content box ─────────
    const contentW = Math.max(0, node.layout.width - pad.left - pad.right);
    const contentH = Math.max(0, node.layout.height - pad.top - pad.bottom);

    for (const child of node.children) {
      if (!visible(child)) {
        continue;
      }

      if (isPercent(child.style.width)) {
        child.layout.width = (parseFloat(child.style.width) / 100) * contentW;
      }

      if (isPercent(child.style.height)) {
        child.layout.height = (parseFloat(child.style.height) / 100) * contentH;
      }

      clamp(child, node.layout.width, node.layout.height);
    }

    const flexWrap = s.wrap ?? 'nowrap';

    if (flexWrap === 'nowrap') {
      // ── Cross-axis stretch ────────────────────────────────────────────────
      const crossAvail = dir === 'row'
        ? node.layout.height - pad.top - pad.bottom
        : node.layout.width - pad.left - pad.right;

      for (const child of relKids) {
        const eff = resolveAlignSelf(child.style, alignItems);
        const cm = resolveMargin(child.style);

        if (eff === 'stretch') {
          if (dir === 'row' && child.style.height === undefined) {
            child.layout.height = Math.max(0, crossAvail - cm.top - cm.bottom);
          } else if (dir === 'column' && child.style.width === undefined) {
            child.layout.width = Math.max(0, crossAvail - cm.left - cm.right);
          }
        }
      }

      // ── Calculate available main-axis space ───────────────────────────────
      let mainAvail = dir === 'row'
        ? node.layout.width - pad.left - pad.right
        : node.layout.height - pad.top - pad.bottom;

      let totalFlex = 0;
      let flowCount = 0;

      for (const child of relKids) {
        const cm = resolveMargin(child.style);
        const flex = resolveFlexGrow(child.style);
        const childMargin = dir === 'row' ? cm.left + cm.right : cm.top + cm.bottom;

        flowCount++;

        if (flex > 0) {
          totalFlex += flex;
          mainAvail -= childMargin;
        } else {
          const childSize = dir === 'row' ? child.layout.width : child.layout.height;

          mainAvail -= childSize + childMargin;
        }
      }

      // Subtract gaps for non-spaced justifyContent
      if (!isSpaced && flowCount > 1) {
        mainAvail -= (flowCount - 1) * mainGap;
      }

      // ── Distribute flex ────────────────────────────────────────────────────
      if (totalFlex > 0 && mainAvail > 0) {
        for (const child of relKids) {
          const flex = resolveFlexGrow(child.style);

          if (flex > 0) {
            const size = (flex / totalFlex) * mainAvail;

            if (dir === 'row') {
              child.layout.width = Math.max(0, size);
            } else {
              child.layout.height = Math.max(0, size);
            }
          }
        }
      }

      // ── Compute starting cursor for main axis ─────────────────────────────
      let cursor = dir === 'row'
        ? node.layout.x + pad.left
        : node.layout.y + pad.top;

      let spacingGap = 0;

      if (isSpaced && flowCount > 0) {
        // Recalculate total children size for spacing distribution
        let totalChildSize = 0;

        for (const child of relKids) {
          const cm = resolveMargin(child.style);
          const childSize = dir === 'row' ? child.layout.width : child.layout.height;
          const childMargin = dir === 'row' ? cm.left + cm.right : cm.top + cm.bottom;

          totalChildSize += childSize + childMargin;
        }

        const containerMain = dir === 'row'
          ? node.layout.width - pad.left - pad.right
          : node.layout.height - pad.top - pad.bottom;

        const freeSpace = Math.max(0, containerMain - totalChildSize);

        if (jc === 'space-between') {
          spacingGap = flowCount > 1 ? freeSpace / (flowCount - 1) : 0;
        } else if (jc === 'space-around') {
          spacingGap = flowCount > 0 ? freeSpace / flowCount : 0;
          cursor += spacingGap / 2;
        } else {
          // space-evenly
          spacingGap = flowCount > 0 ? freeSpace / (flowCount + 1) : 0;
          cursor += spacingGap;
        }
      } else {
        // Shift cursor for center / flex-end
        if (jc === 'center') {
          cursor += Math.max(0, mainAvail) / 2;
        } else if (jc === 'flex-end') {
          cursor += Math.max(0, mainAvail);
        }
      }

      // ── Position relative children (single line) ──────────────────────────
      for (const child of relKids) {
        const cm = resolveMargin(child.style);

        if (dir === 'row') {
          child.layout.x = cursor + cm.left;
          cursor += child.layout.width + cm.left + cm.right;
        } else {
          child.layout.y = cursor + cm.top;
          cursor += child.layout.height + cm.top + cm.bottom;
        }

        cursor += isSpaced ? spacingGap : mainGap;

        // Cross-axis alignment
        const eff = resolveAlignSelf(child.style, alignItems);

        applyCrossAlign(child, pad, node, dir, eff);
      }
    } else {
      // ── Multi-line (wrap) mode ─────────────────────────────────────────────
      const wrapMainAvail = dir === 'row'
        ? node.layout.width - pad.left - pad.right
        : node.layout.height - pad.top - pad.bottom;

      const crossGap = dir === 'row' ? resolveColumnGap(s) : resolveRowGap(s);

      // Group children into lines
      const lines: LayoutNode[][] = [];
      let currentLine: LayoutNode[] = [];
      let currentLineMainSize = 0;

      for (const child of relKids) {
        const cm = resolveMargin(child.style);
        const childMain = dir === 'row'
          ? child.layout.width + cm.left + cm.right
          : child.layout.height + cm.top + cm.bottom;
        const gapOffset = currentLine.length > 0 ? mainGap : 0;

        if (currentLine.length > 0 && currentLineMainSize + gapOffset + childMain > wrapMainAvail + 0.001) {
          lines.push(currentLine);
          currentLine = [child];
          currentLineMainSize = childMain;
        } else {
          currentLine.push(child);
          currentLineMainSize += gapOffset + childMain;
        }
      }

      if (currentLine.length > 0) {
        lines.push(currentLine);
      }

      // Position each line along the cross axis
      let crossCursor = dir === 'row'
        ? node.layout.y + pad.top
        : node.layout.x + pad.left;

      for (const line of lines) {
        // Compute raw line cross-size (max child cross-size + margins)
        let lineCrossSize = 0;

        for (const child of line) {
          const cm = resolveMargin(child.style);
          const childCross = dir === 'row'
            ? child.layout.height + cm.top + cm.bottom
            : child.layout.width + cm.left + cm.right;

          lineCrossSize = Math.max(lineCrossSize, childCross);
        }

        // Apply cross-axis stretch within this line
        for (const child of line) {
          const eff = resolveAlignSelf(child.style, alignItems);
          const cm = resolveMargin(child.style);

          if (eff === 'stretch') {
            if (dir === 'row' && child.style.height === undefined) {
              child.layout.height = Math.max(0, lineCrossSize - cm.top - cm.bottom);
            } else if (dir === 'column' && child.style.width === undefined) {
              child.layout.width = Math.max(0, lineCrossSize - cm.left - cm.right);
            }
          }
        }

        // Compute main-axis space for this line
        let lineMainUsed = 0;

        for (const child of line) {
          const cm = resolveMargin(child.style);

          lineMainUsed += dir === 'row'
            ? child.layout.width + cm.left + cm.right
            : child.layout.height + cm.top + cm.bottom;
        }

        if (line.length > 1) {
          lineMainUsed += (line.length - 1) * mainGap;
        }

        const lineFree = Math.max(0, wrapMainAvail - lineMainUsed);
        let lineSpacingGap = 0;
        let lineCursor = dir === 'row'
          ? node.layout.x + pad.left
          : node.layout.y + pad.top;

        if (isSpaced && line.length > 0) {
          if (jc === 'space-between') {
            lineSpacingGap = line.length > 1 ? lineFree / (line.length - 1) : 0;
          } else if (jc === 'space-around') {
            lineSpacingGap = lineFree / line.length;
            lineCursor += lineSpacingGap / 2;
          } else {
            // space-evenly
            lineSpacingGap = lineFree / (line.length + 1);
            lineCursor += lineSpacingGap;
          }
        } else {
          if (jc === 'center') {
            lineCursor += lineFree / 2;
          } else if (jc === 'flex-end') {
            lineCursor += lineFree;
          }
        }

        // Position each child in the line
        for (const child of line) {
          const cm = resolveMargin(child.style);
          const eff = resolveAlignSelf(child.style, alignItems);

          if (dir === 'row') {
            // Main axis
            child.layout.x = lineCursor + cm.left;
            lineCursor += child.layout.width + cm.left + cm.right + (isSpaced ? lineSpacingGap : mainGap);
            // Cross axis within line
            const childCross = child.layout.height + cm.top + cm.bottom;

            if (eff === 'flex-start' || eff === 'stretch') {
              child.layout.y = crossCursor + cm.top;
            } else if (eff === 'center') {
              child.layout.y = crossCursor + (lineCrossSize - childCross) / 2 + cm.top;
            } else if (eff === 'flex-end') {
              child.layout.y = crossCursor + lineCrossSize - childCross + cm.top;
            }
          } else {
            // Main axis
            child.layout.y = lineCursor + cm.top;
            lineCursor += child.layout.height + cm.top + cm.bottom + (isSpaced ? lineSpacingGap : mainGap);
            // Cross axis within line
            const childCross = child.layout.width + cm.left + cm.right;

            if (eff === 'flex-start' || eff === 'stretch') {
              child.layout.x = crossCursor + cm.left;
            } else if (eff === 'center') {
              child.layout.x = crossCursor + (lineCrossSize - childCross) / 2 + cm.left;
            } else if (eff === 'flex-end') {
              child.layout.x = crossCursor + lineCrossSize - childCross + cm.left;
            }
          }
        }

        crossCursor += lineCrossSize + crossGap;
      }
    }

    // ── Position absolute children ─────────────────────────────────────────
    for (const child of absKids) {
      const cs = child.style;
      const cm = resolveMargin(cs);

      // Default: top-left of parent (inside padding)
      child.layout.x = node.layout.x + pad.left + cm.left;
      child.layout.y = node.layout.y + pad.top + cm.top;

      // Horizontal
      if (cs.left !== undefined && cs.right !== undefined && cs.width === undefined) {
        child.layout.x = node.layout.x + cs.left;
        child.layout.width = node.layout.width - cs.left - cs.right;
      } else if (cs.left !== undefined) {
        child.layout.x = node.layout.x + cs.left + cm.left;
      } else if (cs.right !== undefined) {
        child.layout.x = node.layout.x + node.layout.width - cs.right - child.layout.width - cm.right;
      }

      // Vertical
      if (cs.top !== undefined && cs.bottom !== undefined && cs.height === undefined) {
        child.layout.y = node.layout.y + cs.top;
        child.layout.height = node.layout.height - cs.top - cs.bottom;
      } else if (cs.top !== undefined) {
        child.layout.y = node.layout.y + cs.top + cm.top;
      } else if (cs.bottom !== undefined) {
        child.layout.y = node.layout.y + node.layout.height - cs.bottom - child.layout.height - cm.bottom;
      }
    }

    // ── Round to integers ───────────────────────────────────────────────────
    node.layout.x = Math.round(node.layout.x);
    node.layout.y = Math.round(node.layout.y);
    node.layout.width = Math.round(node.layout.width);
    node.layout.height = Math.round(node.layout.height);
  }
}
