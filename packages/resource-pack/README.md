# @bedrock-core/ui - Test Addon

This addon serves as a **test implementation** and **reference example** for the [`@bedrock-core/ui`](https://github.com/bedrock-core/ui) framework.

And it also is the companion resource pack needed for the framework to work.

## What's Included

- **Behavior Pack** - TypeScript example UI components using `@bedrock-core/ui`
- **Resource Pack** - JSON UI decoders that parse serialized component data
- **Regolith Configuration** - Build system with TypeScript bundler

## Development

This package is part of the monorepo. All development commands should be run from the **root workspace**:

```bash
# From repository root
yarn install          # Install all workspace dependencies
yarn build            # Build all packages (including this addon)
yarn watch            # Watches changes and rebuilds and deploys addon to com.mojang
```
