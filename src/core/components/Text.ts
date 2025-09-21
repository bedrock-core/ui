import type { LabelComponent } from '../../types';

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

export interface TextProps {
  value: string;
  textStyle?: TextStyle;
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}

export function Text({ value, textStyle, width, height, maxWidth, maxHeight }: TextProps): LabelComponent {
  return {
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
  };
}