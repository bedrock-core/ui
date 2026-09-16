import { describe, expect, it } from 'vitest';
import { collapseTrail, trailMaxLength, trailText, trailWidth, type TrailMeasure } from '../trailComposition';

/**
 * A trail gives way in one order, so the order is what is tested: the last
 * segment always, the first while it fits, then the rest back in from the end.
 *
 * Measured with one unit per character rather than with the glyph table, so a
 * case says what it means — `'A > DDDD'` is eight units wide and a width of
 * eight is exactly enough for it. The gap is three characters, so a segment has
 * to be wider than that for dropping it to save any room.
 */
const perCharacter: TrailMeasure = text => text.length;

/** Four segments of known width: `A`, `BBBBBB`, `CCCCCC`, `DDDD`. */
const four = ['A', 'BBBBBB', 'CCCCCC', 'DDDD'];

/** What `collapseTrail` chose, written the way the trail draws it. */
const drawn = (segments: readonly string[], width: number): string =>
  collapseTrail(segments, width, perCharacter)
    .map(slot => (slot === 'gap' ? '...' : segments[slot]))
    .join(' > ');

describe('a trail collapses from the middle', () => {
  it('shows every segment when they fit', () => {
    expect(drawn(four, 26)).toBe('A > BBBBBB > CCCCCC > DDDD');
  });

  it('drops the second segment first', () => {
    expect(drawn(four, 25)).toBe('A > ... > CCCCCC > DDDD');
  });

  it('keeps the first and the last when only they fit', () => {
    expect(drawn(four, 22)).toBe('A > ... > DDDD');
  });

  it('gives up the first last of all', () => {
    expect(drawn(four, 13)).toBe('... > DDDD');
  });

  it('keeps the last segment even when it does not fit', () => {
    expect(drawn(four, 1)).toBe('... > DDDD');
  });

  it('leaves a single segment alone', () => {
    expect(drawn(['DDDD'], 1)).toBe('DDDD');
  });
});

describe('a composed trail', () => {
  const published: Record<string, string> = { 'addon.name': 'Economy', 'core.scope.server.label': 'Server' };
  const resolve = (key: string): string | undefined => published[key];

  it('travels as one message, a part per segment', () => {
    const message = trailText(['addon.name', 'core.scope.server.label'], resolve);

    expect(message.rawtext).toEqual([
      { text: '§0' },
      { translate: 'addon.name' },
      { text: '§8 > §0' },
      { translate: 'core.scope.server.label' },
    ]);
  });

  it('sends a literal as text and a key as a translate the client resolves', () => {
    const message = trailText(['addon.name', 'Steve'], resolve);

    expect(message.rawtext?.[1]).toEqual({ translate: 'addon.name' });
    expect(message.rawtext?.[3]).toEqual({ text: 'Steve' });
  });

  it('leaves out a segment that resolves to nothing, separator included', () => {
    const message = trailText(['addon.name', '', 'Steve'], resolve);

    expect(message.rawtext).toHaveLength(4);
  });

  it('reserves fewer characters under the labelled cancel than under the icon back', () => {
    expect(trailWidth('cancel')).toBeLessThan(trailWidth('icon'));
    expect(trailMaxLength('cancel')).toBeLessThan(trailMaxLength('icon'));
  });
});
