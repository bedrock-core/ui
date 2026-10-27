import type { JSX } from '../../../jsx';
import type { ChannelEntry } from '../allocate';
import { boundedText } from '../text';
import { type ItemContainer, type ProtocolItems, writeLook, writeText } from './items';

/** Last successfully written text or look for each occupied bank slot. */
export type Written = Map<number, number | string>;

/** The host-resolved display value carried by a container's item name. */
export const textOf = (element: JSX.Element): string => {
  const { value, __textMetrics: metrics } = element.props;
  const tail = typeof value === 'object' && value !== null && 'tail' in value ? value.tail : undefined;
  const localized = typeof metrics === 'object' && metrics !== null && 'isKey' in metrics && metrics.isKey === true;
  const resolved = typeof metrics === 'object' && metrics !== null && 'resolvedText' in metrics && typeof metrics.resolvedText === 'string'
    ? metrics.resolvedText
    : '';
  const text = localized || typeof tail !== 'string' ? resolved : tail;

  return text.replace(/^(?:\u00a7r)+/, '');
};

/** Updates changed whole-text values and look states in their allocated slots. */
export const writeChannels = (
  container: ItemContainer,
  channels: readonly ChannelEntry[],
  written: Written,
  items: ProtocolItems,
): void => {
  for (const channel of channels) {
    // A look is one slot whose current durability names it, as a button's does.
    if (channel.carrier === 'enum') {
      if (written.get(channel.slot) !== channel.look) {
        written.set(channel.slot, channel.look);
        writeLook(container, items, channel.slot, channel.look);
      }

      continue;
    }

    const value = boundedText(textOf(channel.element), channel.length);

    if (written.get(channel.slot) !== value) {
      writeText(container, items, channel.slot, value);
      written.set(channel.slot, value);
    }
  }
};
