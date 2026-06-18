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
  regionIndex = 0,
): void {
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

// ─── Region slots ───────────────────────────────────────────────────────────────

/**
 * Marker type for a region/slot wrapper. A slot is transparent (emits no payload)
 * and acts as an independent layout root: its concrete descendants are laid out in
 * their own coordinate space and tagged with the slot's region index. Multi-region
 * screens (e.g. dual scroll) wrap their content in these; single-region screens use
 * none and fall through to the original whole-tree layout path.
 */
export const REGION_SLOT_TYPE = 'region-slot';

function isRegionSlot(element: JSX.Node): boolean {
  return isElement(element) && element.type === REGION_SLOT_TYPE;
}

function regionIndexOf(slot: JSX.Element): number {
  const raw = slot.props.__region;

  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

/**
 * The flexbox width available to a region's content. Slot components set `__regionWidth`
 * to their column width so percentages / stretch / text-wrap inside resolve against the
 * real column — not the full screen. Falls back to the canonical screen width.
 */
function regionWidthOf(slot: JSX.Element): number {
  const raw = slot.props.__regionWidth;

  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : CANONICAL_SCREEN.width;
}

/**
 * Collect region-slot elements in document order, descending only through
 * transparent wrappers (the screen component / fragments above the slots) and not
 * into the slots themselves. Concrete content is never scanned for nested slots —
 * slots are structural children of the screen component.
 */
function findRegionSlots(element: JSX.Node, out: JSX.Element[]): void {
  if (!isElement(element)) {
    return;
  }

  if (isRegionSlot(element)) {
    out.push(element);

    return;
  }

  if (!isTransparent(element)) {
    return;
  }

  const ch = element.props.children;

  if (Array.isArray(ch)) {
    ch.forEach(c => findRegionSlots(c, out));
  } else if (isElement(ch)) {
    findRegionSlots(ch, out);
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
  const slots: JSX.Element[] = [];

  findRegionSlots(tree, slots);

  if (slots.length > 0) {
    return computeRegionLayout(tree, slots);
  }

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

  // Single region: one extent equal to the root content height.
  tree.props.jsonUIRegionExtents = [root.layout.height];

  return tree;
}

/**
 * Multi-region layout: lay out each slot independently in its own coordinate
 * space. Each slot's concrete roots become children of a synthetic column root so
 * 1..N roots are handled uniformly; the resulting offsets are region-local and the
 * synthetic root's height is that region's scroll extent.
 *
 * Region extents are written in region-index order to `tree.props.jsonUIRegionExtents`
 * for the presenter to encode into the title metadata.
 */
function computeRegionLayout(tree: JSX.Element, slots: JSX.Element[]): JSX.Element {
  const ordered = [...slots].sort((a, b) => regionIndexOf(a) - regionIndexOf(b));
  const maxRegion = ordered.reduce((m, s) => Math.max(m, regionIndexOf(s)), 0);
  const extents: number[] = new Array(maxRegion + 1).fill(CANONICAL_SCREEN.height);

  for (const slot of ordered) {
    const regionIndex = regionIndexOf(slot);
    const regionWidth = regionWidthOf(slot);
    // `expand` normalizes children to an array, so collect concrete roots across
    // the whole child list (collectConcrete itself takes a single node).
    const rawChildren = slot.props.children;
    const roots = Array.isArray(rawChildren)
      ? rawChildren.flatMap(c => collectConcrete(c))
      : collectConcrete(rawChildren);
    // Lay each region out in its own column whose width is the region width, so the
    // content's percentages / stretch / text-wrap resolve against the real column.
    const childNodes = roots.map(r => buildNode(r, regionWidth));
    const syntheticRoot = createNode({ flexDirection: 'column', width: regionWidth }, childNodes);

    flexComputeLayout(syntheticRoot);

    const cursor = { index: 0 };

    roots.forEach((r) => {
      applyToTree(r, syntheticRoot, cursor, regionIndex);
    });

    extents[regionIndex] = syntheticRoot.layout.height;
  }

  tree.props.jsonUIRegionExtents = extents;
  // Fall back height for any consumer reading the legacy single value.
  tree.props.jsonUIHeight = extents[0];

  return tree;
}
