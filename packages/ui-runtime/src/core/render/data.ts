import type { JSX } from '../../jsx';
import { childElements } from '../guards';
import { whyNotPlainData } from '../plainData';

/** Retains portable library compilation data beside a control without changing its layout. */
export function withCompileData(element: JSX.Element, key: string, data: unknown): JSX.Element {
  return { ...element, props: { ...element.props, __compileData: { key, data } } };
}

/** Reads library-owned data from an expanded tree; duplicate identities are rejected. */
export function compileDataOf(tree: JSX.Element): Readonly<Record<string, unknown>> | undefined {
  const values: Record<string, unknown> = {};
  const pending = [tree];

  while (pending.length > 0) {
    const node = pending.pop()!;
    const value = node.props.__compileData;

    if (typeof value === 'object' && value !== null && 'key' in value && typeof value.key === 'string' && 'data' in value) {
      if (Object.hasOwn(values, value.key)) { throw new Error(`Duplicate compiled data key: ${value.key}`); }

      const error = whyNotPlainData(value.data, value.key);

      if (error !== undefined) { throw new Error(`Compiled data must be portable: ${error}`); }

      values[value.key] = value.data;
    }

    pending.push(...childElements(node.props.children));
  }

  return Object.keys(values).length === 0 ? undefined : values;
}
