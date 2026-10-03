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

## Test metadata

Pass `testMetadata: true` to `compileScreen` or `compileFormScreen` to receive a
`testMetadata` result alongside the compiled screen. Controls accept `testId`,
`testRole`, and `testName`; `Screen`, `Form`, and `Container` roots accept `testId`.
These declarations do not change generated UI, form responses, or snapshots.

External tools can import the versioned contract without loading the game runtime:

```ts
import { TEST_METADATA_PATH, TEST_METADATA_VERSION } from '@bedrock-core/ui-compiler/testing';
import type { TestMetadataManifest, ScreenTestMetadata } from '@bedrock-core/ui-compiler/testing';
```

The Regolith filter's `testMetadata` setting writes the pack manifest at
`RP/bedrock-core/test-metadata.json`, including SHA-256 hashes of the exact UI
bytes. A JSON Schema is exported at `@bedrock-core/ui-compiler/testing/schema`.
Tools own their validation, observation, instrumentation, and input adapters;
the compiler supplies identities, semantic declarations, and concrete property paths.
See [Test metadata](https://bedrock-core.drav.dev/docs/ui/compiler/testing) for the contract.

## Documentation

https://bedrock-core.drav.dev/docs/ui/compiler
