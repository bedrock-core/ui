import { ControlProps } from '.';
import { CoreUIFormData } from '../../types';
import type { Component } from '../../types/component';
import { SerializableComponent } from '../../types/serialization';
import { Logger } from '../../util/Logger';
import { serialize, serializeString } from '../serializer';

export interface TextStyle {
  color?: [number, number, number];
  lockedColor?: [number, number, number];
  shadow?: boolean;
  fontSize?: 'small' | 'normal' | 'large' | 'extra_large';
  fontScaleFactor?: number;
  fontType?: 'default' | 'unicode' | 'smooth';
  localize?: boolean;
  textAlignment?: 'left' | 'center' | 'right';
}

export interface TextProps extends ControlProps {
  value: string;
  textStyle?: TextStyle;
}

export function Text({ value, textStyle, ...rest }: TextProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      const serializable: SerializableComponent = {
        // Core identity
        type: serializeString('label'),
        // Properties
        colorR: textStyle?.color?.[0] ?? 1,
        colorG: textStyle?.color?.[1] ?? 1,
        colorB: textStyle?.color?.[2] ?? 1,
        lockedColorR: textStyle?.lockedColor?.[0] ?? 1,
        lockedColorG: textStyle?.lockedColor?.[1] ?? 1,
        lockedColorB: textStyle?.lockedColor?.[2] ?? 1,
        shadow: textStyle?.shadow ?? false,
        fontSize: serializeString(textStyle?.fontSize ?? 'normal'),
        fontScaleFactor: textStyle?.fontScaleFactor ?? 1,
        fontType: serializeString(textStyle?.fontType ?? 'default'),
        localize: textStyle?.localize ?? false,
        textAlignment: serializeString(textStyle?.textAlignment ?? 'left'),
        text: serializeString(value ?? ''),
        ...rest,
      };

      const [result, bytes] = serialize(serializable);

      Logger.info(`Serializing text: bytes=${bytes}, result=${result}`);

      form.title(result.slice(114));
      form.label(result);
    },
  };
}
