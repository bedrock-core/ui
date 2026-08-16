/**
 * Build an {@link I18nBundle} from nested resource modules at runtime — no
 * Regolith filter involved. Two audiences:
 *
 * - **Libraries** (config, future bedrock-core packages): their resources ship
 *   inside the package and the consuming addon's filter folds them into the
 *   `.lang`; the library itself still wants typed verbs over its own strings
 *   for breadcrumbs, native modal headings, and any place a key must become a
 *   string. `createResourceBundle('core', { en_US })` gives it exactly the
 *   bundle shape `createI18n` expects, namespaced the way the filter emits it.
 * - **Addons without the filter**: everything works minus what only the build
 *   can do (`.lang` emission, vanilla branch, cross-locale checks).
 */
import type { I18nBundle } from './bundle';
import { templateVars } from './interpolate';

/** Nested resource module shape: strings at the leaves, objects in between. */
export interface ResourceTree {
  readonly [key: string]: string | ResourceTree;
}

function flatten(tree: ResourceTree, prefix: string, into: Record<string, string>): void {
  for (const [segment, value] of Object.entries(tree)) {
    const path = prefix === '' ? segment : `${prefix}.${segment}`;

    if (typeof value === 'string') { into[path] = value; } else { flatten(value, path, into); }
  }
}

export interface ResourceBundleOptions {
  /** The locale defining the type and the recorded argument order. Defaults to `en_US`. */
  readonly defaultLocale?: string;
  /**
   * `.lang`-passthrough entries (locale → REAL key → display string) to carry
   * for measurement — the runtime twin of the filter's `extra` section, for
   * keys that never were resource paths (config bakes the framework guide's
   * keys in this way).
   */
  readonly extra?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

/**
 * @param namespace the branch these keys live under world-wide (`core` for
 *                  bedrock-core's own; an addon namespace otherwise)
 * @param locales   one nested resource object per locale; the default locale
 *                  defines the type and the recorded argument order
 */
export function createResourceBundle<T extends ResourceTree>(
  namespace: string,
  locales: Readonly<Record<string, ResourceTree>> & { readonly en_US: T },
  options: ResourceBundleOptions = {},
): I18nBundle & { readonly resources?: T } {
  const { defaultLocale = 'en_US', extra } = options;
  const tables: Record<string, Record<string, string>> = {};

  for (const [locale, tree] of Object.entries(locales)) {
    const flat: Record<string, string> = {};

    flatten(tree, '', flat);
    tables[locale] = flat;
  }

  const args: Record<string, readonly string[]> = {};

  for (const [path, template] of Object.entries(tables[defaultLocale] ?? {})) {
    const vars = templateVars(template);

    if (vars.length > 0) { args[path] = vars; }
  }

  return { namespace, defaultLocale, libs: [], args, locales: tables, ...(extra !== undefined && { extra }) };
}
