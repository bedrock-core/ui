import { registerIntrinsicComponent } from '../../jsx/intrinsics';
import { CoreUIFormData, JSXProps, SerializableComponent, SerializableElement } from '../../types';
import { Logger } from '../../util/Logger';
import { serialize, serializeString } from '../serializer';

export interface FragmentProps extends JSXProps { }

export function Fragment({ children, ...rest }: FragmentProps): SerializableElement {
  return {
    serialize: (form: CoreUIFormData): void => {
      // 'children' are not primitives; they are serialized separately after emitting
      // this panel's own primitive payload.
      const serializable: SerializableComponent = {
        type: serializeString('fragment'),
        ...rest,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };

      const [result, bytes] = serialize(serializable);

      Logger.info(`Serializing fragment: bytes=${bytes}, result=${result}`);

      form.label(result);

      children?.forEach((child: SerializableElement): void => child.serialize(form));
    },
  };
}

registerIntrinsicComponent('fragment', Fragment);
