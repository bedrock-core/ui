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
- ✅ Resource Pack with JSON UI decoders
- ✅ Regolith configuration
- ✅ TypeScript, ESLint configs
- ✅ Simple working example

## After Generation

```bash
cd your-addon
yarn install          # or npm install
yarn regolith-install # Install Regolith filters
yarn build            # Build the addon
yarn watch            # Watch for changes and redeploy
```
