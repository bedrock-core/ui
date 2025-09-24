import { LabelProps, ResizableProps } from '..';
import type { Component, CoreUIFormData } from '../../../types';

export interface DropdownProps extends LabelProps, ResizableProps {
  options: string[];
  selected?: string;
}

export function Dropdown({ label, options, selected }: DropdownProps): Component {
  const defaultIndex = selected ? Math.max(0, options.indexOf(selected)) : 0;

  return {
    serialize: (form: CoreUIFormData): void => {
      // TODO: Implement serialization logic
      form.dropdown(label, options, { defaultValueIndex: defaultIndex });
    },
  };
}
