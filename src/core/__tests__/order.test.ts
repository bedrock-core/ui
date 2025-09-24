import { describe, it, expect } from 'vitest';
import { Panel } from '../components/Panel';
import { PROTOCOL_HEADER, SLICE_WIDTH, PADDED_WIDTH, TYPE_PREFIX, FIELD_MARKERS } from '../serializer';

// This test guards the ordering of serialized fields for Panel (and by extension
// any component using the same withControledLayout pattern). If ordering changes
// it will break JSON UI binding offsets; this test should alert maintainers.

// Expected field type sequence (after header) for Panel currently:
// 0: type (string)
// 1: visible (bool)
// 2: enabled (bool)
// 3: layer (int)
// 4: inheritMaxSiblingWidth (bool)
// 5: inheritMaxSiblingHeight (bool)
// 6: width (string)
// 7: height (string)
// 8: x (string)
// 9: y (string)
// Update ONLY by appending new fields at the end per protocol evolution rules.

const FIELD_PLAN: (keyof typeof SLICE_WIDTH)[] = ['s', 'b', 'b', 'i', 'b', 'b', 's', 's', 's', 's'];

function slice(payload: string, fieldIndex: number): string {
  let offset = PROTOCOL_HEADER.length;
  for (let i = 0; i < fieldIndex; i++) offset += SLICE_WIDTH[FIELD_PLAN[i]];

  return payload.slice(offset, offset + SLICE_WIDTH[FIELD_PLAN[fieldIndex]]);
}

function corePadded(fieldSlice: string, typeCode: keyof typeof SLICE_WIDTH): string {
  // Remove the 2-char type/prefix (e.g. 's:'), drop trailing marker
  return fieldSlice.slice(2, 2 + (typeCode === 's' ? PADDED_WIDTH.s : typeCode === 'b' ? PADDED_WIDTH.b : typeCode === 'i' ? PADDED_WIDTH.i : PADDED_WIDTH.f));
}

describe('Serialization field order', () => {
  it('emits fields in stable, documented order with default values', () => {
    const captured: string[] = [];
    const mockForm = { label: (t: string) => captured.push(t) } as unknown as import('@minecraft/server-ui').ModalFormData;

    Panel({
      width: 'W',
      height: 'H',
      x: 'X',
      y: 'Y',
      children: [],
    }).serialize(mockForm);

    expect(captured.length).toBe(1);
    const payload = captured[0];
    expect(payload.startsWith(PROTOCOL_HEADER)).toBe(true);

    // Sanity: number of slices matches plan
    const totalExpectedLen = PROTOCOL_HEADER.length + FIELD_PLAN.reduce((a, k) => a + SLICE_WIDTH[k], 0);
    expect(payload.length).toBe(totalExpectedLen);

    // Field 0: type
    const f0 = slice(payload, 0);
    expect(f0.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(f0.endsWith(FIELD_MARKERS[0])).toBe(true);
    expect(corePadded(f0, 's').startsWith('panel')).toBe(true);

    // Field 1: visible default (true)
    const f1 = slice(payload, 1);
    expect(f1.startsWith(`${TYPE_PREFIX.b}:`)).toBe(true);
    expect(corePadded(f1, 'b').startsWith('true')).toBe(true);

    // Field 2: enabled default (true)
    const f2 = slice(payload, 2);
    expect(f2.startsWith(`${TYPE_PREFIX.b}:`)).toBe(true);
    expect(corePadded(f2, 'b').startsWith('true')).toBe(true);

    // Field 3: layer default (int 0)
    const f3 = slice(payload, 3);
    expect(f3.startsWith(`${TYPE_PREFIX.i}:`)).toBe(true);
    expect(corePadded(f3, 'i').startsWith('0')).toBe(true);

    // Field 4: inheritMaxSiblingWidth default (false)
    const f4 = slice(payload, 4);
    expect(corePadded(f4, 'b').startsWith('false')).toBe(true);

    // Field 5: inheritMaxSiblingHeight default (false)
    const f5 = slice(payload, 5);
    expect(corePadded(f5, 'b').startsWith('false')).toBe(true);

    // Field 6: width = 'W'
    const f6 = slice(payload, 6);
    expect(corePadded(f6, 's').startsWith('W')).toBe(true);

    // Field 7: height = 'H'
    const f7 = slice(payload, 7);
    expect(corePadded(f7, 's').startsWith('H')).toBe(true);

    // Field 8: x = 'X'
    const f8 = slice(payload, 8);
    expect(corePadded(f8, 's').startsWith('X')).toBe(true);

    // Field 9: y = 'Y'
    const f9 = slice(payload, 9);
    expect(corePadded(f9, 's').startsWith('Y')).toBe(true);
  });

  it('emits fields in the same order with custom values and shuffled prop insertion', () => {
    const captured: string[] = [];
    const mockForm = { label: (t: string) => captured.push(t) } as unknown as import('@minecraft/server-ui').ModalFormData;

    // Deliberately shuffled property order in the object literal to ensure
    // serialization ordering logic (from helper composition) dominates.
    Panel({
      children: [],
      layer: 3,
      y: '99',
      width: 'WW',
      inheritMaxSiblingHeight: true,
      visible: false,
      x: '12',
      enabled: true,
      height: 'HHH',
      inheritMaxSiblingWidth: true,
    }).serialize(mockForm);

    expect(captured.length).toBe(1);
    const payload = captured[0];
    expect(payload.startsWith(PROTOCOL_HEADER)).toBe(true);

    const totalExpectedLen = PROTOCOL_HEADER.length + FIELD_PLAN.reduce((a, k) => a + SLICE_WIDTH[k], 0);
    expect(payload.length).toBe(totalExpectedLen);

    // Reuse helpers to slice each field.
    const f0 = slice(payload, 0); // type
    expect(corePadded(f0, 's').startsWith('panel')).toBe(true);

    const f1 = slice(payload, 1); // visible (false)
    expect(corePadded(f1, 'b').startsWith('false')).toBe(true);

    const f2 = slice(payload, 2); // enabled (true)
    expect(corePadded(f2, 'b').startsWith('true')).toBe(true);

    const f3 = slice(payload, 3); // layer (3)
    expect(corePadded(f3, 'i').startsWith('3')).toBe(true);

    const f4 = slice(payload, 4); // inheritMaxSiblingWidth (true)
    expect(corePadded(f4, 'b').startsWith('true')).toBe(true);

    const f5 = slice(payload, 5); // inheritMaxSiblingHeight (true)
    expect(corePadded(f5, 'b').startsWith('true')).toBe(true);

    const f6 = slice(payload, 6); // width ('WW')
    expect(corePadded(f6, 's').startsWith('WW')).toBe(true);

    const f7 = slice(payload, 7); // height ('HHH')
    expect(corePadded(f7, 's').startsWith('HHH')).toBe(true);

    const f8 = slice(payload, 8); // x ('12')
    expect(corePadded(f8, 's').startsWith('12')).toBe(true);

    const f9 = slice(payload, 9); // y ('99')
    expect(corePadded(f9, 's').startsWith('99')).toBe(true);
  });

  it('emits fields in stable order when unknown properties are mixed in', () => {
    const captured: string[] = [];
    const mockForm = { label: (t: string) => captured.push(t) } as unknown as import('@minecraft/server-ui').ModalFormData;

    // Test with unknown/non-existent properties mixed between valid ones
    // to ensure field ordering stability. Unknown properties that are primitives
    // will be serialized, while the canonical fields maintain their order.
    const panelWithUnknownProps = {
      unknownString: 'extra-string-prop',
      width: 'TestWidth',
      unknownNumber: 42,
      height: 'TestHeight',
      x: 'TestX',
      unknownBool: true,
      y: 'TestY',
      children: [],
      visible: false,
      anotherUnknownString: 'another-extra',
      enabled: true,
      layer: 5,
      unknownFloat: 3.14,
      inheritMaxSiblingWidth: true,
      inheritMaxSiblingHeight: false,
      finalUnknownProp: 'end-value',
    };

    Panel(panelWithUnknownProps as Parameters<typeof Panel>[0]).serialize(mockForm);

    expect(captured.length).toBe(1);
    const payload = captured[0];
    expect(payload.startsWith(PROTOCOL_HEADER)).toBe(true);

    // Unknown properties ARE actually serialized by withControledLayout (they get spread in ...rest)
    // However, the canonical fields defined by withControledLayout should still appear first
    // in their stable order, followed by the unknown properties in object insertion order.

    // Expected canonical fields first: type, visible, enabled, layer, inheritMaxSiblingWidth, inheritMaxSiblingHeight, width, height, x, y
    // Then unknown fields in their object insertion order: unknownString, unknownNumber, unknownBool, anotherUnknownString, unknownFloat, finalUnknownProp
    expect(payload.length).toBeGreaterThan(PROTOCOL_HEADER.length + FIELD_PLAN.reduce((a, k) => a + SLICE_WIDTH[k], 0));

    // The first 10 fields should be the canonical ones in stable order
    const f0 = slice(payload, 0); // type
    expect(corePadded(f0, 's').startsWith('panel')).toBe(true);

    const f1 = slice(payload, 1); // visible (false)
    expect(corePadded(f1, 'b').startsWith('false')).toBe(true);

    const f2 = slice(payload, 2); // enabled (true)
    expect(corePadded(f2, 'b').startsWith('true')).toBe(true);

    const f3 = slice(payload, 3); // layer (5)
    expect(corePadded(f3, 'i').startsWith('5')).toBe(true);

    const f4 = slice(payload, 4); // inheritMaxSiblingWidth (true)
    expect(corePadded(f4, 'b').startsWith('true')).toBe(true);

    const f5 = slice(payload, 5); // inheritMaxSiblingHeight (false)
    expect(corePadded(f5, 'b').startsWith('false')).toBe(true);

    const f6 = slice(payload, 6); // width ('TestWidth')
    expect(corePadded(f6, 's').startsWith('TestWidth')).toBe(true);

    const f7 = slice(payload, 7); // height ('TestHeight')
    expect(corePadded(f7, 's').startsWith('TestHeight')).toBe(true);

    const f8 = slice(payload, 8); // x ('TestX')
    expect(corePadded(f8, 's').startsWith('TestX')).toBe(true);

    const f9 = slice(payload, 9); // y ('TestY')
    expect(corePadded(f9, 's').startsWith('TestY')).toBe(true);

    // Now verify that unknown properties appear in their insertion order after canonical fields
    // Expected insertion order from the panelWithUnknownProps object:
    // unknownString, unknownNumber, unknownBool, anotherUnknownString, unknownFloat, finalUnknownProp

    // Calculate offset after canonical fields to slice the unknown properties
    let unknownOffset = PROTOCOL_HEADER.length + FIELD_PLAN.reduce((a, k) => a + SLICE_WIDTH[k], 0);

    // Field 10: unknownString ('extra-string-prop') - first unknown property
    const u0 = payload.slice(unknownOffset, unknownOffset + SLICE_WIDTH.s);
    expect(u0.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(corePadded(u0, 's').startsWith('extra-string-prop')).toBe(true);
    unknownOffset += SLICE_WIDTH.s;

    // Field 11: unknownNumber (42) - second unknown property
    const u1 = payload.slice(unknownOffset, unknownOffset + SLICE_WIDTH.i);
    expect(u1.startsWith(`${TYPE_PREFIX.i}:`)).toBe(true);
    expect(corePadded(u1, 'i').startsWith('42')).toBe(true);
    unknownOffset += SLICE_WIDTH.i;

    // Field 12: unknownBool (true) - third unknown property
    const u2 = payload.slice(unknownOffset, unknownOffset + SLICE_WIDTH.b);
    expect(u2.startsWith(`${TYPE_PREFIX.b}:`)).toBe(true);
    expect(corePadded(u2, 'b').startsWith('true')).toBe(true);
    unknownOffset += SLICE_WIDTH.b;

    // Field 13: anotherUnknownString ('another-extra') - fourth unknown property
    const u3 = payload.slice(unknownOffset, unknownOffset + SLICE_WIDTH.s);
    expect(u3.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(corePadded(u3, 's').startsWith('another-extra')).toBe(true);
    unknownOffset += SLICE_WIDTH.s;

    // Field 14: unknownFloat (3.14) - fifth unknown property
    const u4 = payload.slice(unknownOffset, unknownOffset + SLICE_WIDTH.f);
    expect(u4.startsWith(`${TYPE_PREFIX.f}:`)).toBe(true);
    expect(corePadded(u4, 'f').startsWith('3.14')).toBe(true);
    unknownOffset += SLICE_WIDTH.f;

    // Field 15: finalUnknownProp ('end-value') - sixth unknown property
    const u5 = payload.slice(unknownOffset, unknownOffset + SLICE_WIDTH.s);
    expect(u5.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(corePadded(u5, 's').startsWith('end-value')).toBe(true);
    unknownOffset += SLICE_WIDTH.s;

    // Verify that we've consumed the entire payload
    expect(unknownOffset).toBe(payload.length);

    // The key insight: despite unknown properties being mixed in the input object,
    // the withControledLayout function ensures the canonical fields maintain their
    // stable order at the beginning of the serialized payload, followed by unknown
    // properties in their object insertion order.
  });
});
