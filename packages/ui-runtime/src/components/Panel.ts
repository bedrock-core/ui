import { ControlProps, withControl } from './control';
import { FunctionComponent, JSX } from '../jsx';

/** The host `type` emitted by {@link Panel}. */
export const PANEL_TYPE = 'panel';

export interface PanelProps extends ControlProps { children?: JSX.Node }

export const Panel: FunctionComponent<PanelProps> = ({ children, ...rest }: PanelProps): JSX.Element => ({
  type: PANEL_TYPE,
  props: {
    ...withControl(rest),
    children,
  },
});
