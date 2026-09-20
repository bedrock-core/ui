# @bedrock-core/ui-compiler

## 0.1.0

### Minor Changes

- [#13](https://github.com/bedrock-core/ui/pull/13) [`3ccb9af`](https://github.com/bedrock-core/ui/commit/3ccb9af73122f9e3569fbc4c538612f36158ba2c) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** A container screen's protocol rides custom items, and a press is a drop.
  
  Every item the runtime places — the sentinel, a button's transport, a guard, a bank cell — is a custom item the addon registers under the namespace of the entity or block its screen opens from, named `<namespace>:core_<hash>`. A compiled screen identifies each by its max durability instead of `#item_id_aux`, so nothing depends on vanilla item ids. The sentinel takes one slot and carries the layout key as its current durability; a button's look rides its item's current durability rather than its stack size. The ui-compiler filter writes the items; the render pack ships the blank icon they draw.
  
  Every input a button routes drops its item: nothing of the runtime's reaches a cursor or an inventory, and the press goes to the player the drop event names. Rebuild every addon with the new filter and update the render pack with the library.
  
  Removed: `SlotGrid`'s `hideOwned` prop, which only hid a transport that no longer reaches the player, and the `PROTOCOL_ITEM`, `TRANSPORT_ITEM`, `GUARD_ITEM`, `COUNT_ITEM`, their `_AUX` values, `splitKey`, `joinKey`, `lookStack`, `OWNED_LORE` and `OWNED_PROPERTY` exports. Added: `IDENTITY`, `PROTOCOL_ROLES`, `protocolItemId`, `protocolItemDefinitions`, `namespaceOf` and `BLANK_ICON`.

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

- [#13](https://github.com/bedrock-core/ui/pull/13) [`acaca00`](https://github.com/bedrock-core/ui/commit/acaca00dabac57daeefec9980930b71b088f02e8) Thanks [@drav0011](https://github.com/drav0011)! - These three packages are one surface, and they move together.
  
  `@bedrock-core/ui-runtime` is the API an addon writes against, `@bedrock-core/ui-compiler` is what
  turns that into the JSON UI in its pack, and `@bedrock-core/ore-styled` is the control set both
  agree on. A screen is drawn from the pack, so the three are one surface in practice: a component
  the runtime accepts is only real if the compiler can emit it, and a control only exists at all
  because both halves name it the same way. Versioning them apart said otherwise.
  
  `@bedrock-core/ore-styled` is one control per kind, whatever screen draws it. `Button`, `Checkbox`,
  `Radio`, `Toggle`, `Input`, `Dropdown`, `Slider`, `ToggleButtons`, `Tabs`, `Card`, `Divider`, `Header`,
  `MenuRow`, `Trail` and `Form` are the set, and a control renders the same whether it was reached
  from a form, a compiled section or a container screen. `ToggleButtons` makes one choice, or any
  number with `multiple`, and looks the same either way: a chosen segment wears the pressed face, a
  white label and a one-pixel drop on every host. `Tabs` takes a label per `Tabs.Tab` and draws its
  headers on the theme's `tabs` faces, which started as copies of the toggle buttons'. A `MenuRow`
  with `titleMaxLength` or `subtitleMaxLength` draws its lines above its press, so a live row
  compiles.
  
  `@bedrock-core/ui-compiler` publishes the compiler surface an addon's build calls: `toIr` and the
  IR node types, `emit` and the JSON UI document types, `compileScreen` and `buildRouter` for the
  chest host, `compileFormScreen` for the form host, and `faceOf` and the face documents.

- [#13](https://github.com/bedrock-core/ui/pull/13) [`af3a9a7`](https://github.com/bedrock-core/ui/commit/af3a9a78d7088cb8e5e460351a8aab9a0a4f14a1) Thanks [@drav0011](https://github.com/drav0011)! - The build now catches text that a container screen would silently freeze.
  
  A compiled screen's text is written into JSON UI at build time, so a `<Text>` whose content comes from state showed the build's string forever and said nothing about it — a screen that looks right in every screenshot and is wrong the moment anything happens. `maxLength` is what reserves the container slots a changing string needs, and forgetting it had no symptom.
  
  The compiler now renders a screen once for the reference, then again with each `useState` / `useReducer` slot perturbed, and fails the build on what moved:
  
  ```
  "furnace" has 1 <Text> that changes with state but is baked into the layout.
    Baked text is written into JSON UI at build time and never changes again, so the
    screen would show the build's string forever. Give each one `maxLength`, which
    reserves a container slot per character:
      "smelted 0" became "smelted 1" — needs maxLength={9} or more
  ```
  
  The same pass rejects a state change that adds, drops or reorders a cell — a compiled screen is numbered once, so its shape cannot move between renders.
  
  Two things are deliberately not reported: text that already declares `maxLength` (it reserved its cells), and a `<Button>`'s children, which are its face and are baked by definition — an ore-styled button colours its caption by `enabled`, and on a compiled screen only the background swaps.
  
  Probing is not proof: a value that changes only past a threshold no probe crosses is still missed, so `maxLength` remains an explicit marker rather than a hint. Nothing it reports is a false alarm, though — every finding really did change between two renders of the same screen.

- [#13](https://github.com/bedrock-core/ui/pull/13) [`37e3b14`](https://github.com/bedrock-core/ui/commit/37e3b14a57a343db4d50a27972691b39d225eb08) Thanks [@drav0011](https://github.com/drav0011)! - A screen that cannot change ships as a table, not as a component.
  
  A screen is STATIC when every string it shows is baked and every press it takes is a `<Link>`.
  Nothing about it can differ between one present and the next, so the build already knows the
  whole of what showing it requires — the title, the value each entry carries, and where each press
  leads — and the addon ships that instead of the code that would recompute it.
  
  A guide was what this cost the most. Its pages were data in the pack, its views were code in the
  bundle, and every open rebuilt the page's whole block tree to reproduce a layout that had been
  baked into the resource pack at build time. Now a guide page is a row: `GuideBlockList`,
  `GuidePageView`, `GuideHomeView` and the guide manifest are all absent from a built addon, and
  opening a page is one form call.
  
  `<Screen static>` asserts it. The build proves the screen really is static and fails with what
  stopped it otherwise — a live value, or a press it cannot describe — so a screen that was meant to
  cost nothing cannot quietly start costing something. Screens that qualify are detected either way;
  the marker is for the ones where it matters.
  
  New in `@bedrock-core/ui-runtime`: `registerStaticScreens`, and `navigate()` showing a static
  screen straight from its table. `addonReference(ns)` returns what the
  build baked rather than walking components at startup, and `screenReference()` is gone with the
  walk. In `@bedrock-core/ui-compiler`, a compiled screen carries `table`
  when it is one.

- [#13](https://github.com/bedrock-core/ui/pull/13) [`166a5d5`](https://github.com/bedrock-core/ui/commit/166a5d50bd6d3485e2daec6d86268741d01600a6) Thanks [@drav0011](https://github.com/drav0011)! - Text whose shape depends on what it says can be composed by the build in every language the pack ships.
  
  - `<Trans>` draws a translated text whose tags are components, as react-i18next's does: `i18nKey` (or `translations` by locale) and `components` by tag name or index. A `<Text>` component styles its tag's content, and any other component is a press hugging it; `<br/>`, `<strong>` and `<i>` are built in. The build breaks the text into the same number of lines in every language, and each component lands exactly where its text is drawn. A screen whose presses run handlers carries the layout in its snapshot, so a render at runtime emits the same entries.
  - `useComposed` composes a string per language at the width the layout gives a box.
  - `<Button hug>` sizes a press to the text inside it.
  - A baked breadcrumb trail (`Trail segments`, `Header title` and `breadcrumbs`) is one label per language, collapsed the way a live trail is.

### Patch Changes

- Updated dependencies [[`3ccb9af`](https://github.com/bedrock-core/ui/commit/3ccb9af73122f9e3569fbc4c538612f36158ba2c), [`83a14ae`](https://github.com/bedrock-core/ui/commit/83a14ae1005117f3e999ea7fe064b02f3736bf7a), [`b4fc5f2`](https://github.com/bedrock-core/ui/commit/b4fc5f26fd2249a7a425d5488a50a6644006e621), [`4ba50cc`](https://github.com/bedrock-core/ui/commit/4ba50cc651643037f0b3ba5d2207ff8e5b7f51d2), [`440714e`](https://github.com/bedrock-core/ui/commit/440714e5ef61af2b6da28d613d5d9ae385bf60d4), [`166a5d5`](https://github.com/bedrock-core/ui/commit/166a5d50bd6d3485e2daec6d86268741d01600a6), [`83a14ae`](https://github.com/bedrock-core/ui/commit/83a14ae1005117f3e999ea7fe064b02f3736bf7a), [`af3a9a7`](https://github.com/bedrock-core/ui/commit/af3a9a78d7088cb8e5e460351a8aab9a0a4f14a1), [`b4fc5f2`](https://github.com/bedrock-core/ui/commit/b4fc5f26fd2249a7a425d5488a50a6644006e621), [`83a14ae`](https://github.com/bedrock-core/ui/commit/83a14ae1005117f3e999ea7fe064b02f3736bf7a), [`37e3b14`](https://github.com/bedrock-core/ui/commit/37e3b14a57a343db4d50a27972691b39d225eb08), [`166a5d5`](https://github.com/bedrock-core/ui/commit/166a5d50bd6d3485e2daec6d86268741d01600a6)]:
  - @bedrock-core/ui-runtime@0.12.0
