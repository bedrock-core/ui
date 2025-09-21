import { LabelProps, ResizableProps } from '.';
import type { SliderComponent } from '../../types';
import type { ModalFormData } from '@minecraft/server-ui';

export interface SliderProps extends LabelProps, ResizableProps {
  min: number;
  max: number;
  value?: number;
  step?: number;
}

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Slider({ label, min, max, value, step, width, height, maxWidth, maxHeight }: SliderProps): [SliderComponent, (form: ModalFormData) => void] {
  const component: SliderComponent = {
    type: 'slider',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
  };

  const formFunction = (form: ModalFormData): void => {
    form.slider(label, min, max, { defaultValue: value, valueStep: step });
  };

  return [component, formFunction];
}