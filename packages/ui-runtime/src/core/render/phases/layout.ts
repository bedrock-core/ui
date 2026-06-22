import type { FlexSize, FlexStyle, LayoutNode } from '@bedrock-core/flexbox';
import { CANONICAL_SCREEN, createNode, computeLayout as flexComputeLayout } from '@bedrock-core/flexbox';
import { TextFont, TextOverflow, TextWordBreak } from '@bedrock-core/ui/components/Text';
import type { JSX } from '../../../jsx';
import type { ScrollMetrics } from '../../serializer';
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

  // A <Scroll> is a leaf box in the MAIN pass: it reserves its flex space but its content
  // is laid out separately (in its own scroll viewport), so don't descend into it here.
  if (element.type === SCROLL_SLOT_TYPE) {
    return [element];
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
  // A <Scroll> lays out as a leaf flex box; its viewport rect comes from the parent flow.
  if (element.type === SCROLL_SLOT_TYPE) {
    return createNode(scrollFlexStyle(element), []);
  }

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
  regionIndex = 0,
): void {
  // A <Scroll> consumes its leaf node (its viewport rect) but isn't descended here —
  // its content is laid out region-locally in a separate pass.
  if (element.type === SCROLL_SLOT_TYPE) {
    const node = parentNode.children[cursor.index++];

    if (node) {
      element.props.jsonUIx = node.layout.x;
      element.props.jsonUIy = node.layout.y;
      element.props.jsonUIWidth = node.layout.width;
      element.props.jsonUIHeight = node.layout.height;
    }

    return;
  }

  if (isTransparent(element)) {
    const ch = element.props.children;

    if (Array.isArray(ch)) {
      ch.filter(isElement).forEach((c) => {
        applyToTree(c, parentNode, cursor, regionIndex);
      });
    } else if (isElement(ch)) {
      applyToTree(ch, parentNode, cursor, regionIndex);
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
  // Tag the element with the region (scroll) it belongs to. The `region` key was
  // seeded by withControl (default 0), so reassigning it keeps the canonical
  // field order intact for serialization.
  element.props.region = regionIndex;

  const ch = element.props.children;
  const childCursor = { index: 0 };

  if (Array.isArray(ch)) {
    ch.filter(isElement).forEach((c) => {
      applyToTree(c, node, childCursor, regionIndex);
    });
  } else if (isElement(ch)) {
    applyToTree(ch, node, childCursor, regionIndex);
  }
}

// ─── Scroll slots ───────────────────────────────────────────────────────────────

/**
 * Marker type for a `<Scroll>` wrapper. A slot is transparent (emits no payload) and
 * acts as an independent layout root: its concrete descendants are laid out in their own
 * coordinate space (inside the scroll's viewport) and tagged with the scroll index.
 * When no slots are present the whole tree falls into a single implicit root scroll.
 */
export const SCROLL_SLOT_TYPE = 'scroll-slot';

type ScrollAxis = 'x' | 'y';

interface ScrollSlotConfig {
  axis: ScrollAxis;
  /** Absolute viewport left/top (px); set => removed from the outer flex flow. */
  x?: number;
  y?: number;
  /** Viewport size override (px or %); in flow it sizes the flex item. */
  width?: FlexSize;
  height?: FlexSize;
  /** True when both x and y are set — the viewport is absolutely positioned. */
  absolute: boolean;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isPercent(value: unknown): value is `${number}%` {
  return typeof value === 'string' && /^-?\d+(?:\.\d+)?%$/.test(value);
}

function asFlexSize(value: unknown): FlexSize | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return isPercent(value) ? value : undefined;
}

function scrollSlotConfig(slot: JSX.Element): ScrollSlotConfig {
  const p = slot.props;
  const x = asNumber(p.__x);
  const y = asNumber(p.__y);

  return {
    axis: p.__axis === 'x' ? 'x' : 'y',
    x,
    y,
    width: asFlexSize(p.__width),
    height: asFlexSize(p.__height),
    absolute: x !== undefined && y !== undefined,
  };
}

/**
 * Width handed to the flex root for a horizontal scroll so its row of content can lay
 * out at natural widths without shrinking. The real scroll extent is then read back from
 * the children's right edge. Generous (≫ screen) but bounded.
 */
const HORIZONTAL_EXTENT_BOUND = CANONICAL_SCREEN.width * 64;

/**
 * The flex style for a `<Scroll>` leaf box in the main pass. It grows to share its flex
 * parent's space unless a size is fixed; both `x`+`y` make it absolutely positioned.
 */
function scrollFlexStyle(slot: JSX.Element): FlexStyle {
  const cfg = scrollSlotConfig(slot);
  const style: FlexStyle = {};

  if (cfg.width !== undefined) {
    style.width = cfg.width;
  }

  if (cfg.height !== undefined) {
    style.height = cfg.height;
  }

  if (cfg.absolute) {
    style.position = 'absolute';
    style.left = cfg.x;
    style.top = cfg.y;
  } else if (cfg.width === undefined && cfg.height === undefined) {
    // No fixed size → fill the available space in the flex parent (e.g. equal columns).
    style.flexGrow = 1;
  }

  return style;
}

/**
 * Collect `<Scroll>` elements in document order, descending through ALL elements
 * (concrete and transparent) but NOT into the scrolls themselves — a scroll's content is
 * its own region. Index in this list + 1 is the scroll index (index 0 is the main scroll).
 */
function findScrolls(element: JSX.Node, out: JSX.Element[]): void {
  if (Array.isArray(element)) {
    element.forEach(c => findScrolls(c, out));

    return;
  }

  if (!isElement(element)) {
    return;
  }

  if (element.type === SCROLL_SLOT_TYPE) {
    out.push(element);

    return;
  }

  findScrolls(element.props.children, out);
}

/** Lay out a scroll's content and return its scroll extent (px) along the axis. */
function layoutScrollContent(slot: JSX.Element, axis: ScrollAxis, viewportWidth: number, viewportHeight: number, index: number): number {
  // `expand` normalizes children to an array, so collect concrete roots across the
  // whole child list (collectConcrete itself takes a single node).
  const rawChildren = slot.props.children;
  const roots = Array.isArray(rawChildren)
    ? rawChildren.flatMap(c => collectConcrete(c))
    : collectConcrete(rawChildren);

  let syntheticRoot: LayoutNode;
  let extent: number;

  if (axis === 'x') {
    // Horizontal: lay content in a row at natural widths (height stretched to the
    // viewport). Extent = content right edge. No wrap → intrinsic widths.
    const childNodes = roots.map(r => buildNode(r));

    syntheticRoot = createNode(
      { flexDirection: 'row', width: HORIZONTAL_EXTENT_BOUND, height: viewportHeight },
      childNodes,
    );

    flexComputeLayout(syntheticRoot, viewportWidth, viewportHeight);

    extent = syntheticRoot.children.reduce((max, c) => Math.max(max, c.layout.x + c.layout.width), 0);
  } else {
    // Vertical: lay content in a column whose width is the viewport width, so
    // percentages / stretch / text-wrap resolve against the real column. The flex
    // engine floors the root height to refHeight — pass the viewport height so the
    // extent floors to the viewport (not the canonical 210), then grows with content.
    const childNodes = roots.map(r => buildNode(r, viewportWidth));

    syntheticRoot = createNode({ flexDirection: 'column', width: viewportWidth }, childNodes);

    flexComputeLayout(syntheticRoot, viewportWidth, viewportHeight);

    extent = syntheticRoot.layout.height;
  }

  const cursor = { index: 0 };

  roots.forEach((r) => {
    applyToTree(r, syntheticRoot, cursor, index);
  });

  return extent;
}

// ─── Phase 2 entry point ────────────────────────────────────────────────────────

/**
 * Phase 2 of the render pipeline: compute layout for the full JSX element tree.
 *
 * There is ALWAYS a main scroll (index 0) = the whole tree laid out full-screen, with
 * each `<Scroll>` treated as a leaf box (its viewport rect comes from the normal flow).
 * Each `<Scroll>` then becomes an additional scroll (index 1+): its content is laid out
 * region-locally inside its viewport rect. Per-scroll `{ axis, x, y, width, height,
 * extent }` is written to `tree.props.jsonUIScrolls` (index 0 = main) for the presenter.
 *
 * @param tree Root JSX element after Phase 1 (function components expanded).
 * @returns The same element tree, mutated in-place with layout values.
 */
export function computeLayout(tree: JSX.Element): JSX.Element {
  const slots: JSX.Element[] = [];

  findScrolls(tree, slots);

  // ── Main pass (index 0): whole tree, <Scroll>s as leaf boxes ────────────────────
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
      applyToTree(c, root, cursor, 0);
    });
  } else if (isElement(ch)) {
    applyToTree(ch, root, cursor, 0);
  }

  const scrolls: ScrollMetrics[] = [{
    axis: 'y',
    x: 0,
    y: 0,
    width: CANONICAL_SCREEN.width,
    height: CANONICAL_SCREEN.height,
    extent: root.layout.height,
  }];

  // ── Per-scroll passes (index 1+): each <Scroll>'s content, region-local ──────────
  slots.forEach((slot, k) => {
    const index = k + 1;
    const cfg = scrollSlotConfig(slot);
    const x = asNumber(slot.props.jsonUIx) ?? 0;
    const y = asNumber(slot.props.jsonUIy) ?? 0;
    const width = asNumber(slot.props.jsonUIWidth) ?? CANONICAL_SCREEN.width;
    const height = asNumber(slot.props.jsonUIHeight) ?? CANONICAL_SCREEN.height;
    const extent = layoutScrollContent(slot, cfg.axis, width, height, index);

    scrolls[index] = { axis: cfg.axis, x, y, width, height, extent };
  });

  tree.props.jsonUIScrolls = scrolls;
  tree.props.jsonUIHeight = scrolls[0].height;

  return tree;
}
