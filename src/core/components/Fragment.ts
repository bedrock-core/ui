import { FunctionComponent, JSX, JSXNode, JSXProps } from '../../jsx/jsx-runtime';

export interface FragmentProps extends JSXProps { }

export const Fragment: FunctionComponent<FragmentProps> = (props: FragmentProps, children: JSXNode[]): JSX.Element => ({
  type: 'fragment',
  props,
  children,
});
