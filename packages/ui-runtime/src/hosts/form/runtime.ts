import type { Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { isHandler, type PressEvent } from '../../core/events';
import { runInteractiveCallback, type PresentResult } from '../../core/render/presenters/shared';
import type { JSX } from '../../jsx';
import { allocate, type EntryEntry } from './allocate';

/**
 * Showing a screen whose layout is already in the pack.
 *
 * What is left for the runtime once a form is compiled is almost nothing: the
 * title says which screen, each entry carries that cell's live value, and the
 * response says which entry was pressed. No payload is assembled, no geometry
 * is measured, no bytes are packed — the client already has the screen and is
 * only being told what changed.
 *
 * Set that against the interpreter it replaces, which serializes every
 * element's props into a byte-addressed string on every present and ships the
 * whole layout each time. Both write `form_buttons`; only one of them is
 * describing a screen the client has never seen.
 */

/** The string a live `<Text>` shows, exactly as written — a form entry has no alphabet to lose. */
const liveText = (element: JSX.Element, length: number): string => {
  const { value } = element.props;
  const tail = typeof value === 'object' && value !== null && 'tail' in value ? value.tail : undefined;

  return typeof tail === 'string' ? tail.slice(0, length) : '';
};

/**
 * What one entry carries.
 *
 * A cell that only reports a press still needs an entry — the engine numbers
 * `response.selection` by entry, and a control with no entry cannot be
 * attributed — so it carries the one thing about a press that changes: whether
 * it may happen at all. `'0'` is what the compiled button reads as disabled.
 */
export const entryValue = (entry: EntryEntry): string => {
  if (entry.length !== undefined) {
    return liveText(entry.element, entry.length);
  }

  return entry.element.props.enabled === false ? '0' : '1';
};

/**
 * Shows a compiled screen to one player and dispatches what they pressed.
 *
 * @param player - Who the form is shown to.
 * @param tree - The built tree for this present. Walked again here, so the nth
 *   entry is the nth entry on both sides by construction.
 * @param title - The compiled title, which is how the client picks the screen.
 * @returns Whether to re-present, clean up, or do nothing — the same outcomes
 *   the interpreter's presenters return, so the lifecycle is unchanged.
 */
export async function presentCompiledForm(
  player: Player,
  tree: JSX.Element,
  title: string,
): Promise<PresentResult> {
  const { entries } = allocate(tree);
  const form = new ActionFormData();

  form.title(title);

  // Every entry is a button() call, so the collection index a control was
  // compiled with and the selection a press comes back as are the same number.
  for (const entry of entries) {
    form.button(entryValue(entry));
  }

  return form.show(player).then((response) => {
    if (response.canceled) {
      return 'cleanup';
    }

    const pressed = response.selection === undefined ? undefined : entries[response.selection];
    const { onPress } = pressed?.element.props ?? {};

    if (!isHandler<(event: PressEvent) => unknown>(onPress)) {
      return 'none';
    }

    return runInteractiveCallback(player, () => onPress({ player }));
  });
}
