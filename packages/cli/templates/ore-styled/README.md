# {{PROJECT_NAME}}

{{DESCRIPTION}}

A full-stack [bedrock-core](https://bedrock-core.drav.dev/) addon: custom UI,
cross-addon registration, typed config, TS-first localization, in-game guides
and JSON generation — all wired and ready.

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

2. **Install Regolith filters:**

   ```bash
   npm run regolith-install
   # or
   yarn regolith-install
   ```

3. **Install the render pack:**

   ```txt
   Open the core-ui-v*.mcpack to add it to your game
   ```

4. **Build the addon:**

   ```bash
   npm run build
   # or
   yarn build
   ```

5. **Watch mode (auto-rebuild on changes):**

   ```bash
   npm run watch
   # or
   yarn watch
   ```

## What's inside

| Feature | Where | What it shows |
|---------|-------|---------------|
| **Registration** | `packs/BP/scripts/main.ts` | `core.register()` with i18n-keyed display fields, bundle, guide and config schema |
| **Custom UI** | `packs/BP/scripts/UI/Example.tsx` | ore-styled screens, navigation, native forms |
| **Config** | `packs/BP/scripts/config.ts` | Typed schema → widgets in the shared config UI, persisted values |
| **i18n** | `packs/data/i18n/en_US.ts` | TS-first text: `t()` server-filled, `key()`/`raw()` client-resolved, plurals, interpolation |
| **Guides** | `packs/data/guides/en_US/` | MDX pages compiled to an in-game guide, auto-localized |
| **Generator** | `packs/BP/blocks/`, `packs/BP/entities/` | Single-file and multi-file `.ts` → `.json` templates, typed against Mojang's official schemas |

The Regolith pipeline runs **generator → guides → i18n → bundler**: JSON is
generated from the `.ts` templates, guides compile to a manifest plus `.lang`
entries, translations compile to `.lang` files, the typed runtime bundle and
`.d.ts` autocompletion, and finally the scripts bundle into one `main.js`.

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
│   │   │   ├── main.ts           # Entry point — core.register(), ui(core)
│   │   │   ├── config.ts         # Config schema (typed accessors)
│   │   │   └── UI/
│   │   │       ├── Example.tsx   # Example UI component
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
└── core-ui-v*.mcpack
```

## Documentation

For full documentation, visit: <https://bedrock-core.drav.dev/>

## License

MIT © {{AUTHOR}}
