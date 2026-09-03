import type { Player } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { isHandler, type PressEvent } from '../../core/events';
import { listCount } from '../../components/List';
import { analyze, visiblesAt } from '../../core/ir';
import type { CompiledSnapshot } from '../../core/render/screens';
import { runInteractiveCallback, type PresentResult } from '../../core/render/presenters/shared';
import type { JSX } from '../../jsx';
import { allocate, type EntryEntry } from './allocate';
import { debugDiff } from './debug';

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
/**
 * What a live `<Text>` puts on the wire, capped at the width it reserved.
 *
 * Exported because both form hosts have to agree on it: an action form carries
 * the string in an entry, a modal in a row, and a compiled control reads
 * whichever with the same binding. One definition, or they drift.
 */
export const liveText = (element: JSX.Element, length: number): string => {
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
  if (entry.carrier === 'text' && entry.length !== undefined) {
    return liveText(entry.element, entry.length);
  }

  // A carried visible and a press's enabled write the same alphabet: '0' is
  // the one value the compiled control treats as "off".
  if (entry.carrier === 'bool') {
    return entry.element.props.visible === false ? '0' : '1';
  }

  // A list's count, as decimal digits the compiled gates compare against.
  if (entry.carrier === 'int') {
    return String(listCount(entry.element) ?? 0);
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
/**
 * What a compiled screen sends: its entries in order, and the value each is
 * shown with. The whole of what presenting the screen by its title needs.
 */
export const compiledValuesOf = (tree: JSX.Element, snapshot?: CompiledSnapshot): { entries: readonly EntryEntry[]; values: string[] } => {
  // The snapshot's ordinals mark the elements the build compiled bool
  // carriers for; walking them back onto this render's tree is what keeps the
  // entry count identical to the one the layout was baked against.
  const { entries } = allocate(tree, analyze(tree, visiblesAt(tree, snapshot?.vis ?? [])));

  return { entries, values: entries.map(entryValue) };
};

/**
 * Shows the compiled screen `title` names, with `values` as its entries, and
 * resolves to what was pressed — or undefined when the form was dismissed.
 *
 * Nothing of the screen's own script is involved: the client draws the layout
 * its pack holds for that title, so a realm that has only the title and the
 * values (a guide's replicated reference) can show another addon's screen.
 */
export async function showCompiledTitle(player: Player, title: string, values: readonly string[]): Promise<number | undefined> {
  const form = new ActionFormData();

  form.title(title);

  for (const value of values) {
    form.button(value);
  }

  const response = await form.show(player);

  return response.canceled ? undefined : response.selection;
}

export async function presentCompiledForm(
  player: Player,
  tree: JSX.Element,
  title: string,
  snapshot?: CompiledSnapshot,
  debug = false,
): Promise<PresentResult> {
  if (debug && snapshot !== undefined) {
    for (const line of debugDiff(tree, snapshot, title)) {
      console.warn(line);
    }
  }

  // The snapshot's ordinals mark the elements the build compiled bool
  // carriers for; walking them back onto this render's tree is what keeps the
  // entry count identical to the one the layout was baked against.
  const { entries, values } = compiledValuesOf(tree, snapshot);
  const form = new ActionFormData();

  form.title(title);

  // Every entry is a button() call, so the collection index a control was
  // compiled with and the selection a press comes back as are the same number.

  for (const value of values) {
    form.button(value);
  }

  if (debug) {
    console.info(`[ui] ${title} entries ${JSON.stringify(values)}`);
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
