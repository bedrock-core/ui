import { currentI18n, type BoundI18n, type I18n, type TranslationResolver } from '@bedrock-core/i18n';
import type { Player } from '@minecraft/server';
import type { FunctionComponent, JSX } from '../jsx';
import { createContext } from '../core/fabric/context';
import { getCurrentFiber } from '../core/fabric/registry';
import { useContext, usePlayer } from '../hooks';

/**
 * How localized text resolves for a component subtree, as a
 * `@bedrock-core/i18n` {@link TranslationResolver} — a lazy real-key lookup,
 * never a materialized map.
 *
 * The runtime provides this at every root (see {@link DefaultTranslations}):
 * the addon's `createI18n(bundle)` call registers the default source, and
 * `render()` injects it bound to the viewing player — so `useContext` is THE
 * one mechanism and components need no fallback logic. Providing it yourself
 * shadows the injected value for a subtree: hosts that resolve beyond their
 * own bundle (`@bedrock-core/config` provides
 * `core.translations.forPlayer(player)`, which chains every addon's published
 * bundle) or subtrees pinned to custom data.
 *
 * A key nothing resolves measures as the literal key string — mirroring
 * Bedrock, which renders an unmatched key as-is.
 */
export const TranslationContext = createContext<TranslationResolver | null>(null);

/**
 * The resolver from the addon's default i18n instance — the last
 * `createI18n(bundle)` call that didn't opt out — bound to this player through
 * the full locale chain. `null` when the addon never created one; keys then
 * measure as their literal text.
 *
 * Takes a GETTER so callers can defer the player read: when there is no
 * instance, the player is never touched — trees without an instance (tests,
 * i18n-less addons) keep working.
 */
export function defaultResolverFor(getPlayer: () => Player): TranslationResolver | null {
  const instance = currentI18n();

  return instance ? instance.forPlayer(getPlayer()).resolve : null;
}

/**
 * The runtime's root wrapper (mounted by `render()` around every tree): a
 * function component, so the provided value is re-derived on EVERY build pass
 * — a `setLocale` override or a later `createI18n` call is picked up on the
 * next render, not frozen at mount.
 */
export const DefaultTranslations: FunctionComponent<{ player: Player }> = (
  { player, children }: { player: Player; children?: JSX.Node },
): JSX.Element => TranslationContext({ value: defaultResolverFor(() => player), children });

/**
 * THE translation hook — an addon's typed verbs bound to the viewing player
 * through the full locale chain:
 *
 *   const { t, key, raw, display } = useTranslation(i18n);
 *
 * Pass the addon's own `createI18n(bundle)` instance and the verbs keep its
 * full typing — selectors, interpolation arguments, plurals. Lives here (not
 * in `@bedrock-core/i18n`) because binding needs the fiber's player; the i18n
 * package stays hook-free for server-side code, which binds explicitly with
 * `i18n.forPlayer(player)`.
 */
export function useTranslation<R>(instance: I18n<R>): BoundI18n<R> {
  return instance.forPlayer(usePlayer());
}

/**
 * The ACTIVE resolver — sugar over `useContext(TranslationContext)`, which the
 * runtime always populates at the root (context is the ONE mechanism; a
 * provider in the tree shadows it). What `Text` detects keys and measures
 * with; components that build display strings themselves (Header trails,
 * MenuRow coloring) share it.
 */
export function useTranslationResolver(): TranslationResolver | null {
  // Outside an active fiber (a component invoked as a plain function — tests,
  // build tooling) there is no tree and no provider: resolve to null so
  // strings measure/paint literally instead of throwing.
  const [fiber] = getCurrentFiber();

  if (!fiber) {
    return null;
  }

  return useContext(TranslationContext);
}
