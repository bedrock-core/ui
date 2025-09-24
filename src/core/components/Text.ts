import { ResizableProps } from '.';
import { CoreUIFormData } from '../../types';
import type { Component } from '../../types/component';
import { SerializedComponent } from '../../types/serialization';
import { serialize } from '../serializer';

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

export interface TextProps extends ResizableProps {
  value: string;
  textStyle?: TextStyle;
}

export function Text({ value, textStyle, width, height }: TextProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      const serialized: SerializedComponent = {
        // Core identity
        type: 'label',
        text: value ?? '',
        // Sizing
        width: width ?? 'default',
        height: height ?? 'default',
        // Style
        colorR: textStyle?.color?.[0] ?? 1,
        colorG: textStyle?.color?.[1] ?? 1,
        colorB: textStyle?.color?.[2] ?? 1,
        lockedColorR: textStyle?.lockedColor?.[0] ?? 1,
        lockedColorG: textStyle?.lockedColor?.[1] ?? 1,
        lockedColorB: textStyle?.lockedColor?.[2] ?? 1,
        shadow: textStyle?.shadow ?? false,
        fontSize: textStyle?.fontSize ?? 'normal',
        fontScaleFactor: textStyle?.fontScaleFactor ?? 1,
        fontType: textStyle?.fontType ?? 'default',
        localize: textStyle?.localize ?? false,
        textAlignment: textStyle?.textAlignment ?? 'left',
      };

      form.label(serialize(serialized));
    },
  };
}
