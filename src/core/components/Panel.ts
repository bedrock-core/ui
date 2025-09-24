
import { ControledLayoutProps, withControledLayout } from '.';
import { Component, CoreUIFormData, SerializableComponent } from '../../types';
import { Logger } from '../../util/Logger';
import { serialize } from '../serializer';
export interface PanelProps extends ControledLayoutProps {
  // Future idea
  // display?: 'flex' | 'block';
  // orientation?: 'vertical' | 'horizontal';
  children: Component[];
}

export function Panel(props: PanelProps): Component {
  const { children, ...rest } = withControledLayout(props);

  return {
    serialize: (form: CoreUIFormData): void => {
      // 'children' are not primitives; they are serialized separately after emitting
      // this panel's own primitive payload.
      const serializable: SerializableComponent = {
        type: 'panel',
        ...rest,
      };

      const [result, bytes] = serialize(serializable);

      Logger.info(`Serializing panel: bytes=${bytes}, result=${result}`);

      form.label(result);

      children.forEach((child: Component): void => child.serialize(form));
    },
  };
}
