import { describe, expect, it } from 'vitest';
import { Panel } from '../../components/Panel';
import { Text } from '../../components/Text';
import type { JSX } from '../../jsx';
import { computeLayout } from '../render/phases/layout';
import { measureText } from '../../util/textMetrics';

const widthOf = (element: JSX.Element): number => {
  const { width } = element.props.__layout as { width?: unknown };

  return typeof width === 'number' ? width : Number.NaN;
};

const laidOutWidth = (element: JSX.Element): number => {
  const tree = computeLayout(Panel({ children: [element] }));
  const [child] = tree.props.children as JSX.Element[];

  return child.props.jsonUIWidth as number;
};

describe('a text with maxLength', () => {
  it('reserves room for that many of the widest glyph, whatever it says now', () => {
    const short = Text({ maxLength: 8, children: 'idle' });
    const reserved = measureText({ text: 'W'.repeat(8) }).width;

    expect(widthOf(short)).toBeNaN();
    expect(laidOutWidth(short)).toBe(reserved);
    expect(laidOutWidth(short)).toBeGreaterThan(measureText({ text: 'idle' }).width);
  });

  it('fits a text made of the widest glyph exactly', () => {
    const full = Text({ maxLength: 4, children: 'WWWW' });

    expect(laidOutWidth(full)).toBe(measureText({ text: 'WWWW' }).width);
  });

  it('cuts a literal longer than maxLength to it', () => {
    const cut = Text({ maxLength: 2, children: 'WWWW' });

    expect(laidOutWidth(cut)).toBe(measureText({ text: 'WW' }).width);
  });

  it('leaves an explicit width alone', () => {
    const fixed = Text({ maxLength: 8, width: 30, children: 'idle' });

    expect(laidOutWidth(fixed)).toBe(30);
  });

  it('changes nothing for a text without one', () => {
    const plain = Text({ children: 'idle' });

    expect(laidOutWidth(plain)).toBe(measureText({ text: 'idle' }).width);
  });
});
