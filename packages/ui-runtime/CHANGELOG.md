# @bedrock-core/ui-runtime

## 0.12.0

### Minor Changes

- [#13](https://github.com/bedrock-core/ui/pull/13) [`3ccb9af`](https://github.com/bedrock-core/ui/commit/3ccb9af73122f9e3569fbc4c538612f36158ba2c) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** A container screen's protocol rides custom items, and a press is a drop.
  
  Every item the runtime places — the sentinel, a button's transport, a guard, a bank cell — is a custom item the addon registers under the namespace of the entity or block its screen opens from, named `<namespace>:core_<hash>`. A compiled screen identifies each by its max durability instead of `#item_id_aux`, so nothing depends on vanilla item ids. The sentinel takes one slot and carries the layout key as its current durability; a button's look rides its item's current durability rather than its stack size. The ui-compiler filter writes the items; the render pack ships the blank icon they draw.
  
  Every input a button routes drops its item: nothing of the runtime's reaches a cursor or an inventory, and the press goes to the player the drop event names. Rebuild every addon with the new filter and update the render pack with the library.
  
  Removed: `SlotGrid`'s `hideOwned` prop, which only hid a transport that no longer reaches the player, and the `PROTOCOL_ITEM`, `TRANSPORT_ITEM`, `GUARD_ITEM`, `COUNT_ITEM`, their `_AUX` values, `splitKey`, `joinKey`, `lookStack`, `OWNED_LORE` and `OWNED_PROPERTY` exports. Added: `IDENTITY`, `PROTOCOL_ROLES`, `protocolItemId`, `protocolItemDefinitions`, `namespaceOf` and `BLANK_ICON`.

- [#13](https://github.com/bedrock-core/ui/pull/13) [`83a14ae`](https://github.com/bedrock-core/ui/commit/83a14ae1005117f3e999ea7fe064b02f3736bf7a) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** A screen is drawn from the pack, or not at all.
  
  `render()` refuses a root the build never compiled, naming the two things that produce one: the ui-compiler filter seeing the screen, and `@bedrock-core/generated/ui` being imported so its registrations run (the filter now adds that import itself). With that, the half of the runtime that described a screen on every present is gone — the serializer's tree walk, the action-form and modal presenters, the writers that filled the ActionForm slots, and the byte map `withControl` carried for them.
  
  What a compiled screen still cannot bake stays: a chooser's options are data the build cannot know, so they are packed and reach the pack through `ModalFormData`'s own items array; a modal's fields are the engine's on any path, so the typed calls that make them stay too.
  
  Removed from `@bedrock-core/ui-runtime`: `Input`, `Dropdown`, `Slider` and `ModalFieldProps` — the one-modal-per-field primitives, superseded by `Form.Input` / `Form.Dropdown` / `Form.Slider` inside a `<Form>`, which draw every control in one modal. Also `ScrollLimitError`, `MAX_SCROLLS`, `MAX_POOLED_SCROLLS` (a compiled screen emits a region per `<Scroll>`, so there is no pool to run out of), and `emitButton` / `emitHeader`. `registerComponent` no longer takes a `writer` for anything but a native modal field.
  
  Removed from `@bedrock-core/config`: `App`, `AppProps`, `AppRoutes` and `AppScreen`. Every screen the config UI needs is compiled now.

- [#13](https://github.com/bedrock-core/ui/pull/13) [`b4fc5f2`](https://github.com/bedrock-core/ui/commit/b4fc5f26fd2249a7a425d5488a50a6644006e621) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** Fields are top-level components, and `Form.Button` is the one member `Form` keeps.
  
  `Form.Toggle`, `Form.Slider`, `Form.Dropdown`, `Form.Input` and `Form.Option` are now `Toggle`, `Slider`, `Dropdown`, `Input` and `Option`, and `Form.InlineSelect` is `Select`. Their prop types follow: `ToggleProps`, `SliderProps`, `DropdownProps`, `InputProps`, `OptionProps` and `SelectProps` replace the `Form*Props` names. `Form.Button`, with `type` `submit` or `exit`, stays.
  
  Each field asks its host what it becomes. Inside a `<Form>` it is the engine's own field, answered on submit. On a `<Screen>` or a `<Container>`, `Toggle` is a button that flips its state and calls `onChange`, and `Select` is a button per `Option` calling `onChange` with the option's `value`; `on` and `value` hold the state from outside. `Input`, `Slider` and `Dropdown` are refused anywhere but a `<Form>`.
  
  `Select` takes `multiple` for any number of choices. Inside a `<Form>` each option is a native toggle answering under the select's `name`, and `values[name]` is the indices that are on; elsewhere `onChange` receives every chosen value. `Option` takes `color`, `colorSelected` and `dropSelected`, and `Select` their `optionColor`, `optionColorSelected` and `optionDropSelected` defaults, so a label can say which state its option is in.
  
  `Tabs` takes `tabBackground`, `tabHover` and `tabSelected`, the faces its headers are drawn on, unstyled by default.
  
  ```tsx
  <Form onSubmit={({ values }) => save(values)}>
    <Toggle name={'music'} defaultValue={true} />
    <Slider name={'volume'} min={0} max={10} />
    <Form.Button type={'submit'}>{'Save'}</Form.Button>
  </Form>
  ```

- [#13](https://github.com/bedrock-core/ui/pull/13) [`4ba50cc`](https://github.com/bedrock-core/ui/commit/4ba50cc651643037f0b3ba5d2207ff8e5b7f51d2) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** Every handler now takes one event object instead of positional arguments.
  
  ```tsx
  // before
  <Button onPress={(player, host) => …} />
  <Slot onInsert={(player, stack, host) => …} />
  <Container onOpen={(player, host) => …} />
  <Form onSubmit={values => …} onCancel={() => …} />
  
  // after
  <Button onPress={({ player, host }) => …} />
  <Slot onInsert={({ player, stack, host }) => …} />
  <Container onOpen={({ player, host }) => …} />
  <Form onSubmit={({ player, values }) => …} onCancel={({ player }) => …} />
  ```
  
  `player` is always the player the event is about — the viewer on a form, and on a container screen the player who moved the item. `host` is the entity that owns the screen, so it is present exactly on screens an entity owns; `Form.onSubmit` now carries the submitting player alongside `values`, which a form previously had to reach through `usePlayer()`.
  
  What a handler receives can now gain a field without changing a single call site, which is why this lands before 1.0: a form knows its viewer and no entity, a container screen knows both, and each host added after this knows something else again. The new types — `UiEvent`, `PressEvent`, `ContainerEvent`, `SlotEvent`, `SubmitEvent` — are exported from the package root.
  
  Custom native components (`registerComponent`, `ComponentDescriptor`, `Writer`, the `emit*` helpers) are now marked **experimental**: they are bound to the serialization wire format rather than to the component API, and that format changes with compiled screens. Everything else in the package is the supported component API.

- [#13](https://github.com/bedrock-core/ui/pull/13) [`440714e`](https://github.com/bedrock-core/ui/commit/440714e5ef61af2b6da28d613d5d9ae385bf60d4) Thanks [@drav0011](https://github.com/drav0011)! - `@bedrock-core/i18n` is a peer dependency. An addon installs it once, beside `@bedrock-core/server`, so the instance `createI18n()` creates is the one `core.register()` publishes and the one text measurement reads. `@bedrock-core/ui` no longer re-exports it: import `createI18n` from `@bedrock-core/server/i18n`, or from `@bedrock-core/i18n` directly.

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

- [#13](https://github.com/bedrock-core/ui/pull/13) [`b4fc5f2`](https://github.com/bedrock-core/ui/commit/b4fc5f26fd2249a7a425d5488a50a6644006e621) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** The form protocol is `v0009`, and its header is `corev0009`. The payload layout is unchanged, but a render pack from an earlier release no longer recognises these forms, so update the pack with the library.

- [#13](https://github.com/bedrock-core/ui/pull/13) [`83a14ae`](https://github.com/bedrock-core/ui/commit/83a14ae1005117f3e999ea7fe064b02f3736bf7a) Thanks [@drav0011](https://github.com/drav0011)! - **Breaking.** State is readonly.
  
  `useState` and `useReducer` hand back the value as `Immutable<T>` — deeply readonly — and
  the tuple itself is readonly. A render happens because a setter ran, so a value written in
  place (`state.count++`, `items.push(x)`) changed what the next render would draw and told
  nobody; on a compiled screen it is worse, because the build measured the value it was
  given. Changing state means producing a new value and handing it to the setter, which is
  now what the types say.
  
  ```tsx
  const [items, setItems] = useState<string[]>([]);
  
  items.push(name);            // error: readonly
  setItems([...items, name]);  // what it always had to be
  ```
  
  A reducer reads its state the same way: `(state: Immutable<S>, action: A) => S`.
  `Immutable`, `StateSlot`, `StateUpdate` and `ReducerSlot` are exported for code that names
  the types directly.

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

## 0.10.2

### Patch Changes

- [`7e052b4`](https://github.com/bedrock-core/ui/commit/7e052b4530af8d1a2c21bb2e323b2395254ecad3) Thanks [@drav0011](https://github.com/drav0011)! - `render()` during a live session now swaps the new app into the existing present loop — one UI slot per player — instead of spawning a competing loop.

  Fixes the cross-app handoff race (app A's button opens app B): depending on microtask ordering, A's exit verdict could tear down B's freshly-rendered session, leaving a zombie form whose first press was swallowed. Now any ordering converges:

  - The old app's fibers are cleaned up at swap time, so a dead `exit()` fiber can never poison the next verdict, hook state can never bleed between same-named roots, and background logic passes are never blocked by a stale exit flag.
  - A programmatic close during a handoff is no longer treated as ESC: the surviving loop absorbs the swap and presents the new app (a modal's `onCancel` is skipped — the player didn't dismiss).
  - Present chains carry a token, so a superseded chain's late outcome is void instead of tearing down its successor.
  - A crashed build or a rejected `show()` (player quit) now tears the session down instead of stranding the player input-locked.

  From a presser, handing off is now simply `onPress={() => openUi(...)}` (return the promise) — no `exit()` needed, no flash.

## 0.10.1

### Patch Changes

- [`15327a8`](https://github.com/bedrock-core/ui/commit/15327a8a266821b971c00e9253485507fb4cf8c6) Thanks [@drav0011](https://github.com/drav0011)! - Republished as 0.10.1: the 0.10.0 tarball shipped with unrewritten `workspace:*` dependency ranges and cannot be installed — it is deprecated on the registry. Same content, correct ranges. The release below is what 0.10.0 carried:

  Translation resolution is now `@bedrock-core/i18n`-native — lazy resolvers instead of materialized key maps — and `Text` has ONE text channel.

  - **`children?: DisplayText` (`string | RawMessage`) is the only text channel** — the `localizationKey` prop is removed. Protocol v0008 made key and literal text the same wire format (an uncapped variable tail read by a `localize: true` label), so there is nothing to declare: a string child the active resolver knows is treated as a key (client-resolved, per player language); any other string paints literally — exactly what Bedrock does with an unmatched key. A `RawMessage` child (`raw()` output) is always localized; with arguments it rides the rawtext tail and the CLIENT resolves and fills it — no length cap, `score`/`selector` parts included.
  - **Zero wiring for the common case:** the addon's `createI18n(bundle)` call registers the default translation source, and localized children measure through it automatically, per player. No context at the root, no tables.
  - **`TranslationContext`** replaces `TranslationKeysContext`: it carries a `TranslationResolver` (`(key) => string | undefined`) and exists to OVERRIDE the default — hosts that resolve beyond their own bundle (`@bedrock-core/config` provides `core.translations.forPlayer(player)`, which chains every addon's published bundle) or subtrees pinned to custom data.
  - **`useTranslation(i18n)`** — THE translation hook, one home for what every addon was hand-rolling: pass the addon's `createI18n(bundle)` instance and get its fully-typed verbs (`t`, `key`, `raw`, `display`, `resolve`, `locale`) bound to the viewing player through the locale chain. Lives here (not in `@bedrock-core/i18n`) because binding needs the fiber's player — the i18n package stays hook-free for server-side code.
  - **Context is the one mechanism:** `render()` injects the default instance's resolver into `TranslationContext` at every root (re-derived each build pass, so `setLocale` overrides are picked up live); a provider in the tree shadows it for a subtree. `useTranslationResolver()` is sugar over `useContext(TranslationContext)` (`null` outside a fiber) for components that build display strings themselves.
  - **Protocol v0008:** the label payload group is reordered to `fontType, fontScale, x, y, text` with the text as an uncapped tail, and `RawMessage` tails are serialized as `{rawtext: [...]}` JSON for the client to resolve. Requires the v0008 resource pack (`bcuiv0008` headers).
  - **Protocol v0008 — common `fontType` field at `[606-688]`**, carved from the reserved block (418 → 335 bytes) the same way `region` was in v0006, so every component-specific offset from `[1024]` is unchanged. The merged label cell mounts for every cell type, so its label decodes the font slot whatever the cell is; sourcing it from the component-specific region meant an image's `texture` or a button's `backgroundHover` reached the engine's `#font_type` and logged `Could not find font alias <path>` to `NonAssertErrorLog` — which blocks Marketplace submission. Every component now carries a valid alias at a fixed offset (non-text defaults to `default`).
  - **Protocol v0008 — `Image.texture` is the payload TAIL** (from `[1024]`, unpadded and unprefixed) instead of a fixed 83-byte string cell, so texture paths are no longer capped at 80 bytes and never throw `SerializationError`. Nothing before `[1024]` moved — the control block, the common `fontType` slot included, is byte-identical.

  **Removed:** `Text.localizationKey`, `resolveTranslationKeysForPlayer`, `TranslationKeysByLocale`, `TranslationKeysMap`, `TranslationKeysContext`.

- Updated dependencies [[`b8b0eb3`](https://github.com/bedrock-core/ui/commit/b8b0eb3280e8f1031e0293bf5a4227f12a1f5640), [`d0ad2c6`](https://github.com/bedrock-core/ui/commit/d0ad2c695f8b2173875a511b00c7b40f96163799)]:
  - @bedrock-core/flexbox@1.0.0
  - @bedrock-core/i18n@0.1.0
