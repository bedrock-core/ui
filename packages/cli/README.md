# @bedrock-core/cli

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

Scaffolds a complete Minecraft Bedrock addon project with the whole
[`@bedrock-core`](https://github.com/bedrock-core/ui) stack pre-wired — Regolith build, TypeScript,
ESLint, localization, an in-game guide, the render pack, and a working example screen — in one
command.

## Install

```bash
npx @bedrock-core/cli
```

It prompts for a project name, an author and a description, then scaffolds a Regolith project on
the `core` filter — TypeScript, ESLint, localization, an in-game guide, the render pack download,
and three example screens (`home`, `plan`, `profile_form`) built with
[`@bedrock-core/ore-styled`](https://bedrock-core.drav.dev/docs/ore-styled).

```bash
cd your-addon
yarn install
yarn regolith-install
yarn build
```

## Documentation

https://bedrock-core.drav.dev/docs/cli

## License

MIT — see the [root repository](https://github.com/bedrock-core/ui).
