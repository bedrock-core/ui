import type { JSX } from '../../jsx';

/** Build context available when a library describes a compiled press. */
export interface ActionMetadataContext {
  readonly namespace: string;
}

/** Data or a build-time factory retained beside a button's ordinary handler. */
export type ActionMetadataFactory = (context: ActionMetadataContext) => unknown;

/** Attaches a portable action description without changing the runtime handler. */
export function withActionMetadata(element: JSX.Element, metadata: ActionMetadataFactory): JSX.Element;
export function withActionMetadata(element: JSX.Element, metadata: unknown): JSX.Element;

export function withActionMetadata(element: JSX.Element, metadata: unknown): JSX.Element {
  return { ...element, props: { ...element.props, __actionMetadata: metadata } };
}

/** Resolves a library's action description; the compiler validates its plain-data form. */
export function actionMetadataOf(element: JSX.Element, context: ActionMetadataContext): unknown {
  const metadata: unknown = element.props.__actionMetadata;

  return typeof metadata === 'function' ? Reflect.apply(metadata, undefined, [context]) : metadata;
}
