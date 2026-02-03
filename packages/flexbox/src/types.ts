// ============================================
// Flex Direction
// ============================================
export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';

// ============================================
// Flex Wrap
// ============================================
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';

// ============================================
// Justify Content (main axis)
// ============================================
export type JustifyContent
  = | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';

// ============================================
// Align Items (cross axis)
// ============================================
export type AlignItems
  = | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'stretch';

// ============================================
// Align Self (item override)
// ============================================
export type AlignSelf = 'auto' | AlignItems;

// ============================================
// Align Content (multi-line cross axis)
// ============================================
export type AlignContent
  = | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'stretch'
    | 'space-between'
    | 'space-around';

// ============================================
// Flex Style (input configuration)
// ============================================
export interface FlexStyle {
  // Container properties
  flexDirection?: FlexDirection;
  flexWrap?: FlexWrap;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  alignContent?: AlignContent;
  gap?: number;
  rowGap?: number;
  columnGap?: number;

  // Item properties
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | 'auto';
  alignSelf?: AlignSelf;
  order?: number;

  // Sizing (all in %)
  width?: number | 'auto';
  height?: number | 'auto';
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;

  // Padding (all in %)
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  // Margin (all in %)
  margin?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
}

// ============================================
// Computed Layout (output)
// ============================================
export interface ComputedLayout {
  x: number; // % from parent left
  y: number; // % from parent top
  width: number; // % of parent width
  height: number; // % of parent height
}

// ============================================
// Default Style Values
// ============================================
export const DEFAULT_STYLE: Required<Omit<FlexStyle, 'width' | 'height' | 'flexBasis'>> & {
  width: number | 'auto';
  height: number | 'auto';
  flexBasis: number | 'auto';
} = {
  // Container
  flexDirection: 'row',
  flexWrap: 'nowrap',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  alignContent: 'stretch',
  gap: 0,
  rowGap: 0,
  columnGap: 0,

  // Item
  flexGrow: 0,
  flexShrink: 1,
  flexBasis: 'auto',
  alignSelf: 'auto',
  order: 0,

  // Sizing
  width: 'auto',
  height: 'auto',
  minWidth: 0,
  maxWidth: 100,
  minHeight: 0,
  maxHeight: 100,

  // Padding
  padding: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,

  // Margin
  margin: 0,
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
};
