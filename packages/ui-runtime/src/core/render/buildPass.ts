/**
 * What a build render knows that a player's render does not.
 *
 * A compiled screen is laid out once, for everyone, but a client draws a key in
 * its own language. Text whose SHAPE depends on what it says in each language —
 * a paragraph broken into lines, a trail collapsed to fit — can only be composed
 * by the build, from every language's strings and the width the layout gave it.
 * The strings are registered once per build; the widths are read back from the
 * layout and handed to the next pass of the same render.
 */

/** Every language the pack ships, as the build read its `.lang` files. */
export interface BuildLocales {
  /** The language a layout is measured in, and the one a client missing a key falls back to. */
  readonly defaultLocale: string;
  /** Each language's strings, by key. */
  readonly tables: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

let locales: BuildLocales | undefined;

/**
 * Registers the languages the pack ships, for every build render after it. Undefined clears them:
 * a render without them composes nothing per language and never asks for a second pass.
 */
export function setBuildLocales(value: BuildLocales | undefined): void {
  locales = value;
}

/** The languages the pack ships, while a build has registered them. */
export function buildLocales(): BuildLocales | undefined {
  return locales;
}

/**
 * A translated text as the build laid it out, for a render at runtime to draw
 * the same pieces in the same order: by the slot it rendered in, each line's
 * pieces as the components they sit inside and the default language's string.
 */
export interface ComposedRecord {
  readonly s: number;
  readonly l: readonly (readonly { readonly c: readonly string[]; readonly v: string }[])[];
}

/** The widths one render's composing boxes were laid out at, by the order they rendered in. */
interface WidthRound {
  readonly widths: Map<number, number>;
  readonly recorded: ReadonlyMap<number, ComposedRecord>;
  next: number;
  changed: boolean;
}

let round: WidthRound | undefined;

/**
 * Starts one pass of a render, over the widths the passes before it recorded, and the layouts the
 * build recorded for the screen when it is rendered at runtime.
 */
export function beginWidthRound(widths: Map<number, number>, recorded: readonly ComposedRecord[] = []): void {
  round = { widths, recorded: new Map(recorded.map(record => [record.s, record])), next: 0, changed: false };
}

/** Ends a pass. Returns whether it laid a composing box out at a width the pass before it had not. */
export function endWidthRound(): boolean {
  const changed = round?.changed ?? false;

  round = undefined;

  return changed;
}

/**
 * The next composing box of this pass: the slot it renders in, the width the previous pass laid it
 * out at when the build knows the pack's languages, and the layout the build recorded for it when
 * a compiled screen is rendered at runtime. Slots are counted the same way on both, so a runtime
 * render finds what the build recorded. Undefined outside a render.
 */
export function takeWidthSlot(): { slot: number; width: number | undefined; recorded: ComposedRecord | undefined } | undefined {
  if (round === undefined) {
    return undefined;
  }

  const slot = round.next;

  round.next += 1;

  return { slot, width: locales === undefined ? undefined : round.widths.get(slot), recorded: round.recorded.get(slot) };
}

/** Records the width the layout gave a composing box. */
export function recordWidth(slot: number, width: number): void {
  if (round === undefined || locales === undefined) {
    return;
  }

  if (round.widths.get(slot) !== width) {
    round.widths.set(slot, width);
    round.changed = true;
  }
}
