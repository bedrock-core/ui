import { describe, expect, it } from 'vitest';
import {
  getComponentDescriptor,
  getRegisteredTypes,
  isTransparentType,
  registerComponent,
} from '../componentRegistry';
import type { Writer } from '../types';

const noopWriter: Writer = () => {};

describe('componentRegistry', () => {
  it('registers the built-in native components via the test setup', () => {
    const types = getRegisteredTypes();

    expect(types).toContain('button');
    expect(types).toContain('panel');
    expect(types).toContain('text');
    expect(types).toContain('image');
    expect(types).toContain('item_renderer');
  });

  it('marks fragment / context-provider as transparent and renderables as not', () => {
    expect(isTransparentType('fragment')).toBe(true);
    expect(isTransparentType('context-provider')).toBe(true);
    expect(isTransparentType('button')).toBe(false);
  });

  it('registers and resolves a custom renderable component', () => {
    registerComponent('test-custom-renderable', { writer: noopWriter });

    const descriptor = getComponentDescriptor('test-custom-renderable');

    expect(descriptor?.writer).toBe(noopWriter);
    expect(isTransparentType('test-custom-renderable')).toBe(false);
    expect(getRegisteredTypes()).toContain('test-custom-renderable');
  });

  it('registers a custom transparent component', () => {
    registerComponent('test-custom-transparent', { transparent: true });

    expect(isTransparentType('test-custom-transparent')).toBe(true);
  });

  it('throws when registering a duplicate type', () => {
    registerComponent('test-duplicate', { writer: noopWriter });

    expect(() => registerComponent('test-duplicate', { writer: noopWriter })).toThrow(/already registered/);
  });

  it('throws when a descriptor has neither a writer nor transparent', () => {
    expect(() => registerComponent('test-empty', {})).toThrow(/writer or be transparent/);
  });

  it('returns undefined for unknown types', () => {
    expect(getComponentDescriptor('definitely-not-registered')).toBeUndefined();
  });
});
