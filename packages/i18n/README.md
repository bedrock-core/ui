# @bedrock-core/i18n

Localization for Minecraft Bedrock addons: typed keys, interpolation and plurals — resolved on
the **client** in each player's own language wherever possible, on the **server** whenever you
need the actual string.

This package is the runtime half. The build half is the
[`i18n` Regolith filter](../../../regolith-filters/i18n/README.md), which turns your
`packs/data/i18n/<locale>.ts` modules into `.lang` files, a runtime bundle and the types this
package's API infers from. Read that README first for authoring, namespacing and what gets
generated.

## Setup

Once per addon:

```ts
// BP/scripts/i18n.ts
import { createI18n } from '@bedrock-core/i18n';
import bundle from '@bedrock-core/generated/i18n';

export const { t, key, raw, forPlayer, forLocale, setLocale, clearLocale } = createI18n(bundle);
```

Everything — key paths, interpolation variables, plural forms — is inferred from the bundle's
type. No module augmentation, no manual type imports: the filter's generated `.d.ts` roots the
tree at your own keys and grafts `core` (libraries) and `vanilla` on.

## Three verbs

The core idea: prefer the client, fall back to the server. The client resolves `.lang` keys per
player for free; the server only resolves when your code needs the string *now*.

| Verb | Returns | Resolved by | Use for |
| --- | --- | --- | --- |
| `key()` | namespaced key string | client | `Text` children, registry display fields — no args |
| `raw()` | `RawMessage` (`translate` + `with`) | client | interpolated text the client should localize |
| `t()` | plain string | server | layout math, chat, composing strings |

```ts
key($ => $.shop.title)                     // 'drav0011_shop.shop.title'
raw($ => $.shop.bought, { item, price })   // { rawtext: [{ translate: 'drav0011_shop.shop.bought', with: [...] }] }
t($ => $.shop.bought, { item, price })     // 'You bought Apple for 5 emeralds.'
```

Every verb takes a selector (`$ => $.shop.bought`) or the equivalent dot string
(`'shop.bought'`) — both autocomplete, both are checked. Interpolation is typed: the `{{var}}`
placeholders in the authored template become required properties, so a missing or misnamed
argument is a compile error. `raw()` orders its `with` array by the argument order the filter
recorded at build time; a shared contract test pins the two sides together.

## Locale resolution

`t()` needs a locale. The chain, first hit wins:

1. Per-player override — `setLocale(player, 'es_ES')`, persisted in a dynamic property so it
   survives rejoin; `clearLocale(player)` removes it.
2. The player's client language — `player.clientSystemInfo.locale`.
3. A sibling region of that language — a player on unauthored `es_MX` gets the Spanish written
   for Spain rather than English.
4. The addon's `defaultLocale`, then any locale the bundle carries.

```ts
t($ => $.shop.title)                        // defaultLocale — no player in sight
const { t: tp } = forPlayer(player);        // bound to the chain above
const { t: es } = forLocale('es_ES');       // pinned, e.g. for logs
```

`forPlayer` / `forLocale` return the full bound verb set (`t`, `key`, `raw`) — binding matters
for plurals even on the client-resolved verbs, see below.

## Plurals

Author `_one` / `_other` (and `_zero`, `_two`, `_few`, `_many` where a language needs them)
variants; they collapse into a single leaf that takes `count`:

```ts
t($ => $.shop.stock, { count: 3 })   // '3 left in stock'
```

Bedrock `.lang` has no plural mechanism, so the suffix is always chosen **server-side** — even
for `key()`/`raw()`, the chosen suffixed key is what travels to the client. That choice depends
on the target language's plural rules, so pluralized leaves require a bound verb set
(`forPlayer(player).raw(...)`). Rules come from a built-in CLDR category table — no
`Intl.PluralRules` required, because Bedrock's script engine does not guarantee it.

## In UI components

Binding the verbs to the viewing player is one line in your components:

```tsx
const { t, key, raw } = i18n.forPlayer(usePlayer());
```

Wrap it in your own `useTranslation()` hook if you like; `@bedrock-core/config` does exactly
that ([`src/i18n/index.ts`](../config/src/i18n/index.ts)), including preferring the
world-published table so addon overrides reach its breadcrumbs and modal text.

Measurement needs **no wiring at all**: `createI18n(bundle)` registers itself as the addon's
default translation source, and localized `Text` children resolve through it lazily, per player —
`resolve(realKey)` inverse-maps the key into the bundle and converts the one template it needs;
no tables are ever materialized. `TranslationContext` exists to OVERRIDE that — hosts that
resolve beyond their own bundle (config provides `core.translations.forPlayer(player)`) or
subtrees pinned to custom data. Libraries creating internal instances pass
`{ asDefault: false }` so they never shadow the host addon's bundle.

## Cross-addon sharing

Publish the bundle itself through registration:

```ts
core.register({ ..., translations: bundle });
```

The server runtime replicates the bundle — objects, templates and argument order intact — and
serves two lazy views: `core.translations.of(addonId)` gives verbs over a peer's strings, and
`core.translations.forPlayer(player)` gives one resolver chaining every published bundle, later
registrations winning collisions the way Bedrock's own world-level `.lang` merge does. Registry
display fields (`packName`, `description`, `creatorName`) are translation keys for exactly this
reason. The per-template `{{var}}` → `%N$s` conversion at lookup time is pinned by the same
contract test as the filter's `.lang` output.

## Without the filter — and inside libraries

`createResourceBundle(namespace, { en_US, es_ES })` builds the same bundle shape from nested
resource modules at runtime: full typed verbs, no build step. Libraries use it over the
resources they ship (`config` gets `core.addons.title` from its own `src/i18n/en_US.ts`);
addons can use it standalone and adopt the filter later — what they give up until then is only
what a build can do: `.lang` emission, the vanilla branch, cross-locale checks.

## Engine notes

The engine is fully custom, a few KB, with **zero runtime dependencies** — no i18next in the
bundle. It keeps i18next's conventions (`{{var}}` interpolation, plural suffixes, the selector
call shape) so existing knowledge and the filter's docs transfer, but the type machinery and the
resolver are this package's own, sized for Bedrock's constraints: no `Intl`, no dynamic import,
every locale statically in one bundle.

Compile-time guarantees end where dynamic strings begin: `t()` on a key the type system never
saw (a runtime-assembled string) returns the key itself, mirroring how Bedrock renders an
unknown `.lang` key literally.
