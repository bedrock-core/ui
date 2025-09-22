import { ResizableProps } from '.';
import type { Component, Functional, PanelComponent, StackPanelComponent } from '../../types';

export interface PanelProps extends ResizableProps {
  display?: 'flex' | 'block';
  orientation?: 'vertical' | 'horizontal';
}

export function Panel({ display, orientation, width, height, maxWidth, maxHeight }: PanelProps, children: Component[] = []): Functional<StackPanelComponent | PanelComponent> {
  switch (display) {
    case 'flex':
      return {
        type: 'stack_panel',
        size: [width || 'default', height || 'default'],
        max_size: [maxWidth || 'default', maxHeight || 'default'],
        orientation: orientation === 'horizontal' ? 'horizontal' : 'vertical',
        controls: children,
        serialize: (): string => {
          // TODO: Implement panel serialization logic
          // Use ComponentProcessor.serializeChildren(children) to serialize child components
          return '';
        }
      };
    case 'block':
    case undefined:
    default:
      return {
        type: 'panel',
        size: [width || 'default', height || 'default'],
        max_size: [maxWidth || 'default', maxHeight || 'default'],
        controls: children,
        serialize: (): string => {
          // TODO: Implement panel serialization logic
          // Use ComponentProcessor.serializeChildren(children) to serialize child components
          return '';
        }
      };
  }
}