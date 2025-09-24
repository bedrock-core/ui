import { ModalFormData } from '@minecraft/server-ui';
import { ResizableProps } from '.';
import type { Component, SerializableComponent, PanelComponent, StackPanelComponent } from '../../types';

export interface PanelProps extends ResizableProps {
  display?: 'flex' | 'block';
  orientation?: 'vertical' | 'horizontal';
}

export function Panel({ display, orientation, width, height, maxWidth, maxHeight }: PanelProps, children: SerializableComponent<Component>[] = []): SerializableComponent<StackPanelComponent | PanelComponent> {
  switch (display) {
    case 'flex':
      return {
        type: 'stack_panel',
        size: [width || 'default', height || 'default'],
        max_size: [maxWidth || 'default', maxHeight || 'default'],
        orientation: orientation === 'horizontal' ? 'horizontal' : 'vertical',
        controls: children,
        serialize: (form: ModalFormData): string => {
          // TODO: Implement panel serialization logic
          children.forEach(child => {
            child.serialize(form);
          });

          return '';
        },
      };
    case 'block':
    case undefined:
    default:
      return {
        type: 'panel',
        size: [width || 'default', height || 'default'],
        max_size: [maxWidth || 'default', maxHeight || 'default'],
        controls: children,
        serialize: (): string =>
          // TODO: Implement panel serialization logic
          // Use ComponentProcessor.serializeChildren(children) to serialize child components
          '',

      };
  }
}
