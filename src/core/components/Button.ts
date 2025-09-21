import type { ButtonComponent, Component } from '../../types/json_ui/components';

export interface ButtonProps {
  label?: string;
  onClick?: () => void;
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}

export function Button({ width, height, maxWidth, maxHeight }: ButtonProps): ButtonComponent {
  return {
    type: 'button',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    // TODO TEXT WTF IS TEXT
    // text: label,
  };
}