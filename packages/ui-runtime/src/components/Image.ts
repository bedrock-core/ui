import type { Writer } from '../core/types';
import { emitHeader } from '../core/writers';
import { ControlProps, UNSTYLED_TEXTURE, withControl } from './control';
import { FunctionComponent, JSX } from '../jsx';

export interface ImageProps extends ControlProps {

  /**
   * Path to the texture image from resource pack root
   * e.g., "textures/ui/my_image"
   * Any length — it rides the payload's variable-length tail (v0008), so it is
   * neither padded nor capped.
   * Defaults to the unstyled placeholder texture.
   */
  texture?: string;
}

export const Image: FunctionComponent<ImageProps> = ({ texture, ...rest }: ImageProps): JSX.Element => ({
  type: 'image',
  props: {
    // Control block unchanged — the common font slot at [606] included — so every
    // fixed offset before [1024] stays put.
    ...withControl(rest),
    // The texture is the payload's TAIL (v0008): an image cell is always terminal
    // (no children, one component field), so the path is emitted verbatim after the
    // control block — unpadded, unprefixed, uncapped. The RP decodes it as the whole
    // post-[1024] remainder (see components/image.json), which is what lifts the old
    // 80-byte cap on texture paths.
    value: { tail: texture ?? UNSTYLED_TEXTURE },
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
