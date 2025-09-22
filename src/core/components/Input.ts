import type { ModalFormData } from '@minecraft/server-ui';
import { LabelProps, ResizableProps } from '.';
import type { EditBoxComponent, FormData, Functional } from '../../types';

export interface InputProps extends LabelProps, ResizableProps {
  value?: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  textType?: 'ExtendedASCII' | 'IdentifierChars' | 'NumberChars';
}

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Input({ label, placeholder, value, multiline, maxLength, textType, width, height, maxWidth, maxHeight }: InputProps): Functional<EditBoxComponent> {
  return {
    type: 'edit_box',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    max_length: maxLength,
    text_type: textType,
    enabled_newline: multiline,
    serialize: (_form: FormData): string => {
      // form.textField(label, placeholder || '', { defaultValue: value });
      // TODO: Implement input serialization logic
      return '';
    }
  };
}