import { ControlProps, withControl } from '.';
import { FunctionComponent, JSX } from '../../jsx';

export interface TextStyle {
  // Not working currently
  shadow?: boolean;
  fontSize?: 'small' | 'normal' | 'large' | 'extra_large';
  fontType?: 'default' | 'unicode' | 'smooth';
  // Makes no sense until we have flexbox or similar layouting
  textAlignment?: 'left' | 'center' | 'right';
}

export interface TextProps extends ControlProps {
  value: string;
  // textStyle?: TextStyle;
}

export const Text: FunctionComponent<TextProps> = ({ value, ...rest }: TextProps): JSX.Element => ({
  type: 'text',
  props: { ...withControl(rest), value: value ?? '' },
});
