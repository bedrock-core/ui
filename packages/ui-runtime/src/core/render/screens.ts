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

/** Component -> the title its compiled layout is picked by. */
const compiled = new WeakMap<FunctionComponent, string>();

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
 */
export function registerCompiledScreen(screen: FunctionComponent, title: string): void {
  const existing = compiled.get(screen);

  if (existing !== undefined && existing !== title) {
    throw new Error(
      `A screen is already registered as "${existing}" and cannot also be "${title}". `
      + 'One component is one compiled screen; render it twice rather than compiling it twice.',
    );
  }

  compiled.set(screen, title);
}

/**
 * The title a compiled screen is shown with, or undefined when it was not
 * compiled.
 *
 * Takes `unknown` because `render()` accepts a component or an element, and
 * only one of those can have been compiled.
 */
export function compiledTitleOf(screen: unknown): string | undefined {
  return isHandler<FunctionComponent>(screen) ? compiled.get(screen) : undefined;
}
