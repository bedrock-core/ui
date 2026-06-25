import { describe, expect, it } from 'vitest';
import { serializeProps, serializeScrollMetadata, type ScrollMetrics, FIELD_MARKERS, FULL_WIDTH, PAD_CHAR, PROTOCOL_HEADER, PROTOCOL_HEADER_LENGTH } from '../serializer';

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

describe('serializeScrollMetadata', () => {
  const root: ScrollMetrics = { axis: 'y', x: 0, y: 0, width: 160, height: 120, extent: 300 };
  // Block = axis(s) + x,y,width,height,extent(n) = 6 × 83 bytes. Field 0 is the 'scrolls' marker.
  const blockBytes = 6 * FULL_WIDTH.n;

  it('one scroll is header + "scrolls" field + a 6-field block', () => {
    const payload = serializeScrollMetadata([root]);

    expect(payload.startsWith(PROTOCOL_HEADER)).toBe(true);
    expect(payload).toHaveLength(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + blockBytes);
  });

  it('encodes the leading "scrolls" marker (field 0) then axis/x/y/width/height/extent', () => {
    const payload = serializeScrollMetadata([root]);

    const fieldAt = (i: number): string =>
      payload.slice(PROTOCOL_HEADER_LENGTH + i * FULL_WIDTH.n, PROTOCOL_HEADER_LENGTH + (i + 1) * FULL_WIDTH.n);

    expect(fieldAt(0)).toBe(`s:scrolls${PAD_CHAR.repeat(80 - 'scrolls'.length)}${FIELD_MARKERS[0]}`);
    expect(fieldAt(1)).toBe(`s:y${PAD_CHAR.repeat(80 - 'y'.length)}${FIELD_MARKERS[1]}`); // axis0
    expect(fieldAt(2)).toBe(`n:0${PAD_CHAR.repeat(80 - '0'.length)}${FIELD_MARKERS[2]}`); // x0
    expect(fieldAt(3)).toBe(`n:0${PAD_CHAR.repeat(80 - '0'.length)}${FIELD_MARKERS[3]}`); // y0
    expect(fieldAt(4)).toBe(`n:160${PAD_CHAR.repeat(80 - '160'.length)}${FIELD_MARKERS[4]}`); // width0
    expect(fieldAt(5)).toBe(`n:120${PAD_CHAR.repeat(80 - '120'.length)}${FIELD_MARKERS[5]}`); // height0
    expect(fieldAt(6)).toBe(`n:300${PAD_CHAR.repeat(80 - '300'.length)}${FIELD_MARKERS[6]}`); // extent0
  });

  it('appends one block per scroll in index order', () => {
    const second: ScrollMetrics = { axis: 'x', x: 10, y: 20, width: 200, height: 40, extent: 500 };
    const payload = serializeScrollMetadata([root, second]);

    expect(payload).toHaveLength(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + 2 * blockBytes);

    // Scroll 1's axis is the first field of its block (block start = type field + 1 block).
    const block1Start = PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + blockBytes;
    const axis1 = payload.slice(block1Start, block1Start + FULL_WIDTH.s);

    expect(axis1).toBe(`s:x${PAD_CHAR.repeat(80 - 'x'.length)}${FIELD_MARKERS[7]}`);
  });

  it('rounds fractional geometry', () => {
    const payload = serializeScrollMetadata([{ ...root, extent: 99.6, height: 99.4 }]);

    expect(payload).toContain('n:100'); // extent rounded up
    expect(payload).toContain('n:99;'); // height rounded down
  });
});
