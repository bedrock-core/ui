
import { ControlProps, withControl } from '.';
import { FunctionComponent, JSX } from '../../jsx';

export interface PanelProps extends ControlProps {
  // Future idea
  // display?: 'flex' | 'block';
  // orientation?: 'vertical' | 'horizontal';
}

export const Panel: FunctionComponent<PanelProps> = ({ children, ...rest }: PanelProps): JSX.Element => ({
  type: 'panel',
  props: { ...withControl(rest) },
  children,
});
