# {{PROJECT_NAME}}

{{DESCRIPTION}}

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

3. **Install companion resource pack:**

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

## Project Structure

```ts
├── packs/
│   ├── BP/              # Behavior Pack
│   │   ├── manifest.json
│   │   ├── scripts/
│   │   │   ├── main.ts           # Entry point
│   │   │   └── UI/
│   │   │       └── Example.tsx   # Example UI component
│   │   └── texts/
│   └── RP/              # Resource Pack
│       ├── manifest.json
│       ├── ui/          # JSON UI decoders (pre-configured)
│       └── texts/
├── config.json          # Regolith configuration
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── core-ui-v*.mcpack
```

## Documentation

For full documentation, visit: <https://bedrock-core.drav.dev/>

## License

MIT © {{AUTHOR}}
