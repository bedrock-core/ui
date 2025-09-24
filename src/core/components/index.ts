export { Button, type ButtonProps } from './Button';
export { Panel, type PanelProps } from './Panel';
export { Text, type TextProps, type TextStyle } from './Text';
export { Input, type InputProps } from './Form/Input';
export { Toggle, type ToggleProps } from './Form/Toggle';
export { Dropdown, type DropdownProps } from './Form/Dropdown';
export { Slider, type SliderProps } from './Form/Slider';
export { Image, type ImageProps } from './Image';

export interface LabelProps { label: string }

interface LayoutProps {
  // In json ui could be number or string, we treat both as string as it has the larger byte length
  // All mandatory for now as we are going to go with fixed absolute sizing and positioning for now
  width: string;
  height: string;
  x: string;
  y: string;
  inheritMaxSiblingWidth?: boolean;
  inheritMaxSiblingHeight?: boolean;
}

interface ControlProps {
  visible?: boolean;
  enabled?: boolean;
  layer?: number;
  // alpha: number; // float currently does not work in json ui
}

export interface ControledLayoutProps extends LayoutProps, ControlProps { }

function withLayout<T extends LayoutProps>(props: T): Required<LayoutProps> & T {
  return {
    inheritMaxSiblingWidth: props.inheritMaxSiblingWidth ?? false,
    inheritMaxSiblingHeight: props.inheritMaxSiblingHeight ?? false,
    ...props,
  };
}

function withControl<T extends ControlProps>(props: T): Required<ControlProps> & T {
  return {
    visible: props.visible ?? true,
    enabled: props.enabled ?? true,
    layer: props.layer ?? 0,
    ...props,
  };
}

/**
 * Combines both layout and control props, applying defaults to any missing values.
 * All JSON UI components need at least this values so we use them as a base.
 * @param props
 * @returns
 */
export function withControledLayout<T extends LayoutProps & ControlProps>(props: T): Required<LayoutProps> & Required<ControlProps> & T {
  return withControl(withLayout(props));
}
