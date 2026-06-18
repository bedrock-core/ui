import { describe, expect, it } from 'vitest';
import { serializeProps, serializeTitleMetadata, FIELD_MARKERS, FULL_WIDTH, PAD_CHAR, PROTOCOL_HEADER, PROTOCOL_HEADER_LENGTH } from '../serializer';

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

describe('serializeTitleMetadata', () => {
  it('single region is header + string field + one number field (175 bytes)', () => {
    const payload = serializeTitleMetadata('scroll', [120]);

    expect(payload).toHaveLength(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + FULL_WIDTH.n);
    expect(payload.startsWith(PROTOCOL_HEADER)).toBe(true);
  });

  it('encodes screen type as field 0 and the region extent as field 1 with unique markers', () => {
    const payload = serializeTitleMetadata('scroll', [120]);

    const screenField = payload.slice(PROTOCOL_HEADER_LENGTH, PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s);
    const extentField = payload.slice(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s);

    expect(screenField).toBe(`s:scroll${PAD_CHAR.repeat(80 - 'scroll'.length)}${FIELD_MARKERS[0]}`);
    expect(extentField).toBe(`n:120${PAD_CHAR.repeat(80 - '120'.length)}${FIELD_MARKERS[1]}`);
  });

  it('encodes one number field per region in index order', () => {
    const payload = serializeTitleMetadata('dual_scroll', [120, 240]);

    expect(payload).toHaveLength(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + 2 * FULL_WIDTH.n);

    const extent0 = payload.slice(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s, PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + FULL_WIDTH.n);
    const extent1 = payload.slice(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + FULL_WIDTH.n);

    expect(extent0).toBe(`n:120${PAD_CHAR.repeat(80 - '120'.length)}${FIELD_MARKERS[1]}`);
    expect(extent1).toBe(`n:240${PAD_CHAR.repeat(80 - '240'.length)}${FIELD_MARKERS[2]}`);
  });

  it('matches the layout serializeProps produces for the same values', () => {
    const [propsPayload] = serializeProps({ type: 'scroll', extent0: 64 });

    expect(serializeTitleMetadata('scroll', [64])).toBe(propsPayload);
  });

  it('rounds fractional region extents', () => {
    expect(serializeTitleMetadata('scroll', [99.6])).toContain('n:100');
    expect(serializeTitleMetadata('scroll', [99.4])).toContain('n:99;');
  });
});
