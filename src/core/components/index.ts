import { ReservedBytes } from '../../types';
import { reserveBytes } from '../serializer';

export { Button, type ButtonProps } from './Button';
export { Panel, type PanelProps } from './Panel';
export { Text, type TextProps, type TextStyle } from './Text';
export { Input, type InputProps } from './Form/Input';
export { Toggle, type ToggleProps } from './Form/Toggle';
export { Dropdown, type DropdownProps } from './Form/Dropdown';
export { Slider, type SliderProps } from './Form/Slider';
export { Image, type ImageProps } from './Image';

export interface LabelProps { label: string }

export interface ControlProps {
  visible?: boolean;
  enabled?: boolean;
  layer?: number;
  // alpha: number; // float currently does not work in json ui

  // In json ui could be number or string, we treat both as string as it has the larger byte length
  // All mandatory for now as we are going to go with fixed absolute sizing and positioning for now
  width: string;
  height: string;
  x: string;
  y: string;
  inheritMaxSiblingWidth?: boolean;
  inheritMaxSiblingHeight?: boolean;

  /* @internal */
  __reserved?: ReservedBytes;
}

/**
 * Combines both layout and control props, applying defaults to any missing values.
 * All JSON UI components need at least these values as they define the base control properties.
 *
 * SERIALIZATION ORDER (must match control.json deserialization):
 * After protocol header (9 bytes: "bcuiv0001"), fields are deserialized in this exact order:
 *
 * Field 0: type (string, 35 bytes) - component type identifier
 * Field 1: visible (bool, 8 bytes) - visibility state
 * Field 2: enabled (bool, 8 bytes) - interaction enabled state
 * Field 3: layer (int, 19 bytes) - z-index layering
 * Field 4: width (string, 35 bytes) - element width
 * Field 5: height (string, 35 bytes) - element height
 * Field 6: x (string, 35 bytes) - horizontal position
 * Field 7: y (string, 35 bytes) - vertical position
 * Field 8: inheritMaxSiblingWidth (bool, 8 bytes) - width inheritance flag
 * Field 9: inheritMaxSiblingHeight (bool, 8 bytes) - height inheritance flag
 * Reserved: 277 bytes (up to 512 bytes total reserved block for future expansion)
 *
 * Component-specific properties are appended after the reserved block.
 *
 * @param props Component properties extending ControlProps
 * @returns Object with all control properties filled with defaults and canonical ordering
 */
export function withControl<T extends ControlProps>(props: T): Required<ControlProps> & T {
  const {
    visible,
    enabled,
    layer,
    width,
    height,
    x,
    y,
    inheritMaxSiblingWidth,
    inheritMaxSiblingHeight,
    // rest of props are the props specific to the component, which will be appended at the end
    ...rest
  } = props;

  // Create object with properties in exact canonical order for stable serialization
  const ordered = {
    visible: visible ?? true,
    enabled: enabled ?? true,
    layer: layer ?? 0,
    width,
    height,
    x,
    y,
    inheritMaxSiblingWidth: inheritMaxSiblingWidth ?? false,
    inheritMaxSiblingHeight: inheritMaxSiblingHeight ?? false,
    __reserved: reserveBytes(277), // Reserve space for future expansion
  };

  // Append the rest of the props, which are specific to the component and order will be handled by the component itself
  return { ...ordered, ...rest } as Required<ControlProps> & T;
}
