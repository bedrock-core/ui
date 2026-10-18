import { whyNotPlainData } from '../plainData';
import type { FunctionComponent } from '../../jsx';

/** Portable parameter metadata retained at runtime. */
export type ScreenParameter = { readonly optional?: boolean } & (
  | { readonly type: 'string'; readonly enum?: readonly string[] }
  | { readonly type: 'number'; readonly enum?: readonly number[] }
  | { readonly type: 'boolean' }
  | { readonly type: 'data' }
  | { readonly type: 'array'; readonly items: ScreenParameter }
  | { readonly type: 'object'; readonly properties: ScreenParameters }
);

/** Public parameters; undeclared names are rejected. */
export type ScreenParameters = Readonly<Record<string, ScreenParameter>>;

/** Metadata shared by every host, independently of how it opens a screen. */
export interface ScreenMetadata {
  readonly key: string;
  readonly kind: 'action' | 'modal' | 'block' | 'entity' | 'custom';
  /** An absent contract accepts plain data; an empty contract accepts no parameters. */
  readonly parameters?: ScreenParameters;
}

const descriptors = new Map<string, ScreenMetadata>();
const components = new WeakMap<object, ScreenMetadata>();

function copy(descriptor: ScreenMetadata): ScreenMetadata {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- validated metadata retains its shape through JSON
  return JSON.parse(JSON.stringify(descriptor)) as ScreenMetadata;
}

/** Registers build metadata, including screens with native container hosts. */
export function registerScreenMetadata(descriptor: ScreenMetadata, component?: FunctionComponent): void {
  if (!isScreenMetadata(descriptor)) { throw new Error('Invalid screen descriptor.'); }

  descriptors.set(descriptor.key, copy(descriptor));

  if (component !== undefined) { components.set(component, copy(descriptor)); }
}

/** All screens known to this bundle, including static and container screens. */
export function screenMetadata(): readonly ScreenMetadata[] {
  return [...descriptors.values()].map(copy);
}

/** Local screen metadata by exact public key. */
export function screenMetadataFor(key: string): ScreenMetadata | undefined {
  const direct = descriptors.get(key);

  if (direct !== undefined) { return copy(direct); }

  if (key.includes(':')) { return undefined; }

  const matches = [...descriptors.values()].filter(screen => screen.key.slice(screen.key.lastIndexOf(':') + 1) === key);

  return matches.length === 1 ? copy(matches[0]) : undefined;
}

/** Checks descriptors received from another realm. */
export function isScreenMetadata(value: unknown): value is ScreenMetadata {
  if (whyNotPlainData(value, 'screen') !== undefined || value === null || typeof value !== 'object' || Array.isArray(value)
    || !('key' in value) || typeof value.key !== 'string' || value.key.length === 0
    || !('kind' in value) || !['action', 'modal', 'block', 'entity', 'custom'].includes(String(value.kind))) { return false; }

  return !('parameters' in value) || isParameters(value.parameters);
}

function isParameters(value: unknown, depth = 0): value is ScreenParameters {
  if (depth > 16 || value === null || typeof value !== 'object' || Array.isArray(value)) { return false; }

  return Object.values(value).every((parameter: unknown) => {
    if (parameter === null || typeof parameter !== 'object' || Array.isArray(parameter) || !('type' in parameter)
      || ('optional' in parameter && typeof parameter.optional !== 'boolean')) { return false; }

    if (parameter.type === 'object') { return 'properties' in parameter && isParameters(parameter.properties, depth + 1); }

    if (parameter.type === 'array') { return 'items' in parameter && isParameters({ item: parameter.items }, depth + 1); }

    if (parameter.type === 'boolean' || parameter.type === 'data') { return true; }

    return (parameter.type === 'string' || parameter.type === 'number')
      && (!('enum' in parameter) || (Array.isArray(parameter.enum) && parameter.enum.length > 0
        && parameter.enum.every((item: unknown) => typeof item === parameter.type)));
  });
}

/** A validation error, or undefined when parameters satisfy the contract. */
export function screenParametersError(contract: ScreenParameters | undefined, params: Readonly<Record<string, unknown>> = {}): string | undefined {
  const plain = whyNotPlainData(params, 'params');

  if (plain !== undefined) { return `Parameters must be plain data: ${plain}`; }

  if (params === null || typeof params !== 'object' || Array.isArray(params)) { return 'Parameters must be an object.'; }

  if (contract === undefined) { return undefined; }

  const validate = (parameter: ScreenParameter, value: unknown, path: string): string | undefined => {
    if (value === undefined) { return `${path} is required.`; }

    if (parameter.type === 'data') { return undefined; }

    if (parameter.type === 'array') {
      if (!Array.isArray(value)) { return `${path} must be an array.`; }

      for (const [index, item] of value.entries()) {
        const error = validate(parameter.items, item, `${path}[${index}]`);

        if (error !== undefined) { return error; }
      }

      return undefined;
    }

    if (parameter.type === 'object') {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) { return `${path} must be an object.`; }

      return record(parameter.properties, value, path);
    }

    if (typeof value !== parameter.type) { return `${path} must be ${parameter.type}.`; }

    if ('enum' in parameter && parameter.enum !== undefined && !parameter.enum.some(item => item === value)) {
      return `${path} is not an accepted value.`;
    }

    return undefined;
  };

  const record = (properties: ScreenParameters, values: object, path: string): string | undefined => {
    for (const name of Object.keys(values)) {
      if (!Object.hasOwn(properties, name)) { return `${path}.${name} is not declared.`; }
    }

    for (const [name, parameter] of Object.entries(properties)) {
      const value: unknown = Object.hasOwn(values, name) ? Reflect.get(values, name) : undefined;

      if (value === undefined && parameter.optional === true) { continue; }

      const error = validate(parameter, value, `${path}.${name}`);

      if (error !== undefined) { return error; }
    }

    return undefined;
  };

  return record(contract, params, 'params');
}

/** Build metadata associated with a component or an element rendering it. */
export function screenMetadataOf(root: unknown): ScreenMetadata | undefined {
  const component = typeof root === 'function'
    ? root
    : typeof root === 'object' && root !== null && 'type' in root && typeof root.type === 'function' ? root.type : undefined;

  if (component === undefined) { return undefined; }

  const metadata = components.get(component);

  return metadata === undefined ? undefined : copy(metadata);
}
