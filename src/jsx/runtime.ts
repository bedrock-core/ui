import type { Component } from '../types/json_ui/components';
import type { JSXElement, ComponentFunction } from '../types/jsx/types';
import { mapJSXToJSONUI } from './mapper';

/**
 * JSX factory function (replaces React.createElement)
 * 
 * This function creates JSX elements that can be processed by the framework.
 * It follows the React createElement signature for compatibility with JSX transforms.
 * 
 * @param type - Component type (string or function)
 * @param props - Component properties
 * @param children - Child elements
 * @returns JSX element
 */
export function jsx(
  type: string | ComponentFunction,
  props: Record<string, any> | null,
  ...children: JSXElement[]
): JSXElement {
  return {
    type,
    props: props || {},
    children: children.length > 0 ? children : undefined,
  };
}

/**
 * JSX fragment function for React.Fragment equivalent
 * 
 * @param props - Fragment properties (typically just children)
 * @returns JSX element representing a fragment
 */
export function Fragment(props: { children?: JSXElement[] }): JSXElement {
  return {
    type: 'Fragment',
    props: {},
    children: props.children,
  };
}

/**
 * Convert JSX element to internal Component representation
 * 
 * This function recursively processes JSX elements and converts them
 * to the internal component format that can be serialized and sent
 * to the JSON UI system.
 * 
 * @param element - JSX element to convert
 * @returns Converted component
 */
export function jsxToComponent(element: JSXElement): Component {
  // If it's a function component, call it first to get the rendered result
  if (typeof element.type === 'function') {
    const rendered = element.type();
    return jsxToComponent(rendered);
  }

  // Handle fragments by flattening their children
  if (element.type === 'Fragment') {
    if (element.children && element.children.length === 1) {
      return jsxToComponent(element.children[0]);
    }
    // For multiple children in a fragment, wrap in a panel
    const fragmentComponent = {
      type: 'panel',
      ...element.props,
      children: element.children?.map(child => jsxToComponent(child)) || [],
    };
    return mapJSXToJSONUI(fragmentComponent as any);
  }

  // Create JSX component representation
  const jsxComponent = {
    ...element.props,
    type: element.type as string,
  };

  // Handle children recursively
  if (element.children && element.children.length > 0) {
    (jsxComponent as any).children = element.children.map(child => jsxToComponent(child));
  }

  // Map JSX component to JSON UI component
  return mapJSXToJSONUI(jsxComponent as any);
}