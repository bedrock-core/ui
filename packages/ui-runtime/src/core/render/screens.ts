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
 * A screen that is NOT registered renders through the interpreter, which is
 * what makes this additive: an addon built before compiled screens existed,
 * or one whose build has not run, keeps working unchanged.
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

interface CompiledRecord {
  readonly title: string;
  readonly snapshot?: CompiledSnapshot;
}

/** Component -> the title its compiled layout is picked by, and what was baked. */
const compiled = new WeakMap<FunctionComponent, CompiledRecord>();

/**
 * Records that a screen was compiled, and what title reaches its layout.
 *
 * Called by the module the build generates, never by hand. Registering the
 * same component twice with different titles is a build that produced two
 * layouts for one screen, so the last one would silently win — it throws
 * instead.
 *
 * @param screen - The screen component, exactly as the addon renders it.
 * @param title - The compiled title, from the build.
 * @param snapshot - What the build baked: the carried-visible ordinals the
 *   runtime needs, and the shape and text `debug` diffs against. A build old
 *   enough to omit it compiled no bool carriers, so the absence is consistent.
 */
export function registerCompiledScreen(screen: FunctionComponent, title: string, snapshot?: CompiledSnapshot): void {
  const existing = compiled.get(screen);

  if (existing !== undefined && existing.title !== title) {
    throw new Error(
      `A screen is already registered as "${existing.title}" and cannot also be "${title}". `
      + 'One component is one compiled screen; render it twice rather than compiling it twice.',
    );
  }

  compiled.set(screen, { title, ...snapshot === undefined ? {} : { snapshot } });
}

/**
 * The title a compiled screen is shown with, or undefined when it was not
 * compiled.
 *
 * Takes `unknown` because `render()` accepts a component or an element, and
 * only one of those can have been compiled.
 */
export function compiledTitleOf(screen: unknown): string | undefined {
  return isHandler<FunctionComponent>(screen) ? compiled.get(screen)?.title : undefined;
}

/** What the build baked for a compiled screen, when its build recorded it. */
export function compiledSnapshotOf(screen: unknown): CompiledSnapshot | undefined {
  return isHandler<FunctionComponent>(screen) ? compiled.get(screen)?.snapshot : undefined;
}
