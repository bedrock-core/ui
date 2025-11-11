import { ControlProps, withControl } from './control';
import { FunctionComponent, JSX } from '../jsx';

export interface TextStyle {
  // Not working currently
  shadow?: boolean;
  fontSize?: 'small' | 'normal' | 'large' | 'extra_large';
  fontType?: 'default' | 'unicode' | 'smooth';
  // Makes no sense until we have flexbox or similar layouting
  textAlignment?: 'left' | 'center' | 'right';
}

export interface TextProps extends ControlProps {

  /**
   * Text content to display
   * Max 80 characters
   */
  children: string;
}

export const Text: FunctionComponent<TextProps> = ({ children, ...rest }: TextProps): JSX.Element => ({
  type: 'text',
  props: {
    ...withControl(rest),
    value: children ?? '',
  },
});
