import { ControledLayoutProps, LabelProps } from '.';
import type { Component, CoreUIFormData } from '../../types';

export interface ButtonProps extends LabelProps, ControledLayoutProps { onClick?: () => void }

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Button({ }: ButtonProps): Component {
  return {
    serialize: (_form: CoreUIFormData): void => {
      // TODO: Implement serialization logic
      // Should not be the submit button, look at possibilities, client only which triggers re-render?
      // form.submitButton(label, { size: [width, height] });
    },
  };
}
