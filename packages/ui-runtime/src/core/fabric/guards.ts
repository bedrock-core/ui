import { JSX } from '../../jsx';
import { Context, Fiber } from './types';

export function isContextProvider(element: JSX.Element): element is JSX.Element & {
  type: 'context-provider';
  props: JSX.Props & { __context: Context<unknown>; value: unknown };
} {
  return element.type === 'context-provider' && element.props && '__context' in element.props;
}

export function isSuspenseBoundary(fiber: Fiber): fiber is Fiber & { suspense: NonNullable<Fiber['suspense']> } {
  return fiber.isSuspenseBoundary && !!fiber.suspense;
}
