import { JSX } from '../../jsx';
import { Context } from './types';

export function isContextProvider(element: JSX.Element): element is JSX.Element & {
  type: 'context-provider';
  props: JSX.Props & { __context: Context<unknown>; value: unknown };
} {
  return element.type === 'context-provider' && element.props && '__context' in element.props;
}
