import type { JSX } from '../jsx';
import type { ChannelEntry } from './allocate';
import { encode } from './charset';
import { type ItemContainer, writeCell } from './items';

/**
 * Writing live values into the bank.
 *
 * A channel is a run of bank slots the layout reads and no cell draws: a
 * string rides one slot's stack size per character. The value comes off the
 * element the allocation attached to the channel, so the walk that numbered
 * the slots is the walk that fills them, and nothing is addressed by name.
 */

/** Last value written to each bank slot, so an unchanged one costs nothing. */
export type Written = Map<number, number>;

/**
 * The string a live label shows: the label's tail, less what no cell can carry.
 *
 * A formatting code has no glyph in the table, and a label guards a
 * digit-leading string with one. Dropping the pair shows the text; spending it
 * would show a blank and a letter.
 */
export const textOf = (element: JSX.Element): string => {
  const { value } = element.props;
  const tail = typeof value === 'object' && value !== null && 'tail' in value ? value.tail : undefined;

  return typeof tail === 'string' ? tail.replace(/§./g, '') : '';
};

/**
 * Writes what a render produced, skipping anything that did not move.
 *
 * Shortening a string rewrites its tail to blanks, which is the same cost as
 * any other edit: only the cells that actually changed are touched.
 */
export const writeChannels = (
  container: ItemContainer,
  channels: readonly ChannelEntry[],
  written: Written,
): void => {
  for (const channel of channels) {
    for (const [cell, code] of encode(textOf(channel.element), channel.length).entries()) {
      const slot = channel.slot + cell;

      if (written.get(slot) === code) {
        continue;
      }

      written.set(slot, code);
      writeCell(container, slot, code);
    }
  }
};
