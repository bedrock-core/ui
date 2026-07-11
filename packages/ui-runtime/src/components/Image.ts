import type { Writer } from '../core/types';
import { emitHeader } from '../core/writers';
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

/**
 * Serializes an `image` into the ActionForm HEADER slot (engine-level type routing:
 * the factory instantiates only the slim header_router for it, not the 6-variant
 * label_router). Falls back to the label slot on the modal backend.
 */
export const imageWriter: Writer = (payload, form, ctx) => {
  emitHeader(payload, form, ctx);
};
