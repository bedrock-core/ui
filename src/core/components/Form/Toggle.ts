import { LabelProps } from '..';
import type { FormData, Functional, ToggleComponent } from '../../../types';

export interface ToggleProps extends LabelProps {
  checked?: boolean;
}

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Toggle({ label, checked }: ToggleProps): Functional<ToggleComponent> {
  return {
    type: 'toggle',
    serialize: (form: FormData): string => {
      form.toggle(label, { defaultValue: checked });
      // TODO: Implement toggle serialization logic
      return '';
    }
  };
}
