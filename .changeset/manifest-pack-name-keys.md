---
'@bedrock-core/cli': patch
---

The scaffolded pack manifests name themselves with the vanilla `pack.name` / `pack.description` keys instead of the addon's `meta.*` i18n keys — Minecraft's pack list only resolves those two keys, so the `meta.*` headers showed as raw key strings. The i18n filter already emits `pack.name` / `pack.description` into each pack's `texts/<locale>.lang` from the one `meta.*` declaration in `packs/data/i18n/`, so the manifests now point at what the filter actually writes.
