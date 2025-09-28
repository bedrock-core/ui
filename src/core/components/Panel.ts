
import { ControlProps } from '.';
import { Component, CoreUIFormData, SerializableComponent } from '../../types';
import { Logger } from '../../util/Logger';
import { serialize, serializeString } from '../serializer';
export interface PanelProps extends ControlProps {
  // Future idea
  // display?: 'flex' | 'block';
  // orientation?: 'vertical' | 'horizontal';
  children: Component[];
}

export function Panel({ children, ...rest }: PanelProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      // 'children' are not primitives; they are serialized separately after emitting
      // this panel's own primitive payload.
      const serializable: SerializableComponent = {
        type: serializeString('panel'),
        ...rest,
      };

      const [result, bytes] = serialize(serializable);

      Logger.info(`Serializing panel: bytes=${bytes}, result=${result}`);

      form.label(result);

      children.forEach((child: Component): void => child.serialize(form));
    },
  };
}
