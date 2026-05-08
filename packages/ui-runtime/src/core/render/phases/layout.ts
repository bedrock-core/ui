import type { FlexStyle, LayoutNode } from '@bedrock-core/flexbox';
import { createNode, computeLayout as flexComputeLayout } from '@bedrock-core/flexbox';
import { TextFont } from '@bedrock-core/ui/components/Text';
import type { JSX } from '../../../jsx';
import { measureText } from '../../../util/textMetrics';

// ─── Transparent element types that don't participate in layout ────────────────

const TRANSPARENT = new Set(['fragment', 'context-provider']);

/** Returns true when an element is transparent (fragment / context-provider). */
function isTransparent(el: JSX.Element): boolean {
  return typeof el.type === 'string' && TRANSPARENT.has(el.type);
}

// ─── Build LayoutNode tree from JSX element tree ────────────────────────────────

/**
 * Collect the concrete (non-transparent) JSX descendants of an element.
 * Fragments and context providers are flattened — their children are returned
 * as if they were direct siblings of the fragment.
 */
function collectConcrete(element: JSX.Element): JSX.Element[] {
  if (isTransparent(element)) {
    const ch = element.props.children;

    if (!ch) {
      return [];
    }

    if (Array.isArray(ch)) {
      return ch.flatMap(collectConcrete);
    }

    if (typeof ch === 'string') {
      return [];
    }

    return collectConcrete(ch);
  }

  return [element];
}

interface TextMetricsData {
  text: string;
  font?: TextFont;
}

function extractTextMetrics(props: JSX.Props): TextMetricsData {
  const text = typeof props.value === 'string' ? props.value : '';
  const metrics = props.__textMetrics;
  const isMetricsObject = metrics && typeof metrics === 'object' && !Array.isArray(metrics);
  const font = isMetricsObject ? Reflect.get(metrics, 'font') : undefined;

  return {
    text,
    font: font === 'mojangles' || font === 'minecraft-ten'
      ? font
      : undefined,
  };
}

// Default padding added around button text labels when no explicit size is given.
const BUTTON_PAD_H = 8; // left + right each side
const BUTTON_PAD_V = 4; // top + bottom each side

function withIntrinsicSize(element: JSX.Element, style: FlexStyle): FlexStyle {
  if (style.width !== undefined && style.height !== undefined) {
    return style;
  }

  if (element.type === 'text') {
    const textData = extractTextMetrics(element.props);
    const dims = measureText({
      text: textData.text,
      font: textData.font,
    });
    const next: FlexStyle = { ...style };

    if (next.width === undefined) {
      next.width = dims.width;
    }

    if (next.height === undefined) {
      next.height = dims.height;
    }

    return next;
  }

  if (element.type === 'button') {
    const label = element.props.children;

    if (typeof label === 'string' && label.length > 0) {
      const dims = measureText({ text: label });
      const next: FlexStyle = { ...style };

      if (next.width === undefined) {
        next.width = dims.width + BUTTON_PAD_H * 2;
      }

      if (next.height === undefined) {
        next.height = dims.height + BUTTON_PAD_V * 2;
      }

      return next;
    }
  }

  return style;
}

/**
 * Recursively build a LayoutNode tree that mirrors the (fragment-flattened) JSX tree.
 * Only concrete elements (those with `__layout` props) create LayoutNodes.
 */
function buildNode(element: JSX.Element): LayoutNode {
  const baseStyle = (element.props.__layout ?? {}) as FlexStyle;
  const style = withIntrinsicSize(element, baseStyle);

  const rawChildren = element.props.children;
  let childElements: JSX.Element[] = [];

  if (Array.isArray(rawChildren)) {
    childElements = rawChildren.flatMap(collectConcrete);
  } else if (rawChildren && typeof rawChildren === 'object') {
    childElements = collectConcrete(rawChildren);
  }

  return createNode(style, childElements.map(buildNode));
}

// ─── Apply LayoutNode results back to JSX element tree ─────────────────────────

/**
 * Walk the JSX tree in sync with the LayoutNode tree (fragments are transparent),
 * writing absolute Pocket-space texel values into jsonUIx/y/Width/Height.
 *
 * The layout engine outputs ABSOLUTE TEXELS from the screen origin.
 * We keep those texel values directly for serialization so the RP decoders
 * receive raw Pocket units (0..320 on X/width, 0..210 on Y/height).
 */
function applyToTree(
  element: JSX.Element,
  parentNode: LayoutNode,
  cursor: { index: number },
): void {
  if (isTransparent(element)) {
    // Transparent: descend without consuming a LayoutNode slot
    const ch = element.props.children;

    if (Array.isArray(ch)) {
      ch.forEach(c => applyToTree(c, parentNode, cursor));
    } else if (ch && typeof ch === 'object') {
      applyToTree(ch, parentNode, cursor);
    }

    return;
  }

  const node = parentNode.children[cursor.index++];

  if (!node) {
    return;
  }

  // Keep absolute texel coordinates/sizes for direct RP consumption.
  element.props.jsonUIx = node.layout.x;
  element.props.jsonUIy = node.layout.y;
  element.props.jsonUIWidth = node.layout.width;
  element.props.jsonUIHeight = node.layout.height;

  // Recurse into this element's own children
  const ch = element.props.children;
  const childCursor = { index: 0 };

  if (Array.isArray(ch)) {
    ch.forEach(c => applyToTree(c, node, childCursor));
  } else if (ch && typeof ch === 'object') {
    applyToTree(ch, node, childCursor);
  }
}

// ─── Phase 2 entry point ────────────────────────────────────────────────────────

/**
 * Phase 2 of the render pipeline: compute layout for the full JSX element tree.
 *
 * 1. Builds a LayoutNode tree from the JSX props (`__layout` fields).
 * 2. Runs the 3-pass flexbox engine (`@bedrock-core/flexbox`).
 * 3. Writes resolved texel positions back as absolute Pocket-space values into
 *    `jsonUIx`, `jsonUIy`, `jsonUIWidth`, `jsonUIHeight` on each element.
 *
 * @param tree Root JSX element after Phase 1 (function components expanded).
 * @returns The same element tree, mutated in-place with layout values.
 */
export function computeLayout(tree: JSX.Element): JSX.Element {
  // Build the layout tree (root element is always concrete)
  const root = buildNode(tree);

  // Run the flexbox engine (outputs absolute texel positions)
  flexComputeLayout(root);

  // Write root's own layout results
  tree.props.jsonUIx = root.layout.x;
  tree.props.jsonUIy = root.layout.y;
  tree.props.jsonUIWidth = root.layout.width;
  tree.props.jsonUIHeight = root.layout.height;

  // Write children's layout results
  const ch = tree.props.children;
  const cursor = { index: 0 };

  if (Array.isArray(ch)) {
    ch.forEach(c => applyToTree(c, root, cursor));
  } else if (ch && typeof ch === 'object') {
    applyToTree(ch, root, cursor);
  }

  return tree;
}
