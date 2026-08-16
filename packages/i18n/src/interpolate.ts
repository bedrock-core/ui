/**
 * Runtime interpolation. Named `{{var}}` templates resolve server-side in
 * `t()`; the positional `%N$s` form appears in vanilla strings (interpolated
 * with an array) and in what {@link toPositional} produces when tables are
 * published for other addons to measure.
 *
 * `toPositional` is the runtime half of a build-time contract: the i18n
 * Regolith filter performs the identical conversion when writing `.lang`
 * files, and both sides are pinned against the same table in their contract
 * tests.
 */
import type { Interp } from './types';

const VAR_RE = /\{\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}\}/g;
const SLOT_RE = /%(?:(\d+)\$)?s/g;

/** Array.isArray does not narrow readonly arrays out of a union; this does. */
export function isNamedArgs<V>(args: Readonly<Record<string, V>> | readonly V[]): args is Readonly<Record<string, V>> {
  return !Array.isArray(args);
}

/**
 * The `{{var}}` names of a template, in order of first appearance,
 * deduplicated — the runtime mirror of the recorded-argument-order rule the
 * filter applies at build time.
 */
export function templateVars(template: string): string[] {
  const seen: string[] = [];

  for (const match of template.matchAll(VAR_RE)) {
    const name = match[1];

    if (!seen.includes(name)) { seen.push(name); }
  }

  return seen;
}

/**
 * Fill a template. A record fills `{{var}}` markers (unknown markers are left
 * intact — the build already guaranteed the authored set); an array fills
 * `%1$s`-style (or bare `%s`, in appearance order) positional slots.
 */
export function interpolate(template: string, args?: Readonly<Record<string, Interp>> | readonly Interp[]): string {
  if (args === undefined) { return template; }

  if (isNamedArgs(args)) {
    return template.replace(VAR_RE, (marker, name: string) => (name in args ? String(args[name]) : marker));
  }

  let auto = 0;

  return template.replace(SLOT_RE, (marker, index: string | undefined) => {
    const i = index === undefined ? auto++ : Number(index) - 1;

    return i >= 0 && i < args.length ? String(args[i]) : marker;
  });
}

/**
 * Rewrite `{{var}}` markers to `%N$s`, N being the 1-based slot in `order`
 * (the recorded default-locale appearance order). Variables outside the order
 * are left intact — build-time validation already flagged them.
 */
export function toPositional(template: string, order: readonly string[]): string {
  return template.replace(VAR_RE, (marker, name: string) => {
    const idx = order.indexOf(name);

    return idx === -1 ? marker : `%${idx + 1}$s`;
  });
}
