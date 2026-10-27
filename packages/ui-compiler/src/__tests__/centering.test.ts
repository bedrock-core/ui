import { Button, Container, Panel, Screen, Scroll, type JSX } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { compileScreen } from '../compile';
import { compileFormScreen } from '../hosts/form/compile';
import { find } from '../__fixtures__/helpers';

const Toolbar = (): JSX.Element => Panel({
  width: 58, height: 28, paddingTop: 2, paddingLeft: 8, paddingRight: 3,
  flexDirection: 'row', alignItems: 'center', gap: 1,
  children: [Button({ width: 25, height: 18 }), Button({ width: 21, height: 21 })],
});

describe('compiled center alignment', () => {
  it.each([['container', false], ['form', false], ['container', true], ['form', true]] as const)('preserves a common center for odd and even button heights in a %s (scroll: %s)', (host, scroll) => {
    const spec = { namespace: 'centering', name: 'toolbar' };
    const content = (): JSX.Element => scroll ? Scroll({ width: 58, height: 28, children: Toolbar() }) : Toolbar();
    const compiled = host === 'container'
      ? compileScreen(() => Container({ entity: 'centering:toolbar', width: 58, height: 28, children: content() }), spec)
      : compileFormScreen(() => Screen({ children: content() }), spec);
    const first = find(compiled.document, name => name.split('@')[0] === 'button_1')[1];
    const second = find(compiled.document, name => name.split('@')[0] === 'button_2')[1];

    expect(first.offset).toEqual([8, 6]);
    expect(second.offset).toEqual([34, 4.5]);
    expect(Number(first.offset?.[1]) + Number(first.size?.[1]) / 2)
      .toBe(Number(second.offset?.[1]) + Number(second.size?.[1]) / 2);
  });
});


describe('content-sized toolbar spacing', () => {
  it.each([
    { paddingTop: 2, paddingRight: 3, gap: 1, closeMarginX: 0, closeMarginY: 0, firstY: 3.5, secondY: 2 },
    { paddingTop: 3, paddingRight: 6, gap: 4, closeMarginX: -3, closeMarginY: -0.5, firstY: 4, secondY: 2.5 },
  ])('uses the authored padding and margins in a content-sized row: $paddingTop/$gap', ({ paddingTop, paddingRight, gap, closeMarginX, closeMarginY, firstY, secondY }) => {
    const toolbar = (): JSX.Element => Panel({
      paddingTop, paddingBottom: 3, paddingLeft: 8, paddingRight,
      flexDirection: 'row', alignItems: 'center', gap,
      children: [
        Button({ width: 25, height: 18 }),
        Button({ width: 21, height: 21, marginLeft: closeMarginX, marginRight: closeMarginX, marginTop: closeMarginY, marginBottom: closeMarginY }),
      ],
    });
    const compiled = compileScreen(() => Container({ entity: 'centering:toolbar', width: 58, height: 40, children: toolbar() }), { namespace: 'centering', name: 'natural_toolbar' });
    const first = find(compiled.document, name => name.split('@')[0] === 'button_1')[1];
    const second = find(compiled.document, name => name.split('@')[0] === 'button_2')[1];

    expect(first.offset).toEqual([8, firstY]);
    expect(second.offset).toEqual([34, secondY]);
    expect(Number(first.offset?.[1]) + Number(first.size?.[1]) / 2)
      .toBe(Number(second.offset?.[1]) + Number(second.size?.[1]) / 2);
  });
});
