import type { AlignItems, FlexSize, FlexStyle, Percent } from './types';

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

export interface ResolvedEdges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Resolve padding shorthand to individual edges (texels).
 * Priority: individual side > shorthand `padding`.
 */
export function resolvePadding(style: FlexStyle): ResolvedEdges {
  const base = style.padding ?? 0;

  return {
    top: style.paddingTop ?? base,
    right: style.paddingRight ?? base,
    bottom: style.paddingBottom ?? base,
    left: style.paddingLeft ?? base,
  };
}

/**
 * Resolve margin shorthand to individual edges (texels).
 * Priority: individual side > shorthand `margin`.
 */
export function resolveMargin(style: FlexStyle): ResolvedEdges {
  const base = style.margin ?? 0;

  return {
    top: style.marginTop ?? base,
    right: style.marginRight ?? base,
    bottom: style.marginBottom ?? base,
    left: style.marginLeft ?? base,
  };
}

/** Return the gap between items on the row axis (texels). */
export function resolveRowGap(style: FlexStyle): number {
  return style.rowGap ?? style.gap ?? 0;
}

/** Return the gap between items on the column axis (texels). */
export function resolveColumnGap(style: FlexStyle): number {
  return style.columnGap ?? style.gap ?? 0;
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
