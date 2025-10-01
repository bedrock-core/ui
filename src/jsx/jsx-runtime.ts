import { SerializablePrimitive } from '../core';

interface NativeNode<P extends JSX.Props = JSX.Props> {
  type: string;
  props: P;
}

export namespace JSX {
  export type Element = NativeNode;
  export type Node = Element | Element[] | null | undefined;
  export type Props = { [key: string]: SerializablePrimitive | Node | undefined } & { children?: Node };
}

export type FunctionComponent<P extends JSX.Props = JSX.Props> = (props: P) => JSX.Element;

/**
 * JSX runtime function for production mode (jsx/jsxs)
 */
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
