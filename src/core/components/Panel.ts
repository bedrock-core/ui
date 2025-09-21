import type { Component, PanelComponent, StackPanelComponent } from '../../types'

export interface PanelProps {
  display?: 'flex' | 'block';
  orientation?: 'vertical' | 'horizontal';
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}

export function Panel({ display, orientation, width, height, maxWidth, maxHeight }: PanelProps, children: Component[] = []): StackPanelComponent | PanelComponent {
  switch (display) {
    case 'flex':
      return {
        type: 'stack_panel',
        size: [width || 'default', height || 'default'],
        max_size: [maxWidth || 'default', maxHeight || 'default'],
        orientation: orientation === 'horizontal' ? 'horizontal' : 'vertical',
        controls: children,
      };
    case 'block':
    case undefined:
    default:
      return {
        type: 'panel',
        size: [width || 'default', height || 'default'],
        max_size: [maxWidth || 'default', maxHeight || 'default'],
        controls: children,
      };
  }
}