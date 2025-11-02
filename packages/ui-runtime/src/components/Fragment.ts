import { FunctionComponent, JSX } from '../jsx';

export interface FragmentProps { children?: JSX.Node }

export const Fragment: FunctionComponent<FragmentProps> = ({ children }: FragmentProps): JSX.Element => ({
  type: 'fragment',
  props: { children },
});
