/**
 * The runtime bundle the i18n Regolith filter generates
 * (`@bedrock-core/generated/i18n`, inlined by the bundler).
 *
 * `resources` is a type-only phantom: the generated declaration narrows it to
 * the authored resource tree (own keys at the root, library and vanilla
 * branches grafted on) so selectors and interpolation infer, but the JSON
 * never materializes it at runtime.
 */
/**
 * `.lang` lines as data: REAL key → display string, one locale. This flat
 * shape exists ONLY where Bedrock itself is flat — the filter's `.lang`
 * output and the `extra` passthrough it carries. Nothing at runtime
 * materializes or merges maps of it; resolution is lazy against the bundle.
 */
export type LangEntries = Record<string, string>;

export interface I18nBundle {
  readonly namespace: string;
  readonly defaultLocale: string;
  readonly libs: readonly string[];
  /** locale → flat path → template (`{{var}}` form; vanilla entries only where referenced). */
  readonly locales: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** flat path → interpolation argument order (default locale appearance order). */
  readonly args: Readonly<Record<string, readonly string[]>>;
  /**
   * locale → REAL key → value: `.lang` passthrough (guide prose, hand-written
   * entries) the filter carries so the layout engine can still measure keys
   * that never were resource paths. Optional — runtime-built bundles skip it.
   */
  readonly extra?: Readonly<Record<string, LangEntries>>;
  /** Type-only: the tree the t()/key()/raw() selectors navigate. Absent at runtime. */
  readonly resources?: unknown;
}

/**
 * The `.lang` key a flat path resolves to. Three path spaces, one rule each:
 * own keys get the addon namespace prefixed, a library branch's first segment
 * IS its real prefix, and `vanilla.` strips off because those keys are the
 * client's own.
 */
export function realKeyFor(bundle: Pick<I18nBundle, 'namespace' | 'libs'>, path: string): string {
  const dot = path.indexOf('.');
  const first = dot === -1 ? path : path.slice(0, dot);

  if (first === 'vanilla') { return path.slice('vanilla.'.length); }

  if (bundle.libs.includes(first)) { return path; }

  return `${bundle.namespace}.${path}`;
}
