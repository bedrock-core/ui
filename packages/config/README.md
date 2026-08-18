# @bedrock-core/config

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

The shared **addon list + config + guide UI** for [`@bedrock-core/ui`](https://github.com/bedrock-core/ui).

Every bedrock-core addon mounts it with one line and gets settings screens, an in-game guide and a
directory of every other addon in the world — because the registry, config schemas, guides and
translations all replicate over [`@bedrock-core/sync`](https://bedrock-core.drav.dev/docs/server/sync).
Whichever realm runs the newest runtime renders the UI for all of them, so an addon shipped a year
ago is served today's screens.

## Install

```bash
yarn add @bedrock-core/config
```

It also ships inside the umbrella package as `@bedrock-core/ui/config`. The package depends on
`@bedrock-core/server-runtime` for **types only** — no value import, so the two build and version
independently.

## What it gives you

- `ui(core, options?)` — mounts everything: the commands, the open RPC, and this addon's place in
  the host election
- **Commands under your own namespace** — `<ns>:config` and `<ns>:configat` (read and write
  settings from chat, with generated autocomplete for every verb and setting), `<ns>:guide`,
  `<ns>:list`. Turn them off with `ui(core, { commands: false })`
- **Screens for free** — the addon list, the scope and target pickers, the config form for a scope,
  a reset confirmation, and each addon's guide
- **A permission rule you can reuse** — `isOperator`, `allowedScopes` and `clampTarget`, the
  caller-side half of authorization (the owning addon re-checks every write)
- `App` for a custom mount, `registerAddonCommands` for the commands alone, and `CONFIG_SCOPES`
  with the `ConfigScope` / `EntrySchema` / `FlatSchemaLike` types for code building its own pickers

## Usage

```ts
import { core } from '@bedrock-core/server-runtime';
import { ui } from '@bedrock-core/config';
import bundle from '@bedrock-core/generated/i18n';
import guides from '@bedrock-core/generated/guides';

const config = core.register({
  creator: 'bt',
  pack: 'gc_graves',
  packName: 'Graves',
  version: '1.0.0',
  translations: bundle,
  guide: guides,
  config: { server: { keepInventory: { type: 'boolean', default: false, label: 'Keep Inventory' } } },
});

ui(core); // registers bt_gc_graves:config, :configat, :guide, :list
```

Call `ui(core)` once, after `core.register()`.

## Documentation

- [config](https://bedrock-core.drav.dev/docs/ui/config) — `ui()` and its options, every command
  and generated enum, the permission model, the three scopes, typed config schemas, and the API
  reference
- [Config in the server runtime](https://bedrock-core.drav.dev/docs/server/server-runtime/config) —
  declaring a schema, the scope accessors, cross-addon access and authorization
- [Host election](https://bedrock-core.drav.dev/docs/server/server-runtime/host) — which realm
  serves the UI, and why

## License

MIT — see the [root repository](https://github.com/bedrock-core/ui).
