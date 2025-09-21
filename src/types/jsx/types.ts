/**
 * JSX Element interface for React-like syntax support
 */
export interface JSXElement {
  type: string | ComponentFunction;
  props: Record<string, any>;
  children?: JSXElement[];
}

/**
 * Component function type for React-like components
 */
export type ComponentFunction = () => JSXElement;

/**
 * JSX.Element type for TypeScript JSX support
 */
declare global {
  namespace JSX {
    interface Element extends JSXElement { }

    interface IntrinsicElements {
      // Unified Components
      Panel: Partial<import('./components').PanelJSXComponent>;
      Text: Partial<import('./components').TextJSXComponent>;
      Input: Partial<import('./components').InputJSXComponent>;

      // Direct Mapping Components
      Button: Partial<import('./components').ButtonJSXComponent>;
      Toggle: Partial<import('./components').ToggleJSXComponent>;
      Dropdown: Partial<import('./components').DropdownJSXComponent>;
      Slider: Partial<import('./components').SliderJSXComponent>;
      Image: Partial<import('./components').ImageJSXComponent>;
    }
  }
}
