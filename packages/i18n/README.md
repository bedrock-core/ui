# @bedrock-core/i18n

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

Localization for Minecraft Bedrock addons: typed keys, typed interpolation and plurals — resolved
on the **client** in each player's own language wherever possible, and on the **server** whenever
your code needs the actual string.

This is the runtime half of a two-part system. The build half is the
[`i18n` Regolith filter](https://bedrock-core.drav.dev/docs/ui/i18n/regolith-filter), which turns
your `packs/data/i18n/<locale>.ts` modules into `.lang` files, a runtime bundle, and the types
every verb below infers from.

## Install

Already have `@bedrock-core/ui`? It is reachable as `@bedrock-core/ui/i18n` — nothing to add.
Standalone:

```bash
yarn add @bedrock-core/i18n
```

Then the build half, once per addon (before `bundler` in `config.json`, and after `guides` if you
use it):

```bash
regolith install github.com/bedrock-core/regolith-filters/i18n
```

## What it gives you

- **Three verbs, one contract** — `key()` for keys the client resolves, `raw()` for a `RawMessage`
  the client resolves *with* arguments, `t()` for a plain string right now, on the server
- **Types inferred from your resources** — key paths, `{{var}}` interpolation variables and plural
  forms all come from the authored bundle; a missing or misspelled argument is a compile error
- **Plurals without `Intl`** — `_one` / `_other` (and `_zero`/`_two`/`_few`/`_many`) collapse into
  one leaf taking `count`, chosen server-side from a built-in CLDR table
- **A locale chain per player** — persisted override → client language → sibling region of that
  language → the addon's default → anything published
- **`DisplayText` everywhere** — components take a literal, a key or a `RawMessage`
  interchangeably; `display()` collapses any of them to a string when you need one
- **Cross-addon bundles** — publish yours through `core.register({ translations: bundle })` and any
  peer can resolve and measure your strings
- **No runtime dependencies** — a few KB, i18next's conventions, none of i18next

## Usage

```ts
// packs/data/i18n/en_US.ts — `as const` is what lets the compiler infer the key space
export default {
  shop: {
    title: 'Shop',
    bought: 'You bought {{item}} for {{price}} emeralds.',
  },
} as const;
```

```ts
// BP/scripts/i18n.ts — the addon's one instance
import { createI18n } from '@bedrock-core/i18n';
import bundle from '@bedrock-core/generated/i18n';
import type { Player } from '@minecraft/server';

export const i18n = createI18n(bundle);

export function receipt(player: Player, item: string, price: number): void {
  // Bind the verbs to this player's locale chain.
  const { key, raw, t } = i18n.forPlayer(player);

  key($ => $.shop.title);                    // 'drav0011_shop.shop.title' — the client resolves it
  raw($ => $.shop.bought, { item, price });  // RawMessage — the client resolves and fills it
  t($ => $.shop.bought, { item, price });    // 'You bought Apple for 5 emeralds.' — here, now
}
```

That one `createI18n(bundle)` call is also the UI wiring: it registers itself as the addon's
default translation source, so localized `Text` children measure and resolve through it with no
provider at the root and no prop to declare.

## Documentation

- [i18n](https://bedrock-core.drav.dev/docs/ui/i18n) — the verbs, interpolation, plurals, locale
  resolution, `display()`, cross-addon sharing, and the full API reference
- [i18n Regolith filter](https://bedrock-core.drav.dev/docs/ui/i18n/regolith-filter) — authoring,
  namespacing, the `tsconfig.json` alias, what gets generated and what the build checks
- [Translations in the server runtime](https://bedrock-core.drav.dev/docs/server/server-runtime/translations) —
  publishing a bundle and resolving a peer's strings

## License

MIT
