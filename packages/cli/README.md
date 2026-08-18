# @bedrock-core/cli

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

Scaffolds a complete Minecraft Bedrock addon project with the whole
[`@bedrock-core`](https://github.com/bedrock-core/ui) stack pre-wired — Regolith build, TypeScript,
ESLint, localization, an in-game guide, the render pack, and a working example screen — in one
command.

## Usage

```bash
npx @bedrock-core/cli
```

It prompts for a project name, an author and a description, then generates:

- ✅ Behavior Pack with TypeScript setup
- ✅ Resource Pack for your own textures and `.lang` files (the JSON UI decoders live in the render pack below)
- ✅ Regolith configuration — the `generator` → `guides` → `i18n` → `bundler` filter chain
- ✅ Localization scaffolding (`packs/data/i18n/`) wired to [`@bedrock-core/i18n`](https://bedrock-core.drav.dev/docs/ui/i18n)
- ✅ An in-game guide scaffold (`packs/data/guides/`)
- ✅ TypeScript and ESLint configs
- ✅ A working example screen built with [`@bedrock-core/ore-styled`](https://bedrock-core.drav.dev/docs/ui/ore-styled)

It also downloads the latest render pack (`.mcpack`) from the
[releases page](https://github.com/bedrock-core/ui/releases/latest) into the project — open it to
import it into Minecraft. If the download fails the CLI tells you where to get it manually.

## After generation

```bash
cd your-addon
yarn install          # or npm install
yarn regolith-install # install the Regolith filters
yarn build            # build the addon
yarn watch            # rebuild and redeploy on change
```

## Documentation

- [CLI](https://bedrock-core.drav.dev/docs/ui/cli) — every prompt, the full scaffold layout, and
  what to do next
- [Get started](https://bedrock-core.drav.dev/docs/ui/get-started/overview) — the framework itself

## License

MIT — see the [root repository](https://github.com/bedrock-core/ui).
