# {{PROJECT_NAME}}

{{DESCRIPTION}}

A full-stack [bedrock-core](https://bedrock-core.drav.dev/) addon: custom UI,
cross-addon registration, typed config, TS-first localization, in-game guides
and JSON generation — all wired and ready.

## Getting Started

1. **Check prerequisites:**

   Install Node.js 22.18+ and Regolith. If the CLI already installed the
   dependencies, continue to step 3.

2. **Install dependencies:**

   ```bash
   yarn install
   # or: npm install
   # or: pnpm install
   ```

   For yarn or pnpm, run `corepack enable` once if the CLI did not do it.
   Commit the lockfile created by your selected manager.

   Yarn is configured with `nodeLinker: node-modules`; pnpm projects use
   `nodeLinker: hoisted` in `pnpm-workspace.yaml`. Both keep dependencies in a conventional
   `node_modules` layout.

3. **Install Regolith filters:**

   ```bash
   yarn regolith-install
   # or: npm run regolith-install
   # or: pnpm regolith-install
   ```

   The command installs all seven released filters declared in `config.json`: `core` and
   manifest, generator, guides, i18n, ui-compiler and bundler. Regolith does not install
   the stages that `core` delegates to automatically.

4. **Install the render pack:**

   ```txt
   Open the core-ui-<UI version>.mcpack to add it to your game (the current template uses
   core-ui-0.12.1.mcpack)
   ```

5. **Build the addon:**

   ```bash
   yarn build
   # or: npm run build
   # or: pnpm build
   ```

6. **Watch mode (auto-rebuild on changes):**

   ```bash
   yarn watch
   # or: npm run watch
   # or: pnpm watch
   ```

## What's inside

| Feature | Where | What it shows |
|---------|-------|---------------|
| **Registration** | `packs/BP/scripts/main.ts` | `core.register()` with i18n-keyed display fields, bundle, guide and config schema |
| **Custom UI** | `packs/BP/scripts/UI/screens/*.screen.tsx` | ore-styled screens, navigation, native forms |
| **Config** | `packs/BP/scripts/config.ts` | Typed schema → widgets in the shared config UI, persisted values |
| **i18n** | `packs/data/i18n/en_US.ts` | TS-first text: `t()` server-filled, `key()`/`raw()` client-resolved, plurals, interpolation |
| **Guides** | `packs/data/guides/en_US/` | MDX pages compiled to an in-game guide, auto-localized |
| **Generator** | `packs/BP/blocks/`, `packs/BP/entities/` | Single-file and multi-file `.ts` → `.json` templates, typed against Mojang's official schemas |

The Regolith pipeline runs **manifest → generator → guides → i18n →
ui-compiler → bundler**, in one `core` filter entry: the pack manifests are
stamped, JSON is generated from the `.ts` templates, guides compile to a
manifest plus `.lang` entries, translations compile to `.lang` files with the
typed runtime bundle and `.d.ts` autocompletion, every `*.screen.tsx` under
`packs/BP/scripts` compiles to static JSON UI, and finally the scripts bundle
into one `main.js`.

The generator also writes Minecraft document types into
`packs/data/generated/mc/`, which is what makes `satisfies Block` and
`satisfies Entity` work in the templates. Like the other filter-generated
artifacts it is gitignored and rebuilt on every run — so **run the build once
after scaffolding**, or those two files will show unresolved-name errors in
your editor until you do.

## Project Structure

```ts
├── packs/
│   ├── BP/                       # Behavior Pack
│   │   ├── manifest.json
│   │   ├── blocks/               # generator: multi-file template sample
│   │   ├── entities/             # generator: single-file template sample
│   │   ├── scripts/
│   │   │   ├── main.ts           # Entry point — one core.register() call
│   │   │   ├── config.ts         # Config schema (typed accessors)
│   │   │   └── UI/
│   │   │       ├── screens/      # Compiled screens (one *.screen.tsx per screen)
│   │   │       └── i18n.ts       # The addon's i18n instance
│   │   └── texts/
│   ├── RP/                       # Resource Pack
│   │   ├── manifest.json
│   │   └── texts/
│   └── data/
│       ├── i18n/                 # TS-first translations (en_US.ts is the contract)
│       └── guides/               # MDX guide pages per locale
├── config.json                   # Regolith configuration (filter pipeline)
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── core-ui-0.12.1.mcpack
```

## Documentation

For full documentation, visit: <https://bedrock-core.drav.dev/>

## License

MIT © {{AUTHOR}}
