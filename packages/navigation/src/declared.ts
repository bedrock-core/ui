/**
 * What the build declared on the addon's behalf.
 *
 * An addon says everything about itself once, in `core.register()`. Some of what the UI needs
 * follows from that and from what the build made of it — the page drawn from the manifest — so
 * the build hands it over here and the realm publishes it on the first tick. None of it is worth
 * an addon repeating.
 *
 * The addon's strings are not here: `register()` publishes the bundle its default i18n instance
 * was created with, so an addon that mounts no UI is still listed by name.
 */
import type { FunctionComponent } from '@bedrock-core/ui-runtime';

/** The parts a build can declare for an addon. */
export interface DeclaredParts {
  /** The page screen compiled from the addon's manifest, for the shared addon list. */
  page?: FunctionComponent;
}

let parts: DeclaredParts = {};

/** Called by an app's `shape` from the module the ui-compiler filter generates; see {@link DeclaredParts}. */
export function registerDeclared(declared: DeclaredParts): void {
  parts = { ...parts, ...declared };
}

/** What the build declared, for the realm to publish. */
export function declaredParts(): DeclaredParts {
  return parts;
}
