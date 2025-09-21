/**
 * JSX Component Interfaces
 * Higher-level abstraction over JSON UI components for better developer experience
 */

export interface PanelJSXComponent {
  display?: 'flex' | 'block' | 'grid';
  direction?: 'horizontal' | 'vertical';
  scroll?: boolean;
}

export interface TextJSXComponent {
}

export interface InputJSXComponent {
  multiline?: boolean;
}

export interface ButtonJSXComponent {

}

export interface ToggleJSXComponent {

}

export interface DropdownJSXComponent {

}

export interface SliderJSXComponent {

}

export interface ImageJSXComponent {

}

export type JSXComponent =
  | PanelJSXComponent
  | TextJSXComponent
  | InputJSXComponent
  | ButtonJSXComponent
  | ToggleJSXComponent
  | DropdownJSXComponent
  | SliderJSXComponent
  | ImageJSXComponent;