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
      // Container Components
      Panel: Partial<import('../json_ui/components.js').PanelComponent>;
      StackPanel: Partial<import('../json_ui/components.js').StackPanelComponent>;
      CollectionPanel: Partial<import('../json_ui/components.js').CollectionPanelComponent>;
      Grid: Partial<import('../json_ui/components.js').GridComponent>;
      ScrollView: Partial<import('../json_ui/components.js').ScrollViewComponent>;

      // Interactive Components
      Button: Partial<import('../json_ui/components.js').ButtonComponent>;
      Toggle: Partial<import('../json_ui/components.js').ToggleComponent>;
      Dropdown: Partial<import('../json_ui/components.js').DropdownComponent>;
      Slider: Partial<import('../json_ui/components.js').SliderComponent>;
      EditBox: Partial<import('../json_ui/components.js').EditBoxComponent>;
      InputPanel: Partial<import('../json_ui/components.js').InputPanelComponent>;

      // Display Components
      Label: Partial<import('../json_ui/components.js').LabelComponent>;
      Image: Partial<import('../json_ui/components.js').ImageComponent>;
    }
  }
}

// Re-export Component for convenience
export type { Component } from '../json_ui/components.js';
