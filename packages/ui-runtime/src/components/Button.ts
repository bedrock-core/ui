import type { Entity, Player } from '@minecraft/server';
import { isContainerExit } from '../core/fabric/exit';
import type { Writer } from '../core/types';
import { emitButton } from '../core/writers';
import { FunctionComponent, JSX } from '../jsx';
import { ControlProps, resolveStateBackgrounds, StateBackgroundProps, withControl } from './control';

/** The host `type` emitted by {@link Button}. */
export const BUTTON_TYPE = 'button';

export interface ButtonProps extends ControlProps, StateBackgroundProps {
  children?: JSX.Node;
  /**
   * Ran on a press. On a container screen it receives the pressing player and
   * the entity that owns the screen; a form's native response carries neither,
   * so both are absent there.
   */
  onPress?: (player?: Player, host?: Entity) => unknown | Promise<unknown>;
  // state textures serialize at [1024-1106] hover / [1107-1189] pressed /
  // [1190-1272] locked, resolved by the shared `state ?? base ?? unstyled` rule
}

export const Button: FunctionComponent<ButtonProps> = ({ onPress, backgroundHover, backgroundPressed, backgroundLocked, children, ...rest }: ButtonProps): JSX.Element => {
  const states = resolveStateBackgrounds({ background: rest.background, backgroundHover, backgroundPressed, backgroundLocked });

  return {
    type: BUTTON_TYPE,
    props: {
      ...withControl({ ...rest, background: states.background }),
      backgroundHover: states.backgroundHover,
      backgroundPressed: states.backgroundPressed,
      backgroundLocked: states.backgroundLocked,
      onPress: onPress ?? ((): void => {}),
      children,
    },
  };
};

/** Serializes a `button` into the interactive (button) slot. */
export const buttonWriter: Writer = (payload, form, ctx, callbacks) => {
  emitButton(payload, form, ctx, callbacks);
};

/**
 * Whether a built `<Button>` is a container screen's close button: its press
 * is the handle `useExit()` gives a container. It draws like any button but
 * takes no slot — the client closes the screen, and script hears the close.
 */
export function isExitButton(element: JSX.Element): boolean {
  return isContainerExit(element.props.onPress);
}
