import { LabelProps, ResizableProps } from '..';
import type { FormData, SerializableComponent, SliderComponent } from '../../../types';
import type { ModalFormData } from '@minecraft/server-ui';

export interface SliderProps extends LabelProps {
  min: number;
  max: number;
  value?: number;
  step?: number;
}

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Slider({ label, min, max, value, step }: SliderProps): SerializableComponent<SliderComponent> {
  return {
    type: 'slider',
    serialize: (form: FormData): string => {
      form.slider(label, min, max, { defaultValue: value, valueStep: step });

      // TODO: Implement Slider serialization logic
      return '';
    },
  };
}
