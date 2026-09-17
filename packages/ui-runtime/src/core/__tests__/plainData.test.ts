import { describe, expect, it } from 'vitest';
import { whyNotPlainData } from '../plainData';

describe('plain data', () => {
  it('is what JSON writes and reads back unchanged', () => {
    expect(whyNotPlainData({
      name: 'diamond', price: 64, ratio: -0.5, sold: false, owner: null, tags: ['ore', 'rare'], nested: { deep: [{ level: 3 }] },
    }, 'params')).toBeUndefined();
    expect(whyNotPlainData(Object.assign(Object.create(null) as object, { bare: true }), 'params')).toBeUndefined();
  });

  it('names the first part that is not, by the path the author wrote', () => {
    expect(whyNotPlainData({ onPick: () => undefined }, 'params')).toBe('`params.onPick` is a function');
    expect(whyNotPlainData({ list: [1, undefined] }, 'params')).toBe('`params.list[1]` is undefined');
    expect(whyNotPlainData({ 'odd key': Number.NaN }, 'params')).toBe('`params["odd key"]` is NaN');
    expect(whyNotPlainData({ big: 1n }, 'params')).toBe('`params.big` is a bigint');
  });

  it('refuses an instance of a class, whose prototype JSON would drop', () => {
    expect(whyNotPlainData({ when: new Date(0) }, 'params')).toBe('`params.when` is an instance of Date');
    expect(whyNotPlainData({ seen: new Map() }, 'params')).toBe('`params.seen` is an instance of Map');
  });

  it('refuses a symbol key and a value that contains itself', () => {
    expect(whyNotPlainData({ [Symbol('hidden')]: 1 }, 'params')).toBe('`params` has a symbol key');

    const loop: Record<string, unknown> = {};

    loop['self'] = loop;

    expect(whyNotPlainData(loop, 'params')).toBe('`params.self` contains itself');
  });

  it('accepts the same object twice when neither contains the other', () => {
    const shared = { id: 'diamond' };

    expect(whyNotPlainData({ first: shared, second: shared }, 'params')).toBeUndefined();
  });
});
