import type { Component } from '../../types/json_ui/components';
import type { InputJSXComponent } from '../../types/jsx/components';

export function mapInput(jsx: InputJSXComponent): Component {
  const { multiline, ...props } = jsx;

  if (multiline) {
    return {
      ...props,
      type: 'input_panel',
    } as Component;
  }

  return {
    ...props,
    type: 'edit_box',
  } as Component;
}