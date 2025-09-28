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
  uv?: [number, number];
  uvSize?: [number, number];
  ninesliceSize?: number | [number, number, number, number];
  tiled?: boolean;
  keepRatio?: boolean;
  bilinear?: boolean;
}

export function Image({ texture, uv, uvSize, ninesliceSize, tiled, keepRatio, bilinear, ...rest }: ImageProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      if (texture?.length && texture.length > 64) {
        throw new SerializationError(`Image texture path exceeds 64 characters. Length: ${texture.length}. Path: "${texture}"`);
      }

      const nineSliced = Array.isArray(ninesliceSize)
        ? ninesliceSize
        : [ninesliceSize ?? 0, ninesliceSize ?? 0, ninesliceSize ?? 0, ninesliceSize ?? 0];

      const serializable: SerializableComponent = {
        type: serializeString('image'),
        texture: serializeString(texture ?? '', 64),
        uvX: uv?.[0] ?? 0,
        uvY: uv?.[1] ?? 0,
        uvSizeX: uvSize?.[0] ?? 1,
        uvSizeY: uvSize?.[1] ?? 1,
        ninesliceSize0: nineSliced[0],
        ninesliceSize1: nineSliced[1],
        ninesliceSize2: nineSliced[2],
        ninesliceSize3: nineSliced[3],
        tiled: tiled ?? false,
        keepRatio: keepRatio ?? false,
        bilinear: bilinear ?? false,
        ...rest,
      };

      const [result, bytes] = serialize(serializable);

      Logger.info(`Serializing image: bytes=${bytes}, result=${result}`);

      form.label(result);
    },
  };
}
