import { currentI18n, type TranslationResolver } from '@bedrock-core/i18n';
import type { Player } from '@minecraft/server';
import { createContext } from '../core/fabric/context';

/**
 * Context that OVERRIDES how `localizationKey` text resolves for a component
 * subtree, as a `@bedrock-core/i18n` {@link TranslationResolver} — a lazy
 * real-key lookup, never a materialized map.
 *
 * Without a provider there is nothing to wire: the addon's `createI18n(bundle)`
 * call registers itself as the default source and measurement resolves through
 * it automatically (see {@link defaultResolverFor}). Providing is for hosts
 * that resolve beyond their own bundle — `@bedrock-core/config` provides
 * `core.translations.forPlayer(player)`, which chains every addon's published
 * bundle — or for pinning a subtree to custom data.
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
 * Takes a GETTER so callers can pass `usePlayer` directly: when there is no
 * instance, the player (and therefore the dispatcher) is never touched — trees
 * with neither a provider nor an instance (tests, i18n-less addons) keep
 * working.
 */
export function defaultResolverFor(getPlayer: () => Player): TranslationResolver | null {
  const instance = currentI18n();

  return instance ? instance.forPlayer(getPlayer()).resolve : null;
}
