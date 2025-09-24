import { LabelProps, ResizableProps } from '..';
import type { Component, CoreUIFormData } from '../../../types';

export interface SliderProps extends LabelProps, ResizableProps {
  min: number;
  max: number;
  value?: number;
  step?: number;
}

export function Slider({ label, min, max, value, step }: SliderProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      // TODO: Implement serialization logic
      form.slider(label, min, max, { defaultValue: value, valueStep: step });
    },
  };
}
