# @bedrock-core/cli

## 0.10.3

### Patch Changes

- [`f7f36a1`](https://github.com/bedrock-core/ui/commit/f7f36a1979424a68f8bac69bfa8abe75c519197b) Thanks [@drav0011](https://github.com/drav0011)! - The scaffolded pack manifests name themselves with the vanilla `pack.name` / `pack.description` keys instead of the addon's `meta.*` i18n keys — Minecraft's pack list only resolves those two keys, so the `meta.*` headers showed as raw key strings. The i18n filter already emits `pack.name` / `pack.description` into each pack's `texts/<locale>.lang` from the one `meta.*` declaration in `packs/data/i18n/`, so the manifests now point at what the filter actually writes.

## 0.10.2

### Patch Changes

- [`55eaa7f`](https://github.com/bedrock-core/ui/commit/55eaa7f47688e2a577fb83bdf0541e3575531bd3) Thanks [@drav0011](https://github.com/drav0011)! - The `ore-styled` template's scaffolded sources now import through the two meta packages the template actually installs — `core` from `@bedrock-core/server`, and `ui` / `createI18n` / navigation / ore-styled through the `@bedrock-core/ui` subpaths (`/config`, `/i18n`, `/navigation`, `/ore-styled`).

  0.10.1 slimmed the template's dependencies down to the meta packages but left the sources importing the individual packages (`@bedrock-core/server-runtime`, `@bedrock-core/config`, `@bedrock-core/i18n`, `@bedrock-core/navigation`, `@bedrock-core/ore-styled`), which a fresh scaffold no longer declares — so new projects could not resolve them.

## 0.10.1

### Patch Changes

- [`706f224`](https://github.com/bedrock-core/ui/commit/706f224db660635f77c23fe46aaadda90ad417f9) Thanks [@drav0011](https://github.com/drav0011)! - `--version` now reports the CLI's real version, and the scaffolded project installs the server stack through the `@bedrock-core/server` meta package.

  - `bedrock-core --version` was hardcoded to `0.1.1` and had been wrong since that release. It now reads the version out of the CLI's own `package.json` at runtime, so the flag cannot drift from the published package again.
  - The template's `@bedrock-core/config` + `@bedrock-core/i18n` + `@bedrock-core/server-runtime` dependencies collapse into the single `@bedrock-core/server` meta package — one install for the cross-addon server stack, matching how the docs describe it.
  - The template pins `packageManager: yarn@4.18.0` and pre-approves `@bedrock-core/*` in `.yarnrc.yml`, so `yarn install` in a fresh project runs without the interactive build-script approval prompt.

## 0.10.0

### Minor Changes

- [`b8b0eb3`](https://github.com/bedrock-core/ui/commit/b8b0eb3280e8f1031e0293bf5a4227f12a1f5640) Thanks [@drav0011](https://github.com/drav0011)! - The `ore-styled` template now scaffolds the FULL bedrock-core stack, not just a UI:

  - **Filter pipeline** `generator → guides → i18n → bundler`: JSON generation from `.ts` templates, MDX guides compiled to an in-game manifest, TS-first translations (`packs/data/i18n/<locale>.ts`) compiled to `.lang` files + typed runtime bundle, scripts bundled to one `main.js`.
  - **Server runtime**: `main.ts` calls `core.register()` with i18n-keyed display fields (`meta.*` via `i18n.key()`), the translation bundle, the guide manifest and a typed config schema (`config.ts`), then mounts the shared config UI with `ui(core)`.
  - **Generator samples** (folded in from the removed `starter-example`): a multi-file block template (`packs/BP/blocks/tutorial.block.ts`) and a single-file entity template (`packs/BP/entities/training_dummy.entity.ts`).
  - **Guides sample**: `packs/data/guides/en_US/` with a root page, a category and an admonition.
  - **i18n basics**: greeting with interpolation, a plural leaf, and `t()` / `key()` usage in the example screen and on player spawn.
  - New `{{CREATOR_ID}}` / `{{PACK_ID}}` template variables — author and project name sanitized into Minecraft-safe identifiers used for `core.register()`, the addon namespace and generated identifiers.

### Patch Changes

- [`576057f`](https://github.com/bedrock-core/ui/commit/576057f90b8253d7a5be46788abbd4d251eb11a1) Thanks [@drav0011](https://github.com/drav0011)! - The scaffolded BP manifest names itself with the same `meta.*` keys as the RP, instead of duplicating the project name and description in `packs/BP/texts/en_US.lang`.

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

- [`4efcf03`](https://github.com/bedrock-core/ui/commit/4efcf0377ae94e32e4bea05cbd9b046a27f9de1b) Thanks [@drav0011](https://github.com/drav0011)! - The scaffolding template ships its `.gitignore` under a name npm keeps.

  npm strips `.gitignore` from published tarballs, so a scaffolded project came out without one. The template now carries it as `gitignore` and the generator restores the dot after copying.

  Also in this release: the generator filter's schema output is ignored in the template's eslint config, the `@minecraft/server-ui` dependency is declared in the template BP manifest, and the template's regolith pins move to `guides-1.1.1` / `i18n-1.0.1`.
