# @bedrock-core/ore-styled

## 0.11.0

### Minor Changes

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

- [#13](https://github.com/bedrock-core/ui/pull/13) [`440714e`](https://github.com/bedrock-core/ui/commit/440714e5ef61af2b6da28d613d5d9ae385bf60d4) Thanks [@drav0011](https://github.com/drav0011)! - `Header` takes `backReplace`: with `backTo`, the back control opens that screen in place of the current one rather than stacking over it.

- [#13](https://github.com/bedrock-core/ui/pull/13) [`440714e`](https://github.com/bedrock-core/ui/commit/440714e5ef61af2b6da28d613d5d9ae385bf60d4) Thanks [@drav0011](https://github.com/drav0011)! - `@bedrock-core/i18n` is a peer dependency. An addon installs it once, beside `@bedrock-core/server`, so the instance `createI18n()` creates is the one `core.register()` publishes and the one text measurement reads. `@bedrock-core/ui` no longer re-exports it: import `createI18n` from `@bedrock-core/server/i18n`, or from `@bedrock-core/i18n` directly.

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

- [#13](https://github.com/bedrock-core/ui/pull/13) [`166a5d5`](https://github.com/bedrock-core/ui/commit/166a5d50bd6d3485e2daec6d86268741d01600a6) Thanks [@drav0011](https://github.com/drav0011)! - Text whose shape depends on what it says can be composed by the build in every language the pack ships.
  
  - `<Trans>` draws a translated text whose tags are components, as react-i18next's does: `i18nKey` (or `translations` by locale) and `components` by tag name or index. A `<Text>` component styles its tag's content, and any other component is a press hugging it; `<br/>`, `<strong>` and `<i>` are built in. The build breaks the text into the same number of lines in every language, and each component lands exactly where its text is drawn. A screen whose presses run handlers carries the layout in its snapshot, so a render at runtime emits the same entries.
  - `useComposed` composes a string per language at the width the layout gives a box.
  - `<Button hug>` sizes a press to the text inside it.
  - A baked breadcrumb trail (`Trail segments`, `Header title` and `breadcrumbs`) is one label per language, collapsed the way a live trail is.

## 0.10.0

### Minor Changes

- [`a6885dc`](https://github.com/bedrock-core/ui/commit/a6885dc6c3ac8971461f086dbc878b65e6fa7fb7) Thanks [@drav0011](https://github.com/drav0011)! - The addon list shows which row it is showing, and a reset asks before it wipes anything.

  - **`MenuRow` takes `selected`.** A selecting list (`chevron={false}`) leaves one row standing after the press, and until now that row looked like every other one — the detail pane was the only thing saying which addon was open. A selected row wears the theme's new `menuRow.textures.backgroundSelected` (the dropdown's own selected-option face, so picking a row and picking an option read the same) through every state: the hover, pressed and locked props are left undefined so `resolveStateBackgrounds`'s `state ?? base` rule fills them from it. The ordinary hover face is LIGHTER than the selection, so leaving it on washed the selection out exactly when the player pointed at it. Defaults to `false` — a navigating list never has a selection.
  - **Resetting a scope is confirmed first.** The reset button next to a server / dimension / player row used to patch every setting back to its schema default on the press — the one irreversible action in this UI, one mis-tap away, sitting beside a row whose other press merely opens a screen. It now opens `ConfirmReset`: a native modal naming what is about to be reset, with the destructive action on the `danger` submit and `Back` on the dismiss. The defaults patch is built on confirm, from the schema as it stands then, so a schema that replicated again in between cannot be reset to stale values. Every string is an i18n key (`core.reset.*`, `core.action.reset`), so it translates with the rest of the UI.

- [`bdf905f`](https://github.com/bedrock-core/ui/commit/bdf905f2b950283589a97f6a101a9df2f646c942) Thanks [@drav0011](https://github.com/drav0011)! - Form field captions are bold, and `fieldLabel` is exported.

  `theme.components.form.labelStyle` gains a **`bold`** token (default `true`), applied as a `§l` prefix alongside the state colour — so a caption out-ranks the description under it without leaning on size. It follows the same literal-vs-key rule as the colour: a caption the resolver knows as a `.lang` key passes through unprefixed, so bold for a localized caption belongs in the authored translation.

  **`fieldLabel(label, enabled)` is now exported** for captions composed outside a `Form.*` wrapper — a checkbox group's own title, for instance, has no control to hang off, and composing it by hand would drift from every other caption the next time the label style moves.

- [`4f84b8d`](https://github.com/bedrock-core/ui/commit/4f84b8d2e8b5933c2eddf1f293b497b913e886cc) Thanks [@drav0011](https://github.com/drav0011)! - The ore-styled `Form.*` fields take texture props, like every other ore-styled component does.

  `Button` has always let a caller's `background` beat the themed one — the theme textures go in first and the rest spreads over them. The `Form.*` fields did the opposite: they `Omit`ed the texture props out of their public type, so re-skinning a single checkbox meant dropping to the runtime primitive and re-deriving the whole theme by hand. They now accept them, with the theme as the FALLBACK rather than the law: `Form.Button` (the four button states), `Form.Checkbox` and `Form.Toggle` (the four unchecked/off states plus `checkedBackground`/`checkedHover`/`checkedLocked`), `Form.Input` (the four field-box states plus the field's `font`/`scale`), `Form.Slider` (track, `progress`/`progressHover`, the four `thumb*` faces and the `trackHeight`/`thumbWidth`/`thumbHeight` geometry that sizes a custom thumb) and `Form.Dropdown` (closed box, `popupBackground`, the option-row faces, and the option/current text styles). Any state left unset still comes from the theme, so nothing about an unstyled field changes.

  Where a field is a wrapper panel plus a native control — a labeled checkbox is a row, a labeled dropdown a column around the panel that pins the chevron — the texture props are destructured out of the layout rest explicitly, so they reach the CONTROL and never the panel; a `background` on a labeled field skins the box, not the strip of row behind the caption. The components' own "no dedicated pressed face, so pressed reuses hover" rule survives an override too: a caller's `backgroundHover` (or `thumbHover`) becomes their pressed face unless they set the pressed one as well.

  `Form.Radio` and `Form.ToggleButton` were inconsistent in a broader way — neither `Omit`ed anything, because neither extended the primitive at all: each declared a closed hand-rolled interface whose only layout props were `flex` and `width`, so nothing else the primitive accepts, appearance or layout, could reach them. Both now extend `Form.InlineSelect`'s props and take the whole appearance set with the theme as the fallback: `optionBackground`/`optionHover`/`optionSelected`, `bullet`/`bulletSelected`/`bulletHover`/`bulletSelectedHover`, `bulletWidth`/`bulletHeight`, `optionFont`/`optionScale`/`optionAlign`, and the group cell's own `background`. Their signature look is part of what the theme supplies rather than an accident of "unset": a radio's row faces default to the EMPTY texture (the bullet carries the visual) and a toggle button's bullets default to the EMPTY texture (the segments carry it), so an untouched group renders exactly as before — set them and it paints. Their ore-shaped props are untouched: `options` collides with nothing (the primitive authors its options as CHILDREN, which is the one omission left on both), and `rowHeight`, `segmentHeight` and the radio's `gap` default of `2` all behave as they did.

  `gap` deserves its own note on those two, because it is a layout prop that must NOT follow the layout rest: it spaces the rows/segments, so it is destructured out with the appearance props and passed to the group. Left to ride the rest, a labeled group would have handed its row spacing to the wrapper column and quietly replaced the caption gap. The toggle button's `gap` is now a knob too, still defaulting to the `-1` overlap that fuses adjacent segment borders.

  `Form.Dropdown` still does not take `children` — the options are built here from the `options` string array, same as the two groups above.

- [`84f38e5`](https://github.com/bedrock-core/ui/commit/84f38e5b8cae507bc92d976e9cad5f9da00c37c1) Thanks [@drav0011](https://github.com/drav0011)! - `MenuRow` and `Header` take the unified text model: titles, subtitles and breadcrumb segments are `DisplayText` (`string | RawMessage`, from `@bedrock-core/i18n`) — a string that resolves as a key localizes client-side, anything else paints literally, and `MenuRow` only auto-colors literal strings. The `TextSource`, `MenuRowText` and `BreadcrumbSegment` unions are removed in its favor.

### Patch Changes

- [`bdf905f`](https://github.com/bedrock-core/ui/commit/bdf905f2b950283589a97f6a101a9df2f646c942) Thanks [@drav0011](https://github.com/drav0011)! - A form field caption that resolves as a `.lang` key is no longer §-prefixed.

  Literal captions carry their state colour as a §-prefix, but that prefix breaks resolution when the string is a translation key — the key stops being recognisable as one and renders raw. `fieldLabel` now asks the active resolver first and passes a known key through untouched, the same rule `MenuRow` already followed. Bake a § code into the authored translation when a localized caption needs a specific colour.

- [`b8b0eb3`](https://github.com/bedrock-core/ui/commit/b8b0eb3280e8f1031e0293bf5a4227f12a1f5640) Thanks [@drav0011](https://github.com/drav0011)! - Fix: the `transparent` Button variant now uses its own hover and pressed textures instead of reusing the default one for every state, so it visibly reacts to input.

- Updated dependencies [[`d0ad2c6`](https://github.com/bedrock-core/ui/commit/d0ad2c695f8b2173875a511b00c7b40f96163799)]:
  - @bedrock-core/i18n@0.1.0
