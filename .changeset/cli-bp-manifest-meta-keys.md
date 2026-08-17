---
'@bedrock-core/cli': patch
---

The scaffolded BP manifest names itself with the same `meta.*` keys as the RP, instead of duplicating the project name and description in `packs/BP/texts/en_US.lang`.

A pack's `header.name` / `header.description` are translation keys Bedrock resolves from **that pack's own** `texts/<locale>.lang`, which is why the BP could not simply borrow the RP's copy and every template shipped the strings twice. The i18n filter now emits the addon's `meta.*` branch — and only that branch — into `BP/texts/<locale>.lang` too, so both headers can point at the one declaration in `packs/data/i18n/`:

```jsonc
// packs/BP/manifest.json
"header": {
  "name": "{{CREATOR_ID}}_{{PACK_ID}}.meta.name",
  "description": "{{CREATOR_ID}}_{{PACK_ID}}.meta.description"
}
```

`packs/BP/texts/en_US.lang` is now the same comment the RP one already carried, pointing at `packs/data/i18n/`. Scaffolded projects therefore have the pack list read in each player's language, and renaming the addon is one edit rather than three.

Requires the i18n filter version the template pins. Existing projects: delete `pack.name` / `pack.description` from `packs/BP/texts/<locale>.lang`, add a `meta` branch to `packs/data/i18n/<locale>.ts` if you have none, and point the BP header at `<namespace>.meta.name` / `.meta.description`.
