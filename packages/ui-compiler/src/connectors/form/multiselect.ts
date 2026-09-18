import { FULL, topLeft } from '../../faces';
import { MODAL_COLLECTION, placed } from './entry';
import { optionStates, type SelectOption } from './select';
import { TOGGLE_ROW } from './widget';
import { pinnedEnabled } from '../../nodes/utils/fields';
import type { Connector, ControlEntry } from '../types';

export interface MultiSelect {
  name: string;
  /** The row the first option answers in; option `m` answers `m` rows after it. */
  address: number;
  /** Whether the options take input; a disabled chooser pins every option. */
  enabled: boolean;
  options: readonly SelectOption[];
}

/**
 * A chooser that takes any number, with every option placed by the build.
 *
 * Each option is a native toggle of its own, so each owns a `custom_form` row
 * and needs no dropdown to answer through: the index host names the row, and
 * the engine's toggle under it wears the four looks the build drew for that
 * option. They are the same looks a single choice's options wear, which is
 * what keeps the two from ever looking different.
 *
 * The rows are contiguous because the runtime allocates them in option order,
 * so an option's row is the first row plus its index.
 */
export const multiSelect: Connector<MultiSelect> = (data, face) => ({
  [data.name]: {
    type: 'panel',
    ...placed(face),
    controls: data.options.map((option, member): ControlEntry => ({
      [`option_${String(member)}`]: {
        type: 'stack_panel',
        orientation: 'vertical',
        size: [option.rect.width, option.rect.height],
        offset: [option.rect.x, option.rect.y],
        ...topLeft,
        collection_name: MODAL_COLLECTION,
        controls: [{
          [`toggle@${TOGGLE_ROW}`]: {
            collection_index: data.address + member,
            size: FULL,
            ...pinnedEnabled(data),
            controls: optionStates(option),
          },
        }],
      },
    })),
  },
});
