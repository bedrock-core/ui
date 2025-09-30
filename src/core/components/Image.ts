import { ControlProps } from '.';
import { SerializationError, type Component, type CoreUIFormData, type SerializableComponent } from '../../types';
import { Logger } from '../../util/Logger';
import { serialize, serializeString } from '../serializer';

export interface ImageProps extends ControlProps {

  /**
   * Path to the texture image from resource pack root
   * e.g., "textures/ui/my_image"
   * Max 64 characters
   */
  texture?: string;
  disabled?: boolean;
}

export function Image({ texture, disabled, ...rest }: ImageProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      if (texture?.length && texture.length > 64) {
        throw new SerializationError(`Image texture path exceeds 64 characters. Length: ${texture.length}. Path: "${texture}"`);
      }

      const serializable: SerializableComponent = {
        type: serializeString('image'),
        texture: serializeString(texture ?? '', 64),
        grayscale: disabled ?? false,
        ...rest,
      };

      const [result, bytes] = serialize(serializable);

      Logger.info(`Serializing image: bytes=${bytes}, result=${result}`);

      form.label(result);
    },
  };
}
