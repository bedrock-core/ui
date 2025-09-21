import type { EditBoxComponent } from '../../types'

export interface InputProps {
  label: string;
  placeholder?: string;
  value?: string;
  multiline?: boolean;
  maxLength?: number;
  textType?: 'ExtendedASCII' | 'IdentifierChars' | 'NumberChars';
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}

export function Input({ label, multiline, maxLength, textType, width, height, maxWidth, maxHeight }: InputProps): EditBoxComponent {
  return {
    type: 'edit_box',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    text_box_name: label,
    max_length: maxLength,
    text_type: textType,
    enabled_newline: multiline,
  };
}