import { describe, expect, it } from 'vitest';
import {
  GUARD_ITEM_AUX, joinKey, layoutKey, MAX_LAYOUT, PROTOCOL_ITEM_AUX, splitKey, TRANSPORT_ITEM_AUX,
} from '../contract';

describe('the layout key', () => {
  it('depends on nothing but the screen\'s full name', () => {
    expect(layoutKey('core', 'furnace')).toBe(layoutKey('core', 'furnace'));
    expect(layoutKey('core', 'furnace')).not.toBe(layoutKey('drav0011_shop', 'furnace'));
    expect(layoutKey('core', 'furnace')).not.toBe(layoutKey('core', 'crate'));
  });

  it('always fits two stacks', () => {
    for (const [namespace, name] of [['core', 'a'], ['x', ''], ['', ''], ['drav0011_shop', 'crafting_table']]) {
      const key = layoutKey(namespace ?? '', name ?? '');
      const { high, low } = splitKey(key);

      expect(Number.isInteger(key)).toBe(true);
      expect(key).toBeGreaterThanOrEqual(1);
      expect(key).toBeLessThanOrEqual(MAX_LAYOUT);
      // A stack of one publishes no count, so no half is ever 1.
      expect(high).toBeGreaterThanOrEqual(2);
      expect(high).toBeLessThanOrEqual(64);
      expect(low).toBeGreaterThanOrEqual(2);
      expect(low).toBeLessThanOrEqual(64);
      expect(joinKey(high, low)).toBe(key);
    }

    expect(MAX_LAYOUT).toBe(63 * 63);
    expect(splitKey(1)).toEqual({ high: 2, low: 2 });
    expect(splitKey(63)).toEqual({ high: 2, low: 64 });
    expect(splitKey(64)).toEqual({ high: 3, low: 2 });
    expect(splitKey(MAX_LAYOUT)).toEqual({ high: 64, low: 64 });
  });

  it('rides three distinct legacy-range blocks, whose ids never shift', () => {
    const ids = [PROTOCOL_ITEM_AUX, TRANSPORT_ITEM_AUX, GUARD_ITEM_AUX].map(value => value / 65536);

    expect(new Set(ids).size).toBe(3);

    for (const id of ids) {
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
      expect(id).toBeLessThan(256);
    }
  });
});
