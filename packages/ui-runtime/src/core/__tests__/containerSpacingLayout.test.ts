import { beforeAll, describe, expect, it } from 'vitest';
import type { JSX } from '../../jsx';
import { registerNativeComponents } from '../../components';
import { withControl } from '../../components/control';
import { computeLayout } from '../render/phases/layout';

beforeAll(() => registerNativeComponents());

function panel(layout: Record<string, unknown>, children?: JSX.Node): JSX.Element {
  return { type: 'panel', props: { ...withControl(layout), children } };
}

describe('axis-specific container gaps', () => {
  it.each([
    ['row', 'rowGap', 'jsonUIx'], ['column', 'columnGap', 'jsonUIy'],
  ])('applies %s spacing through the component layout pipeline', (flexDirection, gap, axis) => {
    const first = panel({ width: 12, height: 12 });
    const second = panel({ width: 12, height: 12 });
    const tree = panel({ width: 120, height: 80, flexDirection, gap: 2, [gap]: 6 }, [first, second]);
    computeLayout(tree);
    expect(first.props[axis]).toBe(0);
    expect(second.props[axis]).toBe(18);
  });
});
