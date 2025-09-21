export { Button, type ButtonProps } from './Button';
export { Panel, type PanelProps } from './Panel';
export { Text, type TextProps, type TextStyle } from './Text';
export { Input, type InputProps } from './Input';
export { Toggle, type ToggleProps } from './Toggle';
export { Dropdown, type DropdownProps } from './Dropdown';
export { Slider, type SliderProps } from './Slider';
export { Image, type ImageProps } from './Image';

export interface LabelProps {
  label: string;
}

export interface ResizableProps {
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}