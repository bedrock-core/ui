import { entry, placed } from '../utils/place';
import type { Box, Face } from '../utils/types';

export interface ImageFace extends Box {
  /** The baked path, or the one the build rendered with when the path is carried. */
  texture: string;
}

/**
 * A texture.
 *
 * `keep_ratio` is off because the layout already decided the box: letting the
 * engine preserve the source's aspect would move edges the rect guard checked.
 */
export const imageFace: Face<ImageFace> = data => entry(data.name, {
  type: 'image',
  ...placed(data),
  texture: data.texture,
  keep_ratio: false,
});
