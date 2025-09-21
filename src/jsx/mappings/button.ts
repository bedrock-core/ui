import type { Component } from '../../types/json_ui/components';
import type { ButtonJSXComponent } from '../../types/jsx/components';

export function mapButton(jsx: ButtonJSXComponent): Component {
  return {
    ...jsx,
    type: 'button',
  } as Component;
}