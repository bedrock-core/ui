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
  it('is header + string field + number field (175 bytes)', () => {
    const payload = serializeTitleMetadata(120, 'scroll');

    expect(payload).toHaveLength(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + FULL_WIDTH.n);
    expect(payload.startsWith(PROTOCOL_HEADER)).toBe(true);
  });

  it('encodes screen type as field 0 and height as field 1 with unique markers', () => {
    const payload = serializeTitleMetadata(120, 'scroll');

    const screenField = payload.slice(PROTOCOL_HEADER_LENGTH, PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s);
    const heightField = payload.slice(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s);

    expect(screenField).toBe(`s:scroll${PAD_CHAR.repeat(80 - 'scroll'.length)}${FIELD_MARKERS[0]}`);
    expect(heightField).toBe(`n:120${PAD_CHAR.repeat(80 - '120'.length)}${FIELD_MARKERS[1]}`);
  });

  it('matches the layout serializeProps produces for the same values', () => {
    const [propsPayload] = serializeProps({ type: 'scroll', contentHeight: 64 });

    expect(serializeTitleMetadata(64, 'scroll')).toBe(propsPayload);
  });

  it('rounds fractional content heights', () => {
    expect(serializeTitleMetadata(99.6, 'scroll')).toContain('n:100');
    expect(serializeTitleMetadata(99.4, 'scroll')).toContain('n:99;');
  });

  it('defaults to scroll screen type', () => {
    expect(serializeTitleMetadata(0)).toContain('s:scroll');
  });
});
