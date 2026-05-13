import { FunctionComponent, JSX } from '../jsx';
import { ControlProps, withControl } from './control';

export interface ButtonProps extends ControlProps {
  children?: JSX.Node;
  onPress?: () => unknown | Promise<unknown>;
}

const BUTTON_PAD_H = 8;
const BUTTON_PAD_V = 4;

export const Button: FunctionComponent<ButtonProps> = ({ onPress, children, ...rest }: ButtonProps): JSX.Element => ({
  type: 'button',
  props: {
    ...withControl({
      paddingLeft: BUTTON_PAD_H,
      paddingRight: BUTTON_PAD_H,
      paddingTop: BUTTON_PAD_V,
      paddingBottom: BUTTON_PAD_V,
      ...rest,
    }),
    onPress: onPress ?? ((): void => {}),
    children,
  },
});
