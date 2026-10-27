import { textChannelsAt } from '../../../core/ir/text';
import { describe, expect, it } from 'vitest';
import { Button } from '../../../components/Button';
import { Container } from '../../../components/Container';
import { Image } from '../../../components/Image';
import { Panel } from '../../../components/Panel';
import { PlayerInventory } from '../../../components/Inventory';
import { Slot } from '../../../components/Slot';
import { SlotGrid } from '../../../components/SlotGrid';
import { Text } from '../../../components/Text';
import { useExit, useState } from '../../../hooks';
import type { JSX } from '../../../jsx';
import { probeLiveness } from '../../../core/ir/probe';
import { allocate } from '../allocate';
import { buildContainerTree, buildScreenOnce } from '../build';

/** Every cell and channel kind, interleaved so the order is what is tested. */
const Screen = (): JSX.Element => Container({
  entity: 'core:test',
  children: [
    Panel({
      flexDirection: 'row',
      children: [
        Button({ children: Text({ children: 'go' }) }),
        Slot({ role: 'input' }),
        Slot({}),
      ],
    }),
    Text({ children: 'static' }),
    Text({ maxLength: 5, children: 'live' }),
    Image({}),
    Slot({ role: 'output' }),
  ],
});

const channelTree = (factory: () => JSX.Element): JSX.Element => {
  const tree = buildContainerTree(factory);
  textChannelsAt(tree, [1]);
  return tree;
};

describe('allocate', () => {
  it('numbers drawn cells after the sentinel, in document order', () => {
    const { sentinels, slots } = allocate(channelTree(Screen));

    expect(sentinels).toEqual([0]);
    expect(slots.map(({ slot, role }) => [slot, role])).toEqual([
      [1, 'button'],
      [2, 'input'],
      [3, 'both'],
      [4, 'output'],
    ]);
  });

  it('puts channels in the bank past the drawn range, one slot per value', () => {
    const { channels, size } = allocate(channelTree(Screen));

    expect(channels.map(({ slot, carrier, length }) => [slot, carrier, length])).toEqual([
      [5, 'text', 5],
    ]);
    expect(size).toBe(6);
  });

  it('keeps one slot per detected field and caps the transport independently of maxLength', () => {
    const screen = (): JSX.Element => Container({ entity: 'core:test',
      children: [Text({ children: 'one' }), Text({ maxLength: 256, children: 'two' })] });
    const tree = buildContainerTree(screen);
    textChannelsAt(tree, [0, 1]);
    const allocation = allocate(tree);

    expect(allocation.size).toBe(3);
    expect(allocation.channels.map(channel => [channel.slot, channel.length])).toEqual([[1, 128], [2, 128]]);
  });

  it('keeps every entry attached to its element', () => {
    const { slots, channels } = allocate(channelTree(Screen));

    for (const { element } of [...slots, ...channels]) {
      expect(typeof element.type).toBe('string');
    }

    expect(slots[0]?.element.type).toBe('button');
    expect(channels[0]?.element.type).toBe('text');
  });

  it('gives a close button no slot: the client closes the screen', () => {
    const Closable = (): JSX.Element => {
      const exit = useExit();

      return Container({
        entity: 'core:test',
        children: [
          Button({ onPress: exit, children: Text({ children: 'x' }) }),
          Button({ onPress: () => undefined, children: Text({ children: 'go' }) }),
        ],
      });
    };
    const { slots } = allocate(buildContainerTree(Closable));

    expect(slots.map(({ slot, role }) => [slot, role])).toEqual([[1, 'button']]);
  });

  it('skips foreign slots and grids: they read a collection the screen does not own', () => {
    const Screen = (): JSX.Element => Container({
      entity: 'core:test',
      children: [
        Slot({}),
        Slot({ collection: 'inventory_items', index: 3 }),
        SlotGrid({ collection: 'inventory_items', columns: 9, rows: 3 }),
        PlayerInventory({}),
        Slot({ role: 'output' }),
      ],
    });
    const { slots, size } = allocate(channelTree(Screen));

    // Only the two OWN slots are numbered; the foreign slot, the grid and the
    // PlayerInventory wrapper over it take no cell of the screen's container.
    expect(slots.map(({ slot, role }) => [slot, role])).toEqual([[1, 'both'], [2, 'output']]);
    expect(size).toBe(3);
  });

  it('allocates only the sentinel for a screen with nothing live', () => {
    const Static = (): JSX.Element => Container({
      entity: 'core:test',
      children: [Text({ children: 'title' }), Image({})],
    });

    expect(allocate(buildContainerTree(Static))).toEqual({ sentinels: [0], slots: [], channels: [], size: 1 });
  });

  it('is deterministic across builds of the same screen', () => {
    const first = allocate(channelTree(Screen));
    const second = allocate(channelTree(Screen));

    expect(second.slots.map(entry => entry.slot)).toEqual(first.slots.map(entry => entry.slot));
    expect(second.channels.map(entry => entry.slot)).toEqual(first.channels.map(entry => entry.slot));
  });

  it('says which look a button wears, by the row of the build\'s table this render matches', () => {
    const Toggling = (initial: boolean) => (): JSX.Element => {
      const [on] = useState(initial);

      return Container({ entity: 'core:test', children: Button({ background: on ? 'textures/ui/on' : 'textures/ui/off' }) });
    };
    const { variants } = probeLiveness(() => buildScreenOnce(Toggling(true)));

    expect(allocate(buildContainerTree(Toggling(true)), undefined, variants).slots[0]?.look).toBe(0);
    expect(allocate(buildContainerTree(Toggling(false)), undefined, variants).slots[0]?.look).toBe(1);
    // With no tables the button is drawn one way, and says nothing.
    expect(allocate(buildContainerTree(Toggling(true))).slots[0]?.look).toBeUndefined();
  });

  it('gives any other element\'s look a bank slot of its own', () => {
    const Painted = (initial: boolean) => (): JSX.Element => {
      const [on] = useState(initial);

      return Container({ entity: 'core:test', children: Panel({ background: on ? 'textures/ui/on' : 'textures/ui/off' }) });
    };
    const { variants } = probeLiveness(() => buildScreenOnce(Painted(true)));
    const built = allocate(buildContainerTree(Painted(true)), undefined, variants);

    expect(built.channels).toMatchObject([{ carrier: 'enum', slot: 1, length: 1, look: 0 }]);
    expect(built.size).toBe(2);
    expect(allocate(buildContainerTree(Painted(false)), undefined, variants).channels).toMatchObject([{ look: 1 }]);
  });
});

