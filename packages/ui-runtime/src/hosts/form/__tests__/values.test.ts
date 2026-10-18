import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../../../components/Button';
import { EmbedSlots } from '../../../components/Embed';
import { Image } from '../../../components/Image';
import { List } from '../../../components/List';
import { Panel } from '../../../components/Panel';
import { Screen } from '../../../components/Screen';
import { Text } from '../../../components/Text';
import * as ir from '../../../core/ir';
import type { CompiledSnapshot } from '../../../core/render/screens';
import type { JSX } from '../../../jsx';
import { buildScreenTree } from '../../chest/build';
import { COUNT_PREFIX, LOOK_PREFIX } from '../contract';
import { compiledValuesOf } from '../runtime';

const empty: CompiledSnapshot = { shape: '', baked: [], vis: [], looks: [] };

function fixture(): { tree: JSX.Element; onPress: () => void } {
  const onPress = vi.fn();
  const tree = buildScreenTree(() => Screen({ children: Panel({ children: [
    EmbedSlots({ count: 2, values: ['core_addon:foreign', 'handoff'] }),
    Button({ testId: 'look', background: 'selected', onPress }),
    Panel({ enabled: false, children: Button({ onPress }) }),
    Text({ testId: 'live', visible: false, maxLength: 4, children: 'abcdefgh' }),
    Image({ live: true, texture: 'textures/ui/live' }),
    List({ max: 3, items: ['one'], row: (item: string | undefined) => Text({ maxLength: 8, children: item ?? '' }) }),
  ] }) }));

  return { tree, onPress };
}

const baseValues = ['core_addon:foreign', 'handoff', 't', 'f', 'abcd', 'textures/ui/live', COUNT_PREFIX + '1', 'one', '', ''];

afterEach(() => { vi.restoreAllMocks(); });

describe('compiled value snapshot traversal', () => {
  it.each([undefined, empty])('retains all wire values and handlers without walking empty recorded features: %j', (snapshot) => {
    const { tree, onPress } = fixture();
    const visibles = vi.spyOn(ir, 'visiblesAt');
    const variants = vi.spyOn(ir, 'variantsAt');
    const analysis = vi.spyOn(ir, 'analyze');
    const actual = compiledValuesOf(tree, snapshot);

    expect(actual.values).toEqual(baseValues);
    expect(actual.entries.map(entry => entry.entry)).toEqual(Array.from({ length: baseValues.length }, (_, index) => index));
    expect(actual.entries[2]?.element.props.onPress).toBe(onPress);
    expect(actual.entries[3]?.element.props.enabled).toBe(false);
    expect(visibles).not.toHaveBeenCalled();
    expect(variants).not.toHaveBeenCalled();
    expect(analysis).toHaveBeenCalledOnce();
  });

  it('recovers nonempty visibility ordinals and preserves bool-before-text carrier order', () => {
    const { tree } = fixture();
    const ordinal = ir.visibleCandidates(tree).findIndex(element => element.props.testId === 'live');
    const snapshot: CompiledSnapshot = { ...empty, vis: [ordinal] };
    const visibles = vi.spyOn(ir, 'visiblesAt');
    const variants = vi.spyOn(ir, 'variantsAt');
    const actual = compiledValuesOf(tree, snapshot);

    expect(ordinal).toBeGreaterThan(0);
    expect(actual.values).toEqual([...baseValues.slice(0, 4), 'f', ...baseValues.slice(4)]);
    expect(actual.entries[4]?.carrier).toBe('bool');
    expect(actual.entries[5]?.carrier).toBe('text');
    expect(visibles).toHaveBeenCalledExactlyOnceWith(tree, snapshot.vis);
    expect(variants).not.toHaveBeenCalled();
  });

  it('recovers nonempty look tables without adding a visibility walk', () => {
    const { tree } = fixture();
    const position = ir.bakedWalk(tree).findIndex(element => element.props.testId === 'look');
    const snapshot: CompiledSnapshot = { ...empty, looks: [{ position, type: 'button',
      props: [{ position, prop: 'background' }], combinations: [['default'], ['selected']],
    }] };
    const visibles = vi.spyOn(ir, 'visiblesAt');
    const variants = vi.spyOn(ir, 'variantsAt');
    const actual = compiledValuesOf(tree, snapshot);

    expect(position).toBeGreaterThan(0);
    expect(actual.values).toEqual([...baseValues.slice(0, 4), LOOK_PREFIX + '1', ...baseValues.slice(4)]);
    expect(actual.entries[4]?.carrier).toBe('enum');
    expect(variants).toHaveBeenCalledExactlyOnceWith(tree, snapshot.looks);
    expect(visibles).not.toHaveBeenCalled();
  });

  it('keeps both recorded features on their normal paths when both are present', () => {
    const { tree } = fixture();
    const position = ir.bakedWalk(tree).findIndex(element => element.props.testId === 'look');
    const ordinal = ir.visibleCandidates(tree).findIndex(element => element.props.testId === 'live');
    const snapshot: CompiledSnapshot = { ...empty, vis: [ordinal], looks: [{ position, type: 'button',
      props: [{ position, prop: 'background' }], combinations: [['default'], ['selected']],
    }] };
    const visibles = vi.spyOn(ir, 'visiblesAt');
    const variants = vi.spyOn(ir, 'variantsAt');

    expect(compiledValuesOf(tree, snapshot).values).toEqual([...baseValues.slice(0, 4), LOOK_PREFIX + '1', 'f', ...baseValues.slice(4)]);
    expect(visibles).toHaveBeenCalledOnce();
    expect(variants).toHaveBeenCalledOnce();
  });
});
