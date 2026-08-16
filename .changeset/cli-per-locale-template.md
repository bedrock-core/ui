---
'@bedrock-core/cli': minor
---

The `ore-styled` template now scaffolds the FULL bedrock-core stack, not just a UI:

- **Filter pipeline** `generator → guides → i18n → bundler`: JSON generation from `.ts` templates, MDX guides compiled to an in-game manifest, TS-first translations (`packs/data/i18n/<locale>.ts`) compiled to `.lang` files + typed runtime bundle, scripts bundled to one `main.js`.
- **Server runtime**: `main.ts` calls `core.register()` with i18n-keyed display fields (`meta.*` via `i18n.key()`), the translation bundle, the guide manifest and a typed config schema (`config.ts`), then mounts the shared config UI with `ui(core)`.
- **Generator samples** (folded in from the removed `starter-example`): a multi-file block template (`packs/BP/blocks/tutorial.block.ts`) and a single-file entity template (`packs/BP/entities/training_dummy.entity.ts`).
- **Guides sample**: `packs/data/guides/en_US/` with a root page, a category and an admonition.
- **i18n basics**: greeting with interpolation, a plural leaf, and `t()` / `key()` usage in the example screen and on player spawn.
- New `{{CREATOR_ID}}` / `{{PACK_ID}}` template variables — author and project name sanitized into Minecraft-safe identifiers used for `core.register()`, the addon namespace and generated identifiers.
