import { describe, expect, it } from 'vitest';
import { Button } from '../../components/Button';
import { Container } from '../../components/Container';
import { Image } from '../../components/Image';
import { Panel } from '../../components/Panel';
import { PlayerInventory } from '../../components/Inventory';
import { Slot } from '../../components/Slot';
import { SlotGrid } from '../../components/SlotGrid';
import { Text } from '../../components/Text';
import { useExit } from '../../hooks';
import type { JSX } from '../../jsx';
import { allocate } from '../allocate';
import { buildContainerTree } from '../build';

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

describe('allocate', () => {
  it('numbers drawn cells after the sentinel, in document order', () => {
    const { sentinels, slots } = allocate(buildContainerTree(Screen));

    expect(sentinels).toEqual([0, 1]);
    expect(slots.map(({ slot, role }) => [slot, role])).toEqual([
      [2, 'button'],
      [3, 'input'],
      [4, 'both'],
      [5, 'output'],
    ]);
  });

  it('puts channels in the bank past the drawn range, a slot per cell', () => {
    const { channels, size } = allocate(buildContainerTree(Screen));

    expect(channels.map(({ slot, carrier, length }) => [slot, carrier, length])).toEqual([
      [6, 'text', 5],
    ]);
    expect(size).toBe(11);
  });

  it('keeps every entry attached to its element', () => {
    const { slots, channels } = allocate(buildContainerTree(Screen));

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

    expect(slots.map(({ slot, role }) => [slot, role])).toEqual([[2, 'button']]);
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
    const { slots, size } = allocate(buildContainerTree(Screen));

    // Only the two OWN slots are numbered; the foreign slot, the grid and the
    // PlayerInventory wrapper over it take no cell of the screen's container.
    expect(slots.map(({ slot, role }) => [slot, role])).toEqual([[2, 'both'], [3, 'output']]);
    expect(size).toBe(4);
  });

  it('allocates only the sentinel for a screen with nothing live', () => {
    const Static = (): JSX.Element => Container({
      entity: 'core:test',
      children: [Text({ children: 'title' }), Image({})],
    });

    expect(allocate(buildContainerTree(Static))).toEqual({ sentinels: [0, 1], slots: [], channels: [], size: 2 });
  });

  it('is deterministic across builds of the same screen', () => {
    const first = allocate(buildContainerTree(Screen));
    const second = allocate(buildContainerTree(Screen));

    expect(second.slots.map(entry => entry.slot)).toEqual(first.slots.map(entry => entry.slot));
    expect(second.channels.map(entry => entry.slot)).toEqual(first.channels.map(entry => entry.slot));
  });
});
