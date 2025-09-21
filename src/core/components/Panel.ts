import { ResizableProps } from '.';
import type { Component, PanelComponent, StackPanelComponent } from '../../types';
import type { ModalFormData } from '@minecraft/server-ui';

export interface PanelProps extends ResizableProps {
  display?: 'flex' | 'block';
  orientation?: 'vertical' | 'horizontal';
}

export function Panel({ display, orientation, width, height, maxWidth, maxHeight }: PanelProps, children: Component[] = []): [StackPanelComponent | PanelComponent, () => void] {
  let component: StackPanelComponent | PanelComponent;

  switch (display) {
    case 'flex':
      component = {
        type: 'stack_panel',
        size: [width || 'default', height || 'default'],
        max_size: [maxWidth || 'default', maxHeight || 'default'],
        orientation: orientation === 'horizontal' ? 'horizontal' : 'vertical',
        controls: children,
      };
      break;
    case 'block':
    case undefined:
    default:
      component = {
        type: 'panel',
        size: [width || 'default', height || 'default'],
        max_size: [maxWidth || 'default', maxHeight || 'default'],
        controls: children,
      };
      break;
  }

  const formFunction = (): void => {
    // client only
  };

  return [component, formFunction];
}