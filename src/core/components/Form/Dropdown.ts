import { LabelProps, ResizableProps } from '..';
import type { DropdownComponent, FormData, Functional } from '../../../types';

export interface DropdownProps extends LabelProps {
  options: string[];
  selected?: string;
}

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Dropdown({ label, options, selected }: DropdownProps): Functional<DropdownComponent> {
  const defaultIndex = selected ? Math.max(0, options.indexOf(selected)) : 0;

  return {
    type: 'dropdown',
    serialize: (form: FormData): string => {
      form.dropdown(label, options, { defaultValueIndex: defaultIndex });
      // TODO: Implement dropdown serialization logic
      return '';
    }
  };
}