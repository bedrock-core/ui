import { ControlProps, withControl } from './control';
import { FunctionComponent, JSX } from '../jsx';

export type TextFont = 'mojangles' | 'minecraft-ten';

export interface TextStyle {
  font?: TextFont;
}

export interface TextProps extends ControlProps {
  font?: TextFont;

  /**
   * Text content to display
   * Max 80 characters
   */
  children: string;
}

export const Text: FunctionComponent<TextProps> = ({
  children,
  font,
  ...rest
}: TextProps): JSX.Element => ({
  type: 'text',
  props: {
    ...withControl(rest),
    value: children ?? '',
    __textMetrics: {
      font,
    },
  },
});
