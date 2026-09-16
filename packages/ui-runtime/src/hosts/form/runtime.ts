import type { Player } from '@minecraft/server';
import type { DisplayText } from '@bedrock-core/i18n';
import { ActionFormData } from '@minecraft/server-ui';
import { isHandler, type PressEvent } from '../../core/events';
import { embedSlotValue, isEmbedSlot } from '../../components/Embed';
import { listCount } from '../../components/List';
import { analyze, visiblesAt } from '../../core/ir';
import type { CompiledSnapshot } from '../../core/render/screens';
import { runInteractiveCallback, type PresentResult } from '../../core/render/present';
import type { JSX } from '../../jsx';
import { allocate, type EntryEntry } from './allocate';
import { COUNT_PREFIX, FLAG_OFF, FLAG_ON } from './contract';
import { debugDiff } from './debug';

/**
 * Showing a screen whose layout is already in the pack.
 *
 * What is left for the runtime once a form is compiled is almost nothing: the
 * title says which screen, each entry carries that cell's live value, and the
 * response says which entry was pressed. No payload is assembled, no geometry
 * is measured, no bytes are packed — the client already has the screen and is
 * only being told what changed.
 */

/**
 * What a live `<Text>` puts on the wire, capped at the width it reserved.
 *
 * Exported because both form hosts have to agree on it: an action form carries
 * the string in an entry, a modal in a row, and a compiled control reads
 * whichever with the same binding. One definition, or they drift.
 *
 * A KEY is never capped. `maxLength` is how many characters the reader will
 * see, and a key is not what they see — the label resolves it — so cutting it
 * to that many characters leaves a key nothing resolves, which the client then
 * paints verbatim. That is a translated name coming out as `addon.meta.na`.
 *
 * A MESSAGE travels whole for the same reason, and for one more: the client
 * resolves it in its own language before the binding sees it, so several keys —
 * a whole breadcrumb trail — ride one entry (measured, S7).
 */
export const liveText = (element: JSX.Element, length: number): DisplayText => {
  const { value, __textMetrics: metrics } = element.props;
  const tail = typeof value === 'object' && value !== null && 'tail' in value ? value.tail : undefined;
  const isKey = typeof metrics === 'object' && metrics !== null && !Array.isArray(metrics)
    && Reflect.get(metrics, 'isKey') === true;

  if (typeof tail === 'object' && tail !== null) {
    return tail;
  }

  if (typeof tail !== 'string') {
    return '';
  }

  return isKey ? tail : tail.slice(0, length);
};

/**
 * What one entry carries.
 *
 * A cell that only reports a press still needs an entry — the engine numbers
 * `response.selection` by entry, and a control with no entry cannot be
 * attributed — so it carries the one thing about a press that changes: whether
 * it may happen at all. `FLAG_OFF` is what the compiled button reads as disabled.
 */
export const entryValue = (entry: EntryEntry): DisplayText => {
  if (entry.carrier === 'text' && entry.length !== undefined) {
    return liveText(entry.element, entry.length);
  }

  // A texture path travels whole: the compiled image binds the entry's string as its texture.
  if (entry.carrier === 'texture') {
    return liveText(entry.element, Number.MAX_SAFE_INTEGER);
  }

  // A reserved slot carries whatever the host was told the embedded screen wants there.
  if (isEmbedSlot(entry.element)) {
    return embedSlotValue(entry.element);
  }

  // A carried visible and a press's enabled write the same alphabet: FLAG_OFF
  // is the one value the compiled control treats as "off".
  if (entry.carrier === 'bool') {
    return entry.element.props.visible === false ? FLAG_OFF : FLAG_ON;
  }

  // A list's count, as digits the compiled gates compare against.
  if (entry.carrier === 'int') {
    return `${COUNT_PREFIX}${String(listCount(entry.element) ?? 0)}`;
  }

  return entry.element.props.enabled === false ? FLAG_OFF : FLAG_ON;
};

/**
 * Shows a compiled screen to one player and dispatches what they pressed.
 *
 * @param player - Who the form is shown to.
 * @param tree - The built tree for this present. Walked again here, so the nth
 *   entry is the nth entry on both sides by construction.
 * @param title - The compiled title, which is how the client picks the screen.
 * @returns Whether to re-present, clean up, or do nothing — what the session's
 *   lifecycle acts on.
 */
/**
 * What a compiled screen sends: its entries in order, and the value each is
 * shown with. The whole of what presenting the screen by its title needs.
 */
export const compiledValuesOf = (tree: JSX.Element, snapshot?: CompiledSnapshot): { entries: readonly EntryEntry[]; values: DisplayText[] } => {
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
export async function showCompiledTitle(player: Player, title: string, values: readonly DisplayText[]): Promise<number | undefined> {
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
  // The value rides the entry's text; no icon is ever set.
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

    // By entry number rather than position: an embedded screen's entries start after the marker.
    const pressed = entries.find(entry => entry.entry === response.selection);
    const { onPress } = pressed?.element.props ?? {};

    if (!isHandler<(event: PressEvent) => unknown>(onPress)) {
      return 'none';
    }

    return runInteractiveCallback(player, () => onPress({ player }));
  });
}
