---
'@bedrock-core/cli': patch
---

Update the `ore-styled` template for per-locale translation keys: it now resolves the player's locale with `resolveTranslationKeysForPlayer` + `usePlayer` before providing `TranslationKeysContext`, and the generated `.d.ts` types the module as locale → keys.
