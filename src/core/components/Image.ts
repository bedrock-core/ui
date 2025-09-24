import { ResizableProps } from '.';
import type { Component, CoreUIFormData, SerializableComponent } from '../../types';
import { Logger } from '../../util/Logger';
import { serialize } from '../serializer';

export interface ImageProps extends ResizableProps {
  texture?: string;
  uv?: [number, number];
  uvSize?: [number, number];
  ninesliceSize?: number | [number, number, number, number];
  tiled?: boolean;
  keepRatio?: boolean;
  bilinear?: boolean;
}

export function Image({ width, height, x, y, texture, uv, uvSize, ninesliceSize, tiled, keepRatio, bilinear }: ImageProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      const nineSliced = Array.isArray(ninesliceSize) ? ninesliceSize : [ninesliceSize ?? 0, ninesliceSize ?? 0, ninesliceSize ?? 0, ninesliceSize ?? 0];

      const serializable: SerializableComponent = {
        // Core identity
        type: 'image',
        // Sizing
        width: width ?? 'default',
        height: height ?? 'default',
        x: x ?? '0',
        y: y ?? '0',
        // Properties
        texture: texture ?? '',
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
      };

      const [result, bytes] = serialize(serializable);

      Logger.info(`Serializing image: bytes=${bytes}, result=${result}`);

      form.label(result);
    },
  };
}
