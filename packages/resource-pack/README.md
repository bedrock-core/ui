# @bedrock-core/ui resource pack

The shared resource pack supplies textures for Bedrock Core addons.

## Getting the pack

Import the `core-ui-*.mcpack` attached to the matching
[release](https://github.com/bedrock-core/ui/releases/latest), then enable it alongside
your addon. The scaffold CLI downloads it when creating a project.

| Property | Value |
| --- | --- |
| UUID | `761ecd37-ad1c-4a64-862a-d6cc38767426` |
| Scope | `world` |
| Contents | UI textures, pack metadata and pack icon |

## Versions

The pack is released with every UI release, including releases with unchanged textures.
Its major is the UI library major plus one; its minor, patch and any prerelease suffix
match the library version. For example, UI `0.12.2` ships texture pack `1.12.2`.
`scripts/sync-pack-version.mjs` aligns the manifest during versioning and artifact builds.

## Build and export

Run from `packages/resource-pack`:

```bash
yarn install
yarn build   # Export to build/@bedrock-core_ui_rp
yarn deploy  # Export to Minecraft development packs
```

The resource-pack workflow packages `build/@bedrock-core_ui_rp` as the release `.mcpack`.
CurseForge upload uses that same artifact and the settings in `curseforge.json`.
