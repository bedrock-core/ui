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

Screens that are *not* discovered (a component handed to `render()` from an ordinary module) run on `form-legacy`. That is the migration path, not a feature: the build warns once per such screen when it can see the call.

## Screen identity

*Decided.* A screen's name is its file name without the suffix; its identity is `<namespace>_<name>`; its routing key is derived from that string by the host ([02-pipeline](./02-pipeline.md)). At runtime a form screen must present its key in the title, so the runtime has to know which compiled screen a component is:

- The filter writes `packs/data/ui/ui.generated.json` — one record per compiled screen: `name`, `host`, `key`, the **placement** (addresses in document order, capacities), and the baked snapshot `debug` diffs against. It is reached as `@bedrock-core/generated/ui`, the way `@bedrock-core/generated/i18n` and `/guides` already are, and inlined by the bundler.
- The link from a component to its record is by **name**: `render(Screen, player)` reads `Screen.screenName`, which the filter stamps by rewriting the screen module's default export (`export default withScreen('furnace', Furnace)`) in the workspace copy before the bundler runs. Nothing in the author's file changes; a module the filter did not see has no name and runs on `form-legacy`.

*Proposed alternative, rejected:* identity by a hash of the IR shape. It keeps `render(Component)` name-free, but any build/runtime divergence in expansion (a stub player, a locale) silently changes the key and the screen renders as a vanilla form; a name fails loud instead.

## One filter

Today: five filters with four ordering rules (`guides` before `i18n`, `ui-compile` after `i18n` and before `bundler`, `generator` excluding `BP/scripts`) and a `namespace` setting repeated in four places. v2 ships **one** filter, `core`, that runs the steps in the only order that works and resolves the namespace once (setting, else the `core.register()` scan):

```
manifest -> generator -> guides -> i18n -> ui-compile -> bundler
```

Each step stays its own module inside the filter, with today's README as its section; a project that needs only some steps lists them in the filter's `steps` setting. The individual filters keep resolving from the repository for existing projects until 2.0 of the filters, then are removed.

*Decided.* Ships in phase 6 ([09-plan](./09-plan.md)); nothing earlier depends on it.

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

The filter bundles each screen together with the **project's** copy of `ui-runtime` and `ui-compile` (esbuild, game modules aliased to a stub), so a screen compiles against the library the addon ships — unchanged. One esbuild build with every screen as an entry point replaces today's build-per-screen. The compiler's own error messages are relayed unchanged.

## CLI template

`npx @bedrock-core/cli` scaffolds the single filter, one `*.screen.tsx` per host the template shows, and the pack download; `scripts/sync-cli-template.mjs` keeps the template's filter version in step as today.
