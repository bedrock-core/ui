import type { Component } from '../../types/json_ui/components';
import type { ToggleJSXComponent } from '../../types/jsx/components';

export function mapToggle(jsx: ToggleJSXComponent): Component {
  return {
    ...jsx,
    type: 'toggle',
  } as Component;
}