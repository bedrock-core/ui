import type { Component, SliderComponent } from '../../types/json_ui/components';

export interface SliderProps {
  label?: string;
  min: number;
  max: number;
  value?: number;
  step?: number;
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  direction?: 'horizontal' | 'vertical';
}

// TODO VALUE
export function Slider({ label, min, max, value, step, width, height, maxWidth, maxHeight, direction }: SliderProps): SliderComponent {
  const steps = step ? Math.floor((max - min) / step) + 1 : 100;

  return {
    type: 'slider',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    slider_name: label,
    slider_steps: steps,
    slider_direction: direction,
  };
}