import { LabelProps } from '..';
import type { EditBoxComponent, FormData, Functional } from '../../../types';

export interface InputProps extends LabelProps {
  value?: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  textType?: 'ExtendedASCII' | 'IdentifierChars' | 'NumberChars';
}

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Input({ label, placeholder, value, multiline, maxLength, textType }: InputProps): Functional<EditBoxComponent> {
  return {
    type: 'edit_box',
    max_length: maxLength,
    text_type: textType,
    enabled_newline: multiline,
    serialize: (form: FormData): string => {
      form.textField(label, placeholder || '', { defaultValue: value });
      const serializedMaxLength = maxLength;
      const serializedTextType = textType;
      const serializedMultiline = multiline ? 'true' : 'false';

      return `${serializedMaxLength}|${serializedTextType}|${serializedMultiline}`;
    }
  };
}