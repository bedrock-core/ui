import { ControlProps, withControl } from '.';
import { FunctionComponent, JSX } from '../../jsx';

export interface ImageProps extends ControlProps {

  /**
   * Path to the texture image from resource pack root
   * e.g., "textures/ui/my_image"
   * Max 32 characters
   */
  texture?: string;
  disabled?: boolean;
}

export const Image: FunctionComponent<ImageProps> = ({ texture, disabled, ...rest }: ImageProps): JSX.Element => ({
  type: 'image',
  props: {
    ...withControl(rest),
    texture: texture ?? '',
    disabled: disabled ?? false,
  },
});

