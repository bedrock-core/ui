import type { Percent } from '../util';
import type {
  FlexDirection,
  AlignItemsMode,
  JustifyContentMode,
  AlignContentMode,
} from 'flexbox.js';

// Re-export flexbox.js types
export type {
  FlexDirection,
  AlignItemsMode as AlignItems,
  JustifyContentMode as JustifyContent,
  AlignContentMode as AlignContent,
};

export type AlignSelf = 'auto' | AlignItemsMode;
export type Display = 'block' | 'flex';

export interface LayoutProps {
  // Display mode
  display?: Display;

  // Core sizing
  width?: Percent;
  height?: Percent;

  // Flex container properties
  flexDirection?: FlexDirection;
  justifyContent?: JustifyContentMode;
  alignItems?: AlignItemsMode;
  alignContent?: AlignContentMode;
  wrap?: boolean;
  gap?: Percent;

  // Padding
  padding?: Percent;
  paddingTop?: Percent;
  paddingRight?: Percent;
  paddingBottom?: Percent;
  paddingLeft?: Percent;

  // Flex item properties
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: Percent;
  alignSelf?: AlignSelf;

  // Margin
  margin?: Percent;
  marginTop?: Percent;
  marginRight?: Percent;
  marginBottom?: Percent;
  marginLeft?: Percent;

  // Size constraints
  minWidth?: Percent;
  minHeight?: Percent;
  maxWidth?: Percent;
  maxHeight?: Percent;
}
