import { ActionFormData } from '@minecraft/server-ui';
import { LabelProps, ResizableProps } from '.';
import type { ButtonComponent } from '../../types';

export interface ButtonProps extends LabelProps, ResizableProps {
  onClick?: () => void;
}

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Button({ label, width, height, maxWidth, maxHeight }: ButtonProps): [ButtonComponent, (form: ActionFormData) => void] {
  const component: ButtonComponent = {
    type: 'button',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
  };

  // Button doesn't add anything to ModalForm (handled by submitButton)
  const formFunction = (form: ActionFormData): void => {
    form.button(label);
  };

  return [component, formFunction];
}