import { ControledLayoutProps, LabelProps } from '..';
import type { Component, CoreUIFormData } from '../../../types';

export interface InputProps extends LabelProps, ControledLayoutProps {
  value?: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  textType?: 'ExtendedASCII' | 'IdentifierChars' | 'NumberChars';
}

export function Input({ label, placeholder, value }: InputProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      // TODO: Implement serialization logic
      form.textField(label, placeholder || '', { defaultValue: value });
    },
  };
}
