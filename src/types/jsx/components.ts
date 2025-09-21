/**
 * JSX Component Interfaces
 * Higher-level abstraction over JSON UI components for better developer experience
 */

export interface BaseJSXComponent {
  type: string;
}

export interface PanelJSXComponent extends BaseJSXComponent {
  display?: 'flex' | 'block' | 'grid';
  direction?: 'horizontal' | 'vertical';
  scroll?: boolean;
}

export interface TextJSXComponent extends BaseJSXComponent {
}

export interface InputJSXComponent extends BaseJSXComponent {
  multiline?: boolean;
}

export interface ButtonJSXComponent extends BaseJSXComponent {
}

export interface ToggleJSXComponent extends BaseJSXComponent {
}

export interface DropdownJSXComponent extends BaseJSXComponent {
}

export interface SliderJSXComponent extends BaseJSXComponent {
}

export interface ImageJSXComponent extends BaseJSXComponent {
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