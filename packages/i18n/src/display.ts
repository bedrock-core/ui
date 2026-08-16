import type { RawMessage } from '@minecraft/server';
import type { TranslationResolver } from './createI18n';
import { interpolate } from './interpolate';

/**
 * Player-facing text in any of its shapes: a literal string, a real `.lang`
 * key (`key()` output, registry display fields), or a `raw()` RawMessage.
 * THE text union — every channel that shows a player something shares it:
 * `Text` children, MenuRow/Header labels, registry display fields,
 * `display()` input. Which shape a string is (literal vs key) is decided
 * lazily by the active resolver, never declared.
 */
export type DisplayText = string | RawMessage;

/**
 * Resolve a display field to a plain string, server-side, through a resolver —
 * for the places a key must BECOME text: breadcrumb trails, native modal
 * headings, chat prefixes. Accepts both shapes display fields carry: a bare
 * key string (`key()` output, registry fields) or a `raw()` RawMessage, whose
 * `with` parameters are filled positionally (nested translates resolve one
 * level; score/selector parts have no server value and fill as '').
 *
 * A key nothing resolves comes back literally — mirroring Bedrock.
 */
export function resolveDisplay(resolve: TranslationResolver | null | undefined, value: DisplayText): string {
  if (typeof value === 'string') { return resolve?.(value) ?? value; }

  if (value.translate === undefined) { return value.text ?? ''; }

  const template = resolve?.(value.translate) ?? value.translate;

  if (value.with === undefined) { return template; }

  const params = Array.isArray(value.with)
    ? value.with
    : (value.with.rawtext ?? []).map(part =>
        part.text ?? (part.translate !== undefined ? (resolve?.(part.translate) ?? part.translate) : ''));

  return interpolate(template, params);
}
