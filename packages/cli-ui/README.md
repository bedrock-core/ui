# @bedrock-core/cli-ui

CLI tool to scaffold Minecraft Bedrock addon projects with `@bedrock-core/ui` pre-configured.

## Usage

```bash
npx @bedrock-core/cli-ui
```

This will interactively prompt you for:

- Project name
- Author name
- Description

And generate a complete addon structure with:

- ✅ Behavior Pack with TypeScript setup
- ✅ Resource Pack with JSON UI decoders
- ✅ Regolith configuration
- ✅ TypeScript, ESLint configs
- ✅ Simple working example

## What's Generated

```ts
your-addon/
├── packs/
│   ├── BP/              # Behavior Pack
│   │   ├── manifest.json
│   │   ├── scripts/
│   │   │   ├── main.ts
│   │   │   └── UI/
│   │   │       └── Example.tsx
│   │   └── texts/
│   └── RP/              # Resource Pack
│       ├── manifest.json
│       ├── ui/          # JSON UI decoders
│       └── texts/
├── config.json          # Regolith config
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── .mcignore
```

## After Generation

```bash
cd your-addon
yarn install          # or npm install
regolith install-all  # Install Regolith filters
regolith run build    # Build the addon
```

## License

MIT © DrAv0011
