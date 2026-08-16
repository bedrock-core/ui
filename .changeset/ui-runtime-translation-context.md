---
'@bedrock-core/ui-runtime': minor
---

Translation resolution is now `@bedrock-core/i18n`-native — lazy resolvers instead of materialized key maps.

- **Zero wiring for the common case:** the addon's `createI18n(bundle)` call registers the default translation source, and `localizationKey` text measures through it automatically, per player. No context at the root, no tables.
- **`TranslationContext`** replaces `TranslationKeysContext`: it carries a `TranslationResolver` (`(key) => string | undefined`) and exists to OVERRIDE the default — hosts that resolve beyond their own bundle (`@bedrock-core/config` provides `core.translations.forPlayer(player)`, which chains every addon's published bundle) or subtrees pinned to custom data.
- **`Text` accepts `raw()` output** (`RawMessage`) on `localizationKey`: without arguments it behaves exactly like the bare key (client-resolved); with arguments the string is resolved and filled server-side in the player's language — a `.lang` label has no client-side argument channel — with a console warning when the filled text crosses the 80-byte cap.

**Removed:** `resolveTranslationKeysForPlayer`, `TranslationKeysByLocale`, `TranslationKeysMap`, `TranslationKeysContext`.
