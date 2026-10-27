# @bedrock-core/navigation

## 0.13.1

### Patch Changes

- 223550b: Add the experimental Ore UI host with compiled client resources, reactive fields and navigation integration.
- b0c7a7b: Capture immutable plain-data root props in render sessions so Back navigation restores the original page and inputs.
- Updated dependencies [9842a42]
- Updated dependencies [223550b]
- Updated dependencies [b0c7a7b]
- Updated dependencies [4c15d57]
  - @bedrock-core/ui-runtime@0.14.0

## 0.13.0

### Minor Changes

- [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56) Thanks [@drav0011](https://github.com/drav0011)! - Plan bounded local transitions through `createStaticNavigation`, with contextual links and server actions, visited-page Back, and server boundaries when the configured context budgets are reached. Compile shared selection gates and glyph-sized input overlays without duplicating page content.

- [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56) Thanks [@drav0011](https://github.com/drav0011)! - Register screen host kinds and portable parameter contracts. Preserve destination parameters and confirmed client page/tab context through Back and cross-realm navigation. Add `navigation(core)` for owner discovery and host openers, and `navigateAsync()` for destination acceptance. Reject invalid inputs and retain navigation state when a host rejects a transition.

- [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56) Thanks [@drav0011](https://github.com/drav0011)! - Expose a compact navigator extension API with custom layouts and shared stack or tab behavior. Keep host history and wire bookkeeping private, and consolidate destination support.

- [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56) Thanks [@drav0011](https://github.com/drav0011)! - Use destination snapshots as the navigation history for Back and host transfers. Compiled reference tables supply data-only screens; `navigation(core)` handles screen ownership and cross-realm routing.

- [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56) Thanks [@drav0011](https://github.com/drav0011)! - Provide static navigators, route links and whole-host navigation through `@bedrock-core/navigation` and `@bedrock-core/ui/navigation`. The optional `@bedrock-core/navigation/core` entry point provides Core screen discovery, host openers, compiled reference presentation and cross-realm transport.
  
  Expose generic render lifecycle notifications, screen metadata, selection panels and compiled action descriptions from the UI runtime. Plain rendering remains independent of navigation. `renderDestination()` in `@bedrock-core/navigation/runtime` preserves logical destination context in asynchronous host openers.
  
  Version navigation independently from the UI runtime, including prereleases. The root UI package mirrors the runtime version; release checks validate that match and exact runtime dependency resolution.

- [`856e8f5`](https://github.com/bedrock-core/ui/commit/856e8f5ce288e6a5a806c17809085337ac4a2c9f) Thanks [@drav0011](https://github.com/drav0011)! - Prepare finite server entry histories for recent client navigation and honor server fallback when the native state budget is exceeded.

- [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56) Thanks [@drav0011](https://github.com/drav0011)! - Compile bounded native navigation with shared page bodies, persistent selection owners, localized hitboxes and server-confirmed action context.

- [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56) Thanks [@drav0011](https://github.com/drav0011)! - Provide static stack and top-tab navigators, typed route links and hooks, player-scoped container refs, and an integrated Core transport adapter. Share resident page bodies across a bounded native context graph, confirm logical history before server actions, and retain nested state across server checkpoints.
  
  Expose generic expanded-tree composition, library compilation data and render refresh controls. Preserve conditional native inputs, stateful button faces and semantic test targets in compiled navigation layouts.

- [`8cd0b96`](https://github.com/bedrock-core/ui/commit/8cd0b967e92e878c9b68c13323bb541146747ede) Thanks [@drav0011](https://github.com/drav0011)! - Use one compiled navigation graph for reading menus and application history. Preserve saved parents across server returns and use five local history levels with a 128-context budget by default.

### Patch Changes

- [`856e8f5`](https://github.com/bedrock-core/ui/commit/856e8f5ce288e6a5a806c17809085337ac4a2c9f) Thanks [@drav0011](https://github.com/drav0011)! - Reuse player-guard information during liveness analysis of navigation controls.

- [`2729517`](https://github.com/bedrock-core/ui/commit/2729517b640114f13401ead1f24fcb08ae489d97) Thanks [@drav0011](https://github.com/drav0011)! - Keep sibling replacements client-local and support bounded recent history that collapses revisited pages, discards older visits, and retains native navigation after server actions.

- [`d2b14d6`](https://github.com/bedrock-core/ui/commit/d2b14d6d74934ea856460a720146bda7c45274ec) Thanks [@drav0011](https://github.com/drav0011)! - Close the outgoing native form before opening a static navigation walk, preserving Back history and keeping one form active.
- Updated dependencies [[`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56), [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56), [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56), [`36fd254`](https://github.com/bedrock-core/ui/commit/36fd2543142bb98eb983486fec0937eb0b251bb3), [`aee2bbd`](https://github.com/bedrock-core/ui/commit/aee2bbd1c440b846b65e34afe74a507bc5374929), [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56), [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56), [`856e8f5`](https://github.com/bedrock-core/ui/commit/856e8f5ce288e6a5a806c17809085337ac4a2c9f), [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56), [`aee2bbd`](https://github.com/bedrock-core/ui/commit/aee2bbd1c440b846b65e34afe74a507bc5374929), [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56), [`a2c336d`](https://github.com/bedrock-core/ui/commit/a2c336d8f344aa29b5ce41c0490ebb1c6337de56), [`161e53e`](https://github.com/bedrock-core/ui/commit/161e53e2a444678f242b70374ccfb88efbc4c3e2)]:
  - @bedrock-core/ui-runtime@0.13.0

## 0.10.0

### Minor Changes

- [#13](https://github.com/bedrock-core/ui/pull/13) [`166a5d5`](https://github.com/bedrock-core/ui/commit/166a5d50bd6d3485e2daec6d86268741d01600a6) Thanks [@drav0011](https://github.com/drav0011)! - A `<Link params>` opens its target with those params from a static screen and across realms, not only from a screen rendered at runtime.
  
  A static screen's table carries each link's params beside its key: `ReferenceTarget` is `{ to, params?, replace? }`, and a walk that reaches a key the table does not describe — a screen with handlers of its own, or one only its owner's realm can draw — navigates to it with them. A screen the table does describe is shown from values baked with no props, so it takes none.
  
  Params that leave a bundle are plain data: strings, finite numbers, booleans, null, and arrays and plain objects of those. A link whose params hold anything else — a function, a class instance, `undefined`, `NaN` — keeps its screen's component, and a screen declared `<Screen static>` fails the build naming the part that is not data. `whyNotPlainData(value, path)` is that check.
  
  `@bedrock-core/navigation` hands a screen to its owning realm with its params: `CrossRealm.ask` takes them and a `screen` target carries them as `params`. Params that are not plain data stay behind with a warning, and the screen opens without them.

- [#13](https://github.com/bedrock-core/ui/pull/13) [`83a14ae`](https://github.com/bedrock-core/ui/commit/83a14ae1005117f3e999ea7fe064b02f3736bf7a) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** Screens are navigated by key, and a screen of links can be shown by an addon that
  has none of its script.
  
  Every compiled screen has a key — `<addon>:<name>`, written by the build beside the title it is
  drawn by — and a press that opens another screen names that key rather than closing over a handler:
  
  ```tsx
  <Link to="shop:home">Shop</Link>
  ```
  
  Because the target is data on the tree, the build can read it. `addonReference(ns)` reduces this
  addon's static screens to what showing them needs — per screen the title, the value each entry
  carries, and the key each press leads to — and a realm that holds that table can show another
  addon's screens from the pack every client already has, following the links as it goes
  (`presentReference`). That is now how a guide is read across addons.
  
  New in `@bedrock-core/ui-runtime`: `Link`, `navigate`, `back`, `openScreen`, `setNavigator`,
  `addonReference`, `screenReference`, `presentReference`, `isAddonReference`, `isScreenReference`,
  `compiledKeyOf`, `screenForKey`, `compiledScreens`, and the `ScreenKeys` interface a build's
  generated module augments so an addon's own keys are typed. `registerCompiledScreen` now takes
  `{ key, title, snapshot }` instead of positional arguments — it is called by generated code, which
  the build rewrites.
  
  Keys autocomplete: the ui-compiler filter writes `packs/data/ui/screens.generated.d.ts` back into the
  project — the way the i18n and guides filters commit their declarations — so the editor offers this
  addon's keys in `navigate()` and `<Link to>` while another addon's key, which this build never saw,
  is still accepted.
  
  `@bedrock-core/navigation` is the key navigator: `navigate('<addon>:<screen>')`, `replace`, `reset`,
  `back(player)`, `canGoBack`, `currentKey`, `historyOf`, `useNavigation()` inside a screen, and
  `provideReferences(lookup)` to say what resolves a key this bundle did not compile. Coming from the
  stack navigator: `push` is `navigate` (it always stacks), `goBack` is `back`, `reset` takes a key
  instead of a route array, and `setParams` is `replace(key, player, { params })` — a compiled screen
  is drawn from the pack each time it is shown, so new params mean showing it again. The stack is a stack of KEYS — a compiled screen's shape
  is frozen, so a stack of components swapped inside one root cannot exist; `createStackNavigator`,
  `NavigationContainer`, `useRoute`, `stackReducer` and their types are gone.
  
  `@bedrock-core/guides`: `createGuide` is removed — a guide is its compiled screens, and a page is a
  screen rather than a state of one. `guideReference`, `presentGuideReference`, `isGuideReference` and
  `GuideReference` go with it: a guide's screens ride the ordinary screen table. `openGuide(ns, player)`
  is a `navigate()`, so it opens this bundle's guide or another addon's the same way. The views take
  link keys (`linkTo`, `homeTo`) instead of open-page callbacks.
  
  `@bedrock-core/ore-styled`: `Button` and `MenuRow` take `to`, and render a link instead of a plain
  button when given one.
  
  `@bedrock-core/config` resolves keys for the whole realm: it installs `provideReferences` over the
  framework's own table and every addon's published one, publishes this addon's screens with
  `core.register({ screens })`, and opens a guide by navigating to its index key.

- [#13](https://github.com/bedrock-core/ui/pull/13) [`83a14ae`](https://github.com/bedrock-core/ui/commit/83a14ae1005117f3e999ea7fe064b02f3736bf7a) Thanks [@drav0011](https://github.com/drav0011)! - `registerDeclared` hands the realm what the build compiled on an addon's behalf: the addon's page in the shared list, drawn from its manifest. The realm publishes it on the first tick. The module the ui-compiler filter generates calls it; an addon does not.

## 0.9.3

### Patch Changes

- [`b8b0eb3`](https://github.com/bedrock-core/ui/commit/b8b0eb3280e8f1031e0293bf5a4227f12a1f5640) Thanks [@drav0011](https://github.com/drav0011)! - Internal: add a package-local ESLint config and point workspace dependencies at `workspace:*`. No runtime changes.
