import { describe, expect, it } from 'vitest';
import { SlotGrid, slotGridConfig } from '../SlotGrid';

describe('SlotGrid', () => {
  it('reads its config back, interactive and un-hidden by default', () => {
    expect(slotGridConfig(SlotGrid({ collection: 'inventory_items', columns: 9, rows: 3 })))
      .toEqual({ collection: 'inventory_items', columns: 9, rows: 3, interactive: true, hideOwned: false });
  });

  it('carries interactive and hideOwned when asked', () => {
    expect(slotGridConfig(SlotGrid({ collection: 'hotbar_items', columns: 9, rows: 1, interactive: false, hideOwned: true })))
      .toEqual({ collection: 'hotbar_items', columns: 9, rows: 1, interactive: false, hideOwned: true });
  });

  it('refuses an empty collection', () => {
    expect(() => SlotGrid({ collection: '', columns: 9, rows: 1 })).toThrow(RangeError);
  });

  it('refuses non-positive dimensions', () => {
    expect(() => SlotGrid({ collection: 'inventory_items', columns: 0, rows: 1 })).toThrow(/columns/);
    expect(() => SlotGrid({ collection: 'inventory_items', columns: 9, rows: 0 })).toThrow(/rows/);
  });
});
