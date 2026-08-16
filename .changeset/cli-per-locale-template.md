---
'@bedrock-core/cli': patch
---

The `ore-styled` template scaffolds the `i18n` Regolith filter instead of `translation-keys`: typed resources in `packs/data/i18n/<locale>.ts`, a `createI18n` instance that registers the addon's default translation source (no context wiring at the root), and the `@bedrock-core/generated/i18n` alias with committed declarations.
