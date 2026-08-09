---
'@bedrock-core/ui-runtime': minor
---

Translation keys are now per-locale. The generated module is a locale → keys map, and `resolveTranslationKeysForPlayer(byLocale, player)` picks the right one from `player.clientSystemInfo.locale`, falling back to `en_US` and then to any locale present. Requires the multi-locale `translation-keys` Regolith filter.

**Breaking:** `<TranslationKeysContext value={translationKeys}>` no longer type-checks — resolve first:

```tsx
const player = usePlayer();

<TranslationKeysContext value={resolveTranslationKeysForPlayer(translationKeys, player) ?? null}>
  <MyScreen />
</TranslationKeysContext>
```

New exports: `resolveTranslationKeysForPlayer`, `TranslationKeysByLocale`.

Also: regenerated font metrics with wider glyph coverage, plus text measurement and layout fixes that follow from it.
