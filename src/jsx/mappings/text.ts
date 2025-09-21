import type { Component } from '../../types/json_ui/components';
import type { TextJSXComponent } from '../../types/jsx/components';

export function mapText(jsx: TextJSXComponent): Component {
  return {
    ...jsx,
    type: 'label',
  } as Component;
}