import { LabelProps } from '.';
import type { ToggleComponent } from '../../types';
import type { ModalFormData } from '@minecraft/server-ui';

export interface ToggleProps extends LabelProps {
  checked?: boolean;
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Toggle({ label, checked, width, height, maxWidth, maxHeight }: ToggleProps): [ToggleComponent, (form: ModalFormData) => void] {
  const component: ToggleComponent = {
    type: 'toggle',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    toggle_name: label,
    toggle_default_state: checked,
  };

  const formFunction = (form: ModalFormData): void => {
    form.toggle(label, { defaultValue: checked });
  };

  return [component, formFunction];
}
