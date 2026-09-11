/**
 * What the build declared on the addon's behalf.
 *
 * An addon says everything about itself once, in `core.register()`. Most of what
 * the bedrock-core UI needs follows from that and from what the build made of
 * it — the page drawn from the manifest, the i18n bundle the filters
 * generated — so the build hands them over here and {@link ui} publishes
 * them the moment the addon is online. None of it is worth an addon repeating.
 *
 * Anything an addon names in `core.register()` itself is published by the
 * runtime, and wins: the build generates no page for an addon that named one.
 */
import type { I18nBundle } from '@bedrock-core/i18n';
import type { FunctionComponent } from '@bedrock-core/ui-runtime';

/** The parts a build can declare for an addon. */
export interface DeclaredParts {
  /** The page screen compiled from the addon's manifest, for the shared addon list. */
  page?: FunctionComponent;
  /** The addon's i18n bundle, so other addons' UIs can resolve and measure its strings. */
  translations?: I18nBundle;
}

let parts: DeclaredParts = {};

/** Called by the module the ui-compile filter generates; see {@link DeclaredParts}. */
export function registerDeclared(declared: DeclaredParts): void {
  parts = { ...parts, ...declared };
}

/** What the build declared, for `ui()` to publish. */
export function declaredParts(): DeclaredParts {
  return parts;
}
