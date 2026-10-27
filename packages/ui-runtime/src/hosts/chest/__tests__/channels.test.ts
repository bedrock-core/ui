import { type Container, ItemStack } from '@minecraft/server';
import { describe, expect, it, vi } from 'vitest';
import { Container as MockContainer } from '../../../__mocks__/@minecraft/server';
import type { ChannelEntry } from '../allocate';
import { textOf, writeChannels, type Written } from '../runtime/channels';
import { TEXT_EMPTY_VALUE } from '../text';
import { protocolItemId } from '../contract';
import { protocolItems } from '../runtime/items';
import { CONTAINER_TEXT_LIMIT, TEXT_NAME_PREFIX } from '../text';

const items = protocolItems('core');
const COUNT = protocolItemId('core', 'count');
const createContainer = (size: number): Container => new MockContainer(size) as unknown as Container;
const text = (tail: string, slot = 1, length = 128): ChannelEntry => ({
  element: { type: 'text', props: { value: { tail } } }, slot, carrier: 'text', length,
});
const shown = (container: Container, slot = 1): string =>
  container.getItem(slot)?.nameTag?.slice(TEXT_NAME_PREFIX.length) ?? '';

describe('whole-value container text', () => {
  it('holds 128 characters in one occupied bank slot', () => {
    const container = createContainer(4);
    const value = 'ABCD0123'.repeat(16);

    writeChannels(container, [text(value)], new Map(), items);

    expect(shown(container)).toBe(value);
    expect(container.getItem(1)?.typeId).toBe(COUNT);
    expect(container.getItem(1)?.amount).toBe(1);
    expect(container.getItem(2)).toBeUndefined();
  });

  it.each(['12345', '6', 'A B', ' A B ', '## %s =', 'Espa\u00f1a: \u00bfS\u00ed?'])('updates %j in place without losing symbols or spaces', (value) => {
    const container = createContainer(4);
    const written: Written = new Map();

    writeChannels(container, [text('initial')], written, items);
    const setItem = vi.spyOn(container, 'setItem');

    writeChannels(container, [text(value)], written, items);

    expect(shown(container)).toBe(value);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('does not touch an unchanged value, including an unchanged empty value', () => {
    const container = createContainer(4);
    const written: Written = new Map();

    for (const value of ['unchanged', '']) {
      writeChannels(container, [text(value)], written, items);
      const setItem = vi.spyOn(container, 'setItem');
      const getSlot = vi.spyOn(container, 'getSlot');

      writeChannels(container, [text(value)], written, items);
      expect(setItem).not.toHaveBeenCalled();
      expect(getSlot).not.toHaveBeenCalled();
      setItem.mockRestore();
      getSlot.mockRestore();
    }
  });

  it('keeps empty text occupied and hidden while a real space stays visible', () => {
    const container = createContainer(4);
    const written: Written = new Map();

    writeChannels(container, [text('')], written, items);
    expect(items.valueOf(container.getItem(1)!)).toBe(TEXT_EMPTY_VALUE);
    expect(container.getItem(1)?.amount).toBe(1);
    writeChannels(container, [text(' ')], written, items);
    expect(items.valueOf(container.getItem(1)!)).toBe(0);
    expect(shown(container)).toBe(' ');
    writeChannels(container, [text('restored')], written, items);
    expect(shown(container)).toBe('restored');
  });

  it('bounds the payload and does not split surrogate pairs', () => {
    const container = createContainer(4);
    const written: Written = new Map();

    writeChannels(container, [text('x'.repeat(129))], written, items);
    expect(shown(container)).toHaveLength(CONTAINER_TEXT_LIMIT);
    writeChannels(container, [text('x'.repeat(127) + '\ud83d\ude00')], written, items);
    expect(shown(container)).toBe('x'.repeat(127));
    writeChannels(container, [text('abcdef', 1, 3)], written, items);
    expect(shown(container)).toBe('abc');
  });

  it('carries host-resolved translations and messages rather than their keys', () => {
    const container = createContainer(4);
    const channel = text('addon.display.name');
    channel.element.props.__textMetrics = { isKey: true, resolvedText: 'Nombre' };
    writeChannels(container, [channel], new Map(), items);
    expect(shown(container)).toBe('Nombre');

    channel.element.props.value = { tail: { translate: 'addon.greeting', with: ['Alex'] } };
    channel.element.props.__textMetrics = { isKey: true, resolvedText: 'Hola Alex' };
    writeChannels(container, [channel], new Map(), items);
    expect(shown(container)).toBe('Hola Alex');
  });

  it('replaces a foreign item without rewriting neighbouring slots', () => {
    const container = createContainer(4);

    container.setItem(1, new ItemStack('minecraft:stone', 3));
    container.setItem(2, new ItemStack('minecraft:dirt', 7));
    writeChannels(container, [text('value')], new Map(), items);
    expect(shown(container)).toBe('value');
    expect(container.getItem(2)?.typeId).toBe('minecraft:dirt');
    expect(container.getItem(2)?.amount).toBe(7);
  });

  it('keeps separately allocated text and enum values independent', () => {
    const container = createContainer(5);
    const written: Written = new Map();
    const look: ChannelEntry = { element: { type: 'panel', props: {} }, slot: 3, carrier: 'enum', length: 1, look: 5 };

    writeChannels(container, [text('first', 1), text('second', 2), look], written, items);
    expect(shown(container, 1)).toBe('first');
    expect(shown(container, 2)).toBe('second');
    expect(items.valueOf(container.getItem(3)!)).toBe(5);
    const setItem = vi.spyOn(container, 'setItem');

    writeChannels(container, [text('first', 1), text('second', 2), look], written, items);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('removes the leading reset guard while preserving authored formatting', () => {
    expect(textOf(text('\u00a7r42.0').element)).toBe('42.0');
    expect(textOf(text('\u00a7aOK\u00a7r').element)).toBe('\u00a7aOK\u00a7r');
    expect(textOf({ type: 'text', props: {} })).toBe('');
  });
});
