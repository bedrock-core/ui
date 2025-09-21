import type { Component } from '../types/json_ui/components';
import type { JSXComponent } from '../types/jsx/components';

/**
 * Maps JSX components to JSON UI components based on props
 */
export function mapJSXToJSONUI(jsxComponent: JSXComponent & { type: string }): Component {
  switch (jsxComponent.type.toLowerCase()) {
    case 'panel':
      return mapPanelComponent(jsxComponent as any);

    case 'text':
      return mapTextComponent(jsxComponent as any);

    case 'input':
      return mapInputComponent(jsxComponent as any);

    case 'button':
      return mapButtonComponent(jsxComponent as any);

    case 'toggle':
      return mapToggleComponent(jsxComponent as any);

    case 'dropdown':
      return mapDropdownComponent(jsxComponent as any);

    case 'slider':
      return mapSliderComponent(jsxComponent as any);

    case 'image':
      return mapImageComponent(jsxComponent as any);

    default:
      throw new Error(`Unknown JSX component type: ${jsxComponent.type}`);
  }
}

function mapPanelComponent(jsx: any): Component {
  const { display, direction, scroll, ...props } = jsx;

  // Determine JSON UI component type based on display prop
  if (display === 'flex') {
    return {
      ...props,
      type: 'stack_panel',
      orientation: direction || 'vertical',
    } as Component;
  }

  if (display === 'grid') {
    return {
      ...props,
      type: 'grid',
    } as Component;
  }

  if (scroll) {
    return {
      ...props,
      type: 'scroll_view',
    } as Component;
  }

  // Default to regular panel
  return {
    ...props,
    type: 'panel',
  } as Component;
}

function mapTextComponent(jsx: any): Component {
  return {
    ...jsx,
    type: 'label',
  } as Component;
}

function mapInputComponent(jsx: any): Component {
  const { multiline, ...props } = jsx;

  if (multiline) {
    return {
      ...props,
      type: 'input_panel',
    } as Component;
  }

  return {
    ...props,
    type: 'edit_box',
  } as Component;
}

function mapButtonComponent(jsx: any): Component {
  return {
    ...jsx,
    type: 'button',
  } as Component;
}

function mapToggleComponent(jsx: any): Component {
  return {
    ...jsx,
    type: 'toggle',
  } as Component;
}

function mapDropdownComponent(jsx: any): Component {
  return {
    ...jsx,
    type: 'dropdown',
  } as Component;
}

function mapSliderComponent(jsx: any): Component {
  return {
    ...jsx,
    type: 'slider',
  } as Component;
}

function mapImageComponent(jsx: any): Component {
  return {
    ...jsx,
    type: 'image',
  } as Component;
}