import { withControl } from '.';
import { FunctionComponent, JSX, JSXProps } from '../../jsx/jsx-runtime';

export interface FragmentProps extends JSXProps { }

export const Fragment: FunctionComponent<FragmentProps> = ({ children, ...rest }: FragmentProps): JSX.Element => ({
  type: 'fragment',
  props: { ...withControl(rest) },
  children,
});
