import type { ButtonMapping } from '../../jsonui';
import type { Control, ControlEntry } from './types';

/**
 * The one mechanism a compiled screen owns outright: a look the client swaps
 * by itself.
 *
 * A toggle swaps its own content with NOTHING reaching script, on the pack's
 * own form mount and under the modification-inserted chest mount alike.
 * Everything built on it is free — a tab change, a fold, a choice
 * between options costs no press, no re-present and no payload.
 *
 * It is named for what it DOES rather than for the arrangement it happens to
 * be in. The same swap is a row of tabs, a column of radio rows, a strip of
 * segments, or a section that folds: what differs is where the looks are put
 * and what they draw, and that is the caller's, never this module's.
 *
 * Two rules are not optional:
 *
 *  - ALL EIGHT looks. The control draws the one its current state names and
 *    nothing else, so a look left undefined is a control that vanishes the
 *    moment the pointer touches it.
 *  - `toggle_on_button` / `toggle_off_button` and the button mappings, without
 *    which it draws but never takes a press.
 */

/**
 * What is drawn in each state. Only the two plain ones are required: a state
 * left out falls back to its own side's resting look, which is what a control
 * with no hover art wants.
 */
export interface SwapLooks {
  on: Control;
  onHover?: Control;
  onLocked?: Control;
  onLockedHover?: Control;
  off: Control;
  offHover?: Control;
  offLocked?: Control;
  offLockedHover?: Control;
}

export interface SwapGroup {
  /**
   * The group's name. Every swap sharing it moves together, so it carries the
   * screen's namespace: two groups on one screen must never pick each other's
   * looks, and vanilla shares a name across popups.
   */
  group: string;
  /** Which member of the group this is, when only one may be on at a time. */
  index?: number;
  /** Whether turning one on turns the rest off. */
  exclusive?: boolean;
  /** Which state the build rendered with. */
  on?: boolean;
}

const MAPPINGS: readonly ButtonMapping[] = [
  { from_button_id: 'button.menu_select', to_button_id: 'button.menu_select', mapping_type: 'pressed' },
  { from_button_id: 'button.menu_ok', to_button_id: 'button.menu_ok', mapping_type: 'focused' },
];

/** Every look, under the name the control's `*_control` properties expect. */
const looksOf = (looks: SwapLooks): ControlEntry[] => [
  { checked: looks.on },
  { checked_hover: looks.onHover ?? looks.on },
  { checked_locked: looks.onLocked ?? looks.on },
  { checked_locked_hover: looks.onLockedHover ?? looks.on },
  { unchecked: looks.off },
  { unchecked_hover: looks.offHover ?? looks.off },
  { unchecked_locked: looks.offLocked ?? looks.off },
  { unchecked_locked_hover: looks.offLockedHover ?? looks.off },
];

/** The eight `*_control` properties, which are the same every time. */
const LOOK_CONTROLS = {
  checked_control: 'checked',
  unchecked_control: 'unchecked',
  checked_hover_control: 'checked_hover',
  unchecked_hover_control: 'unchecked_hover',
  checked_locked_control: 'checked_locked',
  unchecked_locked_control: 'unchecked_locked',
  checked_locked_hover_control: 'checked_locked_hover',
  unchecked_locked_hover_control: 'unchecked_locked_hover',
} as const;

/**
 * A control that swaps between the looks it is given.
 *
 * The looks arrive already drawn, which is what makes everything above this
 * customisable: what a tab, a fold or an option looks like is the author's,
 * and only the swapping is the engine's.
 */
export const swap = (group: SwapGroup, looks: SwapLooks, geometry: Control): Control => ({
  type: 'toggle',
  ...geometry,
  sound_name: 'random.click',
  sound_volume: 1,
  sound_pitch: 1,
  focus_enabled: true,
  focus_magnet_enabled: true,
  default_focus_precedence: 0,
  toggle_name: group.group,
  toggle_default_state: group.on ?? false,
  ...group.exclusive === true
    ? {
        radio_toggle_group: true,
        toggle_group_forced_index: group.index ?? 0,
        toggle_group_default_selected: 0,
        enable_directional_toggling: false,
      }
    : {},
  toggle_on_button: 'toggle.toggle_on',
  toggle_off_button: 'toggle.toggle_off',
  button_mappings: [...MAPPINGS],
  controls: looksOf(looks),
  ...LOOK_CONTROLS,
});

/**
 * A control shown while a swap is on.
 *
 * The one place something reads a swap back rather than nesting inside it: a
 * fold's rows have to reflow what is under them, and content nested in a look
 * cannot. The seed keeps it from flashing before the first binding resolves.
 *
 * The lookup is SCREEN-WIDE, which is what the swap's name is qualified for.
 * Restricting it to siblings is what a hand-built fold could afford, because
 * it put the toggle and the rows in one stack itself; a swap and its follower
 * pass through whatever the layout put between them — a stack wraps every
 * child in a row of its own pitch — so by the time they are drawn the two are
 * cousins, and a sibling lookup cannot see across. An unresolved name is an
 * assertion in the client, not a control that quietly fails to fold.
 */
export const shownWhileOn = (swapName: string, on: boolean, control: Control): Control => ({
  ...control,
  visible: '#visible',
  property_bag: { '#visible': on },
  bindings: [
    {
      binding_type: 'view',
      source_control_name: swapName,
      source_property_name: '#toggle_state',
      target_property_name: '#visible',
    },
  ],
});
