import { CANONICAL_SCREEN, computeLayout as flexComputeLayout, createNode } from '@bedrock-core/flexbox';
import type { FlexStyle, LayoutNode } from '@bedrock-core/flexbox';
import type { JSX } from '../../../jsx';

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

/**
 * Recursively build a LayoutNode tree that mirrors the (fragment-flattened) JSX tree.
 * Only concrete elements (those with `__layout` props) create LayoutNodes.
 */
function buildNode(element: JSX.Element): LayoutNode {
  const style = (element.props.__layout ?? {}) as FlexStyle;

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
 * writing absolute screen-percentage values into jsonUIx/y/Width/Height.
 *
 * The layout engine outputs ABSOLUTE TEXELS from the screen origin.
 * We convert to 0-100 screen percentages so `scaleForSerialization` in inherit.ts
 * produces the integer-encoded percentage consumed by the JSON UI resource pack.
 *
 * Conversion:
 *   jsonUIWidth  = (layout.width  / CANONICAL_SCREEN.width)  * 100
 *   jsonUIHeight = (layout.height / CANONICAL_SCREEN.height) * 100
 *   jsonUIx      = (layout.x      / CANONICAL_SCREEN.width)  * 100
 *   jsonUIy      = (layout.y      / CANONICAL_SCREEN.height) * 100
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

  // Convert absolute texels → 0-100 screen-relative percentages
  element.props.jsonUIx = (node.layout.x / CANONICAL_SCREEN.width) * 100;
  element.props.jsonUIy = (node.layout.y / CANONICAL_SCREEN.height) * 100;
  element.props.jsonUIWidth = (node.layout.width / CANONICAL_SCREEN.width) * 100;
  element.props.jsonUIHeight = (node.layout.height / CANONICAL_SCREEN.height) * 100;

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
 * 3. Writes resolved texel positions back as 0-100 screen percentages into
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
  tree.props.jsonUIx = (root.layout.x / CANONICAL_SCREEN.width) * 100;
  tree.props.jsonUIy = (root.layout.y / CANONICAL_SCREEN.height) * 100;
  tree.props.jsonUIWidth = (root.layout.width / CANONICAL_SCREEN.width) * 100;
  tree.props.jsonUIHeight = (root.layout.height / CANONICAL_SCREEN.height) * 100;

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
