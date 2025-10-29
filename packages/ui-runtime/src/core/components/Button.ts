import { FunctionComponent, JSX } from '../../jsx';
import { ControlProps, withControl } from './control';

export interface ButtonProps extends ControlProps {
  children?: JSX.Node;
  onPress?: () => void | Promise<void>;
}

export const Button: FunctionComponent<ButtonProps> = ({ onPress, children, ...rest }: ButtonProps): JSX.Element => ({
  type: 'button',
  props: {
    ...withControl(rest),
    onPress: onPress ?? (() => {}),
    children,
  },
});
