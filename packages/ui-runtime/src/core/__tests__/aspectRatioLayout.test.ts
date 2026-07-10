import { beforeAll, describe, expect, it } from 'vitest';
import type { JSX } from '../../jsx';
import { withControl } from '../../components/control';
import { registerNativeComponents } from '../../components';
import { computeLayout } from '../render/phases/layout';

beforeAll(() => {
  registerNativeComponents();
});

function el(type: string, layout: Record<string, unknown>, children?: JSX.Node): JSX.Element {
  return { type, props: { ...withControl(layout), children } };
}

describe('aspectRatio through withControl', () => {
  it('derives the height of a width-sized panel', () => {
    const box = el('panel', { width: 160, aspectRatio: 16 / 9 });
    const tree = el('panel', { width: 320, height: 210, flexDirection: 'column' }, [box]);

    computeLayout(tree);

    expect(box.props.jsonUIWidth).toBe(160);
    expect(box.props.jsonUIHeight).toBe(90);
  });

  it('derives the height of an absolute left+right banner (the thumbnail case)', () => {
    const banner = el('panel', { position: 'absolute', left: 0, right: 1, top: 0, aspectRatio: 16 / 6 });
    const details = el('panel', { width: 213, flexDirection: 'column' }, [banner]);
    const tree = el('panel', { width: 320, height: 210, flexDirection: 'row' }, [details]);

    computeLayout(tree);

    expect(banner.props.jsonUIWidth).toBe(212);
    expect(banner.props.jsonUIHeight).toBe(80); // 212 / (16/6) rounded
  });
});
