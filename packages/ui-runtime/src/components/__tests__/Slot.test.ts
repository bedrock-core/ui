import { describe, expect, it } from 'vitest';
import { isForeignSlot, Slot, slotInteractive, slotRole, slotSource } from '../Slot';

describe('Slot / foreign source', () => {
  it('builds an own slot with no source, interactive by default', () => {
    const own = Slot({});

    expect(isForeignSlot(own)).toBe(false);
    expect(slotSource(own)).toBeUndefined();
    expect(slotInteractive(own)).toBe(true);
  });

  it('locks an own slot on request', () => {
    expect(slotInteractive(Slot({ interactive: false }))).toBe(false);
  });

  it('carries a role on an own slot, defaulting to both', () => {
    expect(slotRole(Slot({}))).toBe('both');
    expect(slotRole(Slot({ role: 'input' }))).toBe('input');
    expect(slotRole(Slot({ role: 'output' }))).toBe('output');
  });

  it('builds a foreign slot, interactive by default', () => {
    expect(slotSource(Slot({ collection: 'inventory_items', index: 5 })))
      .toEqual({ collection: 'inventory_items', index: 5, interactive: true });
  });

  it('marks a display-only foreign slot inert', () => {
    expect(slotSource(Slot({ collection: 'hotbar_items', index: 0, interactive: false }))?.interactive).toBe(false);
  });

  it('refuses a collection without an integer index >= 0', () => {
    expect(() => Slot({ collection: 'inventory_items' })).toThrow(RangeError);
    expect(() => Slot({ collection: 'inventory_items', index: -1 })).toThrow(RangeError);
    expect(() => Slot({ collection: 'inventory_items', index: 1.5 })).toThrow(RangeError);
  });

  it('refuses an index without a collection', () => {
    expect(() => Slot({ index: 3 })).toThrow(/needs a `collection`/);
  });

  it('refuses a role combined with a collection', () => {
    expect(() => Slot({ collection: 'inventory_items', index: 0, role: 'input' })).toThrow(/cannot be combined/);
  });
});
