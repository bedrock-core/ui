import { ResizableProps } from '.';
import type { ImageComponent } from '../../types';

export interface ImageProps extends ResizableProps {
  texture?: string;
  uv?: [number, number];
  uvSize?: [number, number];
  ninesliceSize?: number | [number, number, number, number];
  tiled?: boolean;
  keepRatio?: boolean;
  bilinear?: boolean;
}

export function Image({ texture, uv, uvSize, ninesliceSize, tiled, keepRatio, bilinear, width, height, maxWidth, maxHeight }: ImageProps): [ImageComponent, () => void] {
  const component: ImageComponent = {
    type: 'image',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    texture,
    uv,
    uv_size: uvSize,
    nineslice_size: ninesliceSize,
    tiled,
    keep_ratio: keepRatio,
    bilinear,
  };

  const formFunction = (): void => {
    // client only
  };

  return [component, formFunction];
}