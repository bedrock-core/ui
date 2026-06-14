import type { Writer } from '../core/types';
import { emitButton } from '../core/writers';
import { FunctionComponent, JSX } from '../jsx';
import { ControlProps, withControl } from './control';

export interface ButtonProps extends ControlProps {
  children?: JSX.Node;
  onPress?: () => unknown | Promise<unknown>;
  backgroundHover?: string; // [1024-1106] texture path for hover state
  backgroundPressed?: string; // [1107-1189] texture path for pressed state
  backgroundLocked?: string; // [1190-1272] texture path for locked/disabled state
}

export const Button: FunctionComponent<ButtonProps> = ({ onPress, backgroundHover, backgroundPressed, backgroundLocked, children, ...rest }: ButtonProps): JSX.Element => ({
  type: 'button',
  props: {
    ...withControl(rest),
    backgroundHover: backgroundHover ?? '',
    backgroundPressed: backgroundPressed ?? '',
    backgroundLocked: backgroundLocked ?? '',
    onPress: onPress ?? ((): void => {}),
    children,
  },
});

/** Serializes a `button` into the interactive (button) slot. */
export const buttonWriter: Writer = (payload, form, ctx, callbacks) => {
  emitButton(payload, form, ctx, callbacks);
};
