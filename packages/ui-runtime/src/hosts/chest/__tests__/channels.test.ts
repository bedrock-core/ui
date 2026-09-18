import { type Container, ItemStack } from '@minecraft/server';
import { describe, expect, it, vi } from 'vitest';
import { Container as MockContainer } from '../../../__mocks__/@minecraft/server';
import type { ChannelEntry } from '../allocate';
import { textOf, writeChannels } from '../runtime/channels';
import { CHARSET, encode } from '../charset';
import { protocolItemId } from '../contract';
import { protocolItems } from '../runtime/items';

const items = protocolItems('core');
const COUNT = protocolItemId('core', 'count');

/** The mock container, typed as the engine's: that is what it stands in for at runtime. */
const createContainer = (size: number): Container => new MockContainer(size) as unknown as Container;

const code = (glyph: string): number => CHARSET.indexOf(glyph) + 1;

const text = (tail: string, slot: number, length: number): ChannelEntry => ({
  element: { type: 'text', props: { value: { tail } } },
  slot,
  carrier: 'text',
  length,
});

const amounts = (container: Container, from: number, length: number): number[] =>
  Array.from({ length }, (_, cell) => container.getItem(from + cell)?.amount ?? 0);

describe('text encoding', () => {
  it('spends one code per cell and pads with blanks', () => {
    expect(encode('Hi', 5)).toEqual([code('H'), code('i'), 1, 1, 1]);
    expect(encode('ab', 1)).toEqual([code('a')]);
  });

  it('reads a live label off its tail, without formatting codes', () => {
    expect(textOf(text('§r42.0', 1, 4).element)).toBe('42.0');
    expect(textOf(text('§aOK§r', 1, 4).element)).toBe('OK');
    expect(textOf({ type: 'text', props: {} })).toBe('');
  });
});

describe('writeChannels', () => {
  it('writes a string as count items, one code per cell', () => {
    const container = createContainer(8);
    const written = new Map<number, number>();

    writeChannels(container, [text('Hi', 1, 5)], written, items);

    expect(amounts(container, 1, 5)).toEqual([code('H'), code('i'), 1, 1, 1]);

    const cell = container.getItem(1);

    expect(cell?.typeId).toBe(COUNT);
    expect(cell && items.valueOf(cell)).toBe(0);
  });

  it('skips every cell that did not change', () => {
    const container = createContainer(8);
    const written = new Map<number, number>();

    writeChannels(container, [text('Hello', 1, 5)], written, items);

    const setItem = vi.spyOn(container, 'setItem');
    const getSlot = vi.spyOn(container, 'getSlot');

    writeChannels(container, [text('Hello', 1, 5)], written, items);

    expect(setItem).not.toHaveBeenCalled();
    expect(getSlot).not.toHaveBeenCalled();
  });

  it('rewrites only the cells an edit touched, in place', () => {
    const container = createContainer(8);
    const written = new Map<number, number>();

    writeChannels(container, [text('Hello', 1, 5)], written, items);

    const setItem = vi.spyOn(container, 'setItem');
    const getSlot = vi.spyOn(container, 'getSlot');

    writeChannels(container, [text('He', 1, 5)], written, items);

    expect(setItem).not.toHaveBeenCalled();
    expect(getSlot).toHaveBeenCalledTimes(3);
    expect(amounts(container, 1, 5)).toEqual([code('H'), code('e'), 1, 1, 1]);
  });

  it('replaces a cell that holds something else rather than resizing it', () => {
    const container = createContainer(8);
    const written = new Map<number, number>();

    container.setItem(1, new ItemStack('minecraft:stone', 3));
    writeChannels(container, [text('A', 1, 1)], written, items);

    expect(container.getItem(1)?.typeId).toBe(COUNT);
    expect(container.getItem(1)?.amount).toBe(code('A'));
  });

  it('writes a look as one count item carrying the look as its current durability', () => {
    const container = createContainer(4);
    const written = new Map<number, number>();
    const look: ChannelEntry = { element: { type: 'panel', props: {} }, slot: 2, carrier: 'enum', length: 1, look: 5 };

    writeChannels(container, [look], written, items);

    const cell = container.getItem(2);

    expect(cell?.typeId).toBe(COUNT);
    expect(cell?.amount).toBe(1);
    expect(cell && items.valueOf(cell)).toBe(5);

    const setItem = vi.spyOn(container, 'setItem');

    writeChannels(container, [look], written, items);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('lays channels out where the allocation put them', () => {
    const container = createContainer(10);
    const written = new Map<number, number>();

    writeChannels(container, [text('ab', 3, 2), text('c', 6, 1)], written, items);

    expect(amounts(container, 3, 2)).toEqual([code('a'), code('b')]);
    expect(container.getItem(6)?.amount).toBe(code('c'));
    expect(container.getItem(7)).toBeUndefined();
  });
});
