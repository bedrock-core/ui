import { JSX } from '../jsx/jsx-runtime';
import type { Percent } from '../util';

export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
export type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
export type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
export type AlignContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'stretch';
export type AlignSelf = 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
export type Display = 'block' | 'flex';

export type Spacing = Percent | number | {
  top?: Percent | number;
  right?: Percent | number;
  bottom?: Percent | number;
  left?: Percent | number;
};

export interface ControlProps {
  // Display and sizing - all use Percent type (number or "50%" string)
  display?: Display;
  width?: Percent | number;
  height?: Percent | number;
  visible?: boolean;
  enabled?: boolean;

  // Flex container properties
  flexDirection?: FlexDirection;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  alignContent?: AlignContent;
  wrap?: boolean;
  gap?: Percent | number;
  padding?: Spacing;

  // Flex item properties
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: Percent | number;
  alignSelf?: AlignSelf;
  margin?: Spacing;

  // Size constraints
  minWidth?: Percent | number;
  minHeight?: Percent | number;
  maxWidth?: Percent | number;
  maxHeight?: Percent | number;
}

/**
 * Combines both layout and control props, applying defaults to any missing values.
 * All JSON UI components need at least these values as they define the base control properties.
 *
 * SERIALIZATION ORDER (must match control.json deserialization):
 * Protocol v0003 - Layout computed values: x, y, width, height calculated by flex engine
 * After protocol header (9 bytes: "bcuiv0003") and type (string, 83 bytes), fields are serialized in this exact order:
 *
 * Byte Allocation Map (1024-byte control block):
 * [0-8]:     Protocol header (9 bytes)
 * [9-91]:    Type field (string, 83 bytes)
 * [92-174]:  Field 1: width (number, 83 bytes) - computed width from layout
 * [175-257]: Field 2: height (number, 83 bytes) - computed height from layout
 * [258-340]: Field 3: x (number, 83 bytes) - computed x position from layout
 * [341-423]: Field 4: y (number, 83 bytes) - computed y position from layout
 * [424-431]: Field 5: visible (bool, 8 bytes) - visibility state
 * [432-439]: Field 6: enabled (bool, 8 bytes) - interaction enabled state
 * [440-522]: Field 7: layer (number, 83 bytes) - z-index layering
 * [523-605]: Field 8: alpha (number, 83 bytes) - element transparency
 * [606-613]: Field 9: inheritMaxSiblingWidth (bool, 8 bytes) - width inheritance flag
 * [614-621]: Field 10: inheritMaxSiblingHeight (bool, 8 bytes) - height inheritance flag
 * [622-1023]: Reserved (402 bytes)
 *
 * Reserved calculation: 1024 - 9 - 83 - (6 × 83) - (4 × 8) = 402 bytes
 * (up to 1024 bytes total reserved block for future expansion)
 *
 * Component-specific properties are appended after the reserved block.
 *
 * NOTE: x, y, width, height are computed by the layout phase and should not be manually set.
 * Use flex layout properties (flexGrow, width, etc.) to control sizing instead.
 *
 * @param props Component properties extending ControlProps
 * @returns Object with all control properties filled with defaults and canonical ordering
 */
export function withControl(props: JSX.Props): JSX.Props {
  const {
    width,
    height,
    visible,
    enabled,
    display,
    flexDirection,
    justifyContent,
    alignItems,
    alignContent,
    wrap,
    gap,
    padding,
    flexGrow,
    flexShrink,
    flexBasis,
    alignSelf,
    margin,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
  } = props;

  // Create object with properties in exact canonical order for stable serialization
  // x, y will be set by layout phase (computeLayout)
  return {
    // Computed by layout (defaults for serialization)
    width: width ?? 0,
    height: height ?? 0,
    x: 0, // Computed by layout phase
    y: 0, // Computed by layout phase

    // Control props
    visible: visible ?? true,
    enabled: enabled ?? true,

    // Legacy fields (kept for byte space)
    layer: 0,
    alpha: 1.0,
    inheritMaxSiblingWidth: false,
    inheritMaxSiblingHeight: false,
    $reserved: { bytes: 402 }, // Reserve space for future expansion (v0003: 402 bytes)

    // Flex layout props (not serialized, used by layout phase)
    __display: display ?? 'block',
    __flexDirection: flexDirection,
    __justifyContent: justifyContent,
    __alignItems: alignItems,
    __alignContent: alignContent,
    __wrap: wrap,
    __gap: gap,
    __padding: padding,
    __flexGrow: flexGrow,
    __flexShrink: flexShrink,
    __flexBasis: flexBasis,
    __alignSelf: alignSelf,
    __margin: margin,
    __minWidth: minWidth,
    __minHeight: minHeight,
    __maxWidth: maxWidth,
    __maxHeight: maxHeight,
  };
}
