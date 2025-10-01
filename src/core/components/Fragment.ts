import { withControl } from '.';
import { FunctionComponent, JSX } from '../../jsx/jsx-runtime';

export interface FragmentProps extends JSX.Props { }

export const Fragment: FunctionComponent<FragmentProps> = ({ children, ...rest }: FragmentProps): JSX.Element => ({
  type: 'fragment',
  props: { ...withControl(rest) },
  children,
});
