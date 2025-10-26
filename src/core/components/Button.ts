import { ControlProps, withControl } from './control';
import { FunctionComponent, JSX } from '../../jsx';

export interface ButtonProps extends ControlProps {
  children?: JSX.Node;
  onPress?: () => void;
}

export const Button: FunctionComponent<ButtonProps> = ({ onPress, children, ...rest }: ButtonProps): JSX.Element => ({
  type: 'button',
  props: {
    ...withControl(rest),
    onPress,
    children,
  },
});
