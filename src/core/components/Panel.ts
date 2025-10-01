
import { ControlProps } from '.';
import { FunctionComponent, JSX, JSXNode } from '../../jsx';

export interface PanelProps extends ControlProps {
  // Future idea
  // display?: 'flex' | 'block';
  // orientation?: 'vertical' | 'horizontal';
}

export const Panel: FunctionComponent<PanelProps> = (props: PanelProps, children: JSXNode[]): JSX.Element => ({
  type: 'panel',
  props,
  children,
});
