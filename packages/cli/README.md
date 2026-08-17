# @bedrock-core/cli

CLI tool to scaffold Minecraft Bedrock addon projects with `@bedrock-core/ui` pre-configured.

## Usage

```bash
npx @bedrock-core/cli
```

This will interactively prompt you for:

- Project name
- Author name
- Description

And generate a complete addon structure with:

- ✅ Behavior Pack with TypeScript setup
- ✅ Resource Pack for your own textures and `.lang` files (the JSON UI decoders live in the render pack below)
- ✅ Regolith configuration — the `generator` → `guides` → `i18n` → `bundler` filter chain
- ✅ Localization scaffolding (`packs/data/i18n/`) wired to [`@bedrock-core/i18n`](https://github.com/bedrock-core/ui/blob/main/packages/i18n/README.md)
- ✅ An in-game guide scaffold (`packs/data/guides/`)
- ✅ TypeScript, ESLint configs
- ✅ Simple working example using `@bedrock-core/ore-styled`

It also downloads the latest render pack (`.mcpack`) from the
[releases page](https://github.com/bedrock-core/ui/releases/latest) into the project — open it to
import it into Minecraft. If the download fails the CLI tells you where to get it manually.

## After Generation

```bash
cd your-addon
yarn install          # or npm install
yarn regolith-install # Install Regolith filters
yarn build            # Build the addon
yarn watch            # Watch for changes and redeploy
```
