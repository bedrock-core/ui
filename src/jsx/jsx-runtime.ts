import { FragmentProps, ImageProps, PanelProps, TextProps } from '../core/components';

interface NativeNode<P extends JSX.Props = JSX.Props> {
  type: string;
  props: P;
  children?: JSX.Node;
}

export namespace JSX {
  export type Element = NativeNode;

  export type Node = Element | Element[] | null | undefined;
  export type Props = Record<string, unknown> & { children?: Node };

  interface ElementAttributesProperty {
    props: Props;
  }
  interface ElementChildrenAttribute {
    children: Node;
  }

  export type IntrinsicElements = {
    Fragment: FragmentProps;
    Panel: PanelProps;
    Text: TextProps;
    Image: ImageProps;
  };
}

// TODO SERIALIZABLE PROPS

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
