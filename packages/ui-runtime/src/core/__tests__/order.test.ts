import { ActionFormData } from '@minecraft/server-ui';
import { describe, expect, it } from 'vitest';
import { Panel } from '../components/Panel';
import { FIELD_MARKERS, FULL_WIDTH, PROTOCOL_HEADER, serialize, TYPE_PREFIX, TYPE_WIDTH } from '../serializer';

// This test guards the ordering of serialized fields for Panel (and by extension
// any component using the same withControl pattern). If ordering changes
// it will break JSON UI binding offsets; this test should alert maintainers.

// Expected field type sequence (after header) for Panel currently:
// 0: type (string)
// 1: width (number)
// 2: height (number)
// 3: x (number)
// 4: y (number)
// 5: visible (boolean)
// 6: enabled (boolean)
// 7: layer (number)
// 8: alpha (number)
// 9: inheritMaxSiblingWidth (boolean)
// 10: inheritMaxSiblingHeight (boolean)
// 11: __reserved (reserved, 274 bytes)
// Update ONLY by appending new fields at the end per protocol evolution rules.

type TKey = keyof typeof FULL_WIDTH;

const FIELD_PLAN: TKey[] = ['s', 'n', 'n', 'n', 'n', 'b', 'b', 'n', 'n', 'b', 'b', 'r'];

function slice(payload: string, fieldIndex: number): string {
  let offset = PROTOCOL_HEADER.length;

  // Calculate offset by accounting for dynamic reserved field widths
  for (let i = 0; i < fieldIndex; i++) {
    if (FIELD_PLAN[i] === 'r') {
      // For reserved fields, full allocation is the requested bytes
      // Field 11: __reserved (274 bytes total)
      const reservedBytes = i === 11 ? 274 : 0;
      offset += reservedBytes; // full reserved allocation
    } else {
      offset += FULL_WIDTH[FIELD_PLAN[i]];
    }
  }

  // Calculate width for the target field
  let fieldWidth: number;
  if (FIELD_PLAN[fieldIndex] === 'r') {
    const reservedBytes = fieldIndex === 11 ? 274 : 0;
    fieldWidth = reservedBytes; // full reserved allocation
  } else {
    fieldWidth = FULL_WIDTH[FIELD_PLAN[fieldIndex]];
  }

  return payload.slice(offset, offset + fieldWidth);
}

function corePadded(fieldSlice: string, typeCode: TKey): string {
  // Remove the 2-char type/prefix (e.g. 's:'), drop trailing marker
  return fieldSlice.slice(2, 2 + (typeCode === 's' ? TYPE_WIDTH.s : typeCode === 'b' ? TYPE_WIDTH.b : TYPE_WIDTH.n));
}

describe('Serialization field order', () => {
  it('emits fields in stable, documented order with default values', () => {
    const captured: string[] = [];
    const mockForm = new ActionFormData();
    mockForm.label = (t: string) => {
      captured.push(t);

      return mockForm;
    };

    const element = Panel({
      width: 250.5,
      height: 150.75,
      x: 10.25,
      y: 20.5,
      children: [],
    });

    serialize(element, mockForm);

    expect(captured.length).toBe(1);
    const payload = captured[0];
    expect(payload.startsWith(PROTOCOL_HEADER)).toBe(true);

    // Calculate total expected length including dynamic reserved field sizes
    let totalExpectedLen = PROTOCOL_HEADER.length;
    for (let i = 0; i < FIELD_PLAN.length; i++) {
      if (FIELD_PLAN[i] === 'r') {
        // Reserved field sizes: field 11 = 274 (full allocation)
        const reservedBytes = i === 11 ? 274 : 0;
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

    // Field 1: width = 250.5
    const f1 = slice(payload, 1);
    expect(f1.startsWith(`${TYPE_PREFIX.n}:`)).toBe(true);
    expect(corePadded(f1, 'n').startsWith('250.5')).toBe(true);

    // Field 2: height = 150.75
    const f2 = slice(payload, 2);
    expect(f2.startsWith(`${TYPE_PREFIX.n}:`)).toBe(true);
    expect(corePadded(f2, 'n').startsWith('150.75')).toBe(true);

    // Field 3: x = 10.25
    const f3 = slice(payload, 3);
    expect(f3.startsWith(`${TYPE_PREFIX.n}:`)).toBe(true);
    expect(corePadded(f3, 'n').startsWith('10.25')).toBe(true);

    // Field 4: y = 20.5
    const f4 = slice(payload, 4);
    expect(f4.startsWith(`${TYPE_PREFIX.n}:`)).toBe(true);
    expect(corePadded(f4, 'n').startsWith('20.5')).toBe(true);

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
    expect(f7.startsWith(`${TYPE_PREFIX.n}:`)).toBe(true);
    expect(corePadded(f7, 'n').startsWith('0')).toBe(true);

    // Field 8: alpha default (1.0)
    const f8 = slice(payload, 8);
    expect(f8.startsWith(`${TYPE_PREFIX.n}:`)).toBe(true);
    expect(corePadded(f8, 'n').startsWith('1')).toBe(true);

    // Field 9: inheritMaxSiblingWidth default (false)
    const f9 = slice(payload, 9);
    expect(corePadded(f9, 'b').startsWith('false')).toBe(true);

    // Field 10: inheritMaxSiblingHeight default (false)
    const f10 = slice(payload, 10);
    expect(corePadded(f10, 'b').startsWith('false')).toBe(true);

    // Field 11: __reserved (274 bytes reserved)
    const f11 = slice(payload, 11);
    expect(f11.length).toBe(274); // full reserved allocation
    expect(f11.endsWith(FIELD_MARKERS[11])).toBe(true);
    // Should be 274-1 padding chars (1 for marker)
    expect(f11.slice(0, -1)).toBe(';'.repeat(274 - 1));
  });

  it('emits fields in the same order with custom values and shuffled prop insertion', () => {
    const captured: string[] = [];
    const mockForm = new ActionFormData();
    mockForm.label = (t: string) => {
      captured.push(t);

      return mockForm;
    };

    // Deliberately shuffled property order in the object literal to ensure
    // serialization ordering logic (from helper composition) dominates.
    const element = Panel({
      children: [],
      y: 99.75,
      width: 300.25,
      visible: false,
      x: 12.5,
      enabled: true,
      height: 200.5,
    });

    serialize(element, mockForm);

    expect(captured.length).toBe(1);
    const payload = captured[0];
    expect(payload.startsWith(PROTOCOL_HEADER)).toBe(true);

    // Calculate total expected length including dynamic reserved field sizes
    let totalExpectedLen = PROTOCOL_HEADER.length;
    for (let i = 0; i < FIELD_PLAN.length; i++) {
      if (FIELD_PLAN[i] === 'r') {
        const reservedBytes = i === 11 ? 274 : 0;
        totalExpectedLen += reservedBytes; // full reserved allocation
      } else {
        totalExpectedLen += FULL_WIDTH[FIELD_PLAN[i]];
      }
    }
    expect(payload.length).toBe(totalExpectedLen);

    // Reuse helpers to slice each field.
    const f0 = slice(payload, 0); // type
    expect(corePadded(f0, 's').startsWith('panel')).toBe(true);

    const f1 = slice(payload, 1); // width (300.25)
    expect(corePadded(f1, 'n').startsWith('300.25')).toBe(true);

    const f2 = slice(payload, 2); // height (200.5)
    expect(corePadded(f2, 'n').startsWith('200.5')).toBe(true);

    const f3 = slice(payload, 3); // x (12.5)
    expect(corePadded(f3, 'n').startsWith('12.5')).toBe(true);

    const f4 = slice(payload, 4); // y (99.75)
    expect(corePadded(f4, 'n').startsWith('99.75')).toBe(true);

    const f5 = slice(payload, 5); // visible (false)
    expect(corePadded(f5, 'b').startsWith('false')).toBe(true);

    const f6 = slice(payload, 6); // enabled (true)
    expect(corePadded(f6, 'b').startsWith('true')).toBe(true);

    const f7 = slice(payload, 7); // layer (3)
    expect(corePadded(f7, 'n').startsWith('3')).toBe(true);

    const f8 = slice(payload, 8); // alpha (default 1.0)
    expect(corePadded(f8, 'n').startsWith('1')).toBe(true);

    const f9 = slice(payload, 9); // inheritMaxSiblingWidth (true)
    expect(corePadded(f9, 'b').startsWith('true')).toBe(true);

    const f10 = slice(payload, 10); // inheritMaxSiblingHeight (true)
    expect(corePadded(f10, 'b').startsWith('true')).toBe(true);

    const f11 = slice(payload, 11); // __reserved
    expect(f11.length).toBe(274); // full reserved allocation
    expect(f11.endsWith(FIELD_MARKERS[11])).toBe(true);
    // Should be 274-1 padding chars (1 for marker)
    expect(f11.slice(0, -1)).toBe(';'.repeat(274 - 1));
  });

  it('emits fields in stable order - unknown properties are filtered out by withControl', () => {
    const captured: string[] = [];
    const mockForm = new ActionFormData();
    mockForm.label = (t: string) => {
      captured.push(t);

      return mockForm;
    };

    // Test with unknown/non-existent properties mixed between valid ones.
    // WithControl() only extracts canonical control fields, so unknown properties
    // will be filtered out, ensuring stable serialization with only known fields.
    const panelWithUnknownProps = {
      unknownString: 'extra-string-prop',
      width: 400.5,
      unknownNumber: 42,
      height: 300.25,
      x: 50.25,
      unknownBool: true,
      y: 75.5,
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

    const element = Panel(panelWithUnknownProps as Parameters<typeof Panel>[0]);
    serialize(element, mockForm);

    expect(captured.length).toBe(1);
    const payload = captured[0];
    expect(payload.startsWith(PROTOCOL_HEADER)).toBe(true);

    // Calculate canonical fields size including reserved fields
    let canonicalSize = PROTOCOL_HEADER.length;
    for (let i = 0; i < FIELD_PLAN.length; i++) {
      if (FIELD_PLAN[i] === 'r') {
        const reservedBytes = i === 11 ? 274 : 0;
        canonicalSize += reservedBytes; // full reserved allocation
      } else {
        canonicalSize += FULL_WIDTH[FIELD_PLAN[i]];
      }
    }

    // WithControl filters out unknown properties, so payload should be exactly canonical size
    expect(payload.length).toBe(canonicalSize);
    expect(payload.length).toBe(512); // Standard allocation with control fields only

    // Verify all canonical fields are present in stable order
    const f0 = slice(payload, 0); // type
    expect(corePadded(f0, 's').startsWith('panel')).toBe(true);

    const f1 = slice(payload, 1); // width (400.5)
    expect(corePadded(f1, 'n').startsWith('400.5')).toBe(true);

    const f2 = slice(payload, 2); // height (300.25)
    expect(corePadded(f2, 'n').startsWith('300.25')).toBe(true);

    const f3 = slice(payload, 3); // x (50.25)
    expect(corePadded(f3, 'n').startsWith('50.25')).toBe(true);

    const f4 = slice(payload, 4); // y (75.5)
    expect(corePadded(f4, 'n').startsWith('75.5')).toBe(true);

    const f5 = slice(payload, 5); // visible (false)
    expect(corePadded(f5, 'b').startsWith('false')).toBe(true);

    const f6 = slice(payload, 6); // enabled (true)
    expect(corePadded(f6, 'b').startsWith('true')).toBe(true);

    const f7 = slice(payload, 7); // layer (5)
    expect(corePadded(f7, 'n').startsWith('5')).toBe(true);

    const f8 = slice(payload, 8); // alpha (default 1.0)
    expect(corePadded(f8, 'n').startsWith('1')).toBe(true);

    const f9 = slice(payload, 9); // inheritMaxSiblingWidth (true)
    expect(corePadded(f9, 'b').startsWith('true')).toBe(true);

    const f10 = slice(payload, 10); // inheritMaxSiblingHeight (false)
    expect(corePadded(f10, 'b').startsWith('false')).toBe(true);

    const f11 = slice(payload, 11); // __reserved
    expect(f11.length).toBe(274); // full reserved allocation
    expect(f11.endsWith(FIELD_MARKERS[11])).toBe(true);
    // Should be 274-1 padding chars (1 for marker)
    expect(f11.slice(0, -1)).toBe(';'.repeat(274 - 1));
  });
});
