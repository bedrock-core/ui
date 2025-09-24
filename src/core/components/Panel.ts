
import { ResizableProps } from '.';
import { CoreUIFormData, Component, SerializedComponent } from '../../types';
import { serialize } from '../serializer';
export interface PanelProps extends ResizableProps {
  // Future idea
  // display?: 'flex' | 'block';
  // orientation?: 'vertical' | 'horizontal';
  children: Component[];
}

export function Panel({ width, height, children }: PanelProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      const serialized: SerializedComponent = {
        // Core identity
        type: 'panel',
        // Sizing
        width: width ?? 'default',
        height: height ?? 'default',
      };

      form.label(serialize(serialized));

      children.forEach((child: Component): void => child.serialize(form));
    },
  };
}
