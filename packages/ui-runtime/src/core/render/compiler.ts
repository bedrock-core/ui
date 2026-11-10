import { isCompilerCallback } from './callbacks';

/** Marker emitted only for components accepted by the build's purity analysis. */
const pureComponent = Symbol.for('@bedrock-core/ui/compiler/pure');
const callbackProps = Symbol.for('@bedrock-core/ui/compiler/callback-props');

/** Whether the compiler proved the component's render body safe to reuse. */
export function isCompiledPure(component: object): boolean {
  return Reflect.get(component, pureComponent) === true;
}

/** Reuse only props fully represented by their enumerable snapshot; callable props also need forwarding proof. */
export function cacheableProps(props: Record<string, unknown>, component: object): boolean {
  const prototype: unknown = Object.getPrototypeOf(props);

  if (prototype !== Object.prototype && prototype !== null) { return false; }

  const forwarded: unknown = Reflect.get(component, callbackProps);
  const descriptors = Object.getOwnPropertyDescriptors(props);

  return Reflect.ownKeys(descriptors).every((key) => {
    if (typeof key !== 'string') { return false; }

    const descriptor = descriptors[key];

    if (!descriptor.enumerable || !('value' in descriptor)) { return false; }

    const value: unknown = descriptor.value;

    if (typeof value === 'function') {
      return isCompilerCallback(value) && Array.isArray(forwarded) && forwarded.includes(key);
    }

    return value === null || typeof value !== 'object';
  });
}
