import { ControlProps, withControl } from './control';
import { FunctionComponent, JSX } from '../../jsx';

export interface ButtonProps extends ControlProps {
  label: string;
  onPress?: () => void;
}

export const Button: FunctionComponent<ButtonProps> = ({ label, onPress, ...rest }: ButtonProps): JSX.Element => ({
  type: 'button',
  props: {
    ...withControl(rest),
    label,
    onPress,
  },
});
