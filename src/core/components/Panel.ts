
import { ControlProps } from '.';
import { registerIntrinsicComponent } from '../../jsx/intrinsics';
import { CoreUIFormData, SerializableComponent, SerializableElement } from '../../types';
import { Logger } from '../../util/Logger';
import { serialize, serializeString } from '../serializer';

export interface PanelProps extends ControlProps {
  // Future idea
  // display?: 'flex' | 'block';
  // orientation?: 'vertical' | 'horizontal';
}

export function Panel({ children, ...rest }: PanelProps): SerializableElement {
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

      children?.forEach((child: SerializableElement): void => child.serialize(form));
    },
  };
}

registerIntrinsicComponent('panel', Panel);
