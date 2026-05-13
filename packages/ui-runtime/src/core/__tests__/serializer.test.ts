import { describe, expect, it } from 'vitest';
import { serializeProps, FULL_WIDTH, PAD_CHAR } from '../serializer';

describe('serializeProps — text font field', () => {
  it('serializes mojangles font as "default"', () => {
    const [payload] = serializeProps({
      type: 'text',
      value: 'Hello',
      fontType: 'default',
    });

    expect(payload).toContain('s:default');
  });

  it('fontType field is padded to string field width', () => {
    const [payload] = serializeProps({
      type: 'text',
      value: 'Hi',
      fontType: 'default',
    });

    const paddedSmooth = `s:default${PAD_CHAR.repeat(80 - 'default'.length)}`;

    expect(payload).toContain(paddedSmooth);
  });

  it('fontType field appears after value field', () => {
    const [payload] = serializeProps({
      type: 'text',
      value: 'AB',
      fontType: 'default',
    });

    const valuePos = payload.indexOf('s:AB');
    const fontPos = payload.indexOf('s:default');

    expect(valuePos).toBeGreaterThan(-1);
    expect(fontPos).toBeGreaterThan(valuePos);
  });

  it('fontType total payload grows by one string field (83 bytes)', () => {
    const [, bytesWithout] = serializeProps({ type: 'text', value: 'Hi' });
    const [, bytesWith] = serializeProps({ type: 'text', value: 'Hi', fontType: 'default' });

    expect(bytesWith - bytesWithout).toBe(FULL_WIDTH.s);
  });
});
