import { ControlProps, withControl } from './control';
import { FunctionComponent, JSX } from '../../jsx';

export interface PanelProps extends ControlProps { }

export const Panel: FunctionComponent<PanelProps> = ({ children, ...rest }: PanelProps): JSX.Element => ({
  type: 'panel',
  props: {
    ...withControl(rest),
    children,
  },
});
