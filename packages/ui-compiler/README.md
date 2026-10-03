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

## Pack output

Compile action and modal screens with `compileFormScreen`, and native container
screens with `compileScreen`. Link all hosts together with `buildUiPack`:

```ts
import { buildUiPack, compileFormScreen, compileScreen } from '@bedrock-core/ui-compiler';
import Home from './home.screen';
import Settings from './settings.screen';
import Furnace from './furnace.screen';

const pack = buildUiPack([
  compileFormScreen(Home, { namespace: 'shop', name: 'home' }),
  compileFormScreen(Settings, { namespace: 'shop', name: 'settings' }),
  compileScreen(Furnace, { namespace: 'shop', name: 'furnace' }),
], 'shop');
```

Write the linked `pack.screens` documents and merge their `faces` by definition
name. Write `pack.documents`, merge each of `pack.hooks` into its vanilla file,
and register these files in `_ui_defs.json`. The Regolith filter performs these
steps automatically. `buildFormPack` and `buildContainerPack` also expose each
host separately; `buildUiPack` combines their helper definitions into one file.

Support definitions are built from TypeScript modules inside this compiler.
Builders request dependencies through `ref()`: only reachable helpers are emitted,
once per addon, under an addon-owned namespace. Both form and container output
therefore need no shared-pack UI definitions. Catalog compiles the framework's page and introduction
guide into each addon that installs it.

The vanilla form hook preserves the existing factory and inserts an addon-owned
bridge. Its shared properties recognize the stable compiled-form header; each
router selects its own full screen title. Use the linked screens' `testMetadata`
because linking updates their concrete paths. Metadata file hashes must be taken
after all generated UI has been written.

Container hooks select an addon-owned shell for desktop and pocket profiles.
Each shell preserves vanilla's ordinary-container fallback and mounts the vanilla
insertion panel that receives every addon's router. Slot indices, inventory
transactions and the sentinel protocol are preserved during linking.

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
