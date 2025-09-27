import { describe, it, expect } from 'vitest';
import { Panel } from '../components/Panel';
import { PROTOCOL_HEADER, FULL_WIDTH, TYPE_WIDTH, TYPE_PREFIX, FIELD_MARKERS } from '../serializer';

// This test guards the ordering of serialized fields for Panel (and by extension
// any component using the same withControl pattern). If ordering changes
// it will break JSON UI binding offsets; this test should alert maintainers.

// Expected field type sequence (after header) for Panel currently:
// 0: type (string)
// 1: width (string)
// 2: height (string)
// 3: x (string)
// 4: y (string)
// 5: visible (bool)
// 6: enabled (bool)
// 7: layer (int)
// 8: inheritMaxSiblingWidth (bool)
// 9: inheritMaxSiblingHeight (bool)
// 10: __reserved (reserved, 277 bytes)
// Update ONLY by appending new fields at the end per protocol evolution rules.

type TKey = keyof typeof FULL_WIDTH;

const FIELD_PLAN: TKey[] = ['s', 's', 's', 's', 's', 'b', 'b', 'i', 'b', 'b', 'r'];

function slice(payload: string, fieldIndex: number): string {
  let offset = PROTOCOL_HEADER.length;

  // Calculate offset by accounting for dynamic reserved field widths
  for (let i = 0; i < fieldIndex; i++) {
    if (FIELD_PLAN[i] === 'r') {
      // For reserved fields, full allocation is the requested bytes
      // Field 10: __reserved (277 bytes total)
      const reservedBytes = i === 10 ? 277 : 0;
      offset += reservedBytes; // full reserved allocation
    } else {
      offset += FULL_WIDTH[FIELD_PLAN[i]];
    }
  }

  // Calculate width for the target field
  let fieldWidth: number;
  if (FIELD_PLAN[fieldIndex] === 'r') {
    const reservedBytes = fieldIndex === 10 ? 277 : 0;
    fieldWidth = reservedBytes; // full reserved allocation
  } else {
    fieldWidth = FULL_WIDTH[FIELD_PLAN[fieldIndex]];
  }

  return payload.slice(offset, offset + fieldWidth);
}

function corePadded(fieldSlice: string, typeCode: TKey): string {
  // Remove the 2-char type/prefix (e.g. 's:'), drop trailing marker
  return fieldSlice.slice(2, 2 + (typeCode === 's' ? TYPE_WIDTH.s : typeCode === 'b' ? TYPE_WIDTH.b : typeCode === 'i' ? TYPE_WIDTH.i : TYPE_WIDTH.f));
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

    // Calculate total expected length including dynamic reserved field sizes
    let totalExpectedLen = PROTOCOL_HEADER.length;
    for (let i = 0; i < FIELD_PLAN.length; i++) {
      if (FIELD_PLAN[i] === 'r') {
        // Reserved field sizes: field 10 = 277 (full allocation)
        const reservedBytes = i === 10 ? 277 : 0;
        totalExpectedLen += reservedBytes; // full reserved allocation
      } else {
        totalExpectedLen += FULL_WIDTH[FIELD_PLAN[i]];
      }
    }
    expect(payload.length).toBe(totalExpectedLen);

    // Field 0: type
    const f0 = slice(payload, 0);
    expect(f0.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(f0.endsWith(FIELD_MARKERS[0])).toBe(true);
    expect(corePadded(f0, 's').startsWith('panel')).toBe(true);

    // Field 1: width = 'W'
    const f1 = slice(payload, 1);
    expect(f1.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(corePadded(f1, 's').startsWith('W')).toBe(true);

    // Field 2: height = 'H'
    const f2 = slice(payload, 2);
    expect(f2.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(corePadded(f2, 's').startsWith('H')).toBe(true);

    // Field 3: x = 'X'
    const f3 = slice(payload, 3);
    expect(f3.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(corePadded(f3, 's').startsWith('X')).toBe(true);

    // Field 4: y = 'Y'
    const f4 = slice(payload, 4);
    expect(f4.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(corePadded(f4, 's').startsWith('Y')).toBe(true);

    // Field 5: visible default (true)
    const f5 = slice(payload, 5);
    expect(f5.startsWith(`${TYPE_PREFIX.b}:`)).toBe(true);
    expect(corePadded(f5, 'b').startsWith('true')).toBe(true);

    // Field 6: enabled default (true)
    const f6 = slice(payload, 6);
    expect(f6.startsWith(`${TYPE_PREFIX.b}:`)).toBe(true);
    expect(corePadded(f6, 'b').startsWith('true')).toBe(true);

    // Field 7: layer default (0)
    const f7 = slice(payload, 7);
    expect(f7.startsWith(`${TYPE_PREFIX.i}:`)).toBe(true);
    expect(corePadded(f7, 'i').startsWith('0')).toBe(true);

    // Field 8: inheritMaxSiblingWidth default (false)
    const f8 = slice(payload, 8);
    expect(corePadded(f8, 'b').startsWith('false')).toBe(true);

    // Field 9: inheritMaxSiblingHeight default (false)
    const f9 = slice(payload, 9);
    expect(corePadded(f9, 'b').startsWith('false')).toBe(true);

    // Field 10: __reserved (277 bytes reserved)
    const f10 = slice(payload, 10);
    expect(f10.length).toBe(277); // full reserved allocation
    expect(f10.endsWith(FIELD_MARKERS[10])).toBe(true);
    // Should be 276 padding chars + 1 marker
    expect(f10.slice(0, -1)).toBe(';'.repeat(276));
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

    // Calculate total expected length including dynamic reserved field sizes
    let totalExpectedLen = PROTOCOL_HEADER.length;
    for (let i = 0; i < FIELD_PLAN.length; i++) {
      if (FIELD_PLAN[i] === 'r') {
        const reservedBytes = i === 10 ? 277 : 0;
        totalExpectedLen += reservedBytes; // full reserved allocation
      } else {
        totalExpectedLen += FULL_WIDTH[FIELD_PLAN[i]];
      }
    }
    expect(payload.length).toBe(totalExpectedLen);

    // Reuse helpers to slice each field.
    const f0 = slice(payload, 0); // type
    expect(corePadded(f0, 's').startsWith('panel')).toBe(true);

    const f1 = slice(payload, 1); // width ('WW')
    expect(corePadded(f1, 's').startsWith('WW')).toBe(true);

    const f2 = slice(payload, 2); // height ('HHH')
    expect(corePadded(f2, 's').startsWith('HHH')).toBe(true);

    const f3 = slice(payload, 3); // x ('12')
    expect(corePadded(f3, 's').startsWith('12')).toBe(true);

    const f4 = slice(payload, 4); // y ('99')
    expect(corePadded(f4, 's').startsWith('99')).toBe(true);

    const f5 = slice(payload, 5); // visible (false)
    expect(corePadded(f5, 'b').startsWith('false')).toBe(true);

    const f6 = slice(payload, 6); // enabled (true)
    expect(corePadded(f6, 'b').startsWith('true')).toBe(true);

    const f7 = slice(payload, 7); // layer (3)
    expect(corePadded(f7, 'i').startsWith('3')).toBe(true);

    const f8 = slice(payload, 8); // inheritMaxSiblingWidth (true)
    expect(corePadded(f8, 'b').startsWith('true')).toBe(true);

    const f9 = slice(payload, 9); // inheritMaxSiblingHeight (true)
    expect(corePadded(f9, 'b').startsWith('true')).toBe(true);

    const f10 = slice(payload, 10); // __reserved
    expect(f10.length).toBe(277); // full reserved allocation
    expect(f10.endsWith(FIELD_MARKERS[10])).toBe(true);
    expect(f10.slice(0, -1)).toBe(';'.repeat(276));
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

    // Expected canonical fields first: type, width, height, x, y, visible, enabled, layer, inheritMaxSiblingWidth, inheritMaxSiblingHeight, __reserved
    // Then unknown fields in their object insertion order: unknownString, unknownNumber, unknownBool, anotherUnknownString, unknownFloat, finalUnknownProp

    // Calculate canonical fields size including reserved fields
    let canonicalSize = PROTOCOL_HEADER.length;
    for (let i = 0; i < FIELD_PLAN.length; i++) {
      if (FIELD_PLAN[i] === 'r') {
        const reservedBytes = i === 10 ? 277 : 0;
        canonicalSize += reservedBytes; // full reserved allocation
      } else {
        canonicalSize += FULL_WIDTH[FIELD_PLAN[i]];
      }
    }
    expect(payload.length).toBeGreaterThan(canonicalSize);

    // The first 11 fields should be the canonical ones in stable order (including 1 reserved field)
    const f0 = slice(payload, 0); // type
    expect(corePadded(f0, 's').startsWith('panel')).toBe(true);

    const f1 = slice(payload, 1); // width ('TestWidth')
    expect(corePadded(f1, 's').startsWith('TestWidth')).toBe(true);

    const f2 = slice(payload, 2); // height ('TestHeight')
    expect(corePadded(f2, 's').startsWith('TestHeight')).toBe(true);

    const f3 = slice(payload, 3); // x ('TestX')
    expect(corePadded(f3, 's').startsWith('TestX')).toBe(true);

    const f4 = slice(payload, 4); // y ('TestY')
    expect(corePadded(f4, 's').startsWith('TestY')).toBe(true);

    const f5 = slice(payload, 5); // visible (false)
    expect(corePadded(f5, 'b').startsWith('false')).toBe(true);

    const f6 = slice(payload, 6); // enabled (true)
    expect(corePadded(f6, 'b').startsWith('true')).toBe(true);

    const f7 = slice(payload, 7); // layer (5)
    expect(corePadded(f7, 'i').startsWith('5')).toBe(true);

    const f8 = slice(payload, 8); // inheritMaxSiblingWidth (true)
    expect(corePadded(f8, 'b').startsWith('true')).toBe(true);

    const f9 = slice(payload, 9); // inheritMaxSiblingHeight (false)
    expect(corePadded(f9, 'b').startsWith('false')).toBe(true);

    const f10 = slice(payload, 10); // __reserved
    expect(f10.length).toBe(277); // full reserved allocation
    expect(f10.endsWith(FIELD_MARKERS[10])).toBe(true);
    expect(f10.slice(0, -1)).toBe(';'.repeat(276));

    // Now verify that unknown properties appear in their insertion order after canonical fields
    // Expected insertion order from the panelWithUnknownProps object:
    // unknownString, unknownNumber, unknownBool, anotherUnknownString, unknownFloat, finalUnknownProp

    // Calculate offset after canonical fields (including reserved fields) to slice the unknown properties
    let unknownOffset = canonicalSize; // Use the canonicalSize calculated above

    // Field 11: unknownString ('extra-string-prop') - first unknown property
    const u0 = payload.slice(unknownOffset, unknownOffset + FULL_WIDTH.s);
    expect(u0.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(corePadded(u0, 's').startsWith('extra-string-prop')).toBe(true);
    unknownOffset += FULL_WIDTH.s;

    // Field 12: unknownNumber (42) - second unknown property
    const u1 = payload.slice(unknownOffset, unknownOffset + FULL_WIDTH.i);
    expect(u1.startsWith(`${TYPE_PREFIX.i}:`)).toBe(true);
    expect(corePadded(u1, 'i').startsWith('42')).toBe(true);
    unknownOffset += FULL_WIDTH.i;

    // Field 13: unknownBool (true) - third unknown property
    const u2 = payload.slice(unknownOffset, unknownOffset + FULL_WIDTH.b);
    expect(u2.startsWith(`${TYPE_PREFIX.b}:`)).toBe(true);
    expect(corePadded(u2, 'b').startsWith('true')).toBe(true);
    unknownOffset += FULL_WIDTH.b;

    // Field 14: anotherUnknownString ('another-extra') - fourth unknown property
    const u3 = payload.slice(unknownOffset, unknownOffset + FULL_WIDTH.s);
    expect(u3.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(corePadded(u3, 's').startsWith('another-extra')).toBe(true);
    unknownOffset += FULL_WIDTH.s;

    // Field 15: unknownFloat (3.14) - fifth unknown property
    const u4 = payload.slice(unknownOffset, unknownOffset + FULL_WIDTH.f);
    expect(u4.startsWith(`${TYPE_PREFIX.f}:`)).toBe(true);
    expect(corePadded(u4, 'f').startsWith('3.14')).toBe(true);
    unknownOffset += FULL_WIDTH.f;

    // Field 16: finalUnknownProp ('end-value') - sixth unknown property
    const u5 = payload.slice(unknownOffset, unknownOffset + FULL_WIDTH.s);
    expect(u5.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(corePadded(u5, 's').startsWith('end-value')).toBe(true);
    unknownOffset += FULL_WIDTH.s;

    // Verify that we've consumed the entire payload
    expect(unknownOffset).toBe(payload.length);

    // The key insight: despite unknown properties being mixed in the input object,
    // the withControl function ensures the canonical fields maintain their
    // stable order at the beginning of the serialized payload, followed by unknown
    // properties in their object insertion order.
  });
});
