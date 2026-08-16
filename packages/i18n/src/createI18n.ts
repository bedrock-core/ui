/**
 * The runtime engine. A few KB, zero dependencies: flat-table lookup, {{var}}
 * interpolation, plural-suffix selection via the built-in CLDR table, and the
 * locale chain (per-player override → client language → default → any).
 *
 * Three verbs, one idea — prefer the client, fall back to the server:
 * `key()` returns the namespaced .lang key (client resolves), `raw()` returns
 * a translate/with RawMessage (client resolves, server supplies arguments in
 * the recorded order), `t()` resolves the string server-side now.
 */
import type { Player, RawMessage } from '@minecraft/server';
import { realKeyFor, type I18nBundle } from './bundle';
import { resolveDisplay, type DisplayText } from './display';
import { interpolate, isNamedArgs, toPositional } from './interpolate';
import { pickLocale } from './locale';
import { pluralCategory } from './plural';
import type { AnyLeaf, ArgsOf, Interp, PathsOf, ResolvePath, SelectorTree } from './types';

/** Dynamic property a per-player language override persists under. */
export const LOCALE_PROPERTY = 'bedrock_core:i18n_locale';

/**
 * Both call shapes of a verb: selector (`$ => $.shop.bought`) or dot path.
 * `V` is what interpolation arguments accept — `raw()` widens it to allow
 * nested translates.
 */
export interface TranslateFn<R, Out, V = Interp> {
  <L extends AnyLeaf>(selector: ($: SelectorTree<R>) => L, ...args: ArgsOf<L, V>): Out;
  <P extends PathsOf<R> & string>(path: P, ...args: ArgsOf<ResolvePath<R, P>, V>): Out;
}

/**
 * Resolve a REAL `.lang` key (`drav0011_shop.shop.title`, `core.addons.title`,
 * a vanilla or passthrough key) to its display string, or `undefined` when the
 * source doesn't carry it. This is the measurement contract: no tables are
 * built or merged anywhere — each call reads the bundle's own objects and
 * converts the one template it needs.
 */
export type TranslationResolver = (key: string) => string | undefined;

/** The verb set bound to one resolved locale. */
export interface BoundI18n<R> {
  readonly locale: string;
  readonly t: TranslateFn<R, string>;
  readonly key: TranslateFn<R, string>;
  /**
   * Returns Minecraft's own {@link RawMessage} (`translate` + `with`) — the
   * vehicle past the 80-byte text cap: keys and parameters are short, the
   * resolved sentence is not, and the client resolves every part in its own
   * language. Arguments accept any RawMessage part — nested `raw()`, `score`,
   * `selector` — and travel as rawtext parameters the moment one appears.
   */
  readonly raw: TranslateFn<R, RawMessage, Interp | RawMessage>;
  /** Lazy real-key lookup over this bundle, in this locale (default-locale fallback per key). */
  readonly resolve: TranslationResolver;
  /**
   * Any {@link DisplayText} to a plain string, server-side, in this locale —
   * for the places a key must BECOME text: breadcrumb trails, native modal
   * headings, chat prefixes. Literal strings pass through, key strings
   * resolve, RawMessages resolve and fill their `with` parameters. A key
   * nothing resolves comes back literally — mirroring Bedrock.
   */
  readonly display: (value: DisplayText) => string;
}

/** What {@link createI18n} returns: default-locale verbs plus the binders. */
export interface I18n<R> extends BoundI18n<R> {
  readonly bundle: I18nBundle;
  /** Verbs pinned to one locale (logs, broadcasts, tests). */
  forLocale(locale: string): BoundI18n<R>;
  /** Verbs bound through the chain: override → client locale → default → any. */
  forPlayer(player: Player): BoundI18n<R>;
  /** Persist a per-player language override (survives rejoin). */
  setLocale(player: Player, locale: string): void;
  /** Remove the override; the player's client language takes over again. */
  clearLocale(player: Player): void;
}

export interface CreateI18nOptions {
  /**
   * Register this instance as the addon's default translation source, which is
   * what lets `@bedrock-core/ui` resolve localized-text measurement with no
   * wiring at all. Defaults to true — an addon's own `createI18n` call IS the
   * registration. Libraries building internal instances (config does) pass
   * false so they never shadow the host addon's bundle.
   */
  readonly asDefault?: boolean;
}

// Module scope is per-bundle in Bedrock (each addon bundles its own copy), so
// this is an addon-local default, not a cross-addon global.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the default is consumed untyped (measurement tables only)
let defaultInstance: I18n<any> | undefined;

/**
 * The addon's default i18n instance — the last `createI18n` call that didn't
 * opt out. `@bedrock-core/ui` reads this to auto-resolve measurement tables.
 */
export function currentI18n(): I18n<unknown> | undefined {
  return defaultInstance;
}

/**
 * The resource tree the generated declaration carries; the seeded (pre-first-
 * build) declaration leaves it `unknown`, which degrades every verb to loosely
 * typed strings instead of blocking the project from compiling.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate loose fallback
type ResourcesOf<B extends I18nBundle> = unknown extends B['resources'] ? any : NonNullable<B['resources']>;

const PATH = Symbol('i18n.path');

type PathProxy = { readonly [PATH]: string } & Record<string, unknown>;

/** Lazy proxy tree recording the property chain a selector walks. */
function makeProxy(path: string): PathProxy {
  const children = new Map<string, PathProxy>();
  const target: PathProxy = { [PATH]: path };

  return new Proxy(target, {
    get(_target, prop): unknown {
      if (prop === PATH) { return path; }

      if (typeof prop !== 'string') { return undefined; }

      let child = children.get(prop);

      if (!child) {
        child = makeProxy(path === '' ? prop : `${path}.${prop}`);
        children.set(prop, child);
      }

      return child;
    },
  });
}

type LooseArgs = Readonly<Record<string, Interp>> | readonly Interp[] | undefined;
type LooseRawArgs = Readonly<Record<string, Interp | RawMessage>> | readonly (Interp | RawMessage)[] | undefined;

/** What the loosely-typed implementation receives for either call shape. */
type SelectorLike = string | (($: PathProxy) => PathProxy);

function isRawArg(value: Interp | RawMessage): value is RawMessage {
  return typeof value === 'object';
}

/**
 * Build the `with` payload: plain strings stay a plain array; the moment any
 * argument is itself a RawMessage part, everything travels as rawtext
 * parameters so the client resolves the nested parts in its own language.
 */
function toWith(values: readonly (Interp | RawMessage)[]): string[] | RawMessage {
  if (values.some(isRawArg)) {
    return { rawtext: values.map(value => (isRawArg(value) ? value : { text: String(value) })) };
  }

  return values.map(String);
}

export function createI18n<B extends I18nBundle>(bundle: B, options: CreateI18nOptions = {}): I18n<ResourcesOf<B>> {
  const root = makeProxy('');
  const defaultTable = bundle.locales[bundle.defaultLocale] ?? {};
  const localeList = [...new Set([...Object.keys(bundle.locales), ...Object.keys(bundle.extra ?? {})])];

  const pathOf = (selector: SelectorLike): string =>
    typeof selector === 'function' ? selector(root)[PATH] : selector;

  const PLURAL_SUFFIX_RE = /_(?:zero|one|two|few|many|other)$/;

  /**
   * Argument order for a path. A locale-only plural variant (a CLDR category
   * the default locale never declares, e.g. Czech `few`) may have no recorded
   * entry in a hand-built bundle — its group's `_other` order applies: plural
   * variants share one argument set, enforced by the filter's parity checks.
   */
  const argsFor = (path: string): readonly string[] | undefined =>
    bundle.args[path]
    ?? (PLURAL_SUFFIX_RE.test(path) ? bundle.args[path.replace(PLURAL_SUFFIX_RE, '_other')] : undefined);

  const bound = new Map<string, BoundI18n<ResourcesOf<B>>>();

  function forLocale(locale: string): BoundI18n<ResourcesOf<B>> {
    const cached = bound.get(locale);

    if (cached) { return cached; }

    const table = bundle.locales[locale] ?? defaultTable;
    const has = (path: string): boolean => path in table || path in defaultTable;

    /** Plural groups collapse at the type level; pick the suffixed key back here. */
    const variantOf = (path: string, args: LooseArgs | LooseRawArgs): string => {
      if (args === undefined || !isNamedArgs(args)) { return path; }

      const count = args['count'];

      if (typeof count !== 'number' || !has(`${path}_other`)) { return path; }

      const candidate = `${path}_${pluralCategory(locale, count)}`;

      return has(candidate) ? candidate : `${path}_other`;
    };

    const t = (selector: SelectorLike, args?: LooseArgs): string => {
      const variant = variantOf(pathOf(selector), args);
      const template = table[variant] ?? defaultTable[variant];

      // Mirrors how Bedrock renders an unknown .lang key: the key, literally.
      if (template === undefined) { return realKeyFor(bundle, variant); }

      return interpolate(template, args);
    };

    const key = (selector: SelectorLike, args?: LooseArgs): string =>
      realKeyFor(bundle, variantOf(pathOf(selector), args));

    const raw = (selector: SelectorLike, args?: LooseRawArgs): RawMessage => {
      const variant = variantOf(pathOf(selector), args);
      const translate = realKeyFor(bundle, variant);

      if (args !== undefined && !isNamedArgs(args)) {
        return { translate, with: toWith(args) };
      }

      const order = argsFor(variant);

      if (args !== undefined && order !== undefined && order.length > 0) {
        return { translate, with: toWith(order.map(name => args[name])) };
      }

      return { translate };
    };

    /**
     * Real-key lookup, lazily against the bundle's own objects: inverse-map
     * the key to path space (own namespace prefix stripped, library branches
     * as-is, vanilla under its branch), convert the ONE template on the way
     * out, and fall back to the `.lang` passthrough. Mirrors exactly what the
     * client resolves from the world-merged .lang.
     */
    const resolve = (realKey: string): string | undefined => {
      const ownPrefix = `${bundle.namespace}.`;
      const dot = realKey.indexOf('.');
      const first = dot === -1 ? realKey : realKey.slice(0, dot);
      // Both mappings can apply at once: a core-family addon (namespace
      // `core`) shares its prefix with the `core` library branch, so a miss on
      // the stripped own path falls through to the lib-branch full key.
      const candidates = [];

      if (realKey.startsWith(ownPrefix)) { candidates.push(realKey.slice(ownPrefix.length)); }

      if (bundle.libs.includes(first)) { candidates.push(realKey); }

      for (const path of candidates) {
        const template = table[path] ?? defaultTable[path];

        if (template !== undefined) { return toPositional(template, argsFor(path) ?? []); }
      }

      // Vanilla entries are stored under their branch, already client-form.
      const vanilla = table[`vanilla.${realKey}`] ?? defaultTable[`vanilla.${realKey}`];

      if (vanilla !== undefined) { return vanilla; }

      return bundle.extra?.[locale]?.[realKey] ?? bundle.extra?.[bundle.defaultLocale]?.[realKey];
    };

    const display = (value: DisplayText): string => resolveDisplay(resolve, value);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the implementation is loosely typed; the overloaded verb surface is enforced at every call site
    const api = { locale, t, key, raw, resolve, display } as unknown as BoundI18n<ResourcesOf<B>>;

    bound.set(locale, api);

    return api;
  }

  function resolvePlayerLocale(player: Player): string {
    const override = player.getDynamicProperty(LOCALE_PROPERTY);
    const chosen = pickLocale(localeList, [
      typeof override === 'string' ? override : undefined,
      player.clientSystemInfo?.locale,
    ], bundle.defaultLocale);

    return chosen ?? bundle.defaultLocale;
  }

  const defaults = forLocale(bundle.defaultLocale);

  const api: I18n<ResourcesOf<B>> = {
    bundle,
    locale: defaults.locale,
    t: defaults.t,
    key: defaults.key,
    raw: defaults.raw,
    resolve: defaults.resolve,
    display: defaults.display,
    forLocale,
    forPlayer: (player: Player): BoundI18n<ResourcesOf<B>> => forLocale(resolvePlayerLocale(player)),
    setLocale: (player: Player, locale: string): void => { player.setDynamicProperty(LOCALE_PROPERTY, locale); },
    clearLocale: (player: Player): void => { player.setDynamicProperty(LOCALE_PROPERTY, undefined); },
  };

  if (options.asDefault ?? true) { defaultInstance = api; }

  return api;
}
