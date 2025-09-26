import { ControlProps, LabelProps } from '..';
import type { Component, CoreUIFormData } from '../../../types';

export interface ToggleProps extends LabelProps, ControlProps { checked?: boolean }

export function Toggle({ label, checked }: ToggleProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      // TODO: Implement serialization logic
      form.toggle(label, { defaultValue: checked });
    },
  };
}
