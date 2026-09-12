# 08 — Build flow

## Discovery

Every compiled screen is a module `BP/scripts/**/*.screen.tsx` that default-exports its component, exactly as container screens are found today. The **root element** decides the host: `<Container entity>` → chest, `<Form>` → form-modal, anything else → form-action.

### The one rule, precisely

The build evaluates the screen module on a build machine with `@minecraft/server` and `@minecraft/server-ui` replaced by a stub that answers any name with nothing. Three places, three answers:

| Where | World access | Why |
| --- | --- | --- |
| Module scope, at `import` time — `world.afterEvents.*.subscribe(...)`, `system.run(...)`, a dynamic-property read next to an `import` | **no** | the build evaluates it and the stub returns nothing; at runtime it would run once per bundle whether or not the screen is ever opened |
| The component body, while computing JSX — `world.getPlayers()`, `host.getProperty(...)` in render | **no** | the build calls the body with the stub, so the value is `undefined` at build and the tree differs from the runtime's; at runtime it would run on every render and every probe |
| Hooks and handlers — `useEffect(() => { const s = world.afterEvents.x.subscribe(…); return () => world.afterEvents.x.unsubscribe(s); })`, `onPress(e)`, `onInsert(e)` | **yes** | effects and handlers never run at build; an effect runs while the screen is viewed and its cleanup runs when it closes — the React rule |

Subscribing to a world event **inside the component** is the intended way for a screen to react to the world: subscribe in `useEffect`, set state from the callback, and the render that follows writes the carriers. The build sees only the initial state and the effect's existence, never its body.

Screens that are *not* discovered (a component handed to `render()` from an ordinary module) run on the interpreter fallback. That is the migration path, not a feature: the build warns once per such screen when it can see the call.

## Screen identity

*Decided.* A screen's name is its file name without the suffix; its identity is `<namespace>_<name>`; its routing key is derived from that string by the host ([02-pipeline](./02-pipeline.md)). At runtime a form screen must present its key in the title, so the runtime has to know which compiled screen a component is:

- The filter writes `packs/data/ui/ui.generated.json` — one record per compiled screen: `name`, `host`, `key`, the **placement** (addresses in document order, capacities), and the baked snapshot `debug` diffs against. It is reached as `@bedrock-core/generated/ui`, the way `@bedrock-core/generated/i18n` and `/guides` already are, and inlined by the bundler.
- The link from a component to its record is by **name**: `render(Screen, player)` reads `Screen.screenName`, which the filter stamps by rewriting the screen module's default export (`export default withScreen('furnace', Furnace)`) in the workspace copy before the bundler runs. Nothing in the author's file changes; a module the filter did not see has no name and runs on the interpreter fallback.

*Proposed alternative, rejected:* identity by a hash of the IR shape. It keeps `render(Component)` name-free, but any build/runtime divergence in expansion (a stub player, a locale) silently changes the key and the screen renders as a vanilla form; a name fails loud instead.

## One filter

One Regolith entry, `core`, runs the whole stack in the only order it supports, with the namespace declared once under `shared`:

```
manifest -> generator -> guides -> i18n -> ui-compiler -> bundler
```

Each stage runs in its own Node process out of its own folder, exactly as Regolith would run it — same cwd, same `ROOT_DIR`, same settings JSON, same exit code — so `core` only assembles the settings and enforces the order. Per-stage settings sit under the stage's key and are merged over `shared`; `false` skips a stage; `generator` is opt-in because it writes types into the project. A stage whose inputs are absent reports that it has nothing to do and the run continues, so a project may use part of the stack.

A project that needs a filter of its own between two stages lists the six one by one instead and puts its filter where it belongs. The individual filters keep resolving from the repository until 2.0, then are removed.

## What the build generates

| Output | Where | Content |
| --- | --- | --- |
| `RP/ui/core-ui/screens/<name>.json` | addon RP | the compiled screen: its tree referencing `core_ui_shapes`, its own carrier definitions |
| `RP/ui/core-ui/screens/<ns>_router.json` | addon RP | the addon's router for each host it uses |
| `RP/ui/chest_screen.json`, `RP/ui/server_form.json` | addon RP, vanilla paths | hooks: one `modifications` entry each, defining nothing |
| `RP/ui/_ui_defs.json` | addon RP | the above registered |
| `RP/texts/<locale>.lang` | addon RP | the 64-glyph table, only when a chest screen has live text |
| `BP/entities/<file>.json` | addon BP | `inventory_size`, `core:ui_layout` — chest screens only |
| `packs/data/ui/ui.generated.json` | data | names, keys, placements, baked snapshots |
| the screen modules | workspace copy | default export wrapped with the screen's name |

## Filter internals

The filter bundles each screen together with the **project's** copy of `ui-runtime` and `ui-compiler` (esbuild, game modules aliased to a stub), so a screen compiles against the library the addon ships — unchanged. One esbuild build with every screen as an entry point replaces today's build-per-screen. The compiler's own error messages are relayed unchanged.

## Working loop

What has to be true before a change is worth a look in game, and how each rule earned its place.

1. **One deploy path.** `yarn preflight` — tests, lint, `regolith run` on the development profile, then a read-back of the pack the game will load. The `build` profile fills `packages/resource-pack/build/` for CI and nothing else. Two builds landing in two folders cost two rounds of "the change did nothing".
2. **A build stamp on the HUD.** The development profile sets `"stamp": true` on `ui-compiler`, which bakes `ui <hash6> HH:MM` at the HUD's top-left — a hash of every compiled screen plus the clock. Preflight fails when the deployed stamp is not the one it just built; a `regolith watch` holding the session lock fails the same way, named.
3. **Console, not chat.** `render(Screen, player, { debug: true })` logs what each present wrote (`[ui] <title> entries [...]`) and the `debug` diff to the content log, where a line copies with a click.
4. **Probe first, build second.** A JSON UI behaviour not in [06-render-pack](./06-render-pack.md)'s rules or a findings page gets a probe matrix before a feature stands on it: one atom per probe, lettered, readable as colours and text without debug mode, one deploy, one reading. `#size_binding` under a modification insert cost four rounds of reasoning and one matrix.
5. **Structured readings.** A test request names where to look, what working looks like, and what failing looks like.
6. **Asserts on, always, and `yarn gamelog` after every pass.** Marketplace review runs the client with assertions enabled, so a screen that "works" in a release build and asserts in a debug one is a rejection. The game runs with asserts on during development, and `yarn gamelog` prints every `Assertion failed` (with its condition and function) and every `[ui]` script line from the newest debug and content logs — copyable, and read before anything is called done. The first one it caught took a six-round removal bisect to attribute: the compiled settings slider, constructed hidden behind its title gate on every form screen, reading collection rows that do not exist there ([06-render-pack](./06-render-pack.md) rule 12).

## CLI template

`npx @bedrock-core/cli` scaffolds the single filter, one `*.screen.tsx` per host the template shows, and the pack download; `scripts/sync-cli-template.mjs` keeps the template's filter version in step as today.
