# @bedrock-core/ui-compiler

Compiles a solved [`@bedrock-core/ui`](https://github.com/bedrock-core/ui) tree — a `*.screen.tsx`
default export — into static JSON UI: faces, the per-host placement, and the document each control
lands in. This is the low-level compiler; addon authors reach it through the `ui-compiler` Regolith
filter, which runs it over every screen in a project and writes the result into the addon's own
resource pack. Reach for the package directly only when writing a build tool of your own.

## Install

```bash
yarn add @bedrock-core/ui-compiler
```

## Usage

```ts
import { compileScreen } from '@bedrock-core/ui-compiler';
import Furnace from './furnace.screen';

const compiled = compileScreen(Furnace, { name: 'furnace', namespace: 'core' });
```

## Documentation

https://bedrock-core.drav.dev/docs/ui/compiler
