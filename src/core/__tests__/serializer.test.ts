import { describe, it, expect } from 'vitest';
import { serialize, PROTOCOL_HEADER, SLICE_WIDTH, PADDED_WIDTH, FIELD_MARKERS, TYPE_PREFIX } from '../serializer';

const HEADER = PROTOCOL_HEADER;
const HEADER_LEN = HEADER.length; // 9
const PLAN_PRIMITIVES = {
  basic: ['s', 's', 'i', 'f', 'b'] as const,
  twoStrings: ['s', 's', 's'] as const,
  twoInts: ['s', 'i', 'i'] as const,
  twoBools: ['s', 'b', 'b'] as const,
};

type TKey = keyof typeof SLICE_WIDTH; // 's' | 'i' | 'f' | 'b'
function sliceFieldWithPlan(payload: string, index: number, plan: readonly TKey[]): string {
  const start = HEADER_LEN + plan.slice(0, index).reduce((acc, k) => acc + SLICE_WIDTH[k], 0);

  return payload.slice(start, start + SLICE_WIDTH[plan[index]]);
}

describe('core/serializer', () => {
  it('serializes primitives with correct prefix, widths, markers and byte count', () => {
    const [result, bytes] = serialize({
      type: 'example',
      name: 'hello', // string
      count: 123, // int
      ratio: 45.67, // float
      ok: true, // bool
    });

    // Prefix
    expect(result.startsWith(HEADER)).toBe(true);

    // Expected length from constants
    const expectedLen = HEADER_LEN + PLAN_PRIMITIVES.basic.reduce((acc, k) => acc + SLICE_WIDTH[k], 0);
    expect(result.length).toBe(expectedLen);
    expect(bytes).toBe(expectedLen);

    const plan = PLAN_PRIMITIVES.basic;
    // Field 0: type (string)
    const f0 = sliceFieldWithPlan(result, 0, plan);
    expect(f0.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(f0.endsWith(FIELD_MARKERS[0])).toBe(true);
    const f0Padded = f0.slice(2, 2 + PADDED_WIDTH.s);
    expect(f0Padded.startsWith('example')).toBe(true);

    // Field 1: name (string)
    const f1 = sliceFieldWithPlan(result, 1, plan);
    expect(f1.startsWith(`${TYPE_PREFIX.s}:`)).toBe(true);
    expect(f1.endsWith(FIELD_MARKERS[1])).toBe(true);
    const f1Padded = f1.slice(2, 2 + PADDED_WIDTH.s);
    expect(f1Padded.startsWith('hello')).toBe(true);

    // Field 2: count (int)
    const f2 = sliceFieldWithPlan(result, 2, plan);
    expect(f2.startsWith(`${TYPE_PREFIX.i}:`)).toBe(true);
    expect(f2.endsWith(FIELD_MARKERS[2])).toBe(true);
    const f2Padded = f2.slice(2, 2 + PADDED_WIDTH.i);
    expect(f2Padded.trimEnd().startsWith('123')).toBe(true);

    // Field 3: ratio (float)
    const f3 = sliceFieldWithPlan(result, 3, plan);
    expect(f3.startsWith(`${TYPE_PREFIX.f}:`)).toBe(true);
    expect(f3.endsWith(FIELD_MARKERS[3])).toBe(true);
    const f3Padded = f3.slice(2, 2 + PADDED_WIDTH.f);
    expect(f3Padded.startsWith('45.67')).toBe(true);

    // Field 4: ok (bool)
    const f4 = sliceFieldWithPlan(result, 4, plan);
    expect(f4.startsWith(`${TYPE_PREFIX.b}:`)).toBe(true);
    expect(f4.endsWith(FIELD_MARKERS[4])).toBe(true);
    const f4Padded = f4.slice(2, 2 + PADDED_WIDTH.b);
    expect(f4Padded.startsWith('true')).toBe(true);
  });

  it('keeps identical values in different fields distinct via unique markers (strings)', () => {
    const [result] = serialize({ type: 't', first: 'same', second: 'same' });
    const plan = PLAN_PRIMITIVES.twoStrings;
    // Compare fields 1 and 2 (skip the 'type' field at index 0)
    const f0 = sliceFieldWithPlan(result, 1, plan);
    const f1 = sliceFieldWithPlan(result, 2, plan);
    // Core padded value regions should be identical
    expect(f0.slice(2, 2 + PADDED_WIDTH.s)).toBe(f1.slice(2, 2 + PADDED_WIDTH.s));
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
    expect(f0.slice(2, 2 + PADDED_WIDTH.i)).toBe(f1.slice(2, 2 + PADDED_WIDTH.i));
    expect(f0).not.toBe(f1);
    expect(f0.endsWith(FIELD_MARKERS[1])).toBe(true);
    expect(f1.endsWith(FIELD_MARKERS[2])).toBe(true);
  });

  it('serializes booleans in lowercase and with correct padded length', () => {
    const [result] = serialize({ type: 't', t: true, f: false });
    const plan = PLAN_PRIMITIVES.twoBools;
    const f0 = sliceFieldWithPlan(result, 1, plan);
    const f1 = sliceFieldWithPlan(result, 2, plan);
    expect(f0.slice(2, 2 + PADDED_WIDTH.b).startsWith('true')).toBe(true);
    expect(f1.slice(2, 2 + PADDED_WIDTH.b).startsWith('false')).toBe(true);
  });

  it('throws on unsupported value types', () => {
    expect(() => serialize({ type: 't', ok: true, bad: undefined as unknown as number })).toThrow();
    expect(() => serialize({ type: 't', obj: {} as unknown as number })).toThrow();
  });
});
