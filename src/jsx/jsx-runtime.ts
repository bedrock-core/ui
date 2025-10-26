import { SerializablePrimitive } from '../core';
import { Fragment as FragmentComponent } from '../core/components/Fragment';

interface NativeNode<P extends JSX.Props = JSX.Props> {
  type: string;
  props: P;
}

export namespace JSX {
  export type Element = NativeNode;
  export type Node = Element | Element[] | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type PropValue = SerializablePrimitive | Node | undefined | ((...args: any[]) => void);
  export type Props = { [key: string]: PropValue } & { children?: Node };
}

export type FunctionComponent<P = JSX.Props> = (props: P) => JSX.Element;

export function renderJSX(
  tag: FunctionComponent,
  props: JSX.Props,
): JSX.Element {
  return tag(props || {});
}

// Export factories
export const jsx = renderJSX;
export const jsxs = renderJSX;
export const jsxDEV = renderJSX;

// Export Fragment for JSX fragment syntax (<>...</>)
export const Fragment = FragmentComponent;
