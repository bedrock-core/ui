import { type Container as EngineContainer } from '@minecraft/server';
import { describe, expect, it } from 'vitest';
import { Container as MockContainer } from '../../../__mocks__/@minecraft/server';
import { Container } from '../../../components/Container';
import { Text } from '../../../components/Text';
import { textChannelsAt } from '../../../core/ir/text';
import { allocate } from '../allocate';
import { buildContainerTree } from '../build';
import { writeChannels, type Written } from '../runtime/channels';
import { protocolItems } from '../runtime/items';
import { TEXT_EMPTY_VALUE, TEXT_NAME_PREFIX } from '../text';

const items = protocolItems('core');
const createContainer = (): EngineContainer => new MockContainer(2) as unknown as EngineContainer;

const channelsFor = (input: string, maxLength?: number) => {
  const tree = buildContainerTree(() => Container({
    entity: 'core:test',
    children: Text({ children: input, maxLength }),
  }));

  textChannelsAt(tree, [0]);

  return allocate(tree).channels;
};

const expectValue = (container: EngineContainer, expected: string): void => {
  const item = container.getItem(1)!;

  expect(item.nameTag).toBe(TEXT_NAME_PREFIX + (expected === '' ? ' ' : expected));
  expect(items.valueOf(item)).toBe(expected === '' ? TEXT_EMPTY_VALUE : 0);
};

describe('container Text length limits', () => {
  it.each([
    { input: '123456', limit: 4, expected: '1234' },
    { input: '-123456', limit: 4, expected: '-123' },
    { input: '1234', limit: 1, expected: '1' },
    { input: '1234', limit: 0, expected: '' },
    { input: 'abcdef', limit: 4, expected: 'abcd' },
    { input: '1😀x', limit: 2, expected: '1' },
    { input: '1😀x', limit: 3, expected: '1😀' },
    { input: '1😀x', limit: 4, expected: '1😀x' },
    { input: '😀x', limit: 1, expected: '' },
    { input: '😀x', limit: 2, expected: '😀' },
    { input: 'A😀x', limit: 2, expected: 'A' },
    { input: 'A😀x', limit: 3, expected: 'A😀' },
  ])('carries $input with a $limit-unit literal limit', ({ input, limit, expected }) => {
    const container = createContainer();
    const channels = channelsFor(input, limit);

    expect(channels).toHaveLength(1);
    writeChannels(container, channels, new Map(), items);

    expectValue(container, expected);
  });

  it.each([
    { input: '1' + 'x'.repeat(127), expected: '1' + 'x'.repeat(127) },
    { input: '1' + 'x'.repeat(128), expected: '1' + 'x'.repeat(127) },
    { input: '-' + '9'.repeat(128), expected: '-' + '9'.repeat(127) },
    { input: '1' + 'x'.repeat(125) + '😀', expected: '1' + 'x'.repeat(125) + '😀' },
    { input: '1' + 'x'.repeat(126) + '😀', expected: '1' + 'x'.repeat(126) },
  ])('caps a guarded $input at the transport boundary without splitting emoji', ({ input, expected }) => {
    const container = createContainer();

    writeChannels(container, channelsFor(input, 256), new Map(), items);

    expectValue(container, expected);
  });

  it('retains the default capacity for a numeric value without maxLength', () => {
    const container = createContainer();

    writeChannels(container, channelsFor('9'.repeat(129)), new Map(), items);

    expectValue(container, '9'.repeat(128));
  });

  it('updates between numeric, emoji and empty values in the same slot', () => {
    const container = createContainer();
    const written: Written = new Map();

    for (const value of ['9999', '1😀x', '-12', '', '😀2']) {
      writeChannels(container, channelsFor(value, 4), written, items);

      expectValue(container, value);
      expect(written.get(1)).toBe(value);
    }
  });
});
