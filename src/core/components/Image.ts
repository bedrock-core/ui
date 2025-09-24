import { ResizableProps } from '.';
import type { Component, CoreUIFormData, SerializedComponent } from '../../types';
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

export function Image({ width, height }: ImageProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      // TODO: Implement serialization logic
      const serialized: SerializedComponent = {
        // Core identity
        type: 'image',
        // Sizing
        width: width ?? 'default',
        height: height ?? 'default',
      };

      form.label(serialize(serialized));
    },
  };
}
