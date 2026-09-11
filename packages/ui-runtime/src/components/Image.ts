import { ControlProps, UNSTYLED_TEXTURE, withControl } from './control';
import { FunctionComponent, JSX } from '../jsx';

/** The host `type` emitted by {@link Image}. */
export const IMAGE_TYPE = 'image';

export interface ImageProps extends ControlProps {

  /**
   * Path to the texture image from resource pack root
   * e.g., "textures/ui/my_image"
   * Any length — it rides the payload's variable-length tail (v0008), so it is
   * neither padded nor capped.
   * Defaults to the unstyled placeholder texture.
   */
  texture?: string;
  /**
   * Carry the texture path at runtime on a compiled screen. A compiled image
   * is baked otherwise: the path is written into the pack and a later render
   * showing another texture is silently wrong. Costs one entry on a form.
   */
  live?: boolean;
}

/** Whether a built `<Image>` carries its texture live — how a compiling host tells it from a baked one. */
export function liveTexture(element: JSX.Element): boolean {
  return element.type === IMAGE_TYPE && element.props.__live === true;
}

export const Image: FunctionComponent<ImageProps> = ({ texture, live, ...rest }: ImageProps): JSX.Element => ({
  type: IMAGE_TYPE,
  props: {
    // Control block unchanged — the common font slot at [606] included — so every
    // fixed offset before [1024] stays put.
    ...withControl(rest),
    ...live === true ? { __live: true } : {},
    // The texture is the payload's TAIL (v0008): an image cell is always terminal
    // (no children, one component field), so the path is emitted verbatim after the
    // control block — unpadded, unprefixed, uncapped. The RP decodes it as the whole
    // post-[1024] remainder (see components/image.json), which is what lifts the old
    // 80-byte cap on texture paths.
    value: { tail: texture ?? UNSTYLED_TEXTURE },
  },
});
