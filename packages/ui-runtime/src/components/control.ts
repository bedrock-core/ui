import { JSX } from '../jsx/jsx-runtime';
import type { LayoutProps } from './layout';

export interface ControlProps extends LayoutProps {
  visible?: boolean;
  enabled?: boolean;
  background?: string;
}

/**
 * Combines both layout and control props, applying defaults to any missing values.
 * All JSON UI components need at least these values as they define the base control properties.
 *
 * SERIALIZATION ORDER (must match control.json deserialization):
 * Protocol v0004 - Layout computed values: x, y, width, height calculated by flex engine
 * After protocol header (9 bytes: "bcuiv****") and type (string, 83 bytes), fields are serialized in this exact order:
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
 * [440-522]: Field 7: background (string, 83 bytes) - optional background texture path
 * [523-1023]: Reserved (501 bytes)
 *
 * Reserved calculation: 1024 - 9 - 83 - (6 × 83) - (2 × 8) - 83 = 501 bytes
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
    visible,
    enabled,
    background,
    // Layout props
    width,
    height,
    display,
    flexDirection,
    justifyContent,
    alignItems,
    alignContent,
    wrap,
    gap,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    flexGrow,
    flexShrink,
    flexBasis,
    flex,
    alignSelf,
    margin,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    // Positioning
    position,
    top,
    right,
    bottom,
    left,
    zIndex,
  } = props;

  // Create object with properties in exact canonical order for stable serialization
  // x, y will be set by layout phase (computeLayout)
  return {
    // Defaults, computed by layout phase
    jsonUIWidth: 100,
    jsonUIHeight: 100,
    jsonUIx: 0,
    jsonUIy: 0,

    // Control props
    visible: visible ?? true,
    enabled: enabled ?? true,

    background: background ?? 'textures/ui/core-ui/components/common/background', // [440-522] optional background texture path
    $reserved: { bytes: 501 }, // Reserve space for future expansion (since v0004: 501 bytes)

    // Layout props (not serialized, used by layout phase) - stored with __ prefix
    __layout: {
      display,
      width,
      height,
      flexDirection,
      justifyContent,
      alignItems,
      alignContent,
      wrap,
      gap,
      padding,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      flex,
      flexGrow,
      flexShrink,
      flexBasis,
      alignSelf,
      margin,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
      position,
      top,
      right,
      bottom,
      left,
      zIndex,
    },
  };
}

interface JSONUILayoutProps extends JSX.Props {
  jsonUIx: number;
  jsonUIy: number;
  jsonUIWidth: number;
  jsonUIHeight: number;
}

export function isControlled(props: JSX.Props): props is JSONUILayoutProps {
  return (
    typeof props.jsonUIx === 'number'
    && typeof props.jsonUIy === 'number'
    && typeof props.jsonUIWidth === 'number'
    && typeof props.jsonUIHeight === 'number'
  );
}
