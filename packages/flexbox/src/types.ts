/** Percentage string, e.g. "50%", "100%", "33.5%" */
export type Percent = `${number}%`;

/** Size value: absolute texels or a percentage of the parent container. */
export type FlexSize = number | Percent;

/** Spacing value: always absolute texels (padding, margin, gap). */
export type Spacing = number;

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

  // ── Padding (texels) ───────────────────────────────────────────────────────
  padding?: Spacing;
  paddingTop?: Spacing;
  paddingRight?: Spacing;
  paddingBottom?: Spacing;
  paddingLeft?: Spacing;

  // ── Margin (texels) ────────────────────────────────────────────────────────
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

/** A node in the layout tree, mirrors the component hierarchy. */
export interface LayoutNode {
  style: FlexStyle;
  children: LayoutNode[];
  layout: ComputedLayout;
}
