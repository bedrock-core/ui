export { Button, type ButtonProps } from './Button';
export { Panel, type PanelProps } from './Panel';
export { Text, type TextProps, type TextStyle } from './Text';
export { Input, type InputProps } from './Form/Input';
export { Toggle, type ToggleProps } from './Form/Toggle';
export { Dropdown, type DropdownProps } from './Form/Dropdown';
export { Slider, type SliderProps } from './Form/Slider';
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