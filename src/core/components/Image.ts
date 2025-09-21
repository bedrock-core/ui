import type { ImageComponent } from '../../types/json_ui/components';

export interface ImageProps {
  texture?: string;
  uv?: [number, number];
  uv_size?: [number, number];
  nineslice_size?: number | [number, number, number, number];
  tiled?: boolean;
  keep_ratio?: boolean;
  bilinear?: boolean;
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}

export function Image({ texture, uv, uv_size, nineslice_size, tiled, keep_ratio, bilinear, width, height, maxWidth, maxHeight }: ImageProps): ImageComponent {
  return {
    type: 'image',
    size: [width || 'default', height || 'default'],
    max_size: [maxWidth || 'default', maxHeight || 'default'],
    texture,
    uv,
    uv_size,
    nineslice_size,
    tiled,
    keep_ratio,
    bilinear,
  };
}