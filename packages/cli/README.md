# @bedrock-core/cli

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

Scaffolds a complete Minecraft Bedrock addon project with the whole
[`@bedrock-core`](https://github.com/bedrock-core/ui) stack pre-wired — Regolith build, TypeScript,
ESLint, localization, an in-game guide, the render pack, and a working example screen — in one
command.

## Prerequisites

- Node.js 22.18+
- [Regolith](https://regolith-docs.readthedocs.io/en/stable/)

## Install

```bash
npx @bedrock-core/cli
```

For non-interactive use, pass `--package-manager yarn`, `npm`, `pnpm`, or `none`.

It prompts for a project name, an author and a description, then scaffolds a Regolith project on
the `core` filter — TypeScript, ESLint, localization, an in-game guide, the render pack download,
and three example screens (`home`, `plan`, `profile_form`) built with
[`@bedrock-core/ore-styled`](https://bedrock-core.drav.dev/docs/ore-styled).

When Git is available, the generated directory is initialized as a repository.

The CLI already installs dependencies unless you select `none`. Continue with the manager you chose:

| Task | Yarn | npm | pnpm |
| --- | --- | --- | --- |
| Enter the project | `cd your-addon` | - | - |
| Install filters | `yarn regolith-install` | `npm run regolith-install` | `pnpm regolith-install` |
| Build | `yarn build` | `npm run build` | `pnpm build` |

Commit the generated lockfile. For example, Yarn CI can use `yarn install --immutable` and pnpm can
use `pnpm install --frozen-lockfile`.

The scaffold downloads the render pack matching its UI dependency: `core-ui-0.12.1.mcpack`.
Import that pack into the world where the addon runs.

The template's `filterDefinitions` pins `core` and all six stages it delegates to, so the
`regolith-install` script installs the complete stack before the first build.

## Documentation

https://bedrock-core.drav.dev/docs/cli

## License

MIT — see the [root repository](https://github.com/bedrock-core/ui).
