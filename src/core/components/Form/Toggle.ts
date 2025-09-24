import { ControledLayoutProps, LabelProps } from '..';
import type { Component, CoreUIFormData } from '../../../types';

export interface ToggleProps extends LabelProps, ControledLayoutProps { checked?: boolean }

export function Toggle({ label, checked }: ToggleProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      // TODO: Implement serialization logic
      form.toggle(label, { defaultValue: checked });
    },
  };
}
