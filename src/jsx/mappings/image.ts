import type { Component } from '../../types/json_ui/components';
import type { ImageJSXComponent } from '../../types/jsx/components';

export function mapImage(jsx: ImageJSXComponent): Component {
  return {
    ...jsx,
    type: 'image',
  } as Component;
}