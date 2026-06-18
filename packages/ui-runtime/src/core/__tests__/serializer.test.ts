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
  it('single region is header + string field + height + width fields', () => {
    const payload = serializeTitleMetadata('scroll', [{ height: 120, width: 160 }]);

    expect(payload).toHaveLength(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + 2 * FULL_WIDTH.n);
    expect(payload.startsWith(PROTOCOL_HEADER)).toBe(true);
  });

  it('encodes screen type (field 0), height (field 1), width (field 2)', () => {
    const payload = serializeTitleMetadata('scroll', [{ height: 120, width: 160 }]);

    const screenField = payload.slice(PROTOCOL_HEADER_LENGTH, PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s);
    const heightField = payload.slice(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s, PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + FULL_WIDTH.n);
    const widthField = payload.slice(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + FULL_WIDTH.n);

    expect(screenField).toBe(`s:scroll${PAD_CHAR.repeat(80 - 'scroll'.length)}${FIELD_MARKERS[0]}`);
    expect(heightField).toBe(`n:120${PAD_CHAR.repeat(80 - '120'.length)}${FIELD_MARKERS[1]}`);
    expect(widthField).toBe(`n:160${PAD_CHAR.repeat(80 - '160'.length)}${FIELD_MARKERS[2]}`);
  });

  it('encodes height then width per region in index order', () => {
    const payload = serializeTitleMetadata('dual_scroll', [
      { height: 120, width: 160 },
      { height: 240, width: 170 },
    ]);

    expect(payload).toHaveLength(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + 4 * FULL_WIDTH.n);

    const fieldAt = (i: number): string =>
      payload.slice(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + i * FULL_WIDTH.n, PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + (i + 1) * FULL_WIDTH.n);

    expect(fieldAt(0)).toBe(`n:120${PAD_CHAR.repeat(80 - '120'.length)}${FIELD_MARKERS[1]}`); // height0
    expect(fieldAt(1)).toBe(`n:160${PAD_CHAR.repeat(80 - '160'.length)}${FIELD_MARKERS[2]}`); // width0
    expect(fieldAt(2)).toBe(`n:240${PAD_CHAR.repeat(80 - '240'.length)}${FIELD_MARKERS[3]}`); // height1
    expect(fieldAt(3)).toBe(`n:170${PAD_CHAR.repeat(80 - '170'.length)}${FIELD_MARKERS[4]}`); // width1
  });

  it('keeps the single-scroll height at field 1 (immediately after the screen type)', () => {
    const [propsPayload] = serializeProps({ type: 'scroll', height0: 64, width0: 160 });

    expect(serializeTitleMetadata('scroll', [{ height: 64, width: 160 }])).toBe(propsPayload);
  });

  it('rounds fractional region metrics', () => {
    expect(serializeTitleMetadata('scroll', [{ height: 99.6, width: 160 }])).toContain('n:100');
    expect(serializeTitleMetadata('scroll', [{ height: 99.4, width: 160 }])).toContain('n:99;');
  });
});
