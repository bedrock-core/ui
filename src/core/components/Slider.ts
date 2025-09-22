import { LabelProps, ResizableProps } from '.';
import type { FormData, Functional, SliderComponent } from '../../types';
import type { ModalFormData } from '@minecraft/server-ui';

export interface SliderProps extends LabelProps, ResizableProps {
  min: number;
  max: number;
  value?: number;
  step?: number;
}

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Slider({ label, min, max, value, step, width, height, maxWidth, maxHeight }: SliderProps): Functional<SliderComponent> {
  return {
    type: 'slider',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    serialize: (_form: FormData): string => {
      // form.slider(label, min, max, { defaultValue: value, valueStep: step });
      // TODO: Implement Slider serialization logic
      return '';
    }
  };
}