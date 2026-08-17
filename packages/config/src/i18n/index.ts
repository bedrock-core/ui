/**
 * bedrock-core's own verbs over the resources in `./en_US` — the same
 * machinery addons get from their generated bundle, built here at runtime with
 * `createResourceBundle` because a library has no Regolith build of its own.
 * Namespace `core`: real keys come out as `core.addons.title`, exactly what
 * the i18n filter folds into every consuming addon's `.lang`.
 */
import { createI18n, createResourceBundle, interpolate, resolveDisplay } from '@bedrock-core/i18n';
import type { BoundI18n, DisplayText, Interp, TranslationResolver } from '@bedrock-core/i18n';
import { TranslationContext, useContext, useTranslation as useBoundTranslation } from '@bedrock-core/ui-runtime';
import en_US from './en_US';

export type CoreResources = typeof en_US;

/**
 * The bound `t` verb on its own, for helpers that render a string but are not components and so
 * cannot call the hook themselves — the caller resolves the verbs once and threads them in.
 */
export type CoreT = BoundI18n<CoreResources>['t'];

/**
 * `asDefault: false` — this is a library-internal instance for the verbs only
 * (breadcrumbs, native modal text); registering it as the addon's default
 * source would shadow the host addon's own bundle. Measurement never touches
 * it: the host realm's published bundle already carries this package's
 * resources (the filter folds `bedrockCore.i18n` libraries in, `extra.ts`
 * included), so `core.translations.forPlayer(player)` is the whole world.
 */
export const i18n = createI18n(createResourceBundle('core', { en_US }), { asDefault: false });

type LooseVerb = (selector: unknown, args?: Readonly<Record<string, Interp>>) => string;

/**
 * The verbs bound to the viewing player, with two twists:
 *
 * - `t()` prefers the world-published value when it carries the key — an
 *   addon's deliberate override ("Addons" → "Mods") and locales this package
 *   does not ship reach the breadcrumbs and native modal text too, not just
 *   the painted `.lang` keys.
 * - `resolve()` IS the world resolver — this UI renders every addon's keys
 *   (registry display fields), so a key-to-string here must see all published
 *   bundles, not just this library's.
 * - `display()` is bound over that same world resolver, so breadcrumbs and
 *   native modal text localize registry fields from ANY addon's bundle.
 */
export function useTranslation(): BoundI18n<CoreResources> {
  const published = useContext(TranslationContext);

  return overlay(useBoundTranslation(i18n), published);
}

/**
 * The same verbs for a caller with no render tree to read a context from — a custom-command
 * callback, which answers one player in chat and is not a component. `published` is
 * `core.translations.forPlayer(player)`; pass `undefined` when nobody ran the command (a
 * command block or the console), where there is no language to prefer and this package's own
 * default locale is the only sensible answer.
 */
export function translationsFor(published: TranslationResolver | undefined): BoundI18n<CoreResources> {
  return overlay(i18n, published);
}

/**
 * Lay the world-published bundle over a locally bound verb set: the published value wins
 * wherever it carries the key — an addon's deliberate override ("Addons" → "Mods") and locales
 * this package does not ship reach the breadcrumbs, native modal text and command replies too,
 * not just the painted `.lang` keys — and `resolve`/`display` become the world's, so a key from
 * ANY addon's bundle resolves here.
 */
function overlay(
  bound: BoundI18n<CoreResources>,
  published: TranslationResolver | null | undefined,
): BoundI18n<CoreResources> {
  if (!published) { return bound; }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- widening the overloaded verbs to their loose implementation shape
  const { key: keyOf, t: tOf } = bound as unknown as { key: LooseVerb; t: LooseVerb };

  const t = (selector: unknown, args?: Readonly<Record<string, Interp>>): string => {
    const realKey = keyOf(selector, args);
    const value = published(realKey);

    if (value === undefined) { return tOf(selector, args); }

    if (args === undefined) { return value; }

    // Published values are in positional %N$s form — rebuild the argument
    // array from the recorded order before interpolating.
    const path = realKey.startsWith('core.') ? realKey.slice('core.'.length) : realKey;
    const order = i18n.bundle.args[path];

    return interpolate(value, order === undefined ? args : order.map(name => args[name]));
  };

  const display = (value: DisplayText): string => resolveDisplay(published, value);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- restoring the typed surface over the published-aware t
  return { ...bound, t, resolve: published, display } as BoundI18n<CoreResources>;
}
