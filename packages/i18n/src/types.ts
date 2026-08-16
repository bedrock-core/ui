/**
 * The compile-time half of the engine: selector trees, dot-path unions and
 * interpolation-variable inference, all derived from the bundle's phantom
 * `resources` type. Conventions are i18next's ({{var}}, plural suffixes, the
 * selector call shape); the machinery is this package's own, sized for
 * Bedrock's constraints.
 */

/** A value an interpolation argument accepts. */
export type Interp = string | number;

declare const TEMPLATE: unique symbol;
declare const PLURAL: unique symbol;

/**
 * What a selector returns: a branded leaf carrying the authored template's
 * literal type (which is where argument inference comes from) and whether the
 * leaf is a collapsed plural group.
 */
export interface Leaf<S extends string = string, P extends boolean = false> {
  readonly [TEMPLATE]: S;
  readonly [PLURAL]: P;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- variance: any Leaf instantiation
export type AnyLeaf = Leaf<any, any>;

type Whitespace = ' ' | '\t';
type TrimLeft<S extends string> = S extends `${Whitespace}${infer R}` ? TrimLeft<R> : S;
type TrimRight<S extends string> = S extends `${infer R}${Whitespace}` ? TrimRight<R> : S;
type Trim<S extends string> = TrimLeft<TrimRight<S>>;

/** The `{{var}}` names in a template literal type. */
export type TemplateVars<S extends string>
  = S extends `${string}{{${infer V}}}${infer Rest}` ? Trim<V> | TemplateVars<Rest> : never;

type PluralSuffix = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/** Bases of complete plural groups: every `x_other` contributes `x`. */
type PluralBases<T> = { [K in keyof T]: K extends `${infer B}_other` ? B : never }[keyof T];

/**
 * Keys of a tree node. A node that is also a string (vanilla's
 * leaf-and-branch case, `{ … } & string`) would leak String.prototype names —
 * those are excluded only there, so an authored key named `length` still works.
 */
type KeysOf<T> = T extends object
  ? (T extends string ? Exclude<keyof T & string, keyof string> : keyof T & string)
  : never;

/** The template type of a leaf value; non-literal strings stay `string`. */
type LeafTemplate<V> = V extends string ? (string extends V ? string : V) : string;

/**
 * The `$` a selector navigates: the resource tree with string leaves replaced
 * by branded {@link Leaf}s, and plural sibling groups (`stock_one` /
 * `stock_other`) collapsed into one plural leaf (`stock`).
 */
export type SelectorTree<T>
  = { [K in Exclude<KeysOf<T>, `${PluralBases<T> & string}_${PluralSuffix}`>]:
    T[K] extends string
      ? (T[K] extends object ? SelectorTree<T[K]> & Leaf : Leaf<LeafTemplate<T[K]>>)
      : SelectorTree<T[K]> }
      & { [B in PluralBases<T> & string]: Leaf<LeafTemplate<T[`${B}_other` & keyof T]>, true> };

/**
 * Every valid dot path, plural groups collapsed. Instantiated only when the
 * string form is used — the vanilla branch expands to a large union, and the
 * selector form never pays for it.
 */
export type PathsOf<T>
  = | { [K in KeysOf<T>]: K extends `${PluralBases<T> & string}_${PluralSuffix}` ? never
    : T[K] extends string
      ? (T[K] extends object ? K | `${K}.${PathsOf<T[K]>}` : K)
      : `${K}.${PathsOf<T[K]>}`
  }[KeysOf<T>]
  | (PluralBases<T> & string);

/** Resolve a dot path to the same {@link Leaf} the selector form would return. */
export type ResolvePath<T, P extends string>
  = P extends `${infer H}.${infer Rest}`
    ? (H extends KeysOf<T> ? ResolvePath<T[H & keyof T], Rest> : never)
    : P extends KeysOf<T>
      ? (T[P & keyof T] extends string ? Leaf<LeafTemplate<T[P & keyof T]>> : never)
      : `${P}_other` extends keyof T
        ? Leaf<LeafTemplate<T[`${P}_other` & keyof T]>, true>
        : never;

type VarsRecord<S extends string, V, Excluded extends string = never>
  = { [K in Exclude<TemplateVars<S>, Excluded>]: V };

/**
 * The rest-tuple of arguments a leaf demands. Literal templates make their
 * variables required properties; a plural leaf additionally requires `count`;
 * non-literal leaves (vanilla) optionally take a positional array for the
 * client's `%1$s` slots.
 *
 * `V` is what an argument accepts: `Interp` for the server-resolved verbs;
 * `raw()` widens it so an argument can itself be a nested translate.
 */
export type ArgsOf<L, V = Interp> = L extends Leaf<infer S, infer P>
  ? (P extends true
      ? [args: { count: number } & VarsRecord<S, V, 'count'>]
      : string extends S
        ? [args?: Readonly<Record<string, V>> | readonly V[]]
        : [TemplateVars<S>] extends [never] ? [] : [args: VarsRecord<S, V>])
  : never;
