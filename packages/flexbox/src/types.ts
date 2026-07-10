/** Percentage string, e.g. "50%", "100%", "33.5%" */
export type Percent = `${number}%`;

/** Size value: absolute texels or a percentage of the parent container. */
export type FlexSize = number | Percent;

/**
 * Spacing value for padding, margin, and gap.
 *
 * - number  → absolute texels
 * - Percent → resolved against a base dimension (CSS rules):
 *   - padding/margin %: parent's content-box width (all four sides)
 *   - gap %: container's own content-box dimension on that axis
 *     (rowGap / row-direction gap → width; columnGap / column-direction gap → height)
 *
 * Percent gaps inside content-derived sizing (Pass 2) collapse to 0 to avoid
 * a circular dependency with the parent's not-yet-known dimensions.
 */
export type Spacing = number | Percent;

export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type JustifyContent
  = | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';
export type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch';
export type AlignContent
  = | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'stretch'
    | 'space-between'
    | 'space-around';
export type AlignSelf = 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch';
export type Display = 'flex' | 'none';
export type Position = 'relative' | 'absolute';

export interface FlexStyle {
  // ── Display & positioning ──────────────────────────────────────────────────
  display?: Display;
  position?: Position;

  // ── Sizing (texels or percent of parent) ──────────────────────────────────
  width?: FlexSize;
  height?: FlexSize;
  minWidth?: FlexSize;
  maxWidth?: FlexSize;
  minHeight?: FlexSize;
  maxHeight?: FlexSize;

  aspectRatio?: number;

  // ── Flex container ─────────────────────────────────────────────────────────
  flexDirection?: FlexDirection;
  /** Alias for flexWrap */
  wrap?: FlexWrap;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  alignContent?: AlignContent;
  gap?: Spacing;
  rowGap?: Spacing;
  columnGap?: Spacing;

  // ── Flex item ──────────────────────────────────────────────────────────────
  /** Shorthand: sets flexGrow when flexGrow is not explicitly set. */
  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: FlexSize | 'auto';
  alignSelf?: AlignSelf;

  // ── Padding (texels or % of parent width) ──────────────────────────────────
  padding?: Spacing;
  paddingTop?: Spacing;
  paddingRight?: Spacing;
  paddingBottom?: Spacing;
  paddingLeft?: Spacing;

  // ── Margin (texels or % of parent width) ───────────────────────────────────
  margin?: Spacing;
  marginTop?: Spacing;
  marginRight?: Spacing;
  marginBottom?: Spacing;
  marginLeft?: Spacing;

  // ── Absolute positioning offsets (texels, relative to parent) ─────────────
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;

  // ── Z-order ────────────────────────────────────────────────────────────────
  zIndex?: number;
}

/** Resolved absolute layout output (in texels). All values are rounded integers. */
export interface ComputedLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

/** Size returned by a {@link MeasureFunc}, in texels. */
export interface MeasuredSize {
  width: number;
  height: number;
}

/**
 * Content measure callback for LEAF nodes whose intrinsic size depends on the
 * width the layout grants them (e.g. wrapping text: narrower box → more lines
 * → taller). `computeLayout()` drives it:
 *
 *  - once with `Infinity` to seed the max-content size (CSS auto flex-basis
 *    semantics), and
 *  - after each solve with the node's granted `layout.width`, re-solving when
 *    the returned size changed (bounded fixpoint — heights almost never feed
 *    back into widths, so one re-solve converges in practice).
 *
 * Explicit `style.width`/`style.height` always win over the measured size.
 */
export type MeasureFunc = (availableWidth: number) => MeasuredSize;

/** A node in the layout tree, mirrors the component hierarchy. */
export interface LayoutNode {
  style: FlexStyle;
  children: LayoutNode[];
  layout: ComputedLayout;
  /** Width-dependent content sizing for leaves (see {@link MeasureFunc}). Takes precedence over child-derived sizing. */
  measure?: MeasureFunc;
}
