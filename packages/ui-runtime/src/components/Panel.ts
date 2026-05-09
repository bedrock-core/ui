import { ControlProps, withControl } from './control';
import { FunctionComponent, JSX } from '../jsx';

export interface PanelProps extends ControlProps {
  children?: JSX.Node;
  /** When true, renders without background texture — use for layout-only grouping containers. */
  transparent?: boolean;
}

export const Panel: FunctionComponent<PanelProps> = ({ children, transparent, ...rest }: PanelProps): JSX.Element => ({
  type: transparent ? 'view' : 'panel',
  props: {
    ...withControl(rest),
    children,
  },
});
