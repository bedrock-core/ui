import type { FlexStyle, LayoutNode } from '@bedrock-core/flexbox';
import { CANONICAL_SCREEN, createNode, computeLayout as flexComputeLayout } from '@bedrock-core/flexbox';
import { TextFont, TextOverflow, TextWordBreak } from '@bedrock-core/ui/components/Text';
import type { JSX } from '../../../jsx';
import { isTransparentType } from '../../componentRegistry';
import { isElement } from '../../guards';
import { ellipsizeText, measureText, wrapText } from '../../../util/textMetrics';

// ─── Transparent element types that don't participate in layout ────────────────

function isTransparent(el: JSX.Element): boolean {
  return typeof el.type === 'string' && isTransparentType(el.type);
}

// ─── Build LayoutNode tree from JSX element tree ────────────────────────────────

function collectConcrete(element: JSX.Node): JSX.Element[] {
  if (!isElement(element)) {
    return [];
  }

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
  scale?: number;
  wordBreak?: TextWordBreak;
  overflow?: TextOverflow;
  maxLines?: number;
}

function extractTextMetrics(props: JSX.Props): TextMetricsData {
  const metrics = props.__textMetrics;
  const isMetricsObject = metrics && typeof metrics === 'object' && !Array.isArray(metrics);

  if (!isMetricsObject) {
    const text = typeof props.value === 'string' ? props.value : '';

    return { text };
  }

  // For localization keys, __textMetrics.resolvedText holds the translated string
  // for layout purposes; props.value holds the key itself (serialized to RP).
  const resolvedText = Reflect.get(metrics, 'resolvedText');
  const text = typeof resolvedText === 'string'
    ? resolvedText
    : typeof props.value === 'string'
      ? props.value
      : '';

  const font = Reflect.get(metrics, 'font');
  const scale = Reflect.get(metrics, 'fontSize');
  const wordBreak = Reflect.get(metrics, 'wordBreak');
  const overflow = Reflect.get(metrics, 'overflow');
  const maxLines = Reflect.get(metrics, 'maxLines');

  return {
    text,
    font: (font === 'mojangles' || font === 'minecraftTen') ? font : undefined,
    scale: typeof scale === 'number' ? scale : undefined,
    wordBreak: wordBreak === 'break-word' ? wordBreak : undefined,
    overflow: overflow === 'ellipsis' ? overflow : undefined,
    maxLines: typeof maxLines === 'number' ? maxLines : undefined,
  };
}

// ─── Available-width helpers ───────────────────────────────────────────────────

function getHorizontalPadding(style: FlexStyle): number {
  if (style.paddingLeft !== undefined || style.paddingRight !== undefined) {
    return (Number(style.paddingLeft) || 0) + (Number(style.paddingRight) || 0);
  }

  return (Number(style.padding) || 0) * 2;
}

function withIntrinsicSize(
  element: JSX.Element,
  style: FlexStyle,
  availableWidth?: number,
): FlexStyle {
  if (element.type !== 'text') {
    return style;
  }

  if (typeof style.width === 'number' && typeof style.height === 'number') {
    return style;
  }

  const td = extractTextMetrics(element.props);
  const hasOverflowProps = td.wordBreak === 'break-word' || td.overflow === 'ellipsis' || td.maxLines !== undefined;

  let displayText = td.text;

  if (hasOverflowProps && availableWidth !== undefined && availableWidth > 0) {
    // Apply wrapping / overflow inline using the parent's available width
    if (td.wordBreak === 'break-word') {
      displayText = wrapText(displayText, availableWidth, td.font, td.scale);
    }

    if (td.maxLines !== undefined) {
      const lines = displayText.split('\n');

      if (lines.length > td.maxLines) {
        const kept = lines.slice(0, td.maxLines);

        // Always ellipsize last line when truncating — clip is unreliable because
        // the serialized string may exceed 80 bytes and Bedrock adds its own ellipsis anyway.
        kept[kept.length - 1] = ellipsizeText(
          kept[kept.length - 1],
          availableWidth,
          td.font,
          td.scale,
        );

        displayText = kept.join('\n');
      }
    } else if (td.overflow === 'ellipsis' && td.wordBreak !== 'break-word') {
      displayText = ellipsizeText(displayText, availableWidth, td.font, td.scale);
    }

    // Mutate props.value so the serializer sees the processed text.
    // Skip for localization keys — props.value must stay as the key for RP lookup.
    const metrics = element.props.__textMetrics;
    const isLocalizationKey = metrics && typeof metrics === 'object' && !Array.isArray(metrics)
      && typeof Reflect.get(metrics, 'resolvedText') === 'string';

    if (!isLocalizationKey) {
      element.props.value = displayText;
    }
  }

  const dims = measureText({
    text: displayText,
    font: td.font,
    fontSize: td.scale,
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

/**
 * Recursively build a LayoutNode tree, propagating the parent's available
 * content width top-down so text elements can apply word-wrap / overflow
 * before the flexbox engine computes their heights.
 */
function buildNode(element: JSX.Element, availableWidth?: number): LayoutNode {
  const baseStyle = (element.props.__layout ?? {}) as FlexStyle;
  const style = withIntrinsicSize(element, baseStyle, availableWidth);

  // Compute the content width available for children of this container.
  // Use the resolved width if explicit, otherwise pass through the parent's
  // available content width minus our own padding.
  let childAvailWidth: number | undefined;

  if (typeof style.width === 'number') {
    childAvailWidth = style.width - getHorizontalPadding(style);
  } else if (availableWidth !== undefined) {
    childAvailWidth = availableWidth - getHorizontalPadding(style);
  }

  if (childAvailWidth !== undefined && childAvailWidth < 0) {
    childAvailWidth = 0;
  }

  const rawChildren = element.props.children;
  let childElements: JSX.Element[] = [];

  if (Array.isArray(rawChildren)) {
    childElements = rawChildren.flatMap(collectConcrete);
  } else if (isElement(rawChildren)) {
    childElements = collectConcrete(rawChildren);
  }

  return createNode(style, childElements.map(c => buildNode(c, childAvailWidth)));
}

// ─── Apply LayoutNode results back to JSX element tree ─────────────────────────

function applyToTree(
  element: JSX.Element,
  parentNode: LayoutNode,
  cursor: { index: number },
): void {
  if (isTransparent(element)) {
    const ch = element.props.children;

    if (Array.isArray(ch)) {
      ch.filter(isElement).forEach((c) => {
        applyToTree(c, parentNode, cursor);
      });
    } else if (isElement(ch)) {
      applyToTree(ch, parentNode, cursor);
    }

    return;
  }

  const node = parentNode.children[cursor.index++];

  if (!node) {
    return;
  }

  element.props.jsonUIx = node.layout.x;
  element.props.jsonUIy = node.layout.y;
  element.props.jsonUIWidth = node.layout.width;
  element.props.jsonUIHeight = node.layout.height;

  const ch = element.props.children;
  const childCursor = { index: 0 };

  if (Array.isArray(ch)) {
    ch.filter(isElement).forEach((c) => {
      applyToTree(c, node, childCursor);
    });
  } else if (isElement(ch)) {
    applyToTree(ch, node, childCursor);
  }
}

// ─── Phase 2 entry point ────────────────────────────────────────────────────────

/**
 * Phase 2 of the render pipeline: compute layout for the full JSX element tree.
 *
 * A single flexbox pass is run. Text elements with wordBreak / overflow / maxLines
 * props have their values rewritten inline during buildNode, using the parent
 * container's available content width propagated top-down from CANONICAL_SCREEN.
 *
 * @param tree Root JSX element after Phase 1 (function components expanded).
 * @returns The same element tree, mutated in-place with layout values.
 */
export function computeLayout(tree: JSX.Element): JSX.Element {
  const concreteRoots = collectConcrete(tree);
  const concreteTree = concreteRoots[0] ?? tree;

  const root = buildNode(concreteTree, CANONICAL_SCREEN.width);

  flexComputeLayout(root);

  concreteTree.props.jsonUIx = root.layout.x;
  concreteTree.props.jsonUIy = root.layout.y;
  concreteTree.props.jsonUIWidth = root.layout.width;
  concreteTree.props.jsonUIHeight = root.layout.height;

  if (concreteTree !== tree) {
    tree.props.jsonUIx = root.layout.x;
    tree.props.jsonUIy = root.layout.y;
    tree.props.jsonUIWidth = root.layout.width;
    tree.props.jsonUIHeight = root.layout.height;
  }

  const ch = concreteTree.props.children;
  const cursor = { index: 0 };

  if (Array.isArray(ch)) {
    ch.filter(isElement).forEach((c) => {
      applyToTree(c, root, cursor);
    });
  } else if (isElement(ch)) {
    applyToTree(ch, root, cursor);
  }

  return tree;
}
