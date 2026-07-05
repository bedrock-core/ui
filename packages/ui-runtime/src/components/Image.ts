import type { Writer } from '../core/types';
import { emitLabel } from '../core/writers';
import { ControlProps, UNSTYLED_TEXTURE, withControl } from './control';
import { FunctionComponent, JSX } from '../jsx';

export interface ImageProps extends ControlProps {

  /**
   * Path to the texture image from resource pack root
   * e.g., "textures/ui/my_image"
   * Max 80 characters
   * Defaults to the unstyled placeholder texture.
   */
  texture?: string;
}

export const Image: FunctionComponent<ImageProps> = ({ texture, ...rest }: ImageProps): JSX.Element => ({
  type: 'image',
  props: {
    ...withControl(rest),
    texture: texture ?? UNSTYLED_TEXTURE,
  },
});

/** Serializes an `image` into the static (label) slot. */
export const imageWriter: Writer = (payload, form, ctx) => {
  emitLabel(payload, form, ctx);
};
