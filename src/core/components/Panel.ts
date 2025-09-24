
import { ResizableProps } from '.';
import { CoreUIFormData, Component, SerializableComponent as SerializableComponent } from '../../types';
import { Logger } from '../../util/Logger';
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
      const serializable: SerializableComponent = {
        // Core identity
        type: 'panel',
        // Sizing
        width: width ?? 'default',
        height: height ?? 'default',
      };

      const [result, bytes] = serialize(serializable);

      Logger.info(`Serializing panel: bytes=${bytes}, result=${result}`);

      form.label(result);

      children.forEach((child: Component): void => child.serialize(form));
    },
  };
}
