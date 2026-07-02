import type { Writer } from '../core/types';
import { emitButton } from '../core/writers';
import { FunctionComponent, JSX } from '../jsx';
import { ControlProps, resolveStateBackgrounds, StateBackgroundProps, withControl } from './control';

export interface ButtonProps extends ControlProps, StateBackgroundProps {
  children?: JSX.Node;
  onPress?: () => unknown | Promise<unknown>;
  // state textures serialize at [1024-1106] hover / [1107-1189] pressed /
  // [1190-1272] locked, resolved by the shared `state ?? base ?? unstyled` rule
}

export const Button: FunctionComponent<ButtonProps> = ({ onPress, backgroundHover, backgroundPressed, backgroundLocked, children, ...rest }: ButtonProps): JSX.Element => {
  const states = resolveStateBackgrounds({ background: rest.background, backgroundHover, backgroundPressed, backgroundLocked });

  return {
    type: 'button',
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
