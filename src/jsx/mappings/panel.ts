import type { Component } from '../../types/json_ui/components';
import type { PanelJSXComponent } from '../../types/jsx/components';

export function mapPanel(jsx: PanelJSXComponent): Component {
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