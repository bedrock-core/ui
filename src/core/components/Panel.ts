import type { Component, PanelComponent, StackPanelComponent } from '../../types/json_ui/components';

export interface PanelProps {
  display?: 'flex' | 'block';
  orientation?: 'vertical' | 'horizontal';
  children?: Component[];
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}

// TODO CHANGE ANY
export function Panel({ display, orientation, width, height, maxWidth, maxHeight }: PanelProps, children?: any[]): PanelComponent | StackPanelComponent {
  // TODO CHILDREN (convert to controls)
  switch (display) {
    case 'flex':
      return {
        type: 'stack_panel',
        size: [width || 'default', height || 'default'],
        max_size: [maxWidth || 'default', maxHeight || 'default'],
        orientation: orientation === 'horizontal' ? 'horizontal' : 'vertical',
      };
    case 'block':
    case undefined:
    default:
      return {
        type: 'panel',
        size: [width || 'default', height || 'default'],
        max_size: [maxWidth || 'default', maxHeight || 'default'],
      };
  }
}