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

interface ControlProps {
  visible?: boolean;
  enabled?: boolean;
  layer?: number;
  // alpha: number; // float currently does not work in json ui

  /* @internal */
  __controlReserved?: ReservedBytes;
}

interface LayoutProps {
  // In json ui could be number or string, we treat both as string as it has the larger byte length
  // All mandatory for now as we are going to go with fixed absolute sizing and positioning for now
  width: string;
  height: string;
  x: string;
  y: string;
  inheritMaxSiblingWidth?: boolean;
  inheritMaxSiblingHeight?: boolean;

  /* @internal */
  __layoutReserved?: ReservedBytes;
}

export interface ControledLayoutProps extends LayoutProps, ControlProps {

  /* @internal */
  __coreReserved?: ReservedBytes;
}

/**
 * Combines both layout and control props, applying defaults to any missing values.
 * All JSON UI components need at least this values so we use them as a base.
 * Creates properties in canonical order for stable serialization.
 * @param props
 * @returns
 */
export function withControledLayout<T extends ControledLayoutProps>(props: T): Required<T> {
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
    __controlReserved: reserveBytes(93), // Reserve 93 bytes to reach 128 total for control properties
    inheritMaxSiblingWidth: inheritMaxSiblingWidth ?? false,
    inheritMaxSiblingHeight: inheritMaxSiblingHeight ?? false,
    width,
    height,
    x,
    y,
    __layoutReserved: reserveBytes(100), // Reserve 100 bytes to reach 256 total for layout properties
    __coreReserved: reserveBytes(128), // Reserve up to 512 bytes for addition of more core properties without breaking serialization protocol version
  };

  // Append the rest of the props, which are specific to the component and order will be handled by the component itself
  return { ...ordered, ...rest } as Required<T>;
}
