import { FragmentProps, ImageProps, PanelProps, TextProps } from '../core/components';

export interface Node<P extends JSXProps = JSXProps> {
  type: string;
  props: P;
  children?: JSXNode[];
}

export declare namespace JSX {
  export type Element = Node;

  export type IntrinsicElements = {
    Fragment: FragmentProps;
    Panel: PanelProps;
    Text: TextProps;
    Image: ImageProps;
  };
}

export type JSXNode = JSX.Element | JSX.Element[] | null | undefined;
// TODO SERIALIZABLE PROPS
export type JSXProps = Record<string, unknown> & { children?: JSXNode };

export type FunctionComponent<P extends JSXProps = JSXProps> = (props: P) => JSX.Element;

/**
 * JSX runtime function for production mode (jsx/jsxs)
 */
export function renderJSX(
  tag: FunctionComponent,
  props: JSXProps | null,
): JSX.Element {
  return tag(props || {});
}

// Export factories
export const jsx = renderJSX;
export const jsxs = renderJSX;
export const jsxDEV = renderJSX;
