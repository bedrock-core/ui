/* eslint-disable @typescript-eslint/no-namespace */
import { ControlProps } from '../components';
import { Fragment as FragmentComponent } from '../components/Fragment';

export interface NativeNode<P extends JSX.Props = JSX.Props> {
  type: string | FunctionComponent<P>;
  props: P;
  nativeArgs?: Record<string, unknown>;
}

export namespace JSX {
  export type Element = NativeNode;
  /** What every component accepts besides its own props — `key` re-seats
   *  state: a changed key is a new instance, the React reset idiom. */
  export interface IntrinsicAttributes {
    key?: string | number;
  }
  // Booleans are legal so `{cond && <X/>}` type-checks: the build rewrites the
  // idiom into a carried `visible` before compile and bundle alike, and the
  // walk drops any boolean that still reaches it.
  export type Node = Element | string | boolean | null | undefined | (Element | boolean | null | undefined)[];
  export type Props = ControlProps & { [key: string]: unknown } & { children?: Node };
}

export type FunctionComponent<P = JSX.Props> = (props: P) => JSX.Element;

/**
 * Lazy JSX runtime - stores function references instead of calling them immediately.
 * Functions are called later during tree building when context is properly set up.
 */
export function renderJSX(
  tag: string | FunctionComponent,
  props: JSX.Props,
  key?: string | number,
): JSX.Element {
  // Store the tag (string or function) without calling it
  // buildTree() will call function components at the appropriate time.
  // The automatic runtime hoists `key` out of props into its own argument;
  // fold it back so the expander finds it where it looks.
  return {
    type: tag,
    props: key === undefined ? props || {} : { ...props, key },
  };
}

// Export factories
export const jsx = renderJSX;
export const jsxs = renderJSX;
export const jsxDEV = renderJSX;

// Export Fragment for JSX fragment syntax (<>...</>)
export const Fragment = FragmentComponent;
