import { Fragment as FragmentComponent } from '../components/Fragment';

interface NativeNode<P extends JSX.Props = JSX.Props> {
  type: string | FunctionComponent<P>;
  props: P;
}

export namespace JSX {
  export type Element = NativeNode;
  export type Node = Element | Element[] | string | null | undefined;
  export type Props = { [key: string]: unknown } & { children?: Node };
}

export type FunctionComponent<P = JSX.Props> = (props: P) => JSX.Element;

/**
 * Lazy JSX runtime - stores function references instead of calling them immediately.
 * Functions are called later during tree building when context is properly set up.
 */
export function renderJSX(
  tag: string | FunctionComponent,
  props: JSX.Props,
): JSX.Element {
  // Store the tag (string or function) without calling it
  // buildTree() will call function components at the appropriate time
  return {
    type: tag,
    props: props || {},
  };
}

// Export factories
export const jsx = renderJSX;
export const jsxs = renderJSX;
export const jsxDEV = renderJSX;

// Export Fragment for JSX fragment syntax (<>...</>)
export const Fragment = FragmentComponent;
