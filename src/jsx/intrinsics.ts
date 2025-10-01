import { IntrinsicElementFunction, JSXProps } from '../types/component';

/**
 * Intrinsic element registry - maps string names to native element functions
 * This will be populated with actual native components (Panel, Text, Image, etc.)
 */
const intrinsicElements = new Map<string, IntrinsicElementFunction<JSXProps>>();

export function getIntrinsicComponent<T extends JSXProps>(
  name: string,
): IntrinsicElementFunction<T> | undefined {
  return intrinsicElements.get(name.toLowerCase()) as IntrinsicElementFunction<T> | undefined;
}

export function registerIntrinsicComponent<T extends JSXProps>(name: string, component: IntrinsicElementFunction<T>): void {
  intrinsicElements.set(name.toLowerCase(), component as IntrinsicElementFunction<JSXProps>);
}
