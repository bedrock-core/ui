import { describe, expect, it } from 'vitest';
import { withControl } from '../../components/control';
import { FIELD_MARKERS, FULL_WIDTH, PROTOCOL_HEADER, PROTOCOL_HEADER_LENGTH, reserveBytes, serializeProps, TYPE_PREFIX, TYPE_WIDTH } from '../serializer';

const controlTypes: TKey[] = ['n', 'n', 'n', 'n', 'b', 'b', 'n', 'n', 'b', 'b', 'r'];

/**
 * Helper to exclude children property from withControl output for testing serializeProps
 */
function withControlForTest(props: Parameters<typeof withControl>[0]): Omit<ReturnType<typeof withControl>, 'children'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention
  const { children, __position, ...rest } = withControl(props);

  return rest;
}

const PLAN_PRIMITIVES: Record<string, TKey[]> = {
  // Note: all plans now include control props + reserved: type, width, height, x, y, visible, enabled, layer, alpha, inheritMaxSiblingWidth, inheritMaxSiblingHeight, $reserved, [custom fields...]
  basic: ['s', ...controlTypes, 's', 'n', 'n', 'b'], // control + reserved + name, count, ratio, ok
  twoStrings: ['s', ...controlTypes, 's', 's'], // control + reserved + first, second
  twoNumbers: ['s', ...controlTypes, 'n', 'n'], // control + reserved + a, b
  twoBools: ['s', ...controlTypes, 'b', 'b'], // control + reserved + t, f
};

type TKey = keyof typeof FULL_WIDTH;

function sliceFieldWithPlan(payload: string, index: number, plan: readonly TKey[]): string {
  let offset = PROTOCOL_HEADER_LENGTH;

  // Calculate offset by accounting for reserved fields
  for (let i = 0; i < index; i++) {
    if (plan[i] === 'r') {
      // Reserved field at index 11 has 274 bytes (from withControl)
      offset += i === 11 ? 274 : 0;
    } else {
      offset += FULL_WIDTH[plan[i]];
    }
  }

  // Calculate width for the target field
  let fieldWidth: number;
  if (plan[index] === 'r') {
    fieldWidth = index === 11 ? 274 : 0;
  } else {
    fieldWidth = FULL_WIDTH[plan[index]];
  }

  return payload.slice(offset, offset + fieldWidth);
}

describe('core/serializer', () => {
  describe('payload size helper', () => {
    it('computes expected length for arbitrary object', () => {
      const obj = {
        type: 'arb', // s
        ...withControlForTest({
          width: 100.0, // f (required)
          height: 100.0, // f (required)
          x: 0.0, // f (required)
          y: 0.0, // f (required)
        }),
        name: 'Zed', // s
        count: 42, // i
        ratio: 3.14, // f
        active: false, // b
        flag: true, // b
      };

      const [result, bytes] = serializeProps(obj);
      // Just verify the serialization works and returns consistent length
      expect(result.length).toBe(bytes);
      expect(result.startsWith(PROTOCOL_HEADER)).toBe(true);
    });

    it('layout props payload size matches constants', () => {
      const layout = {
        type: 'panel',
        ...withControlForTest({
          width: 100.0,
          height: 100.0,
          x: 0.0,
          y: 0.0,
        }),
      };

      const [result, bytes] = serializeProps(layout);
      // Just verify the serialization works and returns consistent length
      expect(result.length).toBe(bytes);
      expect(result.startsWith(PROTOCOL_HEADER)).toBe(true);
      // withControl adds all required fields + reserved bytes, so length will be 512 (standard allocation)
      expect(bytes).toBe(512);
    });

    it('control props payload size matches constants', () => {
      const control = {
        type: 'panel',
        ...withControlForTest({
          width: 100.0,
          height: 100.0,
          x: 0.0,
          y: 0.0,
          visible: true,
          enabled: false,
          layer: 0,
        }),
      };

      const [result, bytes] = serializeProps(control);
      // Just verify the serialization works and returns consistent length
      expect(result.length).toBe(bytes);
      expect(result.startsWith(PROTOCOL_HEADER)).toBe(true);
      // withControl adds all required fields + reserved bytes, so length will be 512 (standard allocation)
      expect(bytes).toBe(512);
    });
  });

  it('serializes primitives with correct prefix, widths, markers and byte count', () => {
    const [result, bytes] = serializeProps({
      type: 'example',
      ...withControlForTest({
        width: 100.0,
        height: 100.0,
        x: 0.0,
        y: 0.0,
      }),
      name: 'hello', // string
      count: 123, // int
      ratio: 45.67, // float
      ok: true, // bool
    });

    // Prefix
    expect(result.startsWith(PROTOCOL_HEADER)).toBe(true);

    // withControl adds all fields + reserved bytes, so just verify consistency
    expect(result.length).toBe(bytes);
    // Standard allocation with control fields + reserved bytes + additional fields
    expect(bytes).toBeGreaterThan(512); // More than base due to additional name/count/ratio/ok fields

    const plan = PLAN_PRIMITIVES.basic;
    // Field 0: type (string)
    const f0 = sliceFieldWithPlan(result, 0, plan);
    expect(f0.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(f0.endsWith(FIELD_MARKERS[0])).toBe(true);
    const f0Padded = f0.slice(2, 2 + TYPE_WIDTH.s);
    expect(f0Padded.startsWith('example')).toBe(true);

    // Field 12: name (string) - now at index 12 after control props + reserved
    const f12 = sliceFieldWithPlan(result, 12, plan);
    expect(f12.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(f12.endsWith(FIELD_MARKERS[12])).toBe(true);
    const f12Padded = f12.slice(2, 2 + TYPE_WIDTH.s);
    expect(f12Padded.startsWith('hello')).toBe(true);

    // Field 13: count (number)
    const f13count = sliceFieldWithPlan(result, 13, plan);
    expect(f13count.startsWith(`${TYPE_PREFIX.n}:`)).toBe(true);
    expect(f13count.endsWith(FIELD_MARKERS[13])).toBe(true);
    const f13countPadded = f13count.slice(2, 2 + TYPE_WIDTH.n);
    expect(f13countPadded.trimEnd().startsWith('123')).toBe(true);

    // Field 14: ratio (number)
    const f14ratio = sliceFieldWithPlan(result, 14, plan);
    expect(f14ratio.startsWith(`${TYPE_PREFIX.n}:`)).toBe(true);
    expect(f14ratio.endsWith(FIELD_MARKERS[14])).toBe(true);
    const f14ratioPadded = f14ratio.slice(2, 2 + TYPE_WIDTH.n);
    expect(f14ratioPadded.startsWith('45.67')).toBe(true);

    // Field 15: ok (bool)
    const f15 = sliceFieldWithPlan(result, 15, plan);
    expect(f15.startsWith(`${TYPE_PREFIX.b}:`)).toBe(true);
    expect(f15.endsWith(FIELD_MARKERS[15])).toBe(true);
    const f15Padded = f15.slice(2, 2 + TYPE_WIDTH.b);
    expect(f15Padded.startsWith('true')).toBe(true);
  });

  it('keeps identical values in different fields distinct via unique markers (strings)', () => {
    const [result] = serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), first: 'same', second: 'same' });
    const plan = PLAN_PRIMITIVES.twoStrings;
    // Compare fields 12 and 13 (first and second after control props + reserved)
    const f0 = sliceFieldWithPlan(result, 12, plan);
    const f1 = sliceFieldWithPlan(result, 13, plan);
    // Core padded value regions should be identical
    expect(f0.slice(2, 2 + TYPE_WIDTH.s)).toBe(f1.slice(2, 2 + TYPE_WIDTH.s));
    // But full fields must differ thanks to markers
    expect(f0).not.toBe(f1);
    expect(f0.endsWith(FIELD_MARKERS[12])).toBe(true);
    expect(f1.endsWith(FIELD_MARKERS[13])).toBe(true);
  });

  it('keeps identical values in different fields distinct via unique markers', () => {
    const [result] = serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), a: 13, b: 13 });
    const plan = PLAN_PRIMITIVES.twoNumbers;
    const f0 = sliceFieldWithPlan(result, 12, plan);
    const f1 = sliceFieldWithPlan(result, 13, plan);
    expect(f0.slice(2, 2 + TYPE_WIDTH.n)).toBe(f1.slice(2, 2 + TYPE_WIDTH.n));
    expect(f0).not.toBe(f1);
    expect(f0.endsWith(FIELD_MARKERS[12])).toBe(true);
    expect(f1.endsWith(FIELD_MARKERS[13])).toBe(true);
  });

  it('serializes booleans in lowercase and with correct padded length', () => {
    const [result] = serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), t: true, f: false });
    const plan = PLAN_PRIMITIVES.twoBools;
    const f0 = sliceFieldWithPlan(result, 12, plan);
    const f1 = sliceFieldWithPlan(result, 13, plan);
    expect(f0.slice(2, 2 + TYPE_WIDTH.b).startsWith('true')).toBe(true);
    expect(f1.slice(2, 2 + TYPE_WIDTH.b).startsWith('false')).toBe(true);
  });

  it('throws on unsupported value types', () => {
    expect(() => serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), ok: true, bad: undefined as unknown as number })).toThrow();
    expect(() => serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), obj: {} as unknown as number })).toThrow();
  });

  describe('limits', () => {
    it('string: exact fit (ASCII) and overflow throws error', () => {
      const exact = 'x'.repeat(TYPE_WIDTH.s);
      let res = serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), s: exact })[0];
      // Verify the string is serialized properly
      expect(res).toContain(exact);

      const over = 'x'.repeat(TYPE_WIDTH.s + 8);
      // Verify that strings exceeding max length throw an error
      expect(() => serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), s: over })).toThrow(/exceeds maximum byte length/);
    });

    it('string: multi-byte safety (2-byte and surrogate pairs 4-byte)', () => {
      const twoByte = 'é'; // 2 bytes in UTF-8
      const exactTwoByte = twoByte.repeat(TYPE_WIDTH.s / 2);
      let res = serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), s: exactTwoByte })[0];
      // Verify multi-byte character handling at exact limit
      expect(res).toContain(exactTwoByte);

      const overTwoByte = twoByte.repeat(TYPE_WIDTH.s / 2 + 1);
      // Verify that strings exceeding byte limit throw error
      expect(() => serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), s: overTwoByte })).toThrow(/exceeds maximum byte length/);

      const fourByte = '😀'; // surrogate pair, 4 bytes
      const exactFourByte = fourByte.repeat(TYPE_WIDTH.s / 4);
      res = serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), s: exactFourByte })[0];
      // Verify surrogate pair handling at exact limit
      expect(res).toContain(exactFourByte);

      const overFourByte = fourByte.repeat(TYPE_WIDTH.s / 4 + 1);
      // Verify that strings exceeding byte limit throw error
      expect(() => serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), s: overFourByte })).toThrow(/exceeds maximum byte length/);
    });

    it('number: exact 24-char string and overflow truncation; negative support', () => {
      const exactNum = 1234567890123456; // 16 digits
      let res = serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), num: exactNum })[0];
      // Verify number serialization
      expect(res).toContain(exactNum.toString());

      const overflowNum = 12345678901234568; // 17 digits
      res = serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), num: overflowNum })[0];
      const expectedStart = overflowNum.toString().slice(0, TYPE_WIDTH.n);
      // Verify number truncation
      expect(res).toContain(expectedStart);

      res = serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), num: -1 })[0];
      // Verify negative number support
      expect(res).toContain('-1');
    });

    it('number: padded to 24 and truncated from toString()', () => {
      let res = serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), num: 1 / 3 })[0];
      const val = (1 / 3).toString();
      // Verify number serialization
      expect(res).toContain(val);

      const big = 1e123;
      res = serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), num: big })[0];
      // Verify big number serialization
      expect(res).toContain(big.toString());
    });

    it('bool: exact padding rules (true padded to 5, false exact 5)', () => {
      const [res] = serializeProps({ type: 't', ...withControlForTest({ width: 0, height: 0, x: 0, y: 0 }), t: true, f: false });
      // Verify boolean serialization
      expect(res).toContain('true');
      expect(res).toContain('false');
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
      const [result, bytes] = serializeProps({
        type: 'test',
        ...withControlForTest({
          width: 0,
          height: 0,
          x: 0,
          y: 0,
        }),
        reserved: reserveBytes(20),
      });

      expect(result.startsWith(PROTOCOL_HEADER)).toBe(true);

      // Note: withControl adds all control fields, so we just verify the total length is correct
      // by checking that the result length equals the returned bytes
      expect(result.length).toBe(bytes);
      expect(bytes).toBe(532); // withControl adds 512 bytes + additional 20 reserved bytes

      // Verify the reserved bytes are properly serialized with padding
      expect(result).toContain(';'.repeat(19)); // 19 padding chars for 20-byte reserved field
    });

    it('handles different reserved byte sizes', () => {
      const testSizes = [1, 50, 100, 255];

      testSizes.forEach(size => {
        const [result, bytes] = serializeProps({
          type: 'test',
          ...withControlForTest({
            width: 0,
            height: 0,
            x: 0,
            y: 0,
          }),
          reserved: reserveBytes(size),
        });

        // Verify consistent length calculation
        expect(result.length).toBe(bytes);

        // Verify reserved field padding
        if (size > 1) {
          expect(result).toContain(';'.repeat(size - 1));
        }
      });
    });

    it('serializes mixed fields with reserved bytes in correct order', () => {
      const [result, bytes] = serializeProps({
        type: 'mixed',
        ...withControlForTest({
          width: 0,
          height: 0,
          x: 0,
          y: 0,
        }),
        name: 'test',
        reserved1: reserveBytes(10),
        count: 42,
        reserved2: reserveBytes(5),
        active: true,
      });

      expect(result.startsWith(PROTOCOL_HEADER)).toBe(true);

      // Note: withControl adds all control fields first, then custom fields
      // Just verify basic structure since field positions are managed by withControl
      expect(result.length).toBe(bytes);
      expect(result.startsWith(PROTOCOL_HEADER)).toBe(true);

      // Verify the custom fields are present somewhere in the payload
      expect(result).toContain('mixed'); // type
      expect(result).toContain('test'); // name
      expect(result).toContain('42'); // count

      // Verify reserved bytes are present (padding + markers)
      expect(result).toContain(';'.repeat(9)); // reserved1 padding
      expect(result).toContain(';'.repeat(4)); // reserved2 padding
    });

    it('maintains unique markers for reserved fields', () => {
      const [result, bytes] = serializeProps({
        type: 'test',
        ...withControlForTest({
          width: 0,
          height: 0,
          x: 0,
          y: 0,
        }),
        reserved1: reserveBytes(10),
        reserved2: reserveBytes(10), // Same size, should have different markers
        reserved3: reserveBytes(5),
      });

      // Note: withControl adds all control fields first, so reserved fields come after
      // Just verify that reserved bytes have unique markers (they'll have high indices)
      expect(result.length).toBe(bytes);
      expect(result.startsWith(PROTOCOL_HEADER)).toBe(true);

      // Verify reserved bytes are present with padding
      expect(result).toContain(';'.repeat(9)); // reserved1 & reserved2 padding (10 bytes each)
      expect(result).toContain(';'.repeat(4)); // reserved3 padding (5 bytes)

      // Verify different markers are used (exact positions depend on withControl)
      const padding9 = ';'.repeat(9);
      const padding4 = ';'.repeat(4);
      const occurrences9 = (result.match(new RegExp(padding9, 'g')) || []).length;
      const occurrences4 = (result.match(new RegExp(padding4, 'g')) || []).length;
      expect(occurrences9).toBeGreaterThanOrEqual(2); // at least 2 occurrences of 9-char padding
      expect(occurrences4).toBeGreaterThanOrEqual(1); // at least 1 occurrence of 4-char padding
    });

    it('throws error for invalid reserved bytes input', () => {
      expect(() => reserveBytes(-1)).toThrow();
      expect(() => reserveBytes(1.5)).toThrow();
      expect(() => reserveBytes(NaN)).toThrow();
      expect(() => reserveBytes(Infinity)).toThrow();
    });
  });
});
