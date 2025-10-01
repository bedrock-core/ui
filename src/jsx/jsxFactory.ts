import { Fragment } from '../core/components';
import type { ComponentType, JSXProps, SerializableElement } from '../types/component';
import { getIntrinsicComponent } from './intrinsics';

/**
 * React-compatible createElement function for @bedrock-core/ui components.
 *
 * @param type - Component function or intrinsic element string
 * @param props - Properties object or null
 * @param children - Child components only
 * @returns Component object with serialize method
 */
export function createElement<P extends JSXProps = JSXProps>(
  type: ComponentType<P>,
  props: P,
  ...children: SerializableElement[]
): SerializableElement {
  const normalizedProps = props || {} as P;

  if (typeof type === 'string') {
    // Intrinsic element (built-in component like 'panel', 'text', etc.)
    const IntrinsicComponent = getIntrinsicComponent(type);
    if (!IntrinsicComponent) {
      throw new Error(`Unknown intrinsic component type: "${type}"`);
    }

    return IntrinsicComponent({
      ...normalizedProps,
      children,
    });
  } else {
    // JSX Component function
    return type({
      ...normalizedProps,
      children,
    });
  }
}

export function createFragment<P extends JSXProps = JSXProps>(
  props: P,
  ...children: SerializableElement[]
): SerializableElement {
  const normalizedProps = props || {} as P;

  return Fragment({
    ...normalizedProps,
    children,
  });
}
