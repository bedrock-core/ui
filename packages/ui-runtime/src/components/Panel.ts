import type { Writer } from '../core/types';
import { emitLabel } from '../core/writers';
import { ControlProps, withControl } from './control';
import { FunctionComponent, JSX } from '../jsx';

export interface PanelProps extends ControlProps { children: JSX.Node }

export const Panel: FunctionComponent<PanelProps> = ({ children, ...rest }: PanelProps): JSX.Element => ({
  type: 'panel',
  props: {
    ...withControl(rest),
    children,
  },
});

/** Serializes a `panel` into the static (label) slot. */
export const panelWriter: Writer = (payload, form) => {
  emitLabel(payload, form);
};
