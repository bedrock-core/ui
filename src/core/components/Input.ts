import type { ModalFormData } from '@minecraft/server-ui';
import { LabelProps, ResizableProps } from '.';
import type { EditBoxComponent } from '../../types';

export interface InputProps extends LabelProps, ResizableProps {
  value?: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  textType?: 'ExtendedASCII' | 'IdentifierChars' | 'NumberChars';
}

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Input({ label, placeholder, value, multiline, maxLength, textType, width, height, maxWidth, maxHeight }: InputProps): [EditBoxComponent, (form: ModalFormData) => void] {
  const component: EditBoxComponent = {
    type: 'edit_box',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    max_length: maxLength,
    text_type: textType,
    enabled_newline: multiline,
  };

  const formFunction = (form: ModalFormData): void => {
    form.textField(label, placeholder || '', { defaultValue: value });
  };

  return [component, formFunction];
}