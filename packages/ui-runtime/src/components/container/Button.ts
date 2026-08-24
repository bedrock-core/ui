import type { Player } from '@minecraft/server';
import type { FunctionComponent, JSX } from '../../jsx';
import type { ControlProps } from '../control';
import { Slot } from './Slot';

export interface ButtonProps extends ControlProps {
  onPress?: (player: Player) => void;
  /** Resting face. */
  texture?: string;
  /** Drawn while the pointer is over it. */
  hoverTexture?: string;
  /** Drawn while it is held. */
  pressedTexture?: string;
  /**
   * Drawn instead of `texture` while `onPress` is undefined.
   *
   * A button is enabled exactly while it has a handler, so
   * `onPress={ready ? fn : undefined}` both stops it reacting and swaps this
   * in — and swaps it back out when the handler returns. Without one, a
   * disabled button keeps its resting face and merely stops reacting.
   */
  disabledTexture?: string;
  /** Baked over the face, so it may use any character. */
  children?: string;
}

const DEFAULT_TEXTURE = 'textures/ui/button_borderless_light';
const DEFAULT_HOVER = 'textures/ui/button_borderless_lighthover';
const DEFAULT_PRESSED = 'textures/ui/button_borderless_lightpressed';

/**
 * A button that looks like one.
 *
 * Underneath it is still a container slot, because a press reaches script only
 * as an item move: JSON UI's button mappings produce game actions, and the
 * container transaction is the only one the server sees. But nothing says the
 * item has to be visible. `common.container_item` takes its cell face, its item
 * renderer and its button as variables, so the compiler replaces the icon with
 * nothing, turns off the count and the bars, and gives the face real hover and
 * pressed states. The item underneath is pure transport.
 *
 * Which is why the textures are texture paths and not an item: the face is
 * ordinary JSON UI. The runtime still puts the transport item back and reclaims
 * the copy, but there is nothing on screen to see it happen.
 */
export const Button: FunctionComponent<ButtonProps> = ({
  onPress,
  texture = DEFAULT_TEXTURE,
  hoverTexture = DEFAULT_HOVER,
  pressedTexture = DEFAULT_PRESSED,
  disabledTexture,
  children = '',
  ...rest
}: ButtonProps): JSX.Element => {
  const slot = Slot({ ...rest, role: 'button' });

  return {
    ...slot,
    props: {
      ...slot.props,
      onPress,
      face: {
        texture,
        hover: hoverTexture,
        pressed: pressedTexture,
        label: children,
        ...disabledTexture === undefined ? {} : { disabled: disabledTexture },
      },
    },
  };
};
