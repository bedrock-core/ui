import { LabelProps, ResizableProps } from '.';
import type { ButtonComponent, FormData, SerializableComponent } from '../../types';

export interface ButtonProps extends LabelProps, ResizableProps { onClick?: () => void }

// TODO CONDITIONAL THINGS WITH THE TEXT
export function Button({ label, width, height, maxWidth, maxHeight }: ButtonProps): SerializableComponent<ButtonComponent> {
  return {
    type: 'button',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    serialize: (_form: FormData): string =>
      // form.button(label);
      // TODO: Implement Button serialization logic
      '',

  };
}
