import type { Component } from '../../types/json_ui/components';
import type { DropdownJSXComponent } from '../../types/jsx/components';

export function mapDropdown(jsx: DropdownJSXComponent): Component {
  return {
    ...jsx,
    type: 'dropdown',
  } as Component;
}