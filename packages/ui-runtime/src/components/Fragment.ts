import { FunctionComponent, JSX } from '../jsx';
import { withControl } from './control';

export interface FragmentProps extends JSX.Props { }

export const Fragment: FunctionComponent<FragmentProps> = ({ children, ...rest }: FragmentProps): JSX.Element => ({
  type: 'fragment',
  props: {
    ...withControl({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      ...rest,
    }),
    children,
  },
});
