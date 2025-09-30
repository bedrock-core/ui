
import { ControlProps } from '.';
import { Component, CoreUIFormData, SerializableComponent } from '../../types';
import { Logger } from '../../util/Logger';
import { serialize, serializeString } from '../serializer';

export interface FragmentProps extends ControlProps { children: Component[] }

export function Fragment({ children, ...rest }: FragmentProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      // 'children' are not primitives; they are serialized separately after emitting
      // this panel's own primitive payload.
      const serializable: SerializableComponent = {
        type: serializeString('fragment'),
        ...rest,
      };

      const [result, bytes] = serialize(serializable);

      Logger.info(`Serializing fragment: bytes=${bytes}, result=${result}`);

      form.label(result);

      children.forEach((child: Component): void => child.serialize(form));
    },
  };
}
