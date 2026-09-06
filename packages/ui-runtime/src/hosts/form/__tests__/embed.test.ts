import { describe, expect, it } from 'vitest';
import { Button, Embed, EmbedSlots, Image, Panel, Text } from '../../../components';
import { buildScreenTree } from '../../chest/build';
import { allocate } from '../allocate';
import { compiledValuesOf, entryValue } from '../runtime';

/**
 * The two sides of an embedded screen agree by walking the same tree: the
 * host's reserved slots come first and carry what the host was told, and
 * the embedded screen's own entries are numbered after the marker.
 */

describe('reserved slots on the host', () => {
  const Host = (): ReturnType<typeof Panel> => Panel({
    children: [
      EmbedSlots({ count: 3, values: ['core_addon:x', '1'], onPress: () => {} }),
      Button({ onPress: () => {}, children: [Text({ children: 'MINE' })] }),
    ],
  });

  const tree = buildScreenTree(Host);
  const { entries, values } = compiledValuesOf(tree);

  it('takes the first entries, padded to the count', () => {
    expect(entries.map(entry => entry.entry)).toEqual([0, 1, 2, 3]);
    expect(values).toEqual(['core_addon:x', '1', '', 't']);
  });

  it('never presses the marker', () => {
    expect(entries[0]?.element.props.onPress).toBeUndefined();
    expect(entries[1]?.element.props.onPress).toBeTypeOf('function');
  });
});

describe('the embedded screen', () => {
  const Page = (): ReturnType<typeof Embed> => Embed({
    width: 300,
    height: 200,
    children: [Button({ onPress: () => {}, children: [Text({ children: 'CONFIG' })] })],
  });

  const tree = buildScreenTree(Page);

  it('numbers its entries from 1, leaving entry 0 to the host\'s marker', () => {
    const placement = allocate(tree);

    expect(placement.entries.map(entry => entry.entry)).toEqual([1]);
    expect(placement.size).toBe(2);
  });
});

describe('the texture carrier', () => {
  const Screen = (): ReturnType<typeof Panel> => Panel({
    children: [Image({ live: true, texture: 'textures/ui/icon', width: 16, height: 16 })],
  });

  const tree = buildScreenTree(Screen);
  const { entries } = allocate(tree);

  it('claims one entry and carries the whole path', () => {
    expect(entries).toHaveLength(1);
    expect(entries[0]?.carrier).toBe('texture');
    expect(entryValue(entries[0]!)).toBe('textures/ui/icon');
  });
});
