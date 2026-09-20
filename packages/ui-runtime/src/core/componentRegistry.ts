import { SerializationError, type Writer } from './types';

/**
 * What a native component type is, to the passes that walk a tree.
 *
 * @experimental See {@link registerComponent}.
 *
 * - `transparent` components are structure rather than a control: the layout,
 *   inherit and IR passes walk straight through to their children. `fragment`
 *   and `context-provider` are the built-in ones.
 * - `writer` belongs to the native modal fields alone, which the engine draws
 *   rather than the pack: the field is instantiated by a typed `ModalFormData`
 *   call, and the writer is what makes it.
 * - A descriptor with neither is a control the compiled layout draws, which is
 *   most of them. Nothing about it travels at runtime.
 */
export interface ComponentDescriptor {
  writer?: Writer;
  transparent?: boolean;
}

/**
 * What each native component `type` is. Built-ins are registered once via
 * `registerNativeComponents`; consumers add their own with
 * {@link registerComponent}.
 *
 * Keyed by the string `type` because function components are resolved to host
 * elements (string types) before any pass reads a descriptor.
 */
const registry = new Map<string, ComponentDescriptor>();

/**
 * Register a native component type. Throws if the type is already registered so
 * accidental clashes between addons surface immediately rather than silently
 * overriding each other.
 *
 * @param type - The component `type` string.
 * @param descriptor - What the type is; see {@link ComponentDescriptor}.
 *
 * @experimental Bound to the serialized payload format rather than the component API.
 */
export function registerComponent(type: string, descriptor: ComponentDescriptor): void {
  if (registry.has(type)) {
    throw new SerializationError(
      `registerComponent(): type "${type}" is already registered. `
      + `Pick a unique, namespaced type for your custom component.`,
    );
  }

  registry.set(type, descriptor);
}

/**
 * Resolve the descriptor for a component type, or `undefined` if not registered.
 */
export function getComponentDescriptor(type: string): ComponentDescriptor | undefined {
  return registry.get(type);
}

/**
 * Whether a type is registered as transparent (emits nothing; children only).
 */
export function isTransparentType(type: string): boolean {
  return registry.get(type)?.transparent ?? false;
}

/**
 * All currently registered component types, sorted — used for error messages.
 */
export function getRegisteredTypes(): string[] {
  return [...registry.keys()].sort();
}
