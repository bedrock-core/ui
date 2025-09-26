import { describe, expect, it } from 'vitest';
import { FIELD_MARKERS, FULL_WIDTH, PROTOCOL_HEADER, PROTOCOL_HEADER_LENGTH, reserveBytes, serialize, TYPE_PREFIX, TYPE_WIDTH } from '../serializer';

const PLAN_PRIMITIVES: Record<string, TKey[]> = {
  basic: ['s', 's', 'i', 'f', 'b'],
  twoStrings: ['s', 's', 's'],
  twoInts: ['s', 'i', 'i'],
  twoBools: ['s', 'b', 'b'],
};

type TKey = keyof typeof FULL_WIDTH;

function sliceFieldWithPlan(payload: string, index: number, plan: readonly TKey[]): string {
  const start = PROTOCOL_HEADER_LENGTH + plan.slice(0, index).reduce((acc, k) => acc + FULL_WIDTH[k], 0);

  return payload.slice(start, start + FULL_WIDTH[plan[index]]);
}

function paddedValueOf(payload: string, index: number, plan: readonly TKey[]): string {
  const field = sliceFieldWithPlan(payload, index, plan);
  // Remove 2-char type prefix and trailing 1-char marker.

  return field.slice(2, field.length - 1);
}

describe('core/serializer', () => {
  describe('payload size helper', () => {
    function detectType(v: string | number | boolean): TKey {
      if (typeof v === 'string') return 's';
      if (typeof v === 'boolean') return 'b';

      return Number.isInteger(v) ? 'i' : 'f';
    }

    function expectedLength(plan: readonly (TKey)[]): number {
      return PROTOCOL_HEADER_LENGTH + plan.reduce((acc, k) => acc + FULL_WIDTH[k], 0);
    }

    it('computes expected length for arbitrary object', () => {
      const obj = {
        type: 'arb', // s
        name: 'Zed', // s
        count: 42, // i
        ratio: 3.14, // f
        active: false, // b
        flag: true, // b
      };

      const plan = Object.values(obj).map(detectType);
      const expected = expectedLength(plan);
      const [result, bytes] = serialize(obj);
      expect(result.length).toBe(expected);
      expect(bytes).toBe(expected);
    });

    it('layout props payload size matches constants', () => {
      // LayoutProps order (after type): width, height, x, y, inheritMaxSiblingWidth, inheritMaxSiblingHeight
      const layout = {
        type: 'panel',
        width: 'default',
        height: 'default',
        x: '0',
        y: '0',
        inheritMaxSiblingWidth: false,
        inheritMaxSiblingHeight: true,
      };
      const plan: (TKey)[] = ['s', 's', 's', 's', 's', 'b', 'b'];
      const expected = PROTOCOL_HEADER_LENGTH + plan.reduce((a, k) => a + FULL_WIDTH[k], 0);
      const [result, bytes] = serialize(layout);
      // Layout alone (including type): 1 type + 4 strings + 2 bools
      expect(bytes).toBe(expected);
      expect(result.length).toBe(expected);
      // Sanity: slice count
      const fieldCount = plan.length; // includes type at index 0
      // length minus PROTOCOL_HEADER should equal sum slice widths
      expect(result.length - PROTOCOL_HEADER_LENGTH).toBe(plan.reduce((a, k) => a + FULL_WIDTH[k], 0));
      expect(fieldCount).toBe(7);
    });

    it('control props payload size matches constants', () => {
      // ControlProps order (after type): visible, enabled, layer
      const control = {
        type: 'panel',
        visible: true,
        enabled: false,
        layer: 0,
      };
      const plan: (TKey)[] = ['s', 'b', 'b', 'i'];
      const expected = PROTOCOL_HEADER_LENGTH + plan.reduce((a, k) => a + FULL_WIDTH[k], 0);
      const [result, bytes] = serialize(control);
      expect(bytes).toBe(expected);
      expect(result.length).toBe(expected);
      expect(result.length - PROTOCOL_HEADER_LENGTH).toBe(plan.reduce((a, k) => a + FULL_WIDTH[k], 0));
    });
  });

  it('serializes primitives with correct prefix, widths, markers and byte count', () => {
    const [result, bytes] = serialize({
      type: 'example',
      name: 'hello', // string
      count: 123, // int
      ratio: 45.67, // float
      ok: true, // bool
    });

    // Prefix
    expect(result.startsWith(PROTOCOL_HEADER)).toBe(true);

    // Expected length from constants
    const expectedLen = PROTOCOL_HEADER_LENGTH + PLAN_PRIMITIVES.basic.reduce((acc, k) => acc + FULL_WIDTH[k], 0);
    expect(result.length).toBe(expectedLen);
    expect(bytes).toBe(expectedLen);

    const plan = PLAN_PRIMITIVES.basic;
    // Field 0: type (string)
    const f0 = sliceFieldWithPlan(result, 0, plan);
    expect(f0.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(f0.endsWith(FIELD_MARKERS[0])).toBe(true);
    const f0Padded = f0.slice(2, 2 + TYPE_WIDTH.s);
    expect(f0Padded.startsWith('example')).toBe(true);

    // Field 1: name (string)
    const f1 = sliceFieldWithPlan(result, 1, plan);
    expect(f1.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(f1.endsWith(FIELD_MARKERS[1])).toBe(true);
    const f1Padded = f1.slice(2, 2 + TYPE_WIDTH.s);
    expect(f1Padded.startsWith('hello')).toBe(true);

    // Field 2: count (int)
    const f2 = sliceFieldWithPlan(result, 2, plan);
    expect(f2.startsWith(`${TYPE_PREFIX.i}:`)).toBe(true);
    expect(f2.endsWith(FIELD_MARKERS[2])).toBe(true);
    const f2Padded = f2.slice(2, 2 + TYPE_WIDTH.i);
    expect(f2Padded.trimEnd().startsWith('123')).toBe(true);

    // Field 3: ratio (float)
    const f3 = sliceFieldWithPlan(result, 3, plan);
    expect(f3.startsWith(`${TYPE_PREFIX.f}:`)).toBe(true);
    expect(f3.endsWith(FIELD_MARKERS[3])).toBe(true);
    const f3Padded = f3.slice(2, 2 + TYPE_WIDTH.f);
    expect(f3Padded.startsWith('45.67')).toBe(true);

    // Field 4: ok (bool)
    const f4 = sliceFieldWithPlan(result, 4, plan);
    expect(f4.startsWith(`${TYPE_PREFIX.b}:`)).toBe(true);
    expect(f4.endsWith(FIELD_MARKERS[4])).toBe(true);
    const f4Padded = f4.slice(2, 2 + TYPE_WIDTH.b);
    expect(f4Padded.startsWith('true')).toBe(true);
  });

  it('keeps identical values in different fields distinct via unique markers (strings)', () => {
    const [result] = serialize({ type: 't', first: 'same', second: 'same' });
    const plan = PLAN_PRIMITIVES.twoStrings;
    // Compare fields 1 and 2 (skip the 'type' field at index 0)
    const f0 = sliceFieldWithPlan(result, 1, plan);
    const f1 = sliceFieldWithPlan(result, 2, plan);
    // Core padded value regions should be identical
    expect(f0.slice(2, 2 + TYPE_WIDTH.s)).toBe(f1.slice(2, 2 + TYPE_WIDTH.s));
    // But full fields must differ thanks to markers
    expect(f0).not.toBe(f1);
    expect(f0.endsWith(FIELD_MARKERS[1])).toBe(true);
    expect(f1.endsWith(FIELD_MARKERS[2])).toBe(true);
  });

  it('keeps identical values in different fields distinct via unique markers (ints)', () => {
    const [result] = serialize({ type: 't', a: 13, b: 13 });
    const plan = PLAN_PRIMITIVES.twoInts;
    const f0 = sliceFieldWithPlan(result, 1, plan);
    const f1 = sliceFieldWithPlan(result, 2, plan);
    expect(f0.slice(2, 2 + TYPE_WIDTH.i)).toBe(f1.slice(2, 2 + TYPE_WIDTH.i));
    expect(f0).not.toBe(f1);
    expect(f0.endsWith(FIELD_MARKERS[1])).toBe(true);
    expect(f1.endsWith(FIELD_MARKERS[2])).toBe(true);
  });

  it('serializes booleans in lowercase and with correct padded length', () => {
    const [result] = serialize({ type: 't', t: true, f: false });
    const plan = PLAN_PRIMITIVES.twoBools;
    const f0 = sliceFieldWithPlan(result, 1, plan);
    const f1 = sliceFieldWithPlan(result, 2, plan);
    expect(f0.slice(2, 2 + TYPE_WIDTH.b).startsWith('true')).toBe(true);
    expect(f1.slice(2, 2 + TYPE_WIDTH.b).startsWith('false')).toBe(true);
  });

  it('throws on unsupported value types', () => {
    expect(() => serialize({ type: 't', ok: true, bad: undefined as unknown as number })).toThrow();
    expect(() => serialize({ type: 't', obj: {} as unknown as number })).toThrow();
  });

  describe('limits', () => {
    it('string: exact fit (ASCII) and overflow truncation', () => {
      const exact = 'x'.repeat(TYPE_WIDTH.s);
      let res = serialize({ type: 't', s: exact })[0];
      let plan: (TKey)[] = ['s', 's']; // type, s
      expect(paddedValueOf(res, 1, plan)).toBe(exact);

      const over = 'x'.repeat(TYPE_WIDTH.s + 8);
      res = serialize({ type: 't', s: over })[0];
      plan = ['s', 's'];
      expect(paddedValueOf(res, 1, plan)).toBe(exact);
    });

    it('string: multi-byte safety (2-byte and surrogate pairs 4-byte)', () => {
      const twoByte = 'é'; // 2 bytes in UTF-8
      const overTwoByte = twoByte.repeat(TYPE_WIDTH.s / 2 + 1);
      const expectedTwoByte = twoByte.repeat(TYPE_WIDTH.s / 2);
      let res = serialize({ type: 't', s: overTwoByte })[0];
      let plan: (TKey)[] = ['s', 's'];
      expect(paddedValueOf(res, 1, plan)).toBe(expectedTwoByte);

      const fourByte = '😀'; // surrogate pair, 4 bytes
      const overFourByte = fourByte.repeat(TYPE_WIDTH.s / 4 + 1);
      const expectedFourByte = fourByte.repeat(TYPE_WIDTH.s / 4);
      res = serialize({ type: 't', s: overFourByte })[0];
      plan = ['s', 's'];
      expect(paddedValueOf(res, 1, plan)).toBe(expectedFourByte);
    });

    it('int: exact 16-char string and overflow truncation; negative support', () => {
      const exactInt = 1234567890123456; // 16 digits
      let res = serialize({ type: 't', i: exactInt })[0];
      let plan: (TKey)[] = ['s', 'i']; // type, i
      expect(paddedValueOf(res, 1, plan).startsWith(exactInt.toString())).toBe(true);
      expect(paddedValueOf(res, 1, plan).length).toBe(TYPE_WIDTH.i);

      const overflowInt = 12345678901234568; // 17 digits
      res = serialize({ type: 't', i: overflowInt })[0];
      const expectedStart = overflowInt.toString().slice(0, TYPE_WIDTH.i);
      plan = ['s', 'i'];
      expect(paddedValueOf(res, 1, plan).startsWith(expectedStart)).toBe(true);

      res = serialize({ type: 't', i: -1 })[0];
      plan = ['s', 'i'];
      expect(paddedValueOf(res, 1, plan).startsWith('-1')).toBe(true);
    });

    it('float: padded to 24 and truncated from toString()', () => {
      let res = serialize({ type: 't', f: 1 / 3 })[0];
      let plan: (TKey)[] = ['s', 'f'];
      const val = (1 / 3).toString();
      expect(paddedValueOf(res, 1, plan).startsWith(val)).toBe(true);
      expect(paddedValueOf(res, 1, plan).length).toBe(TYPE_WIDTH.f);

      const big = 1e123;
      res = serialize({ type: 't', f: big })[0];
      plan = ['s', 'f'];
      expect(paddedValueOf(res, 1, plan).startsWith(big.toString())).toBe(true);
    });

    it('bool: exact padding rules (true padded to 5, false exact 5)', () => {
      const [res] = serialize({ type: 't', t: true, f: false });
      const plan = PLAN_PRIMITIVES.twoBools; // ['s','b','b']
      const tPad = paddedValueOf(res, 1, plan);
      const fPad = paddedValueOf(res, 2, plan);
      expect(tPad.startsWith('true')).toBe(true);
      expect(tPad.length).toBe(TYPE_WIDTH.b);
      expect(fPad.startsWith('false')).toBe(true);
      expect(fPad.length).toBe(TYPE_WIDTH.b);
    });
  });

  describe('reserved bytes', () => {
    it('creates reserved bytes object with correct structure', () => {
      const reserved = reserveBytes(50);
      expect(reserved).toEqual({
        __type: 'reserved',
        bytes: 50,
      });
    });

    it('serializes reserved bytes with correct prefix and padding', () => {
      const [result, bytes] = serialize({
        type: 'test',
        reserved: reserveBytes(20),
      });

      expect(result.startsWith(PROTOCOL_HEADER)).toBe(true);

      // Calculate expected length: PROTOCOL_HEADER + type field + reserved field
      const expectedLen = PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + 20; // 20 reserved bytes total
      expect(result.length).toBe(expectedLen);
      expect(bytes).toBe(expectedLen);

      // Extract the reserved field (field index 1)
      const reservedFieldStart = PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s;
      const reservedField = result.slice(reservedFieldStart, reservedFieldStart + 20);

      expect(reservedField.endsWith(FIELD_MARKERS[1])).toBe(true);

      // Check that the padding is correct (19 pad chars + 1 marker)
      const padding = reservedField.slice(0, 19);
      expect(padding).toBe(';'.repeat(19));
    });

    it('handles different reserved byte sizes', () => {
      const testSizes = [1, 50, 100, 255];

      testSizes.forEach(size => {
        const [result, bytes] = serialize({
          type: 'test',
          reserved: reserveBytes(size),
        });

        const expectedLen = PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + size;
        expect(result.length).toBe(expectedLen);
        expect(bytes).toBe(expectedLen);

        // Extract reserved field
        const reservedFieldStart = PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s;
        const reservedField = result.slice(reservedFieldStart, reservedFieldStart + size);

        expect(reservedField.endsWith(FIELD_MARKERS[1])).toBe(true);

        const padding = reservedField.slice(0, size - 1);
        expect(padding).toBe(';'.repeat(size - 1));
      });
    });

    it('serializes mixed fields with reserved bytes in correct order', () => {
      const [result] = serialize({
        type: 'mixed',
        name: 'test',
        reserved1: reserveBytes(10),
        count: 42,
        reserved2: reserveBytes(5),
        active: true,
      });

      expect(result.startsWith(PROTOCOL_HEADER)).toBe(true);

      let offset = PROTOCOL_HEADER_LENGTH;

      // Field 0: type (string)
      const f0 = result.slice(offset, offset + FULL_WIDTH.s);
      expect(f0.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
      expect(f0.slice(2, 2 + TYPE_WIDTH.s).startsWith('mixed')).toBe(true);
      offset += FULL_WIDTH.s;

      // Field 1: name (string)
      const f1 = result.slice(offset, offset + FULL_WIDTH.s);
      expect(f1.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
      expect(f1.slice(2, 2 + TYPE_WIDTH.s).startsWith('test')).toBe(true);
      offset += FULL_WIDTH.s;

      // Field 2: reserved1 (10 bytes)
      const f2 = result.slice(offset, offset + 10);
      expect(f2.slice(0, 9)).toBe(';'.repeat(9)); // 9 padding + 1 marker
      expect(f2.endsWith(FIELD_MARKERS[2])).toBe(true);
      offset += 10;

      // Field 3: count (int)
      const f3 = result.slice(offset, offset + FULL_WIDTH.i);
      expect(f3.startsWith(`${TYPE_PREFIX.i}:`)).toBe(true);
      expect(f3.slice(2, 2 + TYPE_WIDTH.i).startsWith('42')).toBe(true);
      offset += FULL_WIDTH.i;

      // Field 4: reserved2 (5 bytes)
      const f4 = result.slice(offset, offset + 5);
      expect(f4.slice(0, 4)).toBe(';'.repeat(4)); // 4 padding + 1 marker
      expect(f4.endsWith(FIELD_MARKERS[4])).toBe(true);
      offset += 5;

      // Field 5: active (bool)
      const f5 = result.slice(offset, offset + FULL_WIDTH.b);
      expect(f5.startsWith(`${TYPE_PREFIX.b}:`)).toBe(true);
      expect(f5.slice(2, 2 + TYPE_WIDTH.b).startsWith('true')).toBe(true);
    });

    it('maintains unique markers for reserved fields', () => {
      const [result] = serialize({
        type: 'test',
        reserved1: reserveBytes(10),
        reserved2: reserveBytes(10), // Same size, should have different markers
        reserved3: reserveBytes(5),
      });

      let offset = PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s; // Skip type field

      // reserved1 (field index 1)
      const r1 = result.slice(offset, offset + 10);
      expect(r1.endsWith(FIELD_MARKERS[1])).toBe(true);
      offset += 10;

      // reserved2 (field index 2)
      const r2 = result.slice(offset, offset + 10);
      expect(r2.endsWith(FIELD_MARKERS[2])).toBe(true);
      offset += 10;

      // reserved3 (field index 3)
      const r3 = result.slice(offset, offset + 5);
      expect(r3.endsWith(FIELD_MARKERS[3])).toBe(true);

      // Verify all markers are different even though r1 and r2 have same content
      expect(r1).not.toBe(r2); // Different due to markers
      expect(r1.slice(0, -1)).toBe(r2.slice(0, -1)); // Same content except marker
    });

    it('throws error for invalid reserved bytes input', () => {
      expect(() => reserveBytes(-1)).toThrow();
      expect(() => reserveBytes(1.5)).toThrow();
      expect(() => reserveBytes(NaN)).toThrow();
      expect(() => reserveBytes(Infinity)).toThrow();
    });
  });
});
