import type { JSXElement } from '../types/jsx/types';
import { jsx } from './runtime';
import type {
  PanelJSXComponent,
  TextJSXComponent,
  InputJSXComponent,
  ButtonJSXComponent,
  ToggleJSXComponent,
  DropdownJSXComponent,
  SliderJSXComponent,
  ImageJSXComponent,
} from '../types/jsx/components';

export const Panel = (props: Partial<PanelJSXComponent> = {}): JSXElement =>
  jsx('Panel', props);

export const Text = (props: Partial<TextJSXComponent> = {}): JSXElement =>
  jsx('Text', props);

export const Input = (props: Partial<InputJSXComponent> = {}): JSXElement =>
  jsx('Input', props);

export const Button = (props: Partial<ButtonJSXComponent> = {}): JSXElement =>
  jsx('Button', props);

export const Toggle = (props: Partial<ToggleJSXComponent> = {}): JSXElement =>
  jsx('Toggle', props);

export const Dropdown = (props: Partial<DropdownJSXComponent> = {}): JSXElement =>
  jsx('Dropdown', props);

export const Slider = (props: Partial<SliderJSXComponent> = {}): JSXElement =>
  jsx('Slider', props);

export const Image = (props: Partial<ImageJSXComponent> = {}): JSXElement =>
  jsx('Image', props);

export const Components = {
  Panel,
  Text,
  Input,
  Button,
  Toggle,
  Dropdown,
  Slider,
  Image,
};