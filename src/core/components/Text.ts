import { ControlProps } from '.';
import { CoreUIFormData } from '../../types';
import type { Component } from '../../types/component';
import { SerializableComponent } from '../../types/serialization';
import { Logger } from '../../util/Logger';
import { serialize, serializeString } from '../serializer';

export interface TextStyle {
  // Not working currently
  shadow?: boolean;
  fontSize?: 'small' | 'normal' | 'large' | 'extra_large';
  fontType?: 'default' | 'unicode' | 'smooth';
  // Makes no sense until we have flexbox or similar layouting
  textAlignment?: 'left' | 'center' | 'right';
}

export interface TextProps extends ControlProps {
  value: string;
  // textStyle?: TextStyle;
}

export function Text({ value, ...rest }: TextProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      const serializable: SerializableComponent = {
        // Core identity
        type: serializeString('text'),
        // Properties
        // shadow: textStyle?.shadow ?? false,
        // fontSize: serializeString(textStyle?.fontSize ?? 'normal'),
        // fontType: serializeString(textStyle?.fontType ?? 'default'),
        text: serializeString(value ?? ''),
        ...rest,
      };

      const [result, bytes] = serialize(serializable);

      Logger.info(`Serializing text: bytes=${bytes}, result=${result}`);

      form.label(result);
    },
  };
}
