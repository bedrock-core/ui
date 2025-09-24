import { ModalFormData } from '@minecraft/server-ui';
import { LabelProps } from '..';
import type { EditBoxComponent, FormData, SerializableComponent } from '../../../types';
import { serialize } from '../../serializer';

export interface InputProps extends LabelProps {
  value?: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  textType?: 'ExtendedASCII' | 'IdentifierChars' | 'NumberChars';
  width: number;
  height: number;
}

type Arr = Parameters<ModalFormData['textField']>;

type MyObject = {
  [K in Exclude<Arr[number], undefined | object>]: unknown;
};

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Input({ label, placeholder, value, multiline, maxLength, textType, width, height }: InputProps): SerializableComponent<EditBoxComponent> {
  const test: MyObject = {
    label,
    placeholder,
    textFieldOptions: { defaultValue: value },
  };

  return {
    type: 'edit_box',
    serialize: (form: FormData): string => {
      const serialized = serialize(label, maxLength, textType, multiline, width, height);

      form.textField(serialized, placeholder || '', { defaultValue: value });

      return serialized;
    },
  };
}
