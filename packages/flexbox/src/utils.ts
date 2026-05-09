import type { AlignItems, FlexSize, FlexStyle, Percent, Spacing } from './types';

/** Returns true when a size value is a percentage string. */
export function isPercent(value: unknown): value is Percent {
  return typeof value === 'string' && (value).endsWith('%');
}

/**
 * Resolve a FlexSize to an absolute texel value.
 * - number  → returned as-is
 * - Percent → (n / 100) * parentSize
 * - undefined / 'auto' → undefined (caller decides the fallback)
 */
export function resolveSize(
  value: FlexSize | 'auto' | undefined,
  parentSize: number,
): number | undefined {
  if (value === undefined || value === 'auto') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  return (parseFloat(value) / 100) * parentSize;
}

/**
 * Resolve a single Spacing value (number or percent) to absolute texels.
 * Returns 0 when undefined.
 */
function resolveSpacing(value: Spacing | undefined, base: number): number {
  if (value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  return (parseFloat(value) / 100) * base;
}

export interface ResolvedEdges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Resolve padding shorthand to individual edges (texels).
 * Priority: individual side > shorthand `padding`.
 *
 * Per CSS, percentage padding resolves against the parent's content-box width
 * for ALL four sides (yes, even top/bottom). Caller must pass that base.
 */
export function resolvePadding(style: FlexStyle, parentWidth: number): ResolvedEdges {
  const base = style.padding;

  return {
    top: resolveSpacing(style.paddingTop ?? base, parentWidth),
    right: resolveSpacing(style.paddingRight ?? base, parentWidth),
    bottom: resolveSpacing(style.paddingBottom ?? base, parentWidth),
    left: resolveSpacing(style.paddingLeft ?? base, parentWidth),
  };
}

/**
 * Resolve margin shorthand to individual edges (texels).
 * Priority: individual side > shorthand `margin`.
 *
 * Per CSS, percentage margin resolves against the parent's content-box width
 * for ALL four sides. Caller must pass that base.
 */
export function resolveMargin(style: FlexStyle, parentWidth: number): ResolvedEdges {
  const base = style.margin;

  return {
    top: resolveSpacing(style.marginTop ?? base, parentWidth),
    right: resolveSpacing(style.marginRight ?? base, parentWidth),
    bottom: resolveSpacing(style.marginBottom ?? base, parentWidth),
    left: resolveSpacing(style.marginLeft ?? base, parentWidth),
  };
}

/**
 * Return the gap between items on the row axis (horizontal between siblings).
 * Percent values resolve against the container's own content-box width.
 */
export function resolveRowGap(style: FlexStyle, containerWidth: number): number {
  return resolveSpacing(style.rowGap ?? style.gap, containerWidth);
}

/**
 * Return the gap between items on the column axis (vertical between siblings).
 * Percent values resolve against the container's own content-box height.
 */
export function resolveColumnGap(style: FlexStyle, containerHeight: number): number {
  return resolveSpacing(style.columnGap ?? style.gap, containerHeight);
}

/**
 * Return the effective flex-grow value for an item.
 * `flex` shorthand sets flex-grow when `flexGrow` is not explicitly set.
 */
export function resolveFlexGrow(style: FlexStyle): number {
  if (style.flexGrow !== undefined) {
    return style.flexGrow;
  }

  if (style.flex !== undefined) {
    return style.flex;
  }

  return 0;
}

/**
 * Return the effective flex-shrink value for an item.
 *
 * CSS default is 1 (items shrink to fit). We follow the same default so that
 * overflow is automatically distributed; opt out with `flexShrink: 0`.
 */
export function resolveFlexShrink(style: FlexStyle): number {
  return style.flexShrink ?? 1;
}

/**
 * Return the effective alignment for a child, respecting `alignSelf` override.
 * Falls back to the parent's `alignItems` when alignSelf is 'auto' or not set.
 */
export function resolveAlignSelf(
  childStyle: FlexStyle,
  parentAlignItems: AlignItems,
): AlignItems {
  const as = childStyle.alignSelf ?? 'auto';

  if (as !== 'auto') {
    return as;
  }

  return parentAlignItems;
}
