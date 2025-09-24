export { Button, type ButtonProps } from './Button';
export { Panel, type PanelProps } from './Panel';
export { Text, type TextProps, type TextStyle } from './Text';
export { Input, type InputProps } from './Form/Input';
export { Toggle, type ToggleProps } from './Form/Toggle';
export { Dropdown, type DropdownProps } from './Form/Dropdown';
export { Slider, type SliderProps } from './Form/Slider';
export { Image, type ImageProps } from './Image';

export interface LabelProps { label: string }

export interface ResizableProps {
  // In json ui could be number or string, we treat both as string as it has the larger byte length
  // All mandatory for now as we are going to go with fixed absolute sizing and positioning for now
  width: string;
  height: string;
  x: string;
  y: string;
}
