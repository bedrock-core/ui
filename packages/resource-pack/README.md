# @bedrock-core/ui — companion resource pack

The resource pack every `@bedrock-core/ui` addon needs at runtime. It holds the JSON UI that
decodes the framework's **`bcuiv0008`** payloads: the label/button/header/dropdown routers, the
shared `control.json` decode, the component leaves and the scroll screens, under
`packs/RP/ui/core-ui/`.

The server side serializes a component tree into a form payload; this pack is the half that reads
it back and draws it. Without it, an addon's screens do not render.

## Getting the pack

Addon authors do **not** build this package. Take the `core-ui-*.mcpack` attached to the matching
[release](https://github.com/bedrock-core/ui/releases/latest) and open it to import it into
Minecraft, then enable it in the world alongside your addon. `npx @bedrock-core/cli` downloads it
for you when it scaffolds a project.

| | |
| --- | --- |
| UUID | `761ecd37-ad1c-4a64-862a-d6cc38767426` (never changes) |
| Version | `1.10.0` — minor = protocol generation, patch = pack revision (see below) |
| Protocol | `bcuiv0008` (also stated in the pack description, visible in-game) |
| Scope | `world` — one copy is shared by every `@bedrock-core/ui` addon in the world |

Take the pack from the same release as the library: the pack and the runtime are two halves of one
byte-level contract, and a mismatched pair renders garbage. Because the pack is world-scoped,
addons shipped together must agree on a framework version.

### How the version moves

The pack's version tracks the **release it ships in**, so you can read the pairing straight off it:

| Component | Rule | Example |
| --- | --- | --- |
| **Major** | The library's major, plus one | `@bedrock-core/ui` `0.x` → pack `1.x`; `1.x` → pack `2.x` |
| **Minor** | The library's minor | pack `1.10.x` ships with `@bedrock-core/ui` `0.10.x` |
| **Patch** | Pack revisions inside that release line | a decoder fix shipped on the same library version |

So anything that meaningfully changes the pack — a new texture, a new component leaf, a protocol
change — arrives in a release whose minor bumps, and lands on the pack's minor with it. A pack-only
fix takes the patch. (The major is offset by one because the pack has been on `1.x` since the
library's `0.8` days; mirroring the major directly would send `1.10.x` → `1.0.x` when the library
reaches 1.0, and Bedrock must never see a pack version go down.)

The **protocol is deliberately not in the number** — it is recorded in
[`protocol.json`](./protocol.json) and written into the pack description, where a player can
actually read it.

None of it is bumped by hand: [`scripts/sync-pack-version.mjs`](../../scripts/sync-pack-version.mjs)
runs inside `yarn version-packages`, after the meta version settles, and hashes `packs/RP` to catch
pack-only revisions — so no pack change can ship unversioned.

## What ships

**Only `packs/RP` is published.** The release workflow builds this project and zips the resource
pack output (`build/@bedrock-core_ui_rp`) into the `.mcpack` — see the *Package Resource Pack* step
in [`publish.yml`](../../.github/workflows/publish.yml). Nothing else in this package is an
artifact.

The behavior pack, the guide/i18n sources under `packs/data/`, and the demo screens are the local
test harness this repo uses to exercise the framework — a reference implementation and a place to
reproduce protocol bugs. They are built into `build/@bedrock-core_ui_bp` for local testing and
deliberately never released.

## Development

Part of the monorepo; run commands from the **root workspace**:

```bash
# From repository root
yarn install          # Install all workspace dependencies
yarn regolith-install # Install the Regolith filters (once, and after filter version bumps)
yarn build            # Build all packages (including this addon)
yarn watch            # Rebuild and deploy to com.mojang on change
```

The filter chain is `guides` → `i18n` → `bundler`. The generated bundles are reached through
`tsconfig.json` path aliases — `@bedrock-core/generated/i18n` and `@bedrock-core/generated/guides`
— resolving to the filters' output under `packs/data/`; the committed `.d.ts` files next to them
are what the IDE reads before Regolith has ever run.

`packs/BP/scripts/UI/screens/` is the reference gallery, reachable from the addon's home screen:
hooks, flex layout, font metrics, unstyled primitives, ore-styled components, both form backends,
three scroll variants, a stress test, and `I18nDemo` — typed keys, interpolation and plurals
resolving per player language.
