import { ControlProps, withControl } from './control';
import { FunctionComponent, JSX } from '../jsx';

/** The host `type` emitted by {@link Panel}. */
export const PANEL_TYPE = 'panel';

export interface PanelProps extends ControlProps {
  children?: JSX.Node;
  /**
   * Draw the column as a stack, so a hidden child takes no space and the
   * children after it move up.
   *
   * A compiled screen's boxes are solved before anyone is looking at them, so a
   * child hidden at show time normally leaves the space it was given — three
   * optional rows with the middle one missing leave a gap in the middle. A stack
   * is the one thing the engine reflows on its own, which is what makes the rows
   * pack. The cost is a background: a stack has nowhere to draw one, so put it
   * on a panel around this one.
   */
  stack?: boolean;
}

export const Panel: FunctionComponent<PanelProps> = ({ children, stack, ...rest }: PanelProps): JSX.Element => ({
  type: PANEL_TYPE,
  props: {
    ...withControl(rest),
    // Outside `withControl`: the build reads it off the element, and it is not a
    // control property — it decides which control the panel becomes.
    ...stack === true ? { stack: true } : {},
    children,
  },
});
