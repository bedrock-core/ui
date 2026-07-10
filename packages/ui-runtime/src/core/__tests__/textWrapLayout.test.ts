import { beforeAll, describe, expect, it } from 'vitest';
import type { JSX } from '../../jsx';
import { withControl } from '../../components/control';
import { registerNativeComponents } from '../../components';
import { computeLayout } from '../render/phases/layout';
import { measureText, wrapText } from '../../util/textMetrics';

beforeAll(() => {
  registerNativeComponents();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function el(type: string, layout: Record<string, unknown>, children?: JSX.Node): JSX.Element {
  return { type, props: { ...withControl(layout), children } };
}

/**
 * Build a text element the way `<Text>` does: layout props through withControl,
 * text metrics on `__textMetrics`. Pass `key: true` to mimic a localizationKey
 * text (props.value must stay the key — the commit path must not rewrite it).
 */
function text(
  value: string,
  metrics: Record<string, unknown> = {},
  { key = false }: { key?: boolean } = {},
): JSX.Element {
  return {
    type: 'text',
    props: {
      ...withControl({}),
      value,
      __textMetrics: {
        fontSize: 1,
        resolvedText: value,
        isKey: key,
        ...metrics,
      },
    },
  };
}

function asNum(v: unknown): number {
  if (typeof v !== 'number') {
    throw new Error(`expected number, got ${String(v)}`);
  }

  return v;
}

const LINE_HEIGHT = measureText({ text: 'x', fontSize: 1 }).height;

const DESC = 'A very long addon description that keeps going and going so it must '
  + 'wrap onto several lines inside the details card of the list screen';

// ─── wordBreak against flex-resolved widths ───────────────────────────────────

describe('text wrapping against flex-resolved widths', () => {
  it('wraps at the width of a flexGrow panel next to a percent-width sibling (List screen shape)', () => {
    const t = text(DESC, { wordBreak: 'break-word' });
    const left = el('panel', { width: '33%' });
    const details = el('panel', { flexGrow: 1, flexDirection: 'column' }, t);
    const tree = el('panel', { width: 320, height: 210, flexDirection: 'row' }, [left, details]);

    computeLayout(tree);

    const detailsWidth = asNum(details.props.jsonUIWidth);
    const textWidth = asNum(t.props.jsonUIWidth);

    // The details panel gets the leftover ~67% of the row — NOT the full 320.
    expect(detailsWidth).toBeLessThan(320 * 0.7);
    expect(textWidth).toBe(detailsWidth);

    // Height matches the text actually wrapped at the granted width (> 1 line).
    const expected = measureText({ text: wrapText(DESC, textWidth, undefined, 1), fontSize: 1 });

    expect(asNum(t.props.jsonUIHeight)).toBe(expected.height);
    expect(expected.height).toBeGreaterThanOrEqual(2 * LINE_HEIGHT);
  });

  it('wraps at a percent-width panel', () => {
    const t = text(DESC, { wordBreak: 'break-word' });
    const half = el('panel', { width: '50%', flexDirection: 'column' }, t);
    const tree = el('panel', { width: 320, height: 210, flexDirection: 'row' }, [half]);

    computeLayout(tree);

    expect(asNum(t.props.jsonUIWidth)).toBe(160);

    const expected = measureText({ text: wrapText(DESC, 160, undefined, 1), fontSize: 1 });

    expect(asNum(t.props.jsonUIHeight)).toBe(expected.height);
  });

  it('accounts for container padding', () => {
    const t = text(DESC, { wordBreak: 'break-word' });
    const card = el('panel', { width: 200, flexDirection: 'column', padding: 8 }, t);
    const tree = el('panel', { width: 320, height: 210, flexDirection: 'column' }, [card]);

    computeLayout(tree);

    expect(asNum(t.props.jsonUIWidth)).toBe(184); // 200 − 2×8
  });

  it('pushes following siblings down by the wrapped height', () => {
    const t = text(DESC, { wordBreak: 'break-word' });
    const after = el('panel', { height: 20 });
    const tree = el('panel', { width: 160, height: 210, flexDirection: 'column' }, [t, after]);

    computeLayout(tree);

    expect(asNum(after.props.jsonUIy)).toBe(asNum(t.props.jsonUIHeight));
  });

  it('single-line text without overflow props keeps its intrinsic size', () => {
    const t = text('Short label');
    const tree = el('panel', { width: 320, height: 210, flexDirection: 'column', alignItems: 'flex-start' }, [t]);

    computeLayout(tree);

    const dims = measureText({ text: 'Short label', fontSize: 1 });

    expect(asNum(t.props.jsonUIWidth)).toBe(dims.width);
    expect(asNum(t.props.jsonUIHeight)).toBe(dims.height);
  });
});

// ─── Overflow value commit ────────────────────────────────────────────────────

describe('overflow text value commit', () => {
  it('commits the wrapped string to props.value (labels never wrap on their own)', () => {
    const t = text(DESC, { wordBreak: 'break-word' });
    const tree = el('panel', { width: 160, height: 210, flexDirection: 'column' }, [t]);

    computeLayout(tree);

    expect(t.props.value).toBe(wrapText(DESC, asNum(t.props.jsonUIWidth), undefined, 1));
    expect(t.props.value).toContain('\n');
  });

  it('keeps props.value untouched for localization keys (RP resolves the key)', () => {
    const t = text('ui.addons.description', { wordBreak: 'break-word', resolvedText: DESC }, { key: true });
    const tree = el('panel', { width: 160, height: 210, flexDirection: 'column' }, [t]);

    computeLayout(tree);

    // Height still reflects the RESOLVED string wrapped at the granted width…
    const expected = measureText({ text: wrapText(DESC, asNum(t.props.jsonUIWidth), undefined, 1), fontSize: 1 });

    expect(asNum(t.props.jsonUIHeight)).toBe(expected.height);
    // …but the emitted value stays the key.
    expect(t.props.value).toBe('ui.addons.description');
  });

  it('guards a digit-leading wrapped string with §r (safeLabelText)', () => {
    const numeric = '123 456 789 012 345 678 901 234 567 890 123 456 789';
    const t = text(numeric, { wordBreak: 'break-word' });
    const tree = el('panel', { width: 60, height: 210, flexDirection: 'column' }, [t]);

    computeLayout(tree);

    expect(String(t.props.value).startsWith('§r')).toBe(true);
  });

  it('ellipsizes to a single line at the granted width', () => {
    const t = text(DESC, { overflow: 'ellipsis' });
    const tree = el('panel', { width: 100, height: 210, flexDirection: 'column' }, [t]);

    computeLayout(tree);

    expect(asNum(t.props.jsonUIHeight)).toBe(LINE_HEIGHT);
    expect(asNum(t.props.jsonUIWidth)).toBeLessThanOrEqual(100);
    expect(String(t.props.value).endsWith('...')).toBe(true);
  });

  it('maxLines truncates the wrapped text to N lines', () => {
    const t = text(DESC, { wordBreak: 'break-word', maxLines: 2 });
    const tree = el('panel', { width: 160, height: 210, flexDirection: 'column' }, [t]);

    computeLayout(tree);

    expect(asNum(t.props.jsonUIHeight)).toBe(2 * LINE_HEIGHT);
    expect(String(t.props.value).split('\n')).toHaveLength(2);

    const kept = wrapText(DESC, asNum(t.props.jsonUIWidth), undefined, 1).split('\n').slice(0, 2);

    // A wrapped line fits by construction, so ellipsizeText leaves it unchanged.
    expect(t.props.value).toBe(kept.join('\n'));
  });
});

// ─── Localized wrap types ─────────────────────────────────────────────────────

describe('text_wrap element type (localized overflow text)', () => {
  it('is measured like text: the box gets the wrapped height of the resolved string, the value stays the key', () => {
    const t: JSX.Element = {
      type: 'text_wrap',
      props: {
        ...withControl({}),
        value: 'ui.addons.description',
        __textMetrics: { fontSize: 1, wordBreak: 'break-word', resolvedText: DESC, isKey: true },
      },
    };
    const tree = el('panel', { width: 160, height: 210, flexDirection: 'column' }, [t]);

    computeLayout(tree);

    const expected = measureText({ text: wrapText(DESC, asNum(t.props.jsonUIWidth), undefined, 1), fontSize: 1 });

    expect(asNum(t.props.jsonUIWidth)).toBe(160);
    expect(asNum(t.props.jsonUIHeight)).toBe(expected.height);
    expect(t.props.value).toBe('ui.addons.description');
  });
});

// ─── Scroll regions ───────────────────────────────────────────────────────────

describe('text wrapping inside scroll regions', () => {
  it('wraps at the scroll viewport width', () => {
    const t = text(DESC, { wordBreak: 'break-word' });
    const content = el('panel', { flexDirection: 'column' }, t);
    const scroll: JSX.Element = {
      type: 'scroll-slot',
      props: { ...withControl({ width: 120, height: 100 }), __axis: 'y', children: content },
    };
    const tree = el('panel', { width: 320, height: 210, flexDirection: 'column' }, [scroll]);

    computeLayout(tree);

    expect(asNum(t.props.jsonUIWidth)).toBe(120);

    const expected = measureText({ text: wrapText(DESC, 120, undefined, 1), fontSize: 1 });

    expect(asNum(t.props.jsonUIHeight)).toBe(expected.height);
  });
});
