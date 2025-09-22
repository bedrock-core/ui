import { LabelProps } from '.';
import type { FormData, Functional, ToggleComponent } from '../../types';

export interface ToggleProps extends LabelProps {
  checked?: boolean;
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Toggle({ label, checked, width, height, maxWidth, maxHeight }: ToggleProps): Functional<ToggleComponent> {
  return {
    type: 'toggle',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    toggle_name: label,
    toggle_default_state: checked,
    serialize: (_form: FormData): string => {
      // form.toggle(label, { defaultValue: checked });
      // TODO: Implement toggle serialization logic
      return '';
    }
  };
}
