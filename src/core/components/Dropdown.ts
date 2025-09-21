import { LabelProps, ResizableProps } from '.';
import type { DropdownComponent } from '../../types';
import type { ModalFormData } from '@minecraft/server-ui';

export interface DropdownProps extends LabelProps, ResizableProps {
  options: string[];
  selected?: string;
}

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Dropdown({ label, options, selected, width, height, maxWidth, maxHeight }: DropdownProps): [DropdownComponent, (form: ModalFormData) => void] {
  const defaultIndex = selected ? Math.max(0, options.indexOf(selected)) : 0;

  const component: DropdownComponent = {
    type: 'dropdown',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    dropdown_name: label,
  };

  const formFunction = (form: ModalFormData): void => {
    form.dropdown(label, options, { defaultValueIndex: defaultIndex });
  };

  return [component, formFunction];
}