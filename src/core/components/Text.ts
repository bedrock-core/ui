import { ResizableProps } from '.';
import type { SerializableComponent, LabelComponent } from '../../types';

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

export function Text({ value, textStyle, width, height, maxWidth, maxHeight }: TextProps): SerializableComponent {
  return {
    serialize: () => ({
      type: 'label',
      text: value,
      size: [width || 'default', height || 'default'],
      max_size: [maxWidth || 'default', maxHeight || 'default'],
      color: textStyle?.color,
      locked_color: textStyle?.lockedColor,
      shadow: textStyle?.shadow,
      font_size: textStyle?.fontSize,
      font_scale_factor: textStyle?.fontScaleFactor,
      font_type: textStyle?.fontType,
      localize: textStyle?.localize,
      text_alignment: textStyle?.textAlignment,
    }),
  };
}
