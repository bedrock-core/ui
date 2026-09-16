import type { DisplayText } from '@bedrock-core/i18n';
import type { FunctionComponent } from '../../jsx';
import { isHandler } from '../events';

/**
 * Which screens the build compiled, and what to show them with.
 *
 * A compiled screen's layout is already in the addon's pack; the only thing
 * the runtime needs is the title, because that is how the client picks the
 * layout out. Everything else it re-derives from the tree, the same walk the
 * build ran.
 *
 * ## Why the component itself is the key
 *
 * The build knows a screen by its file; the runtime knows it by the function
 * `render()` was handed. Nothing carries a name between the two on its own,
 * and the ways to invent one are all worse than this: a function's `.name`
 * does not survive a bundler faithfully, a string the author repeats at the
 * call site is a second place for the truth to live, and rewriting the
 * author's module to stamp a name into it is a build editing source it does
 * not own.
 *
 * So the build generates one module that imports each screen and registers it
 * — the same shape as the i18n and guides bundles this library already
 * generates — and the addon imports that module once. The association is by
 * component identity, which is exactly what `render()` has in its hand.
 *
 * A screen that is NOT registered cannot be drawn at all: nothing in the pack
 * answers to its title. `render()` refuses it by name, pointing at the two
 * things that produce a registration — the compile seeing the screen, and the
 * generated module being imported so its registrations run.
 */

/**
 * What the build baked, alongside the layout it wrote into the pack.
 *
 * Two consumers, one record. `vis` is load-bearing: it is how the runtime
 * marks the same elements the build compiled bool carriers for — the ordinals
 * are positions in the shared visible walk, stable because the shape is
 * frozen. `shape` and `baked` serve `debug`: a render that disagrees with
 * either is an inference miss the build could not see, reported instead of
 * silently drawn wrong.
 */
export interface CompiledSnapshot {
  /** The claim shape the build compiled, as the probe's one-line fingerprint. */
  readonly shape: string;
  /** Every baked `<Text>` string, in document order. */
  readonly baked: readonly string[];
  /** Ordinals of the elements whose `visible` is carried. */
  readonly vis: readonly number[];
}

/**
 * What the build recorded about one compiled screen.
 *
 * The KEY is how anything outside this bundle names the screen: `<addon>:<name>`,
 * the addon's namespace and the screen's own, which is what `<Link to>` is
 * written with and what a replicated reference is looked up by. The TITLE is how
 * the CLIENT names it, and carries the same two halves joined the JSON UI way.
 * Both are the build's; nothing derives one from the other, because an addon
 * namespace may itself contain the separator.
 */
export interface CompiledScreen {
  /** `<addon>:<name>` — the screen's public key. */
  readonly key: string;
  /** The compiled title the client picks the layout by. */
  readonly title: string;
  /** What the build baked: carried-visible ordinals, shape fingerprint, strings. */
  readonly snapshot?: CompiledSnapshot;
}

/** Component -> the title its compiled layout is picked by, and what was baked. */
const compiled = new WeakMap<FunctionComponent, CompiledScreen>();

/** Key -> the screen it names, for everything that navigates by key. */
const byKey = new Map<string, { readonly screen: FunctionComponent; readonly record: CompiledScreen }>();

/**
 * Key -> the whole of what showing that screen needs, for a screen that has no
 * component here at all.
 *
 * A screen with nothing live — every string baked, every press a link — is
 * shown from what the build knew: the title, the values and the targets. So the
 * addon ships the table instead of the components, and this is where the build's
 * generated module puts it. The same table is what the addon publishes for other
 * realms, which is why showing one's own static screen and showing somebody
 * else's are one code path.
 */
const statics = new Map<string, StaticScreenRecord>();

/** One static screen as the build described it. */
export interface StaticScreenRecord {
  readonly key: string;
  readonly title: string;
  readonly values: readonly DisplayText[];
  readonly targets: readonly ({ readonly to: string } | { readonly back: true } | null)[];
}

/**
 * Records that a screen was compiled, and what title reaches its layout.
 *
 * Called by the module the build generates, never by hand. Registering the
 * same component twice with different titles is a build that produced two
 * layouts for one screen, so the last one would silently win — it throws
 * instead.
 *
 * @param screen - The screen component, exactly as the addon renders it.
 * @param record - The key it is navigated by, the title it is drawn by, and
 *   what the build baked: the carried-visible ordinals the runtime re-marks,
 *   and the shape and text a `debug` render is diffed against.
 */
export function registerCompiledScreen(screen: FunctionComponent, record: CompiledScreen): void {
  const existing = compiled.get(screen);

  if (existing !== undefined && existing.title !== record.title) {
    throw new Error(
      `A screen is already registered as "${existing.title}" and cannot also be "${record.title}". `
      + 'One component is one compiled screen; render it twice rather than compiling it twice.',
    );
  }

  compiled.set(screen, record);
  byKey.set(record.key, { screen, record });
}

/** The key a compiled screen is navigated by, or undefined when it was not compiled. */
export function compiledKeyOf(screen: unknown): string | undefined {
  const component = componentOf(screen);

  return component === undefined ? undefined : compiled.get(component)?.key;
}

/**
 * The screen `key` names in THIS bundle, or undefined when no such screen was
 * registered.
 *
 * A key with no `<addon>:` in front of it is one of this bundle's own, named the
 * way its file is — which is how a screen links to a sibling without repeating
 * the namespace it does not choose. A published reference carries the addon half
 * filled in, because a realm reading one has no bundle to resolve it against.
 */
export function screenForKey(key: string): FunctionComponent | undefined {
  const direct = byKey.get(key);

  if (direct !== undefined) {
    return direct.screen;
  }

  if (key.includes(':')) {
    return undefined;
  }

  for (const [registered, entry] of byKey) {
    if (registered.slice(registered.indexOf(':') + 1) === key) {
      return entry.screen;
    }
  }

  return undefined;
}

/** Every compiled screen this bundle registered, in registration order. */
export function compiledScreens(): readonly CompiledScreen[] {
  return [...byKey.values()].map(entry => entry.record);
}

/**
 * Records the screens the build described in full, which ship as data rather
 * than as components.
 *
 * Called by the generated module with the table it baked. Registering the same
 * key twice replaces it, since the table is one artifact rewritten per build.
 */
export function registerStaticScreens(table: Iterable<StaticScreenRecord>): void {
  for (const record of table) {
    statics.set(record.key, record);
  }
}

/** What `key` needs in order to be shown, when this bundle carries no component for it. */
export function staticScreen(key: string): StaticScreenRecord | undefined {
  const direct = statics.get(key);

  if (direct !== undefined || key.includes(':')) {
    return direct;
  }

  for (const [registered, record] of statics) {
    if (registered.slice(registered.indexOf(':') + 1) === key) {
      return record;
    }
  }

  return undefined;
}

/** Every static screen this bundle carries, which is what it publishes for other realms. */
export function staticScreens(): readonly StaticScreenRecord[] {
  return [...statics.values()];
}

/**
 * The title a compiled screen is shown with, or undefined when it was not
 * compiled.
 *
 * Takes `unknown` because `render()` accepts a component or an element, and
 * only one of those can have been compiled.
 */
/**
 * The registered component behind what `render()` was handed: the component
 * itself, or an element rendering it — a compiled screen takes props that way
 * (a generic screen filled per present), since its shape does not depend on
 * them.
 */
const componentOf = (screen: unknown): FunctionComponent | undefined => {
  if (isHandler<FunctionComponent>(screen)) {
    return screen;
  }

  if (typeof screen === 'object' && screen !== null && 'type' in screen && isHandler<FunctionComponent>(screen.type)) {
    return screen.type;
  }

  return undefined;
};

export function compiledTitleOf(screen: unknown): string | undefined {
  const component = componentOf(screen);

  return component === undefined ? undefined : compiled.get(component)?.title;
}

/** What the build baked for a compiled screen, when its build recorded it. */
export function compiledSnapshotOf(screen: unknown): CompiledSnapshot | undefined {
  const component = componentOf(screen);

  return component === undefined ? undefined : compiled.get(component)?.snapshot;
}
